/**
 * Stratos Wallet SDK
 *
 * Universal SDK for Stratos Wallet ecosystem.
 *
 * For iframe apps (Wallet, Swap, NFT, etc.):
 * @example
 * ```typescript
 * import { StratosSDK, getSDK } from '@stratos-wallet/sdk';
 *
 * const sdk = getSDK();
 * const { user, addresses } = await sdk.connect();
 * const assets = await sdk.getAssets();
 * ```
 *
 * For parent portals:
 * @example
 * ```typescript
 * import { ParentBridge } from '@stratos-wallet/sdk';
 *
 * const bridge = new ParentBridge({
 *   getUser: () => currentUser,
 *   getAssets: () => assets,
 *   transfer: async (params) => { ... },
 *   // ...
 * }, {
 *   allowedOrigins: ['https://wallet.example.com', 'https://swap.example.com'],
 * });
 * ```
 *
 * @packageDocumentation
 */

// SDK for iframe apps
export { StratosSDK, getSDK } from './sdk';

// Bridge for parent portals
export { ParentBridge } from './parentBridge';

// All types
export * from './types';
