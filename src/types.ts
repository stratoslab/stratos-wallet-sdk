/**
 * Stratos Wallet SDK Types
 *
 * Used by both iframe apps (Wallet, Swap, NFT, etc.) and the Parent Bridge
 */

// ============================================
// Chain Types
// ============================================

export type ChainType = 'evm' | 'svm' | 'btc' | 'tron' | 'ton' | 'canton' | 'base';

export interface ChainAddress {
  chain: string;        // "Ethereum", "Solana", "Bitcoin"
  chainType: ChainType;
  address: string;
  icon?: string;
}

// ============================================
// User & Auth
// ============================================

export interface AuthUser {
  id: string;
  username: string;
  displayName: string | null;
  role: 'user' | 'admin';
  partyId?: string;      // Canton party ID
}

export interface ConnectionState {
  connected: boolean;
  user: AuthUser | null;
  addresses: ChainAddress[];
}

// ============================================
// Assets
// ============================================

export interface AssetChain {
  chain: string;
  chainType: ChainType;
  contractAddress: string | null;
  decimals: number;
}

export interface Asset {
  id?: string;
  symbol: string;
  name: string;
  balance: number;
  icon: string | null;
  chain?: string;
  chainType?: ChainType;
  chains?: AssetChain[];
  chainBalances?: Record<string, number>;  // Per-chain balance breakdown (e.g., { "Ethereum": 100, "Base": 50 })
  isCustom?: boolean;
}

// ============================================
// Transactions
// ============================================

export interface Transaction {
  transactionId: string;
  type: 'send' | 'receive';
  amount: number;
  symbol: string;
  from: string;
  to: string;
  chain: string;
  timestamp: string;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface TransferParams {
  to: string;
  amount: string;
  symbol: string;
  chain: ChainType;
  memo?: string;
}

export interface TransferResult {
  txId: string;
  status: 'pending' | 'confirmed' | 'failed';
}

// ============================================
// Canton-Specific
// ============================================

export interface TransferOffer {
  contractId: string;
  sender: string;
  receiver: string;
  amount: string;
  symbol: string;
  description?: string;
  expiresAt?: string;
}

// ============================================
// Canton Generic Contract Types
// ============================================

/** Represents a Canton/Daml contract instance */
export interface CantonContract<T = Record<string, unknown>> {
  contractId: string;
  templateId: string;
  payload: T;
  createdAt?: string;
  signatories?: string[];
  observers?: string[];
}

/** Parameters for querying Canton contracts */
export interface CantonQueryParams {
  /** Full template ID (e.g., "Module:TemplateName") */
  templateId: string;
  /** Optional filter criteria for the query */
  filter?: Record<string, unknown>;
  /** Optional additional parties to read as (e.g., public party for visibility) */
  readAs?: string[];
}

/** Parameters for creating a Canton contract */
export interface CantonCreateParams {
  /** Full template ID (e.g., "Module:TemplateName") */
  templateId: string;
  /** Contract payload/arguments */
  payload: Record<string, unknown>;
}

/** Parameters for exercising a choice on a Canton contract */
export interface CantonExerciseParams {
  /** Contract ID to exercise the choice on */
  contractId: string;
  /** Template ID of the contract */
  templateId: string;
  /** Choice name to exercise */
  choice: string;
  /** Arguments for the choice */
  argument: Record<string, unknown>;
}

/** Result from creating a contract */
export interface CantonCreateResult {
  contractId: string;
}

/** Result from exercising a choice */
export interface CantonExerciseResult<T = unknown> {
  exerciseResult: T;
  events?: CantonContract[];
}

// ============================================
// Signing
// ============================================

export interface SignMessageParams {
  message: string;
  chain: ChainType;
}

// ============================================
// EVM Transaction Types
// ============================================

/** EVM transaction request */
export interface EVMTransactionRequest {
  /** Target contract or recipient address */
  to: string;
  /** Value in wei (as hex string, e.g., "0x0") */
  value?: string;
  /** Contract call data (hex encoded) */
  data?: string;
  /** Gas limit (as hex string) */
  gasLimit?: string;
  /** Gas price in wei (as hex string) - for legacy txs */
  gasPrice?: string;
  /** Max fee per gas (as hex string) - for EIP-1559 */
  maxFeePerGas?: string;
  /** Max priority fee per gas (as hex string) - for EIP-1559 */
  maxPriorityFeePerGas?: string;
  /** Nonce (as hex string or number) */
  nonce?: string | number;
  /** Chain ID (e.g., 1 for Ethereum mainnet) */
  chainId: number;
}

/** Parameters for signing an EVM transaction */
export interface SignEVMTransactionParams {
  /** The transaction to sign */
  transaction: EVMTransactionRequest;
}

/** Parameters for sending an EVM transaction (sign + broadcast) */
export interface SendEVMTransactionParams {
  /** The transaction to send */
  transaction: EVMTransactionRequest;
}

/** Result from signing a transaction */
export interface SignEVMTransactionResult {
  /** Signed transaction as hex string */
  signedTransaction: string;
  /** Transaction hash */
  transactionHash: string;
}

/** Result from sending a transaction */
export interface SendEVMTransactionResult {
  /** Transaction hash */
  transactionHash: string;
  /** Transaction status */
  status: 'pending' | 'confirmed' | 'failed';
}

/** EIP-712 Typed Data for signing */
export interface EIP712TypedData {
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType: string;
  domain: {
    name?: string;
    version?: string;
    chainId?: number;
    verifyingContract?: string;
    salt?: string;
  };
  message: Record<string, unknown>;
}

/** Parameters for signing EIP-712 typed data */
export interface SignTypedDataParams {
  /** The typed data to sign */
  typedData: EIP712TypedData;
}

// ============================================
// Bitcoin (BTC) Transaction Types
// ============================================

/** Bitcoin UTXO */
export interface BTCUTXO {
  txid: string;
  vout: number;
  value: number;
  scriptPubKey?: string;
}

/** Parameters for signing a Bitcoin transaction */
export interface SignBTCTransactionParams {
  utxos: BTCUTXO[];
  toAddress: string;
  amount: number;
  changeAddress?: string;
  fee?: number;
  network?: 'mainnet' | 'testnet';
}

/** Parameters for sending a Bitcoin transaction */
export interface SendBTCTransactionParams extends SignBTCTransactionParams {}

/** Result from signing a Bitcoin transaction */
export interface SignBTCTransactionResult {
  signedTransaction: string;
  txid: string;
}

/** Result from sending a Bitcoin transaction */
export interface SendBTCTransactionResult {
  txid: string;
  status: 'pending' | 'confirmed' | 'failed';
}

// ============================================
// Solana (SOL) Transaction Types
// ============================================

/** Parameters for signing a Solana transaction */
export interface SignSOLTransactionParams {
  toAddress: string;
  amount: number; // in lamports
  network?: 'mainnet' | 'devnet';
}

/** Parameters for sending a Solana transaction */
export interface SendSOLTransactionParams extends SignSOLTransactionParams {}

/** Result from signing a Solana transaction */
export interface SignSOLTransactionResult {
  rawTransaction: string;
  signature: string;
}

/** Result from sending a Solana transaction */
export interface SendSOLTransactionResult {
  signature: string;
  status: 'pending' | 'confirmed' | 'failed';
}

// ============================================
// TRON (TRX) Transaction Types
// ============================================

/** Parameters for signing a TRON transaction */
export interface SignTRONTransactionParams {
  toAddress: string;
  amount: number; // in SUN (1 TRX = 1e6 SUN)
  network?: 'mainnet' | 'shasta';
}

/** Parameters for sending a TRON transaction */
export interface SendTRONTransactionParams extends SignTRONTransactionParams {}

/** Result from signing a TRON transaction */
export interface SignTRONTransactionResult {
  rawTransaction: string;
  txID: string;
  signature: string;
}

/** Result from sending a TRON transaction */
export interface SendTRONTransactionResult {
  txID: string;
  status: 'pending' | 'confirmed' | 'failed';
}

// ============================================
// TON Transaction Types
// ============================================

/** Parameters for signing a TON transaction */
export interface SignTONTransactionParams {
  toAddress: string;
  amount: bigint; // in nanotons (1 TON = 1e9 nanotons)
  message?: string;
  network?: 'mainnet' | 'testnet';
}

/** Parameters for sending a TON transaction */
export interface SendTONTransactionParams extends SignTONTransactionParams {}

/** Result from signing a TON transaction */
export interface SignTONTransactionResult {
  boc: string;
  hash: string;
}

/** Result from sending a TON transaction */
export interface SendTONTransactionResult {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
}

// ============================================
// Generic/Raw Transaction Signing (for DEX swaps)
// ============================================

/** Parameters for signing a raw Solana transaction (e.g., from Jupiter) */
export interface SignRawSolanaTransactionParams {
  /** Base64 encoded serialized transaction */
  transaction: string;
  /** Network to use */
  network?: 'mainnet' | 'devnet';
}

/** Result from signing a raw Solana transaction */
export interface SignRawSolanaTransactionResult {
  /** Base64 encoded signed transaction */
  signedTransaction: string;
  /** Transaction signature */
  signature: string;
}

/** Parameters for sending a raw Solana transaction */
export interface SendRawSolanaTransactionParams {
  /** Base64 encoded signed transaction */
  signedTransaction: string;
  /** Network to use */
  network?: 'mainnet' | 'devnet';
}

/** Result from sending a raw Solana transaction */
export interface SendRawSolanaTransactionResult {
  /** Transaction signature */
  signature: string;
  /** Transaction status */
  status: 'pending' | 'confirmed' | 'failed';
}

/** Parameters for signing a raw TON message (e.g., from STON.fi) */
export interface SignRawTonMessageParams {
  /** Recipient address */
  to: string;
  /** Amount in nanotons */
  value: string;
  /** BOC encoded message body (base64) */
  payload?: string;
  /** State init for contract deployment (base64) */
  stateInit?: string;
  /** Network to use */
  network?: 'mainnet' | 'testnet';
}

/** Result from signing a raw TON message */
export interface SignRawTonMessageResult {
  /** BOC encoded signed message */
  boc: string;
  /** Message hash */
  hash: string;
}

/** Parameters for sending a raw TON message */
export interface SendRawTonMessageParams {
  /** BOC encoded signed message */
  boc: string;
  /** Network to use */
  network?: 'mainnet' | 'testnet';
}

/** Result from sending a raw TON message */
export interface SendRawTonMessageResult {
  /** Message hash */
  hash: string;
  /** Transaction status */
  status: 'pending' | 'confirmed' | 'failed';
}

/** Parameters for triggering a TRON smart contract (e.g., from SunSwap) */
export interface TriggerTronSmartContractParams {
  /** Contract address */
  contractAddress: string;
  /** Function selector (e.g., "transfer(address,uint256)") */
  functionSelector: string;
  /** ABI encoded parameters (hex string without 0x) */
  parameter: string;
  /** TRX amount to send with call (in SUN) */
  callValue?: number;
  /** Fee limit in SUN */
  feeLimit?: number;
  /** Network to use */
  network?: 'mainnet' | 'shasta';
}

/** Result from triggering a TRON smart contract */
export interface TriggerTronSmartContractResult {
  /** Transaction ID */
  txID: string;
  /** Raw transaction hex */
  rawTransaction: string;
  /** Signature */
  signature: string;
}

/** Parameters for broadcasting a signed TRON transaction */
export interface BroadcastTronTransactionParams {
  /** Signed transaction object or hex */
  signedTransaction: string;
  /** Network to use */
  network?: 'mainnet' | 'shasta';
}

/** Result from broadcasting a TRON transaction */
export interface BroadcastTronTransactionResult {
  /** Transaction ID */
  txID: string;
  /** Transaction status */
  status: 'pending' | 'confirmed' | 'failed';
}

// ============================================
// Canton User Rights
// ============================================

/** User right type for Canton ledger */
export type CantonUserRight =
  | { type: 'actAs'; party: string }
  | { type: 'readAs'; party: string }
  | { type: 'participantAdmin' };

/** Parameters for granting user rights */
export interface GrantUserRightsParams {
  /** User ID to grant rights to (typically the party ID) */
  userId: string;
  /** Rights to grant */
  rights: CantonUserRight[];
}

/** Result from granting user rights */
export interface GrantUserRightsResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** The user ID that was granted rights */
  userId: string;
  /** The rights that were granted */
  grantedRights: CantonUserRight[];
}

// ============================================
// Generic Message Signing
// ============================================

/** Parameters for signing a message on any chain */
export interface SignChainMessageParams {
  message: string;
  chain: 'evm' | 'btc' | 'sol' | 'tron' | 'ton';
}

/** Legacy sign transaction params (kept for backwards compatibility) */
export interface SignTransactionParams {
  transaction: unknown;
  chain: ChainType;
}

// ============================================
// Events
// ============================================

export type SDKEvent =
  | 'connect'
  | 'disconnect'
  | 'userChanged'
  | 'assetsChanged'
  | 'transactionsChanged'
  | 'addressesChanged';

export interface SDKEventData {
  connect: ConnectionState;
  disconnect: void;
  userChanged: AuthUser | null;
  assetsChanged: Asset[];
  transactionsChanged: Transaction[];
  addressesChanged: ChainAddress[];
}

// ============================================
// RPC Messages
// ============================================

export interface RPCRequest {
  id: string;
  method: string;
  params?: unknown;
}

export interface RPCResponse {
  id: string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
}

export interface RPCEvent {
  type: 'event';
  event: SDKEvent;
  data: unknown;
}

// ============================================
// Supported EVM Chains
// ============================================

/** Chain IDs for supported EVM networks */
export const EVM_CHAINS = {
  /** Ethereum Mainnet */
  ETHEREUM: 1,
  /** Ethereum Sepolia (testnet) */
  SEPOLIA: 11155111,
  /** Base */
  BASE: 8453,
} as const;

/** Type for supported chain IDs */
export type EVMChainId = typeof EVM_CHAINS[keyof typeof EVM_CHAINS];

// ============================================
// SDK Configuration
// ============================================

export interface SDKConfig {
  /** Parent origin URL (default: auto-detect) */
  parentOrigin?: string;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Enable debug logging */
  debug?: boolean;
}

// ============================================
// Parent Bridge Configuration
// ============================================

export interface ParentBridgeConfig {
  /** Allowed iframe origins */
  allowedOrigins: string[];
  /** Enable debug logging */
  debug?: boolean;
}

export interface ParentBridgeCallbacks {
  /** Get current authenticated user */
  getUser: () => AuthUser | null;
  /** Get user's chain addresses */
  getAddresses: () => ChainAddress[];
  /** Get user's assets with balances */
  getAssets: () => Asset[];
  /** Get user's transaction history */
  getTransactions: () => Transaction[];
  /** Get pending transfer offers (Canton) */
  getTransferOffers: () => TransferOffer[];
  /** Execute a transfer */
  transfer: (params: TransferParams) => Promise<TransferResult>;
  /** Sign a message */
  signMessage: (params: SignMessageParams) => Promise<string>;
  /** Accept a transfer offer (Canton) */
  acceptOffer: (contractId: string) => Promise<TransferResult>;
  /** Refresh data from backend */
  refresh: () => Promise<void>;
  /** Query Canton contracts by template */
  cantonQuery?: (params: CantonQueryParams) => Promise<CantonContract[]>;
  /** Create a Canton contract */
  cantonCreate?: (params: CantonCreateParams) => Promise<CantonCreateResult>;
  /** Exercise a choice on a Canton contract */
  cantonExercise?: (params: CantonExerciseParams) => Promise<CantonExerciseResult>;
  /** Sign an EVM transaction (returns signed tx, does not broadcast) */
  signEVMTransaction?: (params: SignEVMTransactionParams) => Promise<SignEVMTransactionResult>;
  /** Send an EVM transaction (sign + broadcast) */
  sendEVMTransaction?: (params: SendEVMTransactionParams) => Promise<SendEVMTransactionResult>;
  /** Sign EIP-712 typed data */
  signTypedData?: (params: SignTypedDataParams) => Promise<string>;
  /** Sign a Bitcoin transaction */
  signBTCTransaction?: (params: SignBTCTransactionParams) => Promise<SignBTCTransactionResult>;
  /** Send a Bitcoin transaction */
  sendBTCTransaction?: (params: SendBTCTransactionParams) => Promise<SendBTCTransactionResult>;
  /** Sign a Solana transaction */
  signSOLTransaction?: (params: SignSOLTransactionParams) => Promise<SignSOLTransactionResult>;
  /** Send a Solana transaction */
  sendSOLTransaction?: (params: SendSOLTransactionParams) => Promise<SendSOLTransactionResult>;
  /** Sign a TRON transaction */
  signTRONTransaction?: (params: SignTRONTransactionParams) => Promise<SignTRONTransactionResult>;
  /** Send a TRON transaction */
  sendTRONTransaction?: (params: SendTRONTransactionParams) => Promise<SendTRONTransactionResult>;
  /** Sign a TON transaction */
  signTONTransaction?: (params: SignTONTransactionParams) => Promise<SignTONTransactionResult>;
  /** Send a TON transaction */
  sendTONTransaction?: (params: SendTONTransactionParams) => Promise<SendTONTransactionResult>;
  /** Sign a message on any supported chain */
  signChainMessage?: (params: SignChainMessageParams) => Promise<string>;
  /** Sign a raw Solana transaction (e.g., from Jupiter) */
  signRawSolanaTransaction?: (params: SignRawSolanaTransactionParams) => Promise<SignRawSolanaTransactionResult>;
  /** Send a raw Solana transaction (sign + broadcast) */
  sendRawSolanaTransaction?: (params: SendRawSolanaTransactionParams) => Promise<SendRawSolanaTransactionResult>;
  /** Sign a raw TON message (e.g., from STON.fi) */
  signRawTonMessage?: (params: SignRawTonMessageParams) => Promise<SignRawTonMessageResult>;
  /** Send a raw TON message (sign + broadcast) */
  sendRawTonMessage?: (params: SendRawTonMessageParams) => Promise<SendRawTonMessageResult>;
  /** Trigger a TRON smart contract (e.g., for SunSwap) */
  triggerTronSmartContract?: (params: TriggerTronSmartContractParams) => Promise<TriggerTronSmartContractResult>;
  /** Broadcast a signed TRON transaction */
  broadcastTronTransaction?: (params: BroadcastTronTransactionParams) => Promise<BroadcastTronTransactionResult>;
  /** Grant user rights on the Canton ledger (e.g., readAs for public party) */
  grantUserRights?: (params: GrantUserRightsParams) => Promise<GrantUserRightsResult>;
}
