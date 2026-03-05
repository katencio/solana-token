# Solana Token Manager

A Next.js web app to create, manage, and sell SPL tokens on Solana. Connect your wallet (e.g. Phantom), create tokens, set a price in SOL, and let others buy; you see pending payments and deliver tokens in one place.

## What it does

- **Wallet connection**: Connect with any Wallet Standard–compatible wallet (e.g. Phantom). You can switch accounts; the UI always reflects the connected account for balances, token list, and actions.
- **Token creation**: Create SPL tokens with name, symbol, decimals, and optional initial supply. The app creates the mint, optional ATA, and optional mint-to; then saves metadata in the database.
- **Token list**: View tokens filtered by the connected account (yours) or all tokens. Each row shows name, symbol, mint address, owner, and price (if set).
- **Owner actions** (for tokens you own):
  - **Set / change price**: Set a price in SOL (stored in lamports) per token unit. You can change or clear it anytime. When set, others see a Buy button.
  - **Mint**: Mint more units to any address (default: your wallet).
  - **Transfer**: Send tokens to any address (ATA created if needed).
- **Buy**: If a token has a price, non-owners see a **Buy** button. They enter quantity; the app shows total SOL and sends a transfer from buyer to owner. A **pending purchase** is recorded so the owner can deliver the tokens.
- **Pending deliveries**: As an owner, you see a "Pending deliveries" section listing buyers who have paid. For each, you can open a pre-filled **Send tokens** dialog (destination and amount set) to complete the delivery; the purchase is then marked completed.
- **Balances**: A "Balances" card shows SOL and all SPL token balances for the connected wallet. Token names/symbols are filled from the app's database when available.
- **Hydration-safe**: Wallet-dependent UI is deferred until after client mount (and providers are loaded with `ssr: false`) so server and client HTML match and there are no hydration mismatches.

## Tech stack

- **Next.js 16** (App Router), **React 19**, **TypeScript**
- **Solana**: `@solana/web3.js`, `@solana/spl-token`, `@solana/wallet-adapter-react` + `@solana/wallet-adapter-react-ui` (Wallet Standard)
- **Database**: **MongoDB** via Mongoose (tokens and pending purchases)
- **UI**: Tailwind CSS, Radix UI (Dialog, Dropdown), shadcn-style components

## Getting started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- A Solana wallet (e.g. Phantom) and some SOL on devnet (or mainnet if you point the app there)

### Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Create `.env.local` in the project root:

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string (e.g. `mongodb://localhost:27017/solana-token` or MongoDB Atlas URI). |
| `NEXT_PUBLIC_SOLANA_RPC` | No | Solana RPC endpoint. Default: `https://api.devnet.solana.com`. Use mainnet RPC for production if needed. |

### Solana CLI (optional)

To use devnet from the CLI:

```bash
solana config set --url devnet
solana airdrop 2
```

## Deployment

### Build

```bash
npm run build
npm start
```

### Deploy (e.g. Vercel)

1. Push the repo to GitHub and import the project in [Vercel](https://vercel.com).
2. Set environment variables in the Vercel project:
   - `MONGODB_URI`: your production MongoDB URI.
   - `NEXT_PUBLIC_SOLANA_RPC`: (optional) your RPC URL; omit to keep devnet default.
3. Deploy. The app uses serverless API routes for tokens and purchases; ensure MongoDB is reachable from Vercel's runtime.

For other platforms (e.g. Docker, Node server), run `npm run build` and `npm start` and expose the app; set the same env vars.

## Project structure (main parts)

- `app/` – Next.js App Router: `layout.tsx`, `page.tsx`, `api/tokens/` and `api/purchases/` routes.
- `components/` – UI: `ConnectWallet`, `CreateTokenForm`, `TokenList`, `WalletTokenBalances`, `SetPriceDialog`, `BuyTokenDialog`, `PendingDeliveries`, `TokenTransferDialog`, `TokenMintDialog`, providers.
- `contexts/` – `GlobalContext` (legacy; wallet state is primarily from wallet adapter).
- `models/` – Mongoose: `Token` (with optional `priceLamports`), `PendingPurchase`.
- `lib/` – `mongodb.ts` (connection helper).

## API (overview)

- `GET /api/tokens?owner=<address>` – List tokens (optional filter by owner).
- `POST /api/tokens` – Create token metadata (mintAddress, ownerAddress, name, symbol, decimals).
- `PATCH /api/tokens/[mint]` – Update token price (`priceLamports`, optional `ownerAddress` for auth).
- `GET /api/purchases?owner=<address>` – List pending purchases for that owner.
- `POST /api/purchases` – Record a purchase (mintAddress, buyerAddress, quantity, amountLamports, signature).
- `PATCH /api/purchases/[id]` – Mark a purchase as completed (e.g. after sending tokens).

## License

Private / as per your project.
