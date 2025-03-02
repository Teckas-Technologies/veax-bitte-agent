# Node.js API for Veax AI Agent

## Introduction

Veax Assistant is an AI-powered agent designed to assist liquidity providers in optimizing their strategies on the **Veax Protocol**. It enables seamless interaction with Veax smart contracts and APIs, offering real-time insights, risk assessments, and automated liquidity provisioning.  

[![Demo](https://img.shields.io/badge/Demo-Visit%20Demo-brightgreen)](https://tinyurl.com/veax-assistant)
[![Deploy](https://img.shields.io/badge/Deploy-on%20Vercel-blue)](https://vercel.com/new/clone?repository-url=https://github.com/Teckas-Technologies/veax-bitte-agent)

**Tooling:**

[![Use Case](https://img.shields.io/badge/Use%20Case-Make%20Veax%20Operations%20Easier-orange)](#)
[![Tools](https://img.shields.io/badge/Tools-web3.js%2C%20big.js-blue)](#)
[![Framework](https://img.shields.io/badge/Framework-Node.js-blue)](#)

**Author:**

[![Author](https://img.shields.io/badge/Follow-Teckas%20Technologies-blue?style=social&logo=linkedin)](https://www.linkedin.com/company/teckas/) [![Organization](https://img.shields.io/badge/Teckas%20Technologies-blue)](https://teckastechnologies.com/)

## Key Features

- **Fetch Liquidity Pools**: Retrieve real-time liquidity pool data, including token pairs and TVL (Total Value Locked).  
- **Add Liquidity**: Add Liquidity to the pools.
- **Risk Analysis**: Identify risky liquidity pools to help users avoid impermanent loss.  
- **Best Pools Suggestions**: AI-driven recommendations for the best pools to add liquidity.  
- **Historical Price Analysis**: Fetch historical token prices based on user-specified timeframes.  
- **Real-Time Token Prices**: Retrieve spot prices of tokens from the market.  
- **Automated Liquidity Provisioning**: Generate transactions to add liquidity directly from the assistant.  
- **Fetch Tokens**: Retrieve all the tokens in the near protocol.

## User Flow

### 1. Add Liquidity to a Pool  
- **Endpoint**: `GET /api/add-liquidity`  
- **Parameters**:  
  - `tokenA` (string) – Token A address  
  - `tokenB` (string) – Token B address  
  - `walletAddress` (string) – User's NEAR wallet address  
  - `amount` (string) – Amount of tokenA to add  
- **Response**:  
  - Returns transaction data for adding liquidity  

### 2. Fetch Tokens List  
- **Endpoint**: `GET /api/tokens`  
- **Parameters**:  
  - `pageNo` (string) – Page number (default: 1)  
  - `searchText` (string, optional) – Token address search  
- **Response**:  
  - Returns a list of tokens with price and liquidity details  

### 3. Fetch Liquidity-Paired Tokens  
- **Endpoint**: `GET /api/tokens/liquidity-paired`  
- **Parameters**:  
  - `tokenAddress` (string) – Address of the token  
- **Response**:  
  - Returns paired liquidity details  

### 4. Fetch Current Token Price  
- **Endpoint**: `GET /api/tokens/price`  
- **Parameters**:  
  - `tokenAddress` (string) – Address of the token  
- **Response**:  
  - Returns the current price of the token in USD  

### 5. Fetch Historical Token Prices  
- **Endpoint**: `GET /api/tokens/historical-price`  
- **Parameters**:  
  - `tokenAddress` (string) – Address of the token  
  - `timestamp` (string) – Unix timestamp of the price lookup  
- **Response**:  
  - Returns historical price data  

### 6. Fetch Liquidity Pools  
- **Endpoint**: `GET /api/pools`  
- **Parameters**:  
  - `walletAddress` (string) – User's EVM wallet address  
- **Response**:  
  - Returns a list of available liquidity pools  

### 7. Fetch Spot Price of a Pool  
- **Endpoint**: `GET /api/pools/spot-price`  
- **Parameters**:  
  - `tokenA` (string) – Address of token A  
  - `tokenB` (string) – Address of token B  
- **Response**:  
  - Returns the spot price of the pool  

### 8. Fetch Best Liquidity Pools  
- **Endpoint**: `GET /api/pools/best-pools`  
- **Response**:  
  - Returns the top liquidity pools based on stability and liquidity  

### 9. Fetch Risky Liquidity Pools  
- **Endpoint**: `GET /api/pools/risky-pools`  
- **Response**:  
  - Returns liquidity pools with high risk factors


## Conclusion  

Veax Assistant is a powerful AI-driven tool designed to simplify liquidity provisioning on the Veax Protocol. By integrating real-time blockchain data, AI-powered insights, and seamless transaction execution, it helps liquidity providers optimize their strategies while minimizing risk.  

With features like **best pool recommendations, risk assessment, real-time token prices, and automated liquidity provisioning**, Veax Assistant streamlines the entire liquidity management process.  

Moving forward, we aim to **expand multi-chain support, introduce automated liquidity rebalancing, and enhance DeFi analytics** to make Veax Assistant the ultimate liquidity management tool in the decentralized finance space. 

## Step By Step

To get started with the Veax AI Agent, follow these steps:

1. **Clone repository**
```bash
git clone https://github.com/Teckas-Technologies/veax-bitte-agent
cd veax-bitte-agent
```
2. **Install dependencies**
```bash
npm install
npm run start
```

**Contract**: `veax.nea`  

## Usage

 In this template, we used the `Veax API` for fetch the required information from the blockchain.

## Deployment
Follow these steps to deploy the Veax AI Agent on Vercel:
- **Create an Account**: Sign up for an account on Vercel.
- **Connect GitHub**: Connect your GitHub account with Vercel.
- **Import Repository**: Import the GitHub repository of the project.
- **Add Environment Variables**: While configuring the project, add the necessary environment variables.
- **Deploy**: Click the deploy button.
- **Access Application**: Once the deployment is complete, you can access your application.
