# Somnia GPU - Frontend

Static web application for interacting with Somnia GPU AI gateway.

## Structure

- `index.html` - Landing page
- `app.html` - Main application interface
- `app.js` - Application logic and Web3 integration
- `app.css` - Application styles
- `styles.css` - Landing page styles
- `ethers.min.js` - ethers.js v5.7.2 library

## Configuration

Update the contract address in `app.js`:

```javascript
const CONTRACT_ADDRESS = '0xa3e3f9Bd08141fA2B57a82539d550781fDbbFBcD';
const API_URL = 'https://somnia-gpu-api-6e910df44575.herokuapp.com';
```

## Local Development

```bash
python3 -m http.server 8000
```

Visit: http://localhost:8000

## Deployment

Deployed on Vercel:
- Landing: https://somnia-router.vercel.app
- App: https://somnia-router.vercel.app/app

## Features

- Bolt.new-inspired pure black theme
- Web3 wallet connection (MetaMask)
- Automatic Somnia Testnet configuration
- Credit purchase and management
- 8 AI model selection
- Real-time chat interface
- Conversation history tracking
- Transaction confirmation and gas estimation
