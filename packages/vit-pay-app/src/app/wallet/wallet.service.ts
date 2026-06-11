import { Injectable } from '@angular/core';
import { ethers } from 'ethers';
import {
  SafeAccountV0_3_0 as SafeAccount,
  SafeMultiChainSigAccountV1,
  CandidePaymaster,
  MetaTransaction,
  SocialRecoveryModule,
} from 'abstractionkit';
import {
  preflightRiskCheck,
  PreflightResult,
  TransactionToScreen,
} from 'kng2-web3/preflight';

import {
  createPasskey,
  toLocalStorageFormat,
  PasskeyLocalStorageFormat,
} from '../../lib/passkeys';
import { signAndSendUserOp } from '../../lib/userOp';

// Fix 3 (journal §17) — Override les 5 addresses webauthn vers les contracts
// canoniques Safe Passkey Module v0.2.1 (exposés via SafeMultiChainSigAccountV1).
// Par défaut, SafeAccountV0_3_0 pointe sur la copie abstractionkit du SharedSigner
// (0xfD90FAd3…), dont l'`isValidSignature` provoque AA24 à l'init (cf. §16). En
// alignant toutes les addresses webauthn sur la version canonique Safe, la chaîne
// init → swap owner → proxy fonctionne tel que prévu par abstractionkit.
const WEBAUTHN_CANONICAL_OVERRIDES = {
  webAuthnSharedSigner: SafeMultiChainSigAccountV1.DEFAULT_WEB_AUTHN_SHARED_SIGNER,
  webAuthnSignerSingleton: SafeMultiChainSigAccountV1.DEFAULT_WEB_AUTHN_SIGNER_SINGLETON,
  webAuthnSignerFactory: SafeMultiChainSigAccountV1.DEFAULT_WEB_AUTHN_SIGNER_FACTORY,
  webAuthnSignerProxyCreationCode:
    SafeMultiChainSigAccountV1.DEFAULT_WEB_AUTHN_SIGNER_PROXY_CREATION_CODE,
  eip7212WebAuthnContractVerifier:
    SafeMultiChainSigAccountV1.DEFAULT_WEB_AUTHN_DAIMO_VERIFIER,
} as const;

const INIT_CODE_WEBAUTHN_OVERRIDES = {
  webAuthnSharedSigner: WEBAUTHN_CANONICAL_OVERRIDES.webAuthnSharedSigner,
  eip7212WebAuthnContractVerifierForSharedSigner:
    WEBAUTHN_CANONICAL_OVERRIDES.eip7212WebAuthnContractVerifier,
} as const;

export const WEBAUTHN_OVERRIDES_FOR_SIGNATURE = WEBAUTHN_CANONICAL_OVERRIDES;

import {
  WalletConfig,
  assertConfigUsable,
  getWalletConfig,
} from './wallet-config';
import { WalletStorageService } from './wallet-storage.service';
import {
  DailySpendingTracker,
  PasskeyOwner,
  PreflightWarning,
  RecoveryRequest,
  StoredWallet,
  UserOperationDebug,
  UserOperationResult,
  WalletState,
} from './wallet.types';

// Local-timezone ISO date 'YYYY-MM-DD'. Used to detect day rollovers for the
// daily spending counter. Local TZ keeps "today" intuitive for the user even
// across UTC midnight.
function todayLocalIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// JSON.stringify replacer: bigint → '0x…', preserves hex strings as-is.
function stringifyUserOp(userOp: unknown): string {
  return JSON.stringify(
    userOp,
    (_, v) => (typeof v === 'bigint' ? '0x' + v.toString(16) : v),
    2,
  );
}

const ERC20_TRANSFER_ABI = ['function transfer(address to, uint256 amount) returns (bool)'];
const ERC20_BALANCE_ABI = ['function balanceOf(address account) view returns (uint256)'];
const MOCK_ERC20_MINT_ABI = ['function mint(address to, uint256 amount)'];

// Walks an Error's `cause` chain and joins messages with " → ".
// Useful for bundler errors where abstractionkit wraps the raw RPC response
// (e.g. "bundler eth_sendUserOperation rpc call failed → AA24 signature error").
function formatErrorChain(err: unknown): string {
  const parts: string[] = [];
  let current: unknown = err;
  const seen = new Set<unknown>();
  while (current && !seen.has(current)) {
    seen.add(current);
    if (current instanceof Error) {
      parts.push(current.message);
      current = (current as { cause?: unknown }).cause;
    } else {
      parts.push(String(current));
      break;
    }
  }
  return parts.length > 0 ? parts.join(' → ') : 'unknown error';
}

@Injectable({ providedIn: 'root' })
export class WalletService {
  private config: WalletConfig = getWalletConfig();
  private state: WalletState | null = null;

  constructor(private storage: WalletStorageService) {}

  getConfig(): WalletConfig {
    return this.config;
  }

  getState(): WalletState | null {
    return this.state;
  }

  async loadWallet(): Promise<WalletState | null> {
    const stored = this.storage.load();
    if (!stored) return null;

    const passkey: PasskeyOwner = {
      rawId: stored.credentialId,
      pubkeyCoordinates: {
        x: BigInt(stored.webauthnPublicKey.x),
        y: BigInt(stored.webauthnPublicKey.y),
      },
    };

    let deployed = false;
    try {
      assertConfigUsable(this.config);
      const provider = new ethers.JsonRpcProvider(this.config.nodeRpcUrl);
      const code = await provider.getCode(stored.accountAddress);
      deployed = code !== '0x';
    } catch {
      deployed = false;
    }

    this.state = {
      accountAddress: stored.accountAddress,
      chainId: stored.chainId,
      owners: stored.owners,
      recoveryEnabled: stored.recoveryEnabled,
      zchfTokenAddress: stored.zchfTokenAddress,
      passkey,
      deployed,
    };
    return this.state;
  }

  async createWalletWithPasskey(): Promise<WalletState> {
    if (typeof navigator === 'undefined' || !navigator.credentials) {
      throw new Error('WebAuthn is not available in this browser');
    }

    const credential = await createPasskey();
    const passkey = toLocalStorageFormat(credential);
    const accountAddress = SafeAccount.createAccountAddress(
      [passkey.pubkeyCoordinates],
      INIT_CODE_WEBAUTHN_OVERRIDES,
    );

    const ownerAddress = SafeAccount.getSignerLowerCaseAddress(
      passkey.pubkeyCoordinates,
      WEBAUTHN_CANONICAL_OVERRIDES,
    );

    const stored: StoredWallet = {
      version: 1,
      accountAddress,
      chainId: Number(this.config.chainId),
      credentialId: passkey.rawId,
      webauthnPublicKey: {
        x: '0x' + passkey.pubkeyCoordinates.x.toString(16),
        y: '0x' + passkey.pubkeyCoordinates.y.toString(16),
      },
      owners: [ownerAddress],
      recoveryEnabled: false,
      zchfTokenAddress: this.config.zchfTokenAddress,
    };
    this.storage.save(stored);

    this.state = {
      accountAddress,
      chainId: stored.chainId,
      owners: stored.owners,
      recoveryEnabled: false,
      zchfTokenAddress: this.config.zchfTokenAddress,
      passkey: {
        rawId: passkey.rawId,
        pubkeyCoordinates: passkey.pubkeyCoordinates,
      },
      deployed: false,
    };
    return this.state;
  }

  async getZchfBalance(): Promise<bigint> {
    const state = this.requireState();
    assertConfigUsable(this.config);
    const provider = new ethers.JsonRpcProvider(this.config.nodeRpcUrl);
    const token = new ethers.Contract(
      this.config.zchfTokenAddress,
      ERC20_BALANCE_ABI,
      provider,
    );
    return (await token['balanceOf'](state.accountAddress)) as bigint;
  }

  async mintTestZchf(amount: bigint): Promise<UserOperationResult> {
    const state = this.requireState();
    const mintTx = this.buildMockErc20Mint(
      this.config.zchfTokenAddress,
      state.accountAddress,
      amount,
    );
    return this.executeSponsoredUserOp([mintTx]);
  }

  async sendZchfPayment(to: string, amount: bigint): Promise<UserOperationResult> {
    if (!ethers.isAddress(to)) {
      throw new Error(`Invalid destination address: ${to}`);
    }
    this.checkDailyLimit(amount);
    const transferTx = this.buildErc20Transfer(this.config.zchfTokenAddress, to, amount);
    const preflight = await this.runPreflight([transferTx]);
    const result = await this.executeSponsoredUserOp([transferTx]);
    if (result.success) this.incrementDailySpending(amount);
    if (preflight) result.preflight = preflight;
    return result;
  }

  // Returns { spentToday, limit, remaining } in wei. If no limit is configured,
  // `limit` and `remaining` are undefined and the UI hides the indicator.
  getDailySpending(): {
    spentToday: bigint;
    limit?: bigint;
    remaining?: bigint;
    date: string;
  } {
    const today = todayLocalIso();
    const stored = this.storage.load();
    const tracker = stored?.dailySpending;
    const spentToday =
      tracker && tracker.date === today ? BigInt(tracker.spentWei) : 0n;
    const limit = this.config.maxDailyZchfAmount;
    if (limit === undefined) {
      return { spentToday, date: today };
    }
    const remaining = spentToday >= limit ? 0n : limit - spentToday;
    return { spentToday, limit, remaining, date: today };
  }

  private checkDailyLimit(amount: bigint): void {
    const { spentToday, limit } = this.getDailySpending();
    if (limit === undefined) return;
    if (spentToday + amount > limit) {
      const formatted = ethers.formatUnits(limit, 18);
      throw new Error(
        `Limite journalière dépassée (${formatted} ZCHF/jour). ` +
          `Déjà dépensé : ${ethers.formatUnits(spentToday, 18)} ZCHF.`,
      );
    }
  }

  private incrementDailySpending(amount: bigint): void {
    const stored = this.storage.load();
    if (!stored) return;
    const today = todayLocalIso();
    const current =
      stored.dailySpending && stored.dailySpending.date === today
        ? BigInt(stored.dailySpending.spentWei)
        : 0n;
    const next: DailySpendingTracker = {
      date: today,
      spentWei: '0x' + (current + amount).toString(16),
    };
    stored.dailySpending = next;
    this.storage.save(stored);
  }

  // Runs preflight risk screening before signing. BLOCK verdict throws; WARN
  // returns a non-blocking warning (the UI surfaces it to the user). OK returns
  // undefined (no UI noise).
  private async runPreflight(
    transactions: MetaTransaction[],
  ): Promise<PreflightWarning | undefined> {
    const screening: TransactionToScreen[] = transactions.map((tx) => ({
      to: tx.to,
      data: tx.data,
      value: tx.value,
    }));
    let verdict: PreflightResult;
    try {
      verdict = await preflightRiskCheck(screening, {});
    } catch {
      return undefined;
    }
    if (verdict.verdict === 'BLOCK') {
      throw new Error(`Préflight: ${verdict.summary}`);
    }
    if (verdict.verdict === 'WARN') {
      return { summary: verdict.summary, flagCount: verdict.flags.length };
    }
    return undefined;
  }

  // Adds an owner by external address (the new device generates its passkey
  // locally and shares its lower-case owner address with the existing owner,
  // who calls this method to sign the addition). Threshold stays at 1 (any
  // owner can sign).
  async addOwnerByAddress(newOwnerAddress: string): Promise<UserOperationResult> {
    if (!ethers.isAddress(newOwnerAddress)) {
      throw new Error(`Invalid owner address: ${newOwnerAddress}`);
    }
    const state = this.requireState();
    const account = SafeAccount.initializeNewAccount(
      [state.passkey.pubkeyCoordinates],
      INIT_CODE_WEBAUTHN_OVERRIDES,
    );
    const addTx = account.createStandardAddOwnerWithThresholdMetaTransaction(
      newOwnerAddress,
      1,
    );
    const result = await this.executeSponsoredUserOp([addTx]);
    if (result.success) {
      const stored = this.storage.load();
      if (stored) {
        stored.owners = [...stored.owners, newOwnerAddress.toLowerCase()];
        this.storage.save(stored);
        if (this.state) this.state.owners = stored.owners;
      }
    }
    return result;
  }

  async addDeviceWithPasskey(): Promise<{
    newPasskey: PasskeyOwner;
    newOwnerAddress: string;
    operation: UserOperationResult;
  }> {
    const credential = await createPasskey();
    const newPasskey = toLocalStorageFormat(credential);
    const newOwnerAddress = SafeAccount.getSignerLowerCaseAddress(
      newPasskey.pubkeyCoordinates,
      WEBAUTHN_CANONICAL_OVERRIDES,
    );

    const state = this.requireState();
    const account = SafeAccount.initializeNewAccount(
      [state.passkey.pubkeyCoordinates],
      INIT_CODE_WEBAUTHN_OVERRIDES,
    );

    const addTxs = await account.createAddOwnerWithThresholdMetaTransactions(
      newPasskey.pubkeyCoordinates,
      1,
      { nodeRpcUrl: this.config.nodeRpcUrl, ...WEBAUTHN_CANONICAL_OVERRIDES },
    );

    const operation = await this.executeSponsoredUserOp(addTxs);

    if (operation.success) {
      const stored = this.storage.load();
      if (stored) {
        stored.owners = [...stored.owners, newOwnerAddress];
        this.storage.save(stored);
        if (this.state) {
          this.state.owners = stored.owners;
        }
      }
    }

    return {
      newPasskey: {
        rawId: newPasskey.rawId,
        pubkeyCoordinates: newPasskey.pubkeyCoordinates,
      },
      newOwnerAddress,
      operation,
    };
  }

  async enableRecovery(
    guardians: string[],
    threshold: number,
  ): Promise<UserOperationResult> {
    if (guardians.length === 0) {
      throw new Error('At least one guardian is required');
    }
    if (threshold < 1 || threshold > guardians.length) {
      throw new Error(
        `Invalid threshold ${threshold} for ${guardians.length} guardians`,
      );
    }
    for (const g of guardians) {
      if (!ethers.isAddress(g)) {
        throw new Error(`Invalid guardian address: ${g}`);
      }
    }

    const state = this.requireState();
    const module = new SocialRecoveryModule(
      this.config.socialRecoveryModuleAddress,
    );

    const transactions: MetaTransaction[] = [];
    transactions.push(module.createEnableModuleMetaTransaction(state.accountAddress));
    for (const guardian of guardians) {
      transactions.push(
        module.createAddGuardianWithThresholdMetaTransaction(
          guardian,
          BigInt(threshold),
        ),
      );
    }

    const result = await this.executeSponsoredUserOp(transactions);

    if (result.success) {
      const stored = this.storage.load();
      if (stored) {
        stored.recoveryEnabled = true;
        this.storage.save(stored);
        if (this.state) this.state.recoveryEnabled = true;
      }
    }
    return result;
  }

  startRecovery(
    accountAddress: string,
    newOwners: string[],
    newThreshold: number,
  ): { metaTransaction: MetaTransaction; instructions: string } {
    const module = new SocialRecoveryModule(
      this.config.socialRecoveryModuleAddress,
    );
    const metaTransaction = module.createExecuteRecoveryMetaTransaction(
      accountAddress,
      newOwners,
      newThreshold,
    );
    return {
      metaTransaction,
      instructions:
        'Guardian must broadcast this MetaTransaction from their own wallet ' +
        '(directly to the SocialRecoveryModule). After the grace period, ' +
        'call finalizeRecovery() to apply the new owner set.',
    };
  }

  // Reads the last cached RecoveryRequest from localStorage (no network call).
  // Used to pre-fill the UI instantly on page load while a refresh runs in
  // background.
  getCachedRecoveryRequest(): RecoveryRequest | null {
    const stored = this.storage.load();
    const cache = stored?.recoveryRequestCache;
    if (!cache || !stored) return null;
    return {
      accountAddress: stored.accountAddress,
      newOwners: cache.newOwners,
      newThreshold: cache.newThreshold,
      executeAfter: BigInt(cache.executeAfter),
      approvalsRequired: cache.approvalsRequired,
      approvalsReceived: cache.approvalsReceived,
    };
  }

  async getRecoveryRequest(): Promise<RecoveryRequest | null> {
    const state = this.requireState();
    if (!state.recoveryEnabled) return null;

    const module = new SocialRecoveryModule(
      this.config.socialRecoveryModuleAddress,
    );
    try {
      const req = await module.getRecoveryRequest(
        this.config.nodeRpcUrl,
        state.accountAddress,
      );
      const threshold = await module.threshold(
        this.config.nodeRpcUrl,
        state.accountAddress,
      );
      const result: RecoveryRequest = {
        accountAddress: state.accountAddress,
        newOwners: req.newOwners,
        newThreshold: Number(req.newThreshold),
        executeAfter: req.executeAfter,
        approvalsRequired: Number(threshold),
        approvalsReceived: Number(req.guardiansApprovalCount),
      };
      const stored = this.storage.load();
      if (stored) {
        stored.recoveryRequestCache = {
          newOwners: result.newOwners,
          newThreshold: result.newThreshold,
          executeAfter: '0x' + result.executeAfter.toString(16),
          approvalsRequired: result.approvalsRequired,
          approvalsReceived: result.approvalsReceived,
          cachedAt: Date.now(),
        };
        this.storage.save(stored);
      }
      return result;
    } catch {
      return null;
    }
  }

  async finalizeRecovery(): Promise<UserOperationResult> {
    const state = this.requireState();
    const module = new SocialRecoveryModule(
      this.config.socialRecoveryModuleAddress,
    );
    const finalizeTx = module.createFinalizeRecoveryMetaTransaction(
      state.accountAddress,
    );
    return this.executeSponsoredUserOp([finalizeTx]);
  }

  private buildErc20Transfer(
    tokenAddress: string,
    to: string,
    amount: bigint,
  ): MetaTransaction {
    const iface = new ethers.Interface(ERC20_TRANSFER_ABI);
    const data = iface.encodeFunctionData('transfer', [to, amount]);
    return {
      to: tokenAddress,
      value: 0n,
      data,
    };
  }

  private buildMockErc20Mint(
    tokenAddress: string,
    to: string,
    amount: bigint,
  ): MetaTransaction {
    const iface = new ethers.Interface(MOCK_ERC20_MINT_ABI);
    const data = iface.encodeFunctionData('mint', [to, amount]);
    return {
      to: tokenAddress,
      value: 0n,
      data,
    };
  }

  private async executeSponsoredUserOp(
    transactions: MetaTransaction[],
  ): Promise<UserOperationResult> {
    assertConfigUsable(this.config);
    const state = this.requireState();
    const account = SafeAccount.initializeNewAccount(
      [state.passkey.pubkeyCoordinates],
      INIT_CODE_WEBAUTHN_OVERRIDES,
    );
    const buildDebug = (userOp?: unknown): UserOperationDebug => ({
      userOpJson: userOp ? stringifyUserOp(userOp) : undefined,
      userOpEip712Hash:
        userOp
          ? SafeAccount.getUserOperationEip712Hash(
              userOp as Parameters<typeof SafeAccount.getUserOperationEip712Hash>[0],
              this.config.chainId,
            )
          : undefined,
      paymasterUrl: this.config.paymasterUrl,
      bundlerUrl: this.config.bundlerUrl,
    });

    let userOperation;
    try {
      userOperation = await account.createUserOperation(
        transactions,
        this.config.nodeRpcUrl,
        this.config.bundlerUrl,
        {
          ...WEBAUTHN_CANONICAL_OVERRIDES,
          expectedSigners: [state.passkey.pubkeyCoordinates],
          preVerificationGasPercentageMultiplier: 120,
          verificationGasLimitPercentageMultiplier: 120,
        },
      );
    } catch (err) {
      return {
        userOpHash: '',
        success: false,
        error: 'Estimation gas: ' + formatErrorChain(err),
        debug: buildDebug(),
      };
    }

    const paymaster = new CandidePaymaster(this.config.paymasterUrl);
    try {
      const { userOperation: sponsored } =
        await paymaster.createSponsorPaymasterUserOperation(
          account,
          userOperation,
          this.config.bundlerUrl,
          this.config.sponsorshipPolicyId,
        );
      userOperation = sponsored;
    } catch (err) {
      return {
        userOpHash: '',
        success: false,
        error: `Transaction non sponsorisée: ${formatErrorChain(err)}`,
        debug: buildDebug(userOperation),
      };
    }

    const passkey: PasskeyLocalStorageFormat = {
      rawId: state.passkey.rawId,
      pubkeyCoordinates: state.passkey.pubkeyCoordinates,
    };

    try {
      const response = await signAndSendUserOp(
        account,
        userOperation,
        passkey,
        this.config.chainId,
        this.config.bundlerUrl,
        WEBAUTHN_CANONICAL_OVERRIDES,
      );
      const userOpHash = response.userOperationHash;
      const receipt = await response.included();
      if (!receipt) {
        return {
          userOpHash,
          success: false,
          error: 'UserOperation receipt unavailable',
          debug: buildDebug(userOperation),
        };
      }
      if (receipt.success) {
        if (this.state && !this.state.deployed) {
          this.state.deployed = true;
        }
        return {
          userOpHash,
          transactionHash: receipt.receipt.transactionHash,
          success: true,
          debug: buildDebug(userOperation),
        };
      }
      return {
        userOpHash,
        success: false,
        error: 'UserOperation execution failed',
        debug: buildDebug(userOperation),
      };
    } catch (err) {
      return {
        userOpHash: '',
        success: false,
        error: formatErrorChain(err),
        debug: buildDebug(userOperation),
      };
    }
  }

  private requireState(): WalletState {
    if (!this.state) {
      throw new Error('No wallet loaded. Call createWalletWithPasskey() or loadWallet() first.');
    }
    return this.state;
  }
}
