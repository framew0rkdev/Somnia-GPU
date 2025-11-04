// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SomniaRouter {
    address public owner;
    uint256 public creditsPerToken = 1000; // 1000 credits per STT token
    uint256 public totalUsers;
    uint256 public totalRequests;

    struct User {
        uint256 credits;
        uint256 totalSpent;
        uint256 requestCount;
        bool isActive;
    }

    struct ModelProvider {
        string name;
        uint256 costPerToken; // in credits
        bool isActive;
        address providerAddress;
    }

    struct UsageLog {
        address user;
        string model;
        uint256 tokensUsed;
        uint256 creditsCost;
        uint256 timestamp;
    }

    mapping(address => User) public users;
    mapping(string => ModelProvider) public models;
    mapping(uint256 => UsageLog) public usageLogs;

    string[] public availableModels;

    event CreditsPurchased(address indexed user, uint256 amount, uint256 credits);
    event CreditsUsed(address indexed user, string model, uint256 credits);
    event ModelAdded(string modelName, uint256 costPerToken);
    event ModelUpdated(string modelName, bool isActive);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    modifier hasCredits(uint256 required) {
        require(users[msg.sender].credits >= required, "Insufficient credits");
        _;
    }

    constructor() {
        owner = msg.sender;

        _addModel("gpt-4", 30, address(0));
        _addModel("gpt-3.5-turbo", 5, address(0));
        _addModel("claude-3-opus", 35, address(0));
        _addModel("claude-3-sonnet", 15, address(0));
        _addModel("claude-3-haiku", 3, address(0));
        _addModel("gemini-pro", 10, address(0));
        _addModel("mistral-large", 12, address(0));
        _addModel("llama-3-70b", 8, address(0));
    }

    function purchaseCredits() external payable {
        require(msg.value > 0, "Must send STT to purchase credits");

        uint256 creditsToAdd = msg.value * creditsPerToken / 1 ether;

        if (!users[msg.sender].isActive) {
            users[msg.sender].isActive = true;
            totalUsers++;
        }

        users[msg.sender].credits += creditsToAdd;
        users[msg.sender].totalSpent += msg.value;

        emit CreditsPurchased(msg.sender, msg.value, creditsToAdd);
    }

    function useCredits(string memory modelName, uint256 tokensUsed) external {
        require(models[modelName].isActive, "Model not available");

        uint256 creditsCost = (tokensUsed * models[modelName].costPerToken) / 1000;
        require(users[msg.sender].credits >= creditsCost, "Insufficient credits");

        users[msg.sender].credits -= creditsCost;
        users[msg.sender].requestCount++;

        usageLogs[totalRequests] = UsageLog({
            user: msg.sender,
            model: modelName,
            tokensUsed: tokensUsed,
            creditsCost: creditsCost,
            timestamp: block.timestamp
        });

        totalRequests++;

        emit CreditsUsed(msg.sender, modelName, creditsCost);
    }

    function getCredits(address user) external view returns (uint256) {
        return users[user].credits;
    }

    function getUserStats(address user) external view returns (
        uint256 credits,
        uint256 totalSpent,
        uint256 requestCount,
        bool isActive
    ) {
        User memory u = users[user];
        return (u.credits, u.totalSpent, u.requestCount, u.isActive);
    }

    function getAvailableModels() external view returns (string[] memory) {
        return availableModels;
    }

    function getModelDetails(string memory modelName) external view returns (
        string memory name,
        uint256 costPerToken,
        bool isActive
    ) {
        ModelProvider memory model = models[modelName];
        return (model.name, model.costPerToken, model.isActive);
    }

    function addModel(
        string memory modelName,
        uint256 costPerToken,
        address providerAddress
    ) external onlyOwner {
        _addModel(modelName, costPerToken, providerAddress);
    }

    function _addModel(
        string memory modelName,
        uint256 costPerToken,
        address providerAddress
    ) internal {
        require(bytes(models[modelName].name).length == 0, "Model already exists");

        models[modelName] = ModelProvider({
            name: modelName,
            costPerToken: costPerToken,
            isActive: true,
            providerAddress: providerAddress
        });

        availableModels.push(modelName);

        emit ModelAdded(modelName, costPerToken);
    }

    function updateModelStatus(string memory modelName, bool isActive) external onlyOwner {
        require(bytes(models[modelName].name).length > 0, "Model doesn't exist");
        models[modelName].isActive = isActive;

        emit ModelUpdated(modelName, isActive);
    }

    function updateCreditsPerToken(uint256 newRate) external onlyOwner {
        creditsPerToken = newRate;
    }

    function withdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }

    function getContractStats() external view returns (
        uint256 _totalUsers,
        uint256 _totalRequests,
        uint256 balance
    ) {
        return (totalUsers, totalRequests, address(this).balance);
    }
}
