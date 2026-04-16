/**
 * Stratos Wallet SDK
 *
 * Universal SDK for iframe applications to communicate with the parent portal.
 * Used by Wallet, Swap, NFT, DeFi, and any other iframe app.
 */

import type {
  AuthUser,
  ChainAddress,
  Asset,
  Transaction,
  TransferOffer,
  TransferParams,
  TransferResult,
  SignMessageParams,
  ConnectionState,
  SDKEvent,
  SDKEventData,
  RPCRequest,
  RPCResponse,
  RPCEvent,
  SDKConfig,
  ChainType,
  CantonContract,
  CantonQueryParams,
  CantonCreateParams,
  CantonCreateResult,
  CantonExerciseParams,
  CantonExerciseResult,
  SignEVMTransactionParams,
  SignEVMTransactionResult,
  SendEVMTransactionParams,
  SendEVMTransactionResult,
  SignTypedDataParams,
  EVMTransactionRequest,
  // Generic/Raw Transaction Types
  SignRawSolanaTransactionParams,
  SignRawSolanaTransactionResult,
  SendRawSolanaTransactionParams,
  SendRawSolanaTransactionResult,
  SignRawTonMessageParams,
  SignRawTonMessageResult,
  SendRawTonMessageParams,
  SendRawTonMessageResult,
  TriggerTronSmartContractParams,
  TriggerTronSmartContractResult,
  BroadcastTronTransactionParams,
  BroadcastTronTransactionResult,
  // Canton User Rights
  GrantUserRightsParams,
  GrantUserRightsResult,
  // EVM Read-Only Call
  EVMCallParams,
  EVMCallResult,
} from './types';

export class StratosSDK {
  private mode: 'iframe' | 'api';
  private parentOrigin: string;
  private baseUrl: string;
  private apiKey: string;
  private apiSecret: string;
  private timeout: number;
  private debug: boolean;
  private connected: boolean = false;
  private user: AuthUser | null = null;
  private addresses: ChainAddress[] = [];
  private eventListeners: Map<SDKEvent, Set<Function>> = new Map();
  private pendingRequests: Map<string, {
    resolve: Function;
    reject: Function;
    timeout: ReturnType<typeof setTimeout>;
  }> = new Map();

  constructor(config: SDKConfig = {}) {
    this.mode = config.mode || 'iframe';
    this.parentOrigin = config.parentOrigin || (this.mode === 'iframe' ? this.detectParentOrigin() : '');
    this.baseUrl = (config.baseUrl || '').replace(/\/$/, '');
    this.apiKey = config.apiKey || '';
    this.apiSecret = config.apiSecret || '';
    this.timeout = config.timeout || 30000;
    this.debug = config.debug || false;

    if (this.mode === 'api') {
      if (!this.baseUrl || !this.apiKey || !this.apiSecret) {
        throw new Error('API mode requires baseUrl, apiKey, and apiSecret');
      }
      this.log('StratosSDK initialized in API mode', { baseUrl: this.baseUrl });
    } else {
      // Only setup if we're in an iframe
      if (typeof window !== 'undefined' && window.parent !== window) {
        window.addEventListener('message', this.handleMessage.bind(this));
        this.log('StratosSDK initialized', { parentOrigin: this.parentOrigin });
      } else {
        this.log('Not in iframe, StratosSDK iframe mode will not function');
      }
    }
  }

  private detectParentOrigin(): string {
    try {
      // Try to get from referrer
      if (document.referrer) {
        return new URL(document.referrer).origin;
      }
    } catch {
      // Ignore
    }
    // Fallback - will need to be configured
    return '*';
  }

  private log(message: string, data?: unknown): void {
    if (this.debug) {
      console.log(`[StratosSDK] ${message}`, data || '');
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private request<T>(method: string, params?: unknown): Promise<T> {
    if (this.mode === 'api') {
      return this.apiRequest<T>(method, params);
    }
    return this.iframeRequest<T>(method, params);
  }

  /** HTTP API transport — maps SDK methods to /api/sdk/* endpoints */
  private async apiRequest<T>(method: string, params?: unknown): Promise<T> {
    const methodMap: Record<string, { path: string; httpMethod: string }> = {
      getUser: { path: '/api/sdk/addresses', httpMethod: 'GET' },
      getAddresses: { path: '/api/sdk/addresses', httpMethod: 'GET' },
      getAssets: { path: '/api/sdk/balance', httpMethod: 'GET' },
      getTransactions: { path: '/api/sdk/transactions', httpMethod: 'GET' },
      transfer: { path: '/api/sdk/transfer', httpMethod: 'POST' },
      signMessage: { path: '/api/sdk/sign', httpMethod: 'POST' },
      signEVMTransaction: { path: '/api/sdk/sign', httpMethod: 'POST' },
      sendEVMTransaction: { path: '/api/sdk/sign', httpMethod: 'POST' },
      cantonQuery: { path: '/api/sdk/canton/query', httpMethod: 'POST' },
      cantonCreate: { path: '/api/sdk/canton/create', httpMethod: 'POST' },
      cantonExercise: { path: '/api/sdk/canton/exercise', httpMethod: 'POST' },
    };

    const endpoint = methodMap[method];
    if (!endpoint) {
      throw new Error(`Method '${method}' not supported in API mode`);
    }

    const headers: Record<string, string> = {
      'X-API-Key': this.apiKey,
      'X-API-Secret': this.apiSecret,
      'Content-Type': 'application/json'
    };

    let url = `${this.baseUrl}${endpoint.path}`;

    const fetchOpts: RequestInit = { method: endpoint.httpMethod, headers };

    if (endpoint.httpMethod === 'GET' && params && typeof params === 'object') {
      const qp = new URLSearchParams();
      for (const [k, v] of Object.entries(params as Record<string, unknown>)) {
        if (v !== undefined) qp.set(k, String(v));
      }
      const qs = qp.toString();
      if (qs) url += `?${qs}`;
    } else if (endpoint.httpMethod === 'POST' && params) {
      fetchOpts.body = JSON.stringify(params);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    fetchOpts.signal = controller.signal;

    try {
      this.log('API request', { method, url });
      const res = await fetch(url, fetchOpts);
      const data = await res.json() as { success: boolean; data?: T; error?: string };
      if (!data.success) {
        throw new Error(data.error || `API error: ${res.status}`);
      }
      return data.data as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /** iframe postMessage transport (original) */
  private iframeRequest<T>(method: string, params?: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || window.parent === window) {
        reject(new Error('Not in iframe'));
        return;
      }

      const id = this.generateId();

      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, this.timeout);

      this.pendingRequests.set(id, { resolve, reject, timeout: timeoutId });

      const message: RPCRequest = { id, method, params };
      this.log('Sending request', message);
      window.parent.postMessage(message, this.parentOrigin);
    });
  }

  private handleMessage(event: MessageEvent): void {
    // Verify origin if we have a specific one
    if (this.parentOrigin !== '*' && event.origin !== this.parentOrigin) {
      return;
    }

    const data = event.data;

    // Handle RPC response
    if (data && typeof data.id === 'string') {
      const response = data as RPCResponse;
      const pending = this.pendingRequests.get(response.id);

      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(response.id);
        this.log('Received response', response);

        if (response.error) {
          pending.reject(new Error(response.error.message));
        } else {
          pending.resolve(response.result);
        }
      }
      return;
    }

    // Handle events from parent
    if (data && data.type === 'event') {
      const eventMsg = data as RPCEvent;
      this.log('Received event', eventMsg);
      this.handleEvent(eventMsg.event, eventMsg.data);
    }
  }

  private handleEvent(event: SDKEvent, data: unknown): void {
    // Update internal state
    switch (event) {
      case 'connect':
        const connState = data as ConnectionState;
        this.connected = connState.connected;
        this.user = connState.user;
        this.addresses = connState.addresses;
        break;
      case 'disconnect':
        this.connected = false;
        this.user = null;
        this.addresses = [];
        break;
      case 'userChanged':
        this.user = data as AuthUser | null;
        break;
      case 'addressesChanged':
        this.addresses = data as ChainAddress[];
        break;
    }

    // Notify listeners
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (err) {
          console.error(`Error in ${event} listener:`, err);
        }
      });
    }
  }

  // ============================================
  // Connection
  // ============================================

  async connect(): Promise<ConnectionState> {
    const result = await this.request<ConnectionState>('connect');
    this.connected = result.connected;
    this.user = result.user;
    this.addresses = result.addresses;
    return result;
  }

  async disconnect(): Promise<void> {
    await this.request<void>('disconnect');
    this.connected = false;
    this.user = null;
    this.addresses = [];
  }

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get the current network mode from the wallet
   * @returns 'mainnet' or 'testnet'
   */
  async getNetwork(): Promise<'mainnet' | 'testnet'> {
    return this.request<'mainnet' | 'testnet'>('getNetwork');
  }

  // ============================================
  // User & Addresses
  // ============================================

  async getUser(): Promise<AuthUser | null> {
    if (this.user) return this.user;
    this.user = await this.request<AuthUser | null>('getUser');
    return this.user;
  }

  async getAddresses(): Promise<ChainAddress[]> {
    if (this.addresses.length > 0) return this.addresses;
    this.addresses = await this.request<ChainAddress[]>('getAddresses');
    return this.addresses;
  }

  async getAddress(chainType: ChainType): Promise<string | null> {
    const addresses = await this.getAddresses();
    const addr = addresses.find(a => a.chainType === chainType);
    return addr?.address || null;
  }

  // ============================================
  // Assets & Balances
  // ============================================

  async getAssets(): Promise<Asset[]> {
    return this.request<Asset[]>('getAssets');
  }

  async getBalance(symbol: string, chainType?: ChainType): Promise<number> {
    const assets = await this.getAssets();
    const asset = assets.find(a => {
      if (chainType) {
        return a.symbol === symbol && a.chainType === chainType;
      }
      return a.symbol === symbol;
    });
    return asset?.balance || 0;
  }

  // ============================================
  // Transactions
  // ============================================

  async getTransactions(): Promise<Transaction[]> {
    return this.request<Transaction[]>('getTransactions');
  }

  async transfer(params: TransferParams): Promise<TransferResult> {
    return this.request<TransferResult>('transfer', params);
  }

  // ============================================
  // Signing
  // ============================================

  async signMessage(params: SignMessageParams): Promise<string> {
    return this.request<string>('signMessage', params);
  }

  // ============================================
  // EVM Transactions
  // ============================================

  /**
   * Sign an EVM transaction without broadcasting
   * @param params Transaction parameters
   * @returns Signed transaction and hash
   */
  async signEVMTransaction(params: SignEVMTransactionParams): Promise<SignEVMTransactionResult> {
    return this.request<SignEVMTransactionResult>('signEVMTransaction', params);
  }

  /**
   * Send an EVM transaction (sign and broadcast)
   * @param params Transaction parameters
   * @returns Transaction hash and status
   */
  async sendEVMTransaction(params: SendEVMTransactionParams): Promise<SendEVMTransactionResult> {
    return this.request<SendEVMTransactionResult>('sendEVMTransaction', params);
  }

  /**
   * Sign EIP-712 typed data
   * @param params Typed data parameters
   * @returns Signature
   */
  async signTypedData(params: SignTypedDataParams): Promise<string> {
    return this.request<string>('signTypedData', params);
  }

  /**
   * Convenience method to send ETH/native token
   * @param to Recipient address
   * @param value Amount in wei (as hex or decimal string)
   * @param chainId Chain ID
   * @returns Transaction result
   */
  async sendNative(to: string, value: string, chainId: number): Promise<SendEVMTransactionResult> {
    const tx: EVMTransactionRequest = {
      to,
      value: value.startsWith('0x') ? value : '0x' + BigInt(value).toString(16),
      chainId,
    };
    return this.sendEVMTransaction({ transaction: tx });
  }

  /**
   * Convenience method to call a contract function
   * @param to Contract address
   * @param data Encoded function call data
   * @param chainId Chain ID
   * @param value Optional value to send
   * @returns Transaction result
   */
  async sendContractCall(
    to: string,
    data: string,
    chainId: number,
    value?: string
  ): Promise<SendEVMTransactionResult> {
    const tx: EVMTransactionRequest = {
      to,
      data,
      chainId,
      value: value ? (value.startsWith('0x') ? value : '0x' + BigInt(value).toString(16)) : '0x0',
    };
    return this.sendEVMTransaction({ transaction: tx });
  }

  // ============================================
  // Raw Solana Transactions (for DEX swaps like Jupiter)
  // ============================================

  /**
   * Sign a raw Solana transaction (e.g., from Jupiter aggregator)
   * @param params Transaction parameters including base64 encoded transaction
   * @returns Signed transaction and signature
   */
  async signRawSolanaTransaction(params: SignRawSolanaTransactionParams): Promise<SignRawSolanaTransactionResult> {
    return this.request<SignRawSolanaTransactionResult>('signRawSolanaTransaction', params);
  }

  /**
   * Send a raw Solana transaction (sign + broadcast)
   * @param params Signed transaction to broadcast
   * @returns Transaction signature and status
   */
  async sendRawSolanaTransaction(params: SendRawSolanaTransactionParams): Promise<SendRawSolanaTransactionResult> {
    return this.request<SendRawSolanaTransactionResult>('sendRawSolanaTransaction', params);
  }

  // ============================================
  // Raw TON Messages (for DEX swaps like STON.fi)
  // ============================================

  /**
   * Sign a raw TON message (e.g., for STON.fi swap)
   * @param params Message parameters including payload
   * @returns BOC encoded signed message and hash
   */
  async signRawTonMessage(params: SignRawTonMessageParams): Promise<SignRawTonMessageResult> {
    return this.request<SignRawTonMessageResult>('signRawTonMessage', params);
  }

  /**
   * Send a raw TON message (broadcast signed message)
   * @param params BOC encoded signed message
   * @returns Message hash and status
   */
  async sendRawTonMessage(params: SendRawTonMessageParams): Promise<SendRawTonMessageResult> {
    return this.request<SendRawTonMessageResult>('sendRawTonMessage', params);
  }

  // ============================================
  // TRON Smart Contract (for DEX swaps like SunSwap)
  // ============================================

  /**
   * Trigger a TRON smart contract (e.g., for SunSwap)
   * @param params Contract call parameters
   * @returns Signed transaction result
   */
  async triggerTronSmartContract(params: TriggerTronSmartContractParams): Promise<TriggerTronSmartContractResult> {
    return this.request<TriggerTronSmartContractResult>('triggerTronSmartContract', params);
  }

  /**
   * Broadcast a signed TRON transaction
   * @param params Signed transaction to broadcast
   * @returns Transaction ID and status
   */
  async broadcastTronTransaction(params: BroadcastTronTransactionParams): Promise<BroadcastTronTransactionResult> {
    return this.request<BroadcastTronTransactionResult>('broadcastTronTransaction', params);
  }

  /**
   * Get an EVM transaction receipt (used to poll for contract deployment address)
   * @param txHash Transaction hash
   * @param chainId Chain ID
   * @returns Transaction receipt
   */
  async getTransactionReceipt(txHash: string, chainId: number): Promise<any> {
    return this.request<any>('getTransactionReceipt', { txHash, chainId });
  }

  /**
   * Read-only EVM RPC call (eth_call, eth_getBalance, etc.)
   * Routed through the portal to the appropriate RPC endpoint.
   * @param params RPC method, params, and chainId
   * @returns Raw RPC result string
   */
  async evmCall(params: EVMCallParams): Promise<EVMCallResult> {
    return this.request<EVMCallResult>('evmCall', params);
  }

  /**
   * Get portal configuration values relevant to mini-apps
   * Returns config keys like usdcTemplateId, etc.
   */
  async getConfig(): Promise<Record<string, string>> {
    return this.request<Record<string, string>>('getConfig');
  }

  /**
   * Accept pending Splice TransferOffer contracts for the bridge operator.
   * Used by auto-accept to process incoming CC transfers to the bridge.
   */
  async acceptBridgeTransferOffers(): Promise<{ accepted: number; errors: string[]; ccBalance?: string }> {
    return this.request<{ accepted: number; errors: string[]; ccBalance?: string }>('acceptBridgeOffers');
  }

  /**
   * Create a Splice TransferOffer from BridgeOperator to a user (CC release).
   * Used in the EVM→CC bridge flow after the bridge processes the request.
   * @param params Amount and recipient party for the CC release
   * @returns The created contract ID
   */
  async bridgeReleaseCC(params: { amount: string; recipientParty: string }): Promise<{ contractId: string }> {
    return this.request<{ contractId: string }>('bridgeReleaseCC', params);
  }

  /**
   * Transfer USDCHolding from BridgeOperator to a user on Canton.
   * Used in the CC→USDC (Canton same-chain) swap flow.
   * @param params Amount and recipient party for the USDC release
   * @returns The transferred contract ID
   */
  async bridgeReleaseUSDC(params: { amount: string; recipientParty: string }): Promise<{ contractId: string }> {
    return this.request<{ contractId: string }>('bridgeReleaseUSDC', params);
  }

  /**
   * Generic API proxy — call any backend endpoint through the portal.
   * Allows mini-apps to use backend APIs without adding SDK methods per endpoint.
   * @param path API path (e.g. '/api/canton/bridge-release-cc')
   * @param body JSON body to POST
   * @returns The response data (parsed JSON)
   */
  async callAPI<T = unknown>(path: string, body?: Record<string, unknown>): Promise<T> {
    return this.request<T>('callAPI', { path, body: body || {} });
  }

  // ============================================
  // Portal Capabilities
  // ============================================

  /**
   * Ask the portal to issue a signed capability token for a scoped action.
   *
   * The portal checks the caller's authority (via D1 admin flags) and mints
   * a short-lived RS256 JWT. Apps forward the token to their backend, which
   * verifies against the portal's JWKS. The private signing key never leaves
   * the portal, so a compromised app cannot forge tokens for other users.
   *
   * @param params.action     e.g. 'install-dar'
   * @param params.workflowId optional — scopes the token to one workflow
   * @returns the JWT string (to be sent as `Authorization: Bearer <token>`)
   */
  async getCapability(params: { action: string; workflowId?: string | null }): Promise<string> {
    const body: Record<string, unknown> = { action: params.action };
    if (params.workflowId) body.workflowId = params.workflowId;
    const res = await this.callAPI<{ token?: string }>(
      '/api/authority/issue-capability',
      body,
    );
    if (!res || typeof res.token !== 'string') {
      throw new Error('Portal did not return a capability token');
    }
    return res.token;
  }

  // ============================================
  // Canton-Specific
  // ============================================

  async getPartyId(): Promise<string | null> {
    const user = await this.getUser();
    return user?.partyId || null;
  }

  async getTransferOffers(): Promise<TransferOffer[]> {
    return this.request<TransferOffer[]>('getTransferOffers');
  }

  /**
   * Accept all pending transfer offers for the current user.
   * Used at the end of swap flows to ensure CC lands in the wallet.
   */
  async acceptAllOffers(): Promise<{ accepted: number }> {
    return this.request<{ accepted: number }>('acceptAllOffers');
  }

  async acceptTransferOffer(contractId: string): Promise<TransferResult> {
    return this.request<TransferResult>('acceptOffer', { contractId });
  }

  // ============================================
  // Canton Generic Contract Operations
  // ============================================

  /**
   * Query Canton contracts by template ID
   * @param params Query parameters including templateId and optional filter
   * @returns Array of matching contracts
   */
  async cantonQuery<T = Record<string, unknown>>(params: CantonQueryParams): Promise<CantonContract<T>[]> {
    return this.request<CantonContract<T>[]>('cantonQuery', params);
  }

  /**
   * Create a new Canton contract
   * @param params Create parameters including templateId and payload
   * @returns The created contract ID
   */
  async cantonCreate(params: CantonCreateParams): Promise<CantonCreateResult> {
    return this.request<CantonCreateResult>('cantonCreate', params);
  }

  /**
   * Exercise a choice on a Canton contract
   * @param params Exercise parameters including contractId, choice name, and arguments
   * @returns The exercise result
   */
  async cantonExercise<T = unknown>(params: CantonExerciseParams): Promise<CantonExerciseResult<T>> {
    return this.request<CantonExerciseResult<T>>('cantonExercise', params);
  }

  /**
   * Grant user rights on the Canton ledger
   * Used to grant readAs/actAs rights to users (e.g., readAs public party during onboarding)
   * @param params Grant parameters including userId and rights to grant
   * @returns The grant result
   */
  async grantUserRights(params: GrantUserRightsParams): Promise<GrantUserRightsResult> {
    return this.request<GrantUserRightsResult>('grantUserRights', params);
  }

  // ============================================
  // Data Refresh
  // ============================================

  async refresh(): Promise<void> {
    await this.request<void>('refresh');
  }

  // ============================================
  // Events
  // ============================================

  on<E extends SDKEvent>(event: E, callback: (data: SDKEventData[E]) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  off<E extends SDKEvent>(event: E, callback: (data: SDKEventData[E]) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  removeAllListeners(): void {
    this.eventListeners.clear();
  }

  // ============================================
  // Cleanup
  // ============================================

  destroy(): void {
    window.removeEventListener('message', this.handleMessage.bind(this));
    this.pendingRequests.forEach(({ timeout }) => clearTimeout(timeout));
    this.pendingRequests.clear();
    this.eventListeners.clear();
  }
}

// Default instance
let defaultInstance: StratosSDK | null = null;

export function getSDK(config?: SDKConfig): StratosSDK {
  if (!defaultInstance) {
    defaultInstance = new StratosSDK(config);
  }
  return defaultInstance;
}
