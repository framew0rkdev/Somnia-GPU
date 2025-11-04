const API_URL = 'https://somnia-gpu-api-6e910df44575.herokuapp.com';
const CONTRACT_ADDRESS = '0xa3e3f9Bd08141fA2B57a82539d550781fDbbFBcD';
const SOMNIA_TESTNET = {
    chainId: '0xc488',
    chainName: 'Somnia Testnet',
    nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
    rpcUrls: ['https://dream-rpc.somnia.network'],
    blockExplorerUrls: ['https://explorer-testnet.somnia.network']
};

const CONTRACT_ABI = [
    "function purchaseCredits() external payable",
    "function getCredits(address user) external view returns (uint256)",
    "function useCredits(string memory modelName, uint256 tokensUsed) external"
];

let provider, signer, contract;
let selectedModel = null;
let userAddress = null;
let conversationHistory = [];

const models = [
    { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI', cost: 30, color: '#C91A09' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5', provider: 'OpenAI', cost: 5, color: '#F2CD37' },
    { id: 'claude-3-opus', name: 'Claude Opus', provider: 'Anthropic', cost: 35, color: '#0055BF' },
    { id: 'claude-3-sonnet', name: 'Claude Sonnet', provider: 'Anthropic', cost: 15, color: '#237841' },
    { id: 'claude-3-haiku', name: 'Claude Haiku', provider: 'Anthropic', cost: 3, color: '#FE8A18' },
    { id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google', cost: 10, color: '#C91A09' },
    { id: 'mistral-large', name: 'Mistral Large', provider: 'Mistral', cost: 12, color: '#F2CD37' },
    { id: 'llama-3-70b', name: 'Llama 3 70B', provider: 'Together', cost: 8, color: '#0055BF' }
];

document.getElementById('connect-btn').addEventListener('click', connectWallet);
document.getElementById('disconnect-btn')?.addEventListener('click', disconnectWallet);
document.getElementById('buy-credits-btn').addEventListener('click', showBuyModal);
document.getElementById('confirm-buy-btn').addEventListener('click', buyCredits);
document.getElementById('cancel-buy-btn').addEventListener('click', hideBuyModal);
document.getElementById('send-btn').addEventListener('click', sendMessage);
document.getElementById('message-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

init();

function init() {
    renderModels();
    // Select first model by default
    if (models.length > 0) {
        selectModel(models[0].id);
    }
}

function renderModels() {
    const modelsList = document.getElementById('models-list');
    modelsList.innerHTML = models.map(model => `
        <div class="model-card" data-model="${model.id}">
            <h3>${model.name}</h3>
            <p>${model.provider} • ${model.cost} credits per 1K tokens</p>
        </div>
    `).join('');

    document.querySelectorAll('.model-card').forEach(card => {
        card.addEventListener('click', () => selectModel(card.dataset.model));
    });
}

function adjustColor(color, amount) {
    const num = parseInt(color.replace("#",""), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return "#" + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
}

function selectModel(modelId) {
    selectedModel = models.find(m => m.id === modelId);
    document.querySelectorAll('.model-card').forEach(b => b.classList.remove('selected'));
    document.querySelector(`[data-model="${modelId}"]`).classList.add('selected');

    const modelNameEl = document.getElementById('current-model-name');
    if (modelNameEl) {
        modelNameEl.textContent = selectedModel.name;
    }

    conversationHistory = [];

    // Enable input if wallet is connected
    if (userAddress) {
        const input = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-btn');
        if (input) {
            input.disabled = false;
            input.placeholder = 'Message AI...';
        }
        if (sendBtn) sendBtn.disabled = false;
    }
}

async function connectWallet() {
    try {
        if (typeof window.ethereum === 'undefined') {
            alert('Please install MetaMask!');
            return;
        }

        // First request accounts
        provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        signer = provider.getSigner();
        userAddress = await signer.getAddress();

        console.log('Wallet connected:', userAddress);

        // Then try to switch/add network
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: SOMNIA_TESTNET.chainId }]
            });
        } catch (switchError) {
            // If network doesn't exist, add it
            if (switchError.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [SOMNIA_TESTNET]
                });
            } else {
                throw switchError;
            }
        }

        // Initialize contract
        if (CONTRACT_ADDRESS) {
            contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        }

        // Update UI
        document.getElementById('connect-btn').style.display = 'none';
        document.getElementById('wallet-connected').style.display = 'flex';
        document.getElementById('wallet-address-text').textContent =
            userAddress.slice(0, 6) + '...' + userAddress.slice(-4);

        if (selectedModel) {
            const input = document.getElementById('message-input');
            const sendBtn = document.getElementById('send-btn');
            if (input) {
                input.disabled = false;
                input.placeholder = 'Message AI...';
            }
            if (sendBtn) sendBtn.disabled = false;
        }

        await updateCredits();
    } catch (error) {
        console.error('Connection error:', error);
        alert('Failed to connect wallet: ' + error.message);
    }
}

function disconnectWallet() {
    provider = null;
    signer = null;
    contract = null;
    userAddress = null;
    selectedModel = null;

    document.getElementById('connect-btn').style.display = 'flex';
    document.getElementById('wallet-connected').style.display = 'none';
    document.getElementById('message-input').disabled = true;
    document.getElementById('send-btn').disabled = true;
    document.getElementById('chat-container').innerHTML = '';
}

async function updateCredits() {
    if (!contract || !userAddress) {
        document.getElementById('credit-amount').textContent = 'N/A';
        return;
    }

    try {
        const credits = await contract.getCredits(userAddress);
        document.getElementById('credit-amount').textContent = credits.toString();
    } catch (error) {
        console.error('Error fetching credits:', error);
        document.getElementById('credit-amount').textContent = '0';
    }
}

function showBuyModal() {
    const modal = document.getElementById('buy-modal');
    modal.style.display = 'flex';
}

document.getElementById('buy-modal')?.querySelector('.modal-overlay')?.addEventListener('click', hideBuyModal);

function hideBuyModal() {
    document.getElementById('buy-modal').style.display = 'none';
}

async function buyCredits() {
    const amount = document.getElementById('stt-amount').value;

    if (!contract) {
        alert('Contract not configured. Set CONTRACT_ADDRESS in app.js');
        return;
    }

    try {
        const tx = await contract.purchaseCredits({
            value: ethers.utils.parseEther(amount)
        });

        addSystemMessage('Processing purchase...');
        await tx.wait();
        addSystemMessage('Credits purchased successfully!');

        await updateCredits();
        hideBuyModal();
    } catch (error) {
        console.error('Purchase error:', error);
        alert('Failed to purchase credits');
    }
}

async function sendMessage() {
    const input = document.getElementById('message-input');
    const message = input.value.trim();

    if (!message || !selectedModel || !userAddress) return;

    addMessage(message, 'user');
    input.value = '';

    conversationHistory.push({ role: 'user', content: message });

    addLoadingMessage();

    try {
        const response = await fetch(`${API_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: selectedModel.id,
                messages: conversationHistory,
                userAddress
            })
        });

        const data = await response.json();

        removeLoadingMessage();

        if (data.success) {
            const aiMessage = data.response.choices[0].message.content;
            addMessage(aiMessage, 'ai');

            conversationHistory.push({ role: 'assistant', content: aiMessage });

            if (contract && data.tokensUsed) {
                try {
                    const tx = await contract.useCredits(selectedModel.id, data.tokensUsed);
                    await tx.wait();
                    await updateCredits();
                } catch (error) {
                    console.error('Credits deduction error:', error);
                }
            }
        } else {
            addMessage('Error: ' + (data.error || 'Failed to get response'), 'ai');
        }
    } catch (error) {
        removeLoadingMessage();
        console.error('Send error:', error);
        addMessage('Error: Failed to send message', 'ai');
    }
}

function addMessage(text, type) {
    const container = document.getElementById('chat-container');

    // Clear welcome message if exists
    const welcomeMsg = container.querySelector('[style*="flex-direction: column"]');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.innerHTML = `
        <div class="message-content">${text}</div>
    `;

    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

function addSystemMessage(text) {
    addMessage(text, 'ai');
}

function addLoadingMessage() {
    const container = document.getElementById('chat-container');

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message ai';
    loadingDiv.id = 'loading-message';
    loadingDiv.innerHTML = `
        <div class="loading-message">
            <div class="loading-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;

    container.appendChild(loadingDiv);
    container.scrollTop = container.scrollHeight;
}

function removeLoadingMessage() {
    const loading = document.getElementById('loading-message');
    if (loading) loading.remove();
}
