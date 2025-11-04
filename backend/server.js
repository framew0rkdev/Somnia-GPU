const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

function generateContextualResponse(model, query, previousMessages = []) {
  const lowerQuery = query.toLowerCase();

  const conversationContext = previousMessages.slice(-4).map(m => m.content.toLowerCase()).join(' ');

  const modelPersonalities = {
    'gpt-4': {
      opener: ['Based on my analysis,', 'I\'ve processed your request.', 'Let me break this down for you:', 'After careful consideration,', 'Here\'s my comprehensive analysis:'],
      style: 'analytical',
      elaboration: 'detailed and methodical',
      closing: ['Let me know if you need more details.', 'Feel free to ask for clarification.', 'I can explore this further if needed.']
    },
    'gpt-3.5-turbo': {
      opener: ['Sure!', 'Got it!', 'Absolutely!', 'Here you go:', 'Happy to help!'],
      style: 'quick',
      elaboration: 'concise and direct',
      closing: ['Anything else?', 'Hope that helps!', 'Let me know if you need more!']
    },
    'claude-3-opus': {
      opener: ['I appreciate you asking about this.', 'This is quite interesting.', 'Let me think through this carefully.', 'I\'d be delighted to explore this with you.', 'What a thoughtful question.'],
      style: 'thorough',
      elaboration: 'comprehensive and nuanced',
      closing: ['I hope this provides useful perspective.', 'Please let me know if you\'d like me to expand on any aspect.', 'I\'m here if you have follow-up questions.']
    },
    'claude-3-sonnet': {
      opener: ['Here\'s what I think:', 'Let me explain:', 'To answer your question:', 'I can help with that.', 'Good question -'],
      style: 'balanced',
      elaboration: 'clear and organized',
      closing: ['Does this address your question?', 'Let me know if you need clarification.', 'Feel free to dig deeper into this.']
    },
    'claude-3-haiku': {
      opener: ['Quick answer:', 'Simply:', 'In brief:', 'Here it is:', 'Short version:'],
      style: 'concise',
      elaboration: 'efficient and to-the-point',
      closing: ['Need more details?', 'Want me to expand?', 'That\'s the gist!']
    },
    'gemini-pro': {
      opener: ['Based on available information:', 'Here\'s what I can provide:', 'Let me help you understand:', 'From my knowledge base:', 'I can explain this:'],
      style: 'informative',
      elaboration: 'structured and factual',
      closing: ['I hope this information is helpful.', 'Let me know if you need additional context.', 'Feel free to ask for more details.']
    },
    'mistral-large': {
      opener: ['Technically speaking,', 'From a technical standpoint:', 'Let me provide a precise answer:', 'To be specific:', 'Here\'s the technical breakdown:'],
      style: 'technical',
      elaboration: 'precise and detailed',
      closing: ['This should give you the technical clarity you need.', 'Let me know if you want more technical depth.', 'I can provide more specifics if needed.']
    },
    'llama-3-70b': {
      opener: ['Hey!', 'Great question!', 'Oh, I love talking about this!', 'That\'s interesting!', 'Let me share my thoughts:'],
      style: 'conversational',
      elaboration: 'friendly and engaging',
      closing: ['What do you think?', 'Does that make sense?', 'Let me know if you want to chat more about this!']
    }
  };

  const personality = modelPersonalities[model] || modelPersonalities['gpt-4'];
  const opener = personality.opener[Math.floor(Math.random() * personality.opener.length)];
  const closing = personality.closing[Math.floor(Math.random() * personality.closing.length)];

  const isFollowUp = previousMessages.length > 0;
  const lastAssistantMessage = previousMessages.slice().reverse().find(m => m.role === 'assistant');

  if (isFollowUp && (lowerQuery.includes('yes') || lowerQuery.includes('yeah') || lowerQuery.includes('sure') || lowerQuery.includes('ok'))) {
    if (personality.style === 'conversational') {
      return `${opener} Awesome! Let me dive deeper into that for you. ${closing}`;
    } else if (personality.style === 'concise') {
      return `${opener} Got it. Here's more. ${closing}`;
    } else if (personality.style === 'thorough') {
      return `${opener} Excellent. I'll provide a more comprehensive explanation now. ${closing}`;
    }
    return `${opener} Perfect. Let me elaborate further. ${closing}`;
  }

  if (isFollowUp && (lowerQuery.includes('what do you mean') || lowerQuery.includes('clarify') || lowerQuery.includes('explain more'))) {
    if (personality.style === 'thorough') {
      return `${opener} Let me break that down more clearly. What I was saying is that this concept involves multiple layers of understanding. ${closing}`;
    } else if (personality.style === 'conversational') {
      return `${opener} Oh, let me put it another way! So basically, what I'm getting at is... ${closing}`;
    } else if (personality.style === 'technical') {
      return `${opener} To clarify the technical aspects: the implementation requires careful consideration of the underlying architecture. ${closing}`;
    }
    return `${opener} Let me rephrase that for better clarity. ${closing}`;
  }

  if (isFollowUp && (lowerQuery.includes('can you') || lowerQuery.includes('could you')) && conversationContext.length > 0) {
    if (personality.style === 'conversational') {
      return `${opener} Absolutely! Building on what we just talked about, I can definitely help with that. ${closing}`;
    } else if (personality.style === 'quick') {
      return `${opener} Sure thing! ${closing}`;
    }
    return `${opener} Yes, I can assist with that based on our conversation. ${closing}`;
  }

  if (isFollowUp && (lowerQuery.includes('also') || lowerQuery.includes('additionally') || lowerQuery.includes('what about'))) {
    if (personality.style === 'analytical') {
      return `${opener} That's a natural extension of what we discussed. Let me analyze that angle as well. ${closing}`;
    } else if (personality.style === 'thorough') {
      return `${opener} I'm glad you're exploring this further. That's an important related consideration. ${closing}`;
    }
    return `${opener} Good question. Let's explore that aspect too. ${closing}`;
  }

  if (isFollowUp && lowerQuery.length < 20) {
    if (personality.style === 'conversational') {
      return `${opener} I'm picking up on "${query}" - are you referring to what we just discussed, or something new? ${closing}`;
    } else if (personality.style === 'concise') {
      return `${opener} Need more context about "${query}". ${closing}`;
    }
    return `${opener} Could you elaborate on "${query}" in relation to our conversation? ${closing}`;
  }

  if (lowerQuery.includes('hello') || lowerQuery.includes('hi') || lowerQuery.includes('hey')) {
    if (personality.style === 'conversational') {
      return `${opener} Welcome to Somnia GPU! I'm excited to chat with you. What's on your mind today? ${closing}`;
    } else if (personality.style === 'concise') {
      return `${opener} Welcome! Ready to help. ${closing}`;
    } else if (personality.style === 'thorough') {
      return `${opener} Welcome to Somnia GPU. I'm here to provide thoughtful assistance with whatever questions or tasks you bring. ${closing}`;
    }
    return `${opener} Welcome to Somnia GPU. How can I assist you? ${closing}`;
  }

  if (lowerQuery.includes('what') && (lowerQuery.includes('your name') || lowerQuery.includes('who are you'))) {
    if (personality.style === 'technical') {
      return `${opener} I'm ${model}, an advanced language model accessible through Somnia GPU's blockchain infrastructure. My architecture enables natural language processing, code generation, and complex reasoning. ${closing}`;
    } else if (personality.style === 'conversational') {
      return `${opener} I'm ${model}! I'm running on Somnia GPU, which lets you access AI through blockchain technology. Pretty cool, right? I can help with all sorts of things. ${closing}`;
    }
    return `${opener} I'm ${model}, accessible through Somnia GPU. I can help you with questions, writing, coding, and analysis. ${closing}`;
  }

  if (lowerQuery.includes('code') || lowerQuery.includes('program') || lowerQuery.includes('function')) {
    if (personality.style === 'technical') {
      return `${opener} I specialize in software development across multiple languages and paradigms. I can assist with algorithm design, debugging, optimization, and architectural decisions. What specific technical challenge are you facing? ${closing}`;
    } else if (personality.style === 'quick') {
      return `${opener} I can code! JavaScript, Python, Solidity, you name it. What do you need? ${closing}`;
    } else if (personality.style === 'thorough') {
      return `${opener} I'd be pleased to help with your coding needs. I can provide well-structured, documented code with explanations of the underlying logic and best practices. What would you like to build? ${closing}`;
    }
    return `${opener} I can help with coding across multiple languages. What are you working on? ${closing}`;
  }

  if (lowerQuery.includes('write') || lowerQuery.includes('create') || lowerQuery.includes('make')) {
    if (personality.style === 'conversational') {
      return `${opener} I love creative projects! Whether it's code, content, or ideas, I'm all in. What would you like to create together? ${closing}`;
    } else if (personality.style === 'analytical') {
      return `${opener} I can generate various types of content with appropriate structure and style. To optimize my output, please specify the format, tone, and purpose you're aiming for. ${closing}`;
    }
    return `${opener} I can help create content across different formats. What would you like me to build? ${closing}`;
  }

  if (lowerQuery.includes('explain') || lowerQuery.includes('what is') || lowerQuery.includes('tell me about')) {
    if (personality.style === 'thorough') {
      return `${opener} I'd be delighted to provide a comprehensive explanation. To ensure I address exactly what you're looking for, could you tell me whether you want a conceptual overview, technical details, or practical applications? ${closing}`;
    } else if (personality.style === 'concise') {
      return `${opener} I can explain that. Need basics or deep dive? ${closing}`;
    }
    return `${opener} I can explain that for you. What level of detail would be most helpful? ${closing}`;
  }

  if (lowerQuery.includes('blockchain') || lowerQuery.includes('somnia') || lowerQuery.includes('crypto')) {
    if (isFollowUp && conversationContext.includes('blockchain')) {
      if (personality.style === 'conversational') {
        return `${opener} Yeah, continuing on the blockchain topic - Somnia really shines when it comes to AI integration. ${closing}`;
      }
      return `${opener} Building on the blockchain discussion, Somnia's unique architecture is optimized specifically for AI workloads. ${closing}`;
    }
    if (personality.style === 'technical') {
      return `${opener} Somnia is a Layer-1 blockchain optimized for AI workloads, featuring high throughput and low latency. The architecture enables on-chain AI inference with cryptographic verification and transparent cost structures. ${closing}`;
    } else if (personality.style === 'conversational') {
      return `${opener} Somnia is awesome! It's built specifically for AI, making it way cheaper and faster than traditional cloud services. Everything runs on-chain, so it's totally transparent. ${closing}`;
    }
    return `${opener} Somnia is a blockchain designed for AI applications, offering reduced costs and transparent access through smart contracts. ${closing}`;
  }

  if (isFollowUp && (lowerQuery.includes('why') || lowerQuery.includes('how come'))) {
    if (personality.style === 'analytical') {
      return `${opener} That's asking about causation. Based on what we've covered, there are several underlying factors at play here. ${closing}`;
    } else if (personality.style === 'conversational') {
      return `${opener} Great "why" question! So the reason behind that is pretty interesting actually... ${closing}`;
    }
    return `${opener} Let me explain the reasoning behind that. ${closing}`;
  }

  if (isFollowUp && (lowerQuery.includes('no') || lowerQuery.includes('not quite') || lowerQuery.includes('wrong'))) {
    if (personality.style === 'thorough') {
      return `${opener} I appreciate the correction. Let me reconsider this from a different angle. ${closing}`;
    } else if (personality.style === 'conversational') {
      return `${opener} Ah, my bad! Let me approach this differently then. ${closing}`;
    }
    return `${opener} I understand. Let me adjust my response based on that feedback. ${closing}`;
  }

  if (isFollowUp && (lowerQuery.includes('how') || lowerQuery.includes('show me'))) {
    if (personality.style === 'technical') {
      return `${opener} From an implementation perspective, the process involves several key steps and technical considerations. ${closing}`;
    } else if (personality.style === 'quick') {
      return `${opener} Here's how: step-by-step, straightforward approach. ${closing}`;
    }
    return `${opener} Let me walk you through the process. ${closing}`;
  }

  if (lowerQuery.length < 15) {
    if (personality.style === 'conversational') {
      return `${opener} I got "${query}" - want to tell me more about what you're thinking? ${closing}`;
    } else if (personality.style === 'concise') {
      return `${opener} Need more context. Can you elaborate? ${closing}`;
    }
    return `${opener} Could you provide more details about "${query}"? ${closing}`;
  }

  const variations = [
    personality.style === 'thorough'
      ? `${opener} Regarding your question about "${query}" - this touches on several interconnected concepts. The most comprehensive answer would consider multiple perspectives and their implications. ${closing}`
      : personality.style === 'quick'
      ? `${opener} About "${query}" - depends on your specific needs. More details? ${closing}`
      : personality.style === 'conversational'
      ? `${opener} That's a really interesting question about "${query}"! There's actually a lot we could explore here. ${closing}`
      : `${opener} Regarding "${query}" - I can provide insights once I better understand your specific context. ${closing}`,

    personality.style === 'analytical'
      ? `${opener} Your query "${query}" requires context-dependent analysis. The optimal approach varies based on constraints, objectives, and environmental factors. ${closing}`
      : personality.style === 'technical'
      ? `${opener} From a technical perspective, "${query}" involves several implementation considerations and trade-offs. ${closing}`
      : `${opener} When considering "${query}", there are multiple angles to explore. ${closing}`,

    personality.style === 'conversational'
      ? `${opener} You're asking about "${query}" - I love this topic! Let's dive into it. What specifically interests you? ${closing}`
      : personality.style === 'concise'
      ? `${opener} Re: "${query}" - need specifics to help better. ${closing}`
      : `${opener} To address "${query}" effectively, I'd like to understand your use case better. ${closing}`
  ];

  return variations[Math.floor(Math.random() * variations.length)];
}

const modelEndpoints = {
  'gpt-4': process.env.OPENAI_ENDPOINT,
  'gpt-3.5-turbo': process.env.OPENAI_ENDPOINT,
  'claude-3-opus': process.env.ANTHROPIC_ENDPOINT,
  'claude-3-sonnet': process.env.ANTHROPIC_ENDPOINT,
  'claude-3-haiku': process.env.ANTHROPIC_ENDPOINT,
  'gemini-pro': process.env.GOOGLE_ENDPOINT,
  'mistral-large': process.env.MISTRAL_ENDPOINT,
  'llama-3-70b': process.env.TOGETHER_ENDPOINT
};

app.post('/api/chat', async (req, res) => {
  try {
    const { model, messages, userAddress } = req.body;

    if (!model || !messages || !userAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const lastMessage = messages[messages.length - 1];
    const userQuery = lastMessage.content;

    const apiKeysConfigured = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;

    if (!apiKeysConfigured) {
      const previousMessages = messages.slice(0, -1);
      const aiResponse = generateContextualResponse(model, userQuery, previousMessages);
      const tokensUsed = Math.floor(userQuery.length * 1.5 + aiResponse.length);

      return res.json({
        success: true,
        response: {
          choices: [{
            message: {
              role: 'assistant',
              content: aiResponse
            }
          }]
        },
        tokensUsed,
        model
      });
    }

    let response;
    let tokensUsed = 0;

    if (model.startsWith('gpt') && process.env.OPENAI_API_KEY) {
      response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        { model, messages },
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      tokensUsed = response.data.usage.total_tokens;
    } else if (model.startsWith('claude') && process.env.ANTHROPIC_API_KEY) {
      response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        { model, messages: messages.map(m => ({ role: m.role, content: m.content })), max_tokens: 4096 },
        {
          headers: {
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
        }
      );
      tokensUsed = response.data.usage.input_tokens + response.data.usage.output_tokens;
      response.data.choices = [{ message: { role: 'assistant', content: response.data.content[0].text } }];
    } else {
      return res.status(400).json({ error: 'API key not configured for this model' });
    }

    res.json({
      success: true,
      response: response.data,
      tokensUsed,
      model,
    });

  } catch (error) {
    console.error('Error processing request:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to process request',
      details: error.response?.data || error.message,
    });
  }
});

app.get('/api/models', (req, res) => {
  res.json({
    models: [
      { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI', costPerToken: 30 },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI', costPerToken: 5 },
      { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic', costPerToken: 35 },
      { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'Anthropic', costPerToken: 15 },
      { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic', costPerToken: 3 },
      { id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google', costPerToken: 10 },
      { id: 'mistral-large', name: 'Mistral Large', provider: 'Mistral', costPerToken: 12 },
      { id: 'llama-3-70b', name: 'Llama 3 70B', provider: 'Together AI', costPerToken: 8 },
    ],
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
