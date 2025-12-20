/**
 * Stratos Wallet SDK - Basic Demo
 *
 * This example demonstrates how to use the SDK to:
 * - Connect to the wallet and get user info
 * - Display wallet addresses for all supported chains
 * - Display Canton party ID and query contracts
 * - Sign messages on different chains
 * - Send basic EVM transactions
 */

import { getSDK, StratosSDK } from '@stratos-wallet/sdk';
import type { ChainAddress, AuthUser, CantonContract, ChainType } from '@stratos-wallet/sdk';

// Initialize SDK with debug mode
const sdk: StratosSDK = getSDK({ debug: true });

// DOM Elements
const connectionStatus = document.getElementById('connection-status')!;
const btnConnect = document.getElementById('btn-connect') as HTMLButtonElement;
const btnDisconnect = document.getElementById('btn-disconnect') as HTMLButtonElement;
const userInfo = document.getElementById('user-info')!;
const addressesList = document.getElementById('addresses-list')!;
const cantonInfo = document.getElementById('canton-info')!;
const contractsList = document.getElementById('contracts-list')!;
const templateIdInput = document.getElementById('template-id') as HTMLInputElement;
const btnQuery = document.getElementById('btn-query') as HTMLButtonElement;
const messageInput = document.getElementById('message-input') as HTMLInputElement;
const chainSelect = document.getElementById('chain-select') as HTMLSelectElement;
const btnSign = document.getElementById('btn-sign') as HTMLButtonElement;
const signatureResult = document.getElementById('signature-result')!;
const txTo = document.getElementById('tx-to') as HTMLInputElement;
const txAmount = document.getElementById('tx-amount') as HTMLInputElement;
const txChain = document.getElementById('tx-chain') as HTMLSelectElement;
const btnSendTx = document.getElementById('btn-send-tx') as HTMLButtonElement;
const txResult = document.getElementById('tx-result')!;
const logElement = document.getElementById('log')!;

// Utility: Add log entry
function log(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
  const timestamp = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.textContent = `[${timestamp}] ${message}`;
  logElement.appendChild(entry);
  logElement.scrollTop = logElement.scrollHeight;
}

// Utility: Format address for display
function formatAddress(address: string): string {
  if (address.length <= 20) return address;
  return `${address.slice(0, 10)}...${address.slice(-8)}`;
}

// Utility: Get chain display name
function getChainDisplayName(chainType: ChainType, chain?: string): string {
  if (chain) return chain;
  const names: Record<ChainType, string> = {
    evm: 'EVM',
    svm: 'Solana',
    btc: 'Bitcoin',
    tron: 'TRON',
    ton: 'TON',
    canton: 'Canton',
    base: 'Base',
  };
  return names[chainType] || chainType;
}

// Update connection status UI
function updateConnectionStatus(connected: boolean): void {
  connectionStatus.className = `status ${connected ? 'connected' : 'disconnected'}`;
  connectionStatus.innerHTML = `
    <span class="dot"></span>
    <span>${connected ? 'Connected' : 'Disconnected'}</span>
  `;
  btnConnect.disabled = connected;
  btnDisconnect.disabled = !connected;
  btnQuery.disabled = !connected;
  btnSign.disabled = !connected;
  btnSendTx.disabled = !connected;
}

// Display user information
function displayUserInfo(user: AuthUser | null): void {
  if (!user) {
    userInfo.innerHTML = '<div class="empty-state">Connect wallet to view user info</div>';
    return;
  }

  userInfo.innerHTML = `
    <div class="info-row">
      <span class="info-label">User ID</span>
      <span class="info-value">${user.id}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Username</span>
      <span class="info-value">${user.username}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Display Name</span>
      <span class="info-value">${user.displayName || 'Not set'}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Role</span>
      <span class="info-value">${user.role}</span>
    </div>
  `;
}

// Display wallet addresses
function displayAddresses(addresses: ChainAddress[]): void {
  if (addresses.length === 0) {
    addressesList.innerHTML = '<div class="empty-state">No addresses available</div>';
    return;
  }

  addressesList.innerHTML = addresses
    .map(
      (addr) => `
      <div class="address-item">
        <div class="chain">${getChainDisplayName(addr.chainType, addr.chain)}</div>
        <div class="addr" title="${addr.address}">${addr.address}</div>
      </div>
    `
    )
    .join('');
}

// Display Canton info (party ID)
async function displayCantonInfo(): Promise<void> {
  try {
    const partyId = await sdk.getPartyId();

    if (!partyId) {
      cantonInfo.innerHTML = '<div class="empty-state">No Canton party ID available</div>';
      return;
    }

    cantonInfo.innerHTML = `
      <div class="info-row">
        <span class="info-label">Party ID</span>
        <span class="info-value" style="font-size: 11px; word-break: break-all;">${partyId}</span>
      </div>
    `;

    log(`Canton Party ID: ${formatAddress(partyId)}`, 'success');
  } catch (error) {
    cantonInfo.innerHTML = '<div class="empty-state">Failed to fetch Canton info</div>';
    log(`Error fetching Canton info: ${error}`, 'error');
  }
}

// Display Canton contracts
function displayContracts(contracts: CantonContract[]): void {
  if (contracts.length === 0) {
    contractsList.innerHTML = '<div class="empty-state">No contracts found for this template</div>';
    return;
  }

  contractsList.innerHTML = contracts
    .map(
      (contract) => `
      <div class="contract-item">
        <div class="template">${contract.templateId}</div>
        <div class="id">Contract ID: ${formatAddress(contract.contractId)}</div>
        <div class="payload">${JSON.stringify(contract.payload, null, 2)}</div>
      </div>
    `
    )
    .join('');
}

// Connect wallet
async function connectWallet(): Promise<void> {
  try {
    log('Connecting to wallet...', 'info');
    const result = await sdk.connect();

    updateConnectionStatus(result.connected);
    displayUserInfo(result.user);
    displayAddresses(result.addresses);
    await displayCantonInfo();

    log('Wallet connected successfully', 'success');
    log(`User: ${result.user?.username || 'Unknown'}`, 'info');
    log(`Addresses: ${result.addresses.length} found`, 'info');
  } catch (error) {
    log(`Connection failed: ${error}`, 'error');
  }
}

// Disconnect wallet
async function disconnectWallet(): Promise<void> {
  try {
    log('Disconnecting...', 'info');
    await sdk.disconnect();

    updateConnectionStatus(false);
    displayUserInfo(null);
    addressesList.innerHTML = '<div class="empty-state">Connect wallet to view addresses</div>';
    cantonInfo.innerHTML = '<div class="empty-state">Connect wallet to view Canton info</div>';
    contractsList.innerHTML =
      '<div class="empty-state">Enter a template ID and click Query to search contracts</div>';

    log('Wallet disconnected', 'success');
  } catch (error) {
    log(`Disconnect failed: ${error}`, 'error');
  }
}

// Query Canton contracts
async function queryContracts(): Promise<void> {
  const templateId = templateIdInput.value.trim();
  if (!templateId) {
    log('Please enter a template ID', 'error');
    return;
  }

  try {
    log(`Querying contracts for template: ${templateId}`, 'info');
    const contracts = await sdk.cantonQuery({ templateId });

    displayContracts(contracts);
    log(`Found ${contracts.length} contract(s)`, 'success');
  } catch (error) {
    log(`Query failed: ${error}`, 'error');
    contractsList.innerHTML = '<div class="empty-state">Query failed - see log for details</div>';
  }
}

// Sign message
async function signMessage(): Promise<void> {
  const message = messageInput.value.trim();
  const chain = chainSelect.value as ChainType;

  if (!message) {
    log('Please enter a message to sign', 'error');
    return;
  }

  try {
    log(`Signing message on ${chain}...`, 'info');
    const signature = await sdk.signMessage({ message, chain });

    signatureResult.innerHTML = `
      <div style="word-break: break-all; font-family: monospace; font-size: 11px; color: #4ade80;">
        ${signature}
      </div>
    `;
    log('Message signed successfully', 'success');
  } catch (error) {
    log(`Signing failed: ${error}`, 'error');
    signatureResult.innerHTML = '<div class="empty-state" style="color: #f87171;">Signing failed</div>';
  }
}

// Send EVM transaction
async function sendTransaction(): Promise<void> {
  const to = txTo.value.trim();
  const amountEth = txAmount.value.trim();
  const chainId = parseInt(txChain.value);

  if (!to || !amountEth) {
    log('Please fill in recipient and amount', 'error');
    return;
  }

  // Validate address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(to)) {
    log('Invalid Ethereum address format', 'error');
    return;
  }

  try {
    // Convert ETH to Wei (1 ETH = 10^18 Wei)
    const amountWei = BigInt(Math.floor(parseFloat(amountEth) * 1e18)).toString();

    log(`Sending ${amountEth} ETH to ${formatAddress(to)} on chain ${chainId}...`, 'info');

    const result = await sdk.sendNative(to, amountWei, chainId);

    txResult.innerHTML = `
      <div style="color: #4ade80;">
        <div>Status: ${result.status}</div>
        <div style="font-family: monospace; font-size: 11px; word-break: break-all; margin-top: 8px;">
          TX Hash: ${result.transactionHash}
        </div>
      </div>
    `;
    log(`Transaction sent! Hash: ${formatAddress(result.transactionHash)}`, 'success');
  } catch (error) {
    log(`Transaction failed: ${error}`, 'error');
    txResult.innerHTML = '<div style="color: #f87171;">Transaction failed - see log for details</div>';
  }
}

// Event listeners
btnConnect.addEventListener('click', connectWallet);
btnDisconnect.addEventListener('click', disconnectWallet);
btnQuery.addEventListener('click', queryContracts);
btnSign.addEventListener('click', signMessage);
btnSendTx.addEventListener('click', sendTransaction);

// Listen for SDK events
sdk.on('userChanged', (user) => {
  log(`User changed: ${user?.username || 'logged out'}`, 'info');
  displayUserInfo(user);
});

sdk.on('addressesChanged', (addresses) => {
  log(`Addresses updated: ${addresses.length} addresses`, 'info');
  displayAddresses(addresses);
});

sdk.on('disconnect', () => {
  log('Disconnected by parent', 'info');
  updateConnectionStatus(false);
});

// Initialize
log('Stratos Wallet SDK Demo ready', 'info');
log('Click "Connect Wallet" to begin', 'info');
