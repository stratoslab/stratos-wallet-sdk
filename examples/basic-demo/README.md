# Stratos Wallet SDK - Basic Demo

This example demonstrates how to integrate the Stratos Wallet SDK into an iframe application.

## Features Demonstrated

- **Wallet Connection**: Connect/disconnect from the parent wallet portal
- **User Information**: Display authenticated user details
- **Wallet Addresses**: Show addresses for all supported chains (EVM, Solana, Bitcoin, TRON, TON, Canton)
- **Canton Party ID**: Display the user's Canton network party identifier
- **Canton Contracts**: Query contracts by template ID
- **Message Signing**: Sign messages on different chains
- **EVM Transactions**: Send native token transfers on EVM chains

## Running the Demo

```bash
# Navigate to the example directory
cd examples/basic-demo

# Install dependencies
npm install

# Start development server
npm run dev
```

The demo will be available at `http://localhost:5173`.

**Note**: This demo is designed to run inside an iframe within a Stratos Wallet portal. Running it standalone will show the UI but SDK functions will not work without a parent portal.

## Code Overview

### Initializing the SDK

```typescript
import { getSDK } from '@stratos-wallet/sdk';

const sdk = getSDK({ debug: true });
```

### Connecting to Wallet

```typescript
const { user, addresses, connected } = await sdk.connect();
```

### Getting Wallet Addresses

```typescript
// Get all addresses
const addresses = await sdk.getAddresses();

// Get specific chain address
const evmAddress = await sdk.getAddress('evm');
const cantonAddress = await sdk.getAddress('canton');
```

### Displaying Canton Party ID

```typescript
const partyId = await sdk.getPartyId();
console.log('Canton Party ID:', partyId);
```

### Querying Canton Contracts

```typescript
const contracts = await sdk.cantonQuery({
  templateId: 'Splice.Amulet:Amulet',
});

contracts.forEach((contract) => {
  console.log('Contract ID:', contract.contractId);
  console.log('Payload:', contract.payload);
});
```

### Signing Messages

```typescript
const signature = await sdk.signMessage({
  message: 'Hello, Stratos!',
  chain: 'evm',
});
```

### Sending EVM Transactions

```typescript
// Send native token (ETH/BASE)
const result = await sdk.sendNative(
  '0x1234...', // recipient
  '1000000000000000000', // 1 ETH in wei
  1 // Ethereum mainnet chain ID
);

console.log('TX Hash:', result.transactionHash);
console.log('Status:', result.status);
```

## Listening to Events

```typescript
sdk.on('userChanged', (user) => {
  console.log('User changed:', user);
});

sdk.on('addressesChanged', (addresses) => {
  console.log('Addresses updated:', addresses);
});

sdk.on('disconnect', () => {
  console.log('Disconnected from wallet');
});
```
