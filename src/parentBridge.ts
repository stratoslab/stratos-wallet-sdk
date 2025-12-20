/**
 * Parent Bridge
 *
 * Used by the parent portal to handle requests from iframe apps.
 * The portal provides callbacks for data access and actions.
 */

import type {
  RPCRequest,
  RPCResponse,
  RPCEvent,
  SDKEvent,
  ParentBridgeConfig,
  ParentBridgeCallbacks,
  TransferParams,
  SignMessageParams,
  CantonQueryParams,
  CantonCreateParams,
  CantonExerciseParams,
  SignEVMTransactionParams,
  SendEVMTransactionParams,
  SignTypedDataParams,
  GrantUserRightsParams,
} from './types';

export class ParentBridge {
  private callbacks: ParentBridgeCallbacks;
  private allowedOrigins: Set<string>;
  private debug: boolean;
  private iframeOrigins: Map<string, Window> = new Map();

  constructor(callbacks: ParentBridgeCallbacks, config: ParentBridgeConfig) {
    this.callbacks = callbacks;
    this.allowedOrigins = new Set(config.allowedOrigins);
    this.debug = config.debug || false;

    window.addEventListener('message', this.handleMessage.bind(this));
    this.log('ParentBridge initialized', { allowedOrigins: config.allowedOrigins });
  }

  private log(message: string, data?: unknown): void {
    if (this.debug) {
      console.log(`[ParentBridge] ${message}`, data || '');
    }
  }

  private isAllowedOrigin(origin: string): boolean {
    // Allow localhost in development
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return true;
    }
    return this.allowedOrigins.has(origin);
  }

  private async handleMessage(event: MessageEvent): Promise<void> {
    // Verify origin
    if (!this.isAllowedOrigin(event.origin)) {
      this.log('Rejected message from untrusted origin', event.origin);
      return;
    }

    const data = event.data as RPCRequest;

    // Validate request format
    if (!data || typeof data.id !== 'string' || typeof data.method !== 'string') {
      return;
    }

    this.log('Received request', { method: data.method, params: data.params });

    // Track the iframe source for sending events later
    if (event.source) {
      this.iframeOrigins.set(event.origin, event.source as Window);
    }

    try {
      const result = await this.processRequest(data.method, data.params);
      this.sendResponse(event.source as Window, event.origin, {
        id: data.id,
        result,
      });
    } catch (error) {
      this.sendResponse(event.source as Window, event.origin, {
        id: data.id,
        error: {
          code: -1,
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  private async processRequest(method: string, params?: unknown): Promise<unknown> {
    switch (method) {
      case 'connect': {
        const user = this.callbacks.getUser();
        const addresses = this.callbacks.getAddresses();
        return {
          connected: user !== null,
          user,
          addresses,
        };
      }

      case 'disconnect':
        return { success: true };

      case 'getUser':
        return this.callbacks.getUser();

      case 'getAddresses':
        return this.callbacks.getAddresses();

      case 'getAssets':
        return this.callbacks.getAssets();

      case 'getTransactions':
        return this.callbacks.getTransactions();

      case 'getTransferOffers':
        return this.callbacks.getTransferOffers();

      case 'transfer': {
        const transferParams = params as TransferParams;
        return this.callbacks.transfer(transferParams);
      }

      case 'signMessage': {
        const signParams = params as SignMessageParams;
        return this.callbacks.signMessage(signParams);
      }

      case 'acceptOffer': {
        const { contractId } = params as { contractId: string };
        return this.callbacks.acceptOffer(contractId);
      }

      case 'refresh':
        await this.callbacks.refresh();
        return { success: true };

      // Canton Generic Contract Operations
      case 'cantonQuery': {
        if (!this.callbacks.cantonQuery) {
          throw new Error('Canton query not supported');
        }
        const queryParams = params as CantonQueryParams;
        return this.callbacks.cantonQuery(queryParams);
      }

      case 'cantonCreate': {
        if (!this.callbacks.cantonCreate) {
          throw new Error('Canton create not supported');
        }
        const createParams = params as CantonCreateParams;
        return this.callbacks.cantonCreate(createParams);
      }

      case 'cantonExercise': {
        if (!this.callbacks.cantonExercise) {
          throw new Error('Canton exercise not supported');
        }
        const exerciseParams = params as CantonExerciseParams;
        return this.callbacks.cantonExercise(exerciseParams);
      }

      // EVM Transaction Operations
      case 'signEVMTransaction': {
        if (!this.callbacks.signEVMTransaction) {
          throw new Error('EVM transaction signing not supported');
        }
        const signTxParams = params as SignEVMTransactionParams;
        return this.callbacks.signEVMTransaction(signTxParams);
      }

      case 'sendEVMTransaction': {
        if (!this.callbacks.sendEVMTransaction) {
          throw new Error('EVM transaction sending not supported');
        }
        const sendTxParams = params as SendEVMTransactionParams;
        return this.callbacks.sendEVMTransaction(sendTxParams);
      }

      case 'signTypedData': {
        if (!this.callbacks.signTypedData) {
          throw new Error('EIP-712 typed data signing not supported');
        }
        const typedDataParams = params as SignTypedDataParams;
        return this.callbacks.signTypedData(typedDataParams);
      }

      // Canton User Rights
      case 'grantUserRights': {
        if (!this.callbacks.grantUserRights) {
          throw new Error('User rights granting not supported');
        }
        const grantParams = params as GrantUserRightsParams;
        return this.callbacks.grantUserRights(grantParams);
      }

      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  private sendResponse(target: Window, origin: string, response: RPCResponse): void {
    this.log('Sending response', response);
    target.postMessage(response, origin);
  }

  /**
   * Broadcast an event to all connected iframes
   */
  broadcastEvent<E extends SDKEvent>(event: E, data: unknown): void {
    const message: RPCEvent = {
      type: 'event',
      event,
      data,
    };

    this.log('Broadcasting event', { event, data });

    this.iframeOrigins.forEach((target, origin) => {
      try {
        target.postMessage(message, origin);
      } catch (err) {
        this.log('Failed to send event to iframe', { origin, error: err });
        // Remove dead iframes
        this.iframeOrigins.delete(origin);
      }
    });
  }

  /**
   * Notify iframes that assets have changed
   */
  notifyAssetsChanged(): void {
    const assets = this.callbacks.getAssets();
    this.broadcastEvent('assetsChanged', assets);
  }

  /**
   * Notify iframes that transactions have changed
   */
  notifyTransactionsChanged(): void {
    const transactions = this.callbacks.getTransactions();
    this.broadcastEvent('transactionsChanged', transactions);
  }

  /**
   * Notify iframes that user has changed
   */
  notifyUserChanged(): void {
    const user = this.callbacks.getUser();
    this.broadcastEvent('userChanged', user);
  }

  /**
   * Notify iframes that addresses have changed
   */
  notifyAddressesChanged(): void {
    const addresses = this.callbacks.getAddresses();
    this.broadcastEvent('addressesChanged', addresses);
  }

  /**
   * Add an allowed origin dynamically
   */
  addAllowedOrigin(origin: string): void {
    this.allowedOrigins.add(origin);
  }

  /**
   * Remove an allowed origin
   */
  removeAllowedOrigin(origin: string): void {
    this.allowedOrigins.delete(origin);
    this.iframeOrigins.delete(origin);
  }

  /**
   * Cleanup
   */
  destroy(): void {
    window.removeEventListener('message', this.handleMessage.bind(this));
    this.iframeOrigins.clear();
  }
}
