# ChainVault — Phase 1 MVP

> A rug-pull-proof IDO launchpad on BSC Testnet. Funds are locked in escrow and released to founders only after milestone completion.

---

## Quick Start

### Prerequisites
- Node.js 20+, Docker + Docker Compose
- MetaMask browser extension
- BSC Testnet tBNB — get from [faucet](https://testnet.bnbchain.org/faucet-smart)

---

### Step 1 — Configure Environment

```bash
cd chainvault
cp .env.example .env
# Edit .env with your DEPLOYER_PRIVATE_KEY and FOUNDER_WALLET
```

### Step 2 — Deploy Contracts to BSC Testnet

```bash
cd contracts
npm install
npx hardhat run scripts/deploy.js --network bscTestnet
```

Copy the printed addresses into `chainvault/.env`:
```
TOKEN_SALE_ADDRESS=0x...
ESCROW_ADDRESS=0x...
NEXT_PUBLIC_TOKEN_SALE_ADDRESS=0x...
NEXT_PUBLIC_ESCROW_ADDRESS=0x...
```

### Step 3 — Launch Full Stack

```bash
cd ..   # back to chainvault/
docker-compose up --build
```

**App:** http://localhost:3000  
**Backend API:** http://localhost:4000/api/project

---

### Local Development (without Docker)

**Backend:**
```bash
cd backend && npm install && npm start
```

**Frontend:**
```bash
cd frontend && npm install && npm run dev
```

**Contracts compile + test:**
```bash
cd contracts && npx hardhat compile && npx hardhat test
```

---

## Project Structure

```
chainvault/
├── contracts/
│   ├── contracts/
│   │   ├── TokenSaleContract.sol   # IDO sale with soft/hard cap + refund
│   │   └── EscrowContract.sol      # Milestone-based fund release
│   ├── scripts/deploy.js
│   ├── test/ChainVault.test.js
│   └── hardhat.config.js
├── backend/
│   └── src/index.js                # Express: serves ABIs + metadata
├── frontend/
│   └── src/
│       ├── app/                    # Next.js App Router pages
│       ├── components/             # SaleCard, InvestForm, Dashboard, Admin
│       └── lib/                    # WalletProvider, contracts, toast
├── docker-compose.yml
├── .env
└── .env.example
```

---

## Demo Script

**Successful Raise Flow:**
1. Open http://localhost:3000, click **Connect Wallet**
2. MetaMask prompts → approve → auto-switches to BSC Testnet (Chain ID 97)
3. Enter BNB amount → **Invest** → confirm MetaMask tx
4. Navigate to **/admin** → click **End Sale** (with enough raised to hit soft cap)
5. Admin: click **Release Milestone 1** → 50% BNB goes to founder
6. Admin: click **Release Milestone 2** → remaining 50% goes to founder

**Refund Flow:**
1. Invest BNB (don't hit soft cap)
2. Admin: **End Sale** → state becomes FAILED
3. **/dashboard** → click **Claim Refund** → full BNB returned

---

## Smart Contracts

| Contract | BSCScan |
|---|---|
| TokenSaleContract | `https://testnet.bscscan.com/address/<TOKEN_SALE_ADDRESS>` |
| EscrowContract | `https://testnet.bscscan.com/address/<ESCROW_ADDRESS>` |

### BSC Testnet Reference

| Property | Value |
|---|---|
| Chain ID | 97 |
| Primary RPC | `https://data-seed-prebsc-1-s1.binance.org:8545` |
| Explorer | `https://testnet.bscscan.com` |
| Faucet | `https://testnet.bnbchain.org/faucet-smart` |

---

## Security (Phase 1)

- `ReentrancyGuard` on `invest()` and `refund()`
- `Ownable` access control on admin functions
- No server-side private keys — all tx signed via MetaMask
- Input validation: zero-value invest, over hard cap, post-deadline all rejected

> **Note:** This is a hackathon MVP. Not audited. Do not use real funds.
