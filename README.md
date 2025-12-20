# Stratos Wallet SDK

Universal SDK for integrating with Stratos Wallet - a multi-chain wallet supporting EVM, Solana, Bitcoin, Tron, TON, and Canton networks.

## Installation

```bash
npm install @stratos-wallet/sdk
```

## Quick Start

### For iframe apps (Wallet, Swap, NFT, DeFi, etc.)

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
  getAddresses: () => addresses,
  getAssets: () => assets,
  getTransactions: () => transactions,
  getTransferOffers: () => transferOffers,
  transfer: async (params) => { /* ... */ },
  signMessage: async (params) => { /* ... */ },
  acceptOffer: async (contractId) => { /* ... */ },
  refresh: async () => { /* ... */ },
}, {
  allowedOrigins: ['https://wallet.example.com', 'https://swap.example.com'],
});
```

---

## SDK API Reference (for iframe apps)

### Connection

#### `connect(): Promise<ConnectionState>`
Establish connection with the parent portal.

```typescript
const { connected, user, addresses } = await sdk.connect();
```

#### `disconnect(): Promise<void>`
Disconnect from the parent portal.

```typescript
await sdk.disconnect();
```

#### `isConnected(): boolean`
Check if SDK is connected.

```typescript
if (sdk.isConnected()) {
  // Connected
}
```

---

### User & Addresses

#### `getUser(): Promise<AuthUser | null>`
Get the current authenticated user.

```typescript
const user = await sdk.getUser();
// { id, username, displayName, role, partyId }
```

#### `getAddresses(): Promise<ChainAddress[]>`
Get all chain addresses for the user.

```typescript
const addresses = await sdk.getAddresses();
// [{ chain: "Ethereum", chainType: "evm", address: "0x..." }, ...]
```

#### `getAddress(chainType: ChainType): Promise<string | null>`
Get address for a specific chain type.

```typescript
const evmAddress = await sdk.getAddress('evm');
const solAddress = await sdk.getAddress('svm');
const btcAddress = await sdk.getAddress('btc');
```

**Supported ChainTypes:** `'evm' | 'svm' | 'btc' | 'tron' | 'ton' | 'canton' | 'base'`

---

### Assets & Balances

#### `getAssets(): Promise<Asset[]>`
Get all assets with balances.

```typescript
const assets = await sdk.getAssets();
// [{ symbol: "ETH", name: "Ethereum", balance: 1.5, chainType: "evm", ... }, ...]
```

#### `getBalance(symbol: string, chainType?: ChainType): Promise<number>`
Get balance for a specific asset.

```typescript
const ethBalance = await sdk.getBalance('ETH');
const usdcOnBase = await sdk.getBalance('USDC', 'base');
```

---

### Transactions

#### `getTransactions(): Promise<Transaction[]>`
Get transaction history.

```typescript
const transactions = await sdk.getTransactions();
// [{ transactionId, type, amount, symbol, from, to, chain, timestamp, status }, ...]
```

#### `transfer(params: TransferParams): Promise<TransferResult>`
Transfer assets to another address.

```typescript
const result = await sdk.transfer({
  to: '0x1234...',
  amount: '1.0',
  symbol: 'ETH',
  chain: 'evm',
  memo: 'Payment for services', // optional
});
// { txId: "0x...", status: "pending" | "confirmed" | "failed" }
```

---

### Message Signing

#### `signMessage(params: SignMessageParams): Promise<string>`
Sign a message on any supported chain.

```typescript
const signature = await sdk.signMessage({
  message: 'Hello, World!',
  chain: 'evm',
});
```

---

### EVM Transactions

#### `signEVMTransaction(params): Promise<SignEVMTransactionResult>`
Sign an EVM transaction without broadcasting.

```typescript
const result = await sdk.signEVMTransaction({
  transaction: {
    to: '0x1234...',
    value: '0x0',
    data: '0x...',
    chainId: 1, // Ethereum mainnet
  }
});
// { signedTransaction: "0x...", transactionHash: "0x..." }
```

#### `sendEVMTransaction(params): Promise<SendEVMTransactionResult>`
Sign and broadcast an EVM transaction.

```typescript
const result = await sdk.sendEVMTransaction({
  transaction: {
    to: '0x1234...',
    value: '0xde0b6b3a7640000', // 1 ETH in wei
    chainId: 1,
  }
});
// { transactionHash: "0x...", status: "pending" }
```

#### `signTypedData(params): Promise<string>`
Sign EIP-712 typed data.

```typescript
const signature = await sdk.signTypedData({
  typedData: {
    types: { ... },
    primaryType: 'Order',
    domain: { name: 'MyDApp', version: '1', chainId: 1 },
    message: { ... },
  }
});
```

#### `sendNative(to, value, chainId): Promise<SendEVMTransactionResult>`
Convenience method to send ETH/native token.

```typescript
const result = await sdk.sendNative(
  '0x1234...',
  '1000000000000000000', // 1 ETH in wei
  1 // Ethereum mainnet
);
```

#### `sendContractCall(to, data, chainId, value?): Promise<SendEVMTransactionResult>`
Convenience method to call a contract function.

```typescript
const result = await sdk.sendContractCall(
  '0xContractAddress',
  '0xa9059cbb...', // encoded function call
  1,
  '0x0' // optional value
);
```

---

### Solana Transactions

#### `signRawSolanaTransaction(params): Promise<SignRawSolanaTransactionResult>`
Sign a raw Solana transaction (e.g., from Jupiter aggregator).

```typescript
const result = await sdk.signRawSolanaTransaction({
  transaction: 'base64EncodedTransaction',
  network: 'mainnet',
});
// { signedTransaction: "base64...", signature: "..." }
```

#### `sendRawSolanaTransaction(params): Promise<SendRawSolanaTransactionResult>`
Send a signed Solana transaction.

```typescript
const result = await sdk.sendRawSolanaTransaction({
  signedTransaction: 'base64SignedTransaction',
  network: 'mainnet',
});
// { signature: "...", status: "pending" | "confirmed" | "failed" }
```

---

### TON Transactions

#### `signRawTonMessage(params): Promise<SignRawTonMessageResult>`
Sign a raw TON message (e.g., for STON.fi swap).

```typescript
const result = await sdk.signRawTonMessage({
  to: 'EQAddress...',
  value: '1000000000', // in nanotons
  payload: 'base64Payload', // optional
  stateInit: 'base64StateInit', // optional
  network: 'mainnet',
});
// { boc: "base64...", hash: "..." }
```

#### `sendRawTonMessage(params): Promise<SendRawTonMessageResult>`
Broadcast a signed TON message.

```typescript
const result = await sdk.sendRawTonMessage({
  boc: 'base64SignedMessage',
  network: 'mainnet',
});
// { hash: "...", status: "pending" | "confirmed" | "failed" }
```

---

### TRON Transactions

#### `triggerTronSmartContract(params): Promise<TriggerTronSmartContractResult>`
Trigger a TRON smart contract (e.g., for SunSwap).

```typescript
const result = await sdk.triggerTronSmartContract({
  contractAddress: 'TContractAddress',
  functionSelector: 'transfer(address,uint256)',
  parameter: 'abiEncodedParams',
  callValue: 0, // TRX in SUN
  feeLimit: 100000000,
  network: 'mainnet',
});
// { txID: "...", rawTransaction: "...", signature: "..." }
```

#### `broadcastTronTransaction(params): Promise<BroadcastTronTransactionResult>`
Broadcast a signed TRON transaction.

```typescript
const result = await sdk.broadcastTronTransaction({
  signedTransaction: 'signedTxHex',
  network: 'mainnet',
});
// { txID: "...", status: "pending" | "confirmed" | "failed" }
```

---

### Canton (Daml) Operations

#### `getPartyId(): Promise<string | null>`
Get the Canton party ID for the current user.

```typescript
const partyId = await sdk.getPartyId();
```

#### `getTransferOffers(): Promise<TransferOffer[]>`
Get pending Canton transfer offers.

```typescript
const offers = await sdk.getTransferOffers();
// [{ contractId, sender, receiver, amount, symbol, description, expiresAt }, ...]
```

#### `acceptTransferOffer(contractId): Promise<TransferResult>`
Accept a Canton transfer offer.

```typescript
const result = await sdk.acceptTransferOffer('contractId123');
```

#### `cantonQuery<T>(params): Promise<CantonContract<T>[]>`
Query Canton contracts by template ID.

```typescript
const contracts = await sdk.cantonQuery({
  templateId: 'Module:TemplateName',
  filter: { owner: 'party::123' }, // optional
  readAs: ['party::public'], // optional
});
// [{ contractId, templateId, payload, createdAt, signatories, observers }, ...]
```

#### `cantonCreate(params): Promise<CantonCreateResult>`
Create a new Canton contract.

```typescript
const result = await sdk.cantonCreate({
  templateId: 'Module:TemplateName',
  payload: {
    owner: 'party::123',
    amount: '100.0',
  },
});
// { contractId: "..." }
```

#### `cantonExercise<T>(params): Promise<CantonExerciseResult<T>>`
Exercise a choice on a Canton contract.

```typescript
const result = await sdk.cantonExercise({
  contractId: 'contract123',
  templateId: 'Module:TemplateName',
  choice: 'Transfer',
  argument: {
    newOwner: 'party::456',
  },
});
// { exerciseResult: ..., events: [...] }
```

#### `grantUserRights(params): Promise<GrantUserRightsResult>`
Grant user rights on the Canton ledger.

```typescript
const result = await sdk.grantUserRights({
  userId: 'party::123',
  rights: [
    { type: 'readAs', party: 'party::public' },
    { type: 'actAs', party: 'party::123' },
  ],
});
// { success: true, userId: "...", grantedRights: [...] }
```

---

### Data Refresh

#### `refresh(): Promise<void>`
Trigger a data refresh from the backend.

```typescript
await sdk.refresh();
```

---

### Events

#### `on(event, callback): void`
Subscribe to SDK events.

```typescript
sdk.on('connect', (state) => console.log('Connected:', state));
sdk.on('disconnect', () => console.log('Disconnected'));
sdk.on('userChanged', (user) => console.log('User changed:', user));
sdk.on('assetsChanged', (assets) => console.log('Assets updated:', assets));
sdk.on('transactionsChanged', (txs) => console.log('Transactions updated:', txs));
sdk.on('addressesChanged', (addrs) => console.log('Addresses updated:', addrs));
```

**Available Events:**
- `connect` - Connection established
- `disconnect` - Connection lost
- `userChanged` - User data changed
- `assetsChanged` - Asset balances updated
- `transactionsChanged` - Transaction history updated
- `addressesChanged` - Chain addresses updated

#### `off(event, callback): void`
Unsubscribe from SDK events.

```typescript
sdk.off('assetsChanged', myCallback);
```

#### `removeAllListeners(): void`
Remove all event listeners.

```typescript
sdk.removeAllListeners();
```

---

### Cleanup

#### `destroy(): void`
Clean up SDK resources.

```typescript
sdk.destroy();
```

---

## ParentBridge API Reference (for parent portals)

### Constructor

```typescript
const bridge = new ParentBridge(callbacks, config);
```

**Config:**
- `allowedOrigins: string[]` - Allowed iframe origins
- `debug?: boolean` - Enable debug logging

**Required Callbacks:**
- `getUser()` - Get current user
- `getAddresses()` - Get chain addresses
- `getAssets()` - Get assets with balances
- `getTransactions()` - Get transaction history
- `getTransferOffers()` - Get Canton transfer offers
- `transfer(params)` - Execute transfer
- `signMessage(params)` - Sign message
- `acceptOffer(contractId)` - Accept Canton offer
- `refresh()` - Refresh data

**Optional Callbacks:**
- `cantonQuery(params)` - Query Canton contracts
- `cantonCreate(params)` - Create Canton contract
- `cantonExercise(params)` - Exercise Canton choice
- `signEVMTransaction(params)` - Sign EVM transaction
- `sendEVMTransaction(params)` - Send EVM transaction
- `signTypedData(params)` - Sign EIP-712 data
- `signRawSolanaTransaction(params)` - Sign Solana transaction
- `sendRawSolanaTransaction(params)` - Send Solana transaction
- `signRawTonMessage(params)` - Sign TON message
- `sendRawTonMessage(params)` - Send TON message
- `triggerTronSmartContract(params)` - Trigger TRON contract
- `broadcastTronTransaction(params)` - Broadcast TRON transaction
- `grantUserRights(params)` - Grant Canton rights

### Methods

#### `broadcastEvent(event, data): void`
Broadcast an event to all connected iframes.

```typescript
bridge.broadcastEvent('assetsChanged', newAssets);
```

#### `notifyAssetsChanged(): void`
Notify iframes that assets have changed.

```typescript
bridge.notifyAssetsChanged();
```

#### `notifyTransactionsChanged(): void`
Notify iframes that transactions have changed.

```typescript
bridge.notifyTransactionsChanged();
```

#### `notifyUserChanged(): void`
Notify iframes that user has changed.

```typescript
bridge.notifyUserChanged();
```

#### `notifyAddressesChanged(): void`
Notify iframes that addresses have changed.

```typescript
bridge.notifyAddressesChanged();
```

#### `addAllowedOrigin(origin): void`
Add an allowed origin dynamically.

```typescript
bridge.addAllowedOrigin('https://newapp.example.com');
```

#### `removeAllowedOrigin(origin): void`
Remove an allowed origin.

```typescript
bridge.removeAllowedOrigin('https://oldapp.example.com');
```

#### `destroy(): void`
Clean up bridge resources.

```typescript
bridge.destroy();
```

---

## Supported Chains

| Chain | ChainType | Networks |
|-------|-----------|----------|
| Ethereum | `evm` | mainnet (1), sepolia (11155111) |
| Base | `base` / `evm` | mainnet (8453) |
| Solana | `svm` | mainnet, devnet |
| Bitcoin | `btc` | mainnet, testnet |
| TRON | `tron` | mainnet, shasta |
| TON | `ton` | mainnet, testnet |
| Canton | `canton` | - |

---

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
