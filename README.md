# Stratos Wallet SDK

SDK for integrating with Stratos Wallet - a multi-chain wallet supporting EVM, Solana, Bitcoin, Tron, TON, and Canton networks.

## Installation

```bash
npm install @stratos-wallet/sdk
```

## Usage

### For iframe apps (Wallet, Swap, NFT, etc.)

```typescript
import { StratosSDK, getSDK } from '@stratos-wallet/sdk';

const sdk = getSDK();
const { user, addresses } = await sdk.connect();
const assets = await sdk.getAssets();
```

### For parent portals

```typescript
import { ParentBridge } from '@stratos-wallet/sdk';

const bridge = new ParentBridge({
  getUser: () => currentUser,
  getAssets: () => assets,
  transfer: async (params) => { ... },
  // ...
}, {
  allowedOrigins: ['https://wallet.example.com', 'https://swap.example.com'],
});
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Type check
npm run lint
```

## License

MIT
