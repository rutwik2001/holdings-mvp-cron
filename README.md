# 🕒 Holdings MVP – Cron Jobs (Backend)

This repository contains the backend logic for the **Holdings MVP** project, responsible for fetching and updating wallet token balances across multiple EVM-compatible chains using scheduled cron jobs.

---

## 📌 Overview

The cron system periodically fetches ERC-20 and native token balances for a set of tracked wallets using a **custom Multicall smart contract**, reducing RPC overhead and ensuring data is stored in a structured MongoDB database for frontend consumption.

---

## 🧩 Tech Stack

- **Next.js (App Router)**
- **TypeScript**
- **Tailwind CSS**
- **Ethers.js**
- **MongoDB** (via API)
- **Custom Multicall Smart Contract**

---

### 🔧 Prerequisites

- Node.js v18+
- MongoDB (local or Atlas)
- RPC endpoints for Ethereum, Optimism, ZetaChain, etc.
- A deployed instance of your custom Multicall contract

---

### 📄 Environment Variables

Create a `.env` file in the root:

```env
MONGODB_URI=your_mongo_connection
ethSepoliaRPC=https://...
opSepoliaRPC=https://...
zetaChainRPC=https://...

ethSepoliaAddress=deployed_multicall_address
opSepoliaAddress=deployed_multicall_address
zetaChainAddress=deployed_multicall_address

coingeckoAPI=your_api_key
```

### ▶️ Running Locally
```
npm install
npm run build
node dist/main.js
pm2 start dist/main.js --name holdings-cron
```
