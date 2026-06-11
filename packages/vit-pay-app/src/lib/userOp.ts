import { ethers } from 'ethers'
import {
  SafeAccountV0_3_0 as SafeAccount,
  SignerSignaturePair,
  WebauthnSignatureData,
  SendUseroperationResponse,
  UserOperationV7,
} from 'abstractionkit'

import {
  PasskeyLocalStorageFormat,
  extractSignature,
  extractClientDataFields
} from './passkeys'
import { hexStringToUint8Array } from '../utils'
import { environment } from '../environments/environment'

type Assertion = {
  response: AuthenticatorAssertionResponse
}

// Overrides passed through to formatSignaturesToUseroperationSignature so the
// signature is routed to the canonical Safe WebAuthn contracts (Fix 3 §17).
export interface WebauthnSignatureOverrides {
  webAuthnSharedSigner?: string
  webAuthnSignerSingleton?: string
  webAuthnSignerFactory?: string
  webAuthnSignerProxyCreationCode?: string
  eip7212WebAuthnPrecompileVerifier?: string
  eip7212WebAuthnContractVerifier?: string
}

async function signAndSendUserOp(
  smartAccount: SafeAccount,
  userOp: UserOperationV7,
  passkey: PasskeyLocalStorageFormat,
  chainId: bigint = environment.chainId,
  bundlerUrl: string = environment.bundlerUrl,
  webauthnOverrides: WebauthnSignatureOverrides = {},
): Promise<SendUseroperationResponse> {
  const safeInitOpHash = SafeAccount.getUserOperationEip712Hash(userOp, chainId)

  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: ethers.getBytes(safeInitOpHash),
      allowCredentials: [{ type: 'public-key', id: hexStringToUint8Array(passkey.rawId)}],
      // SafeWebAuthnSharedSigner v0.2.1 require UV bit dans authenticatorData
      // (AUTH_FLAG_MASK = 0x05 = UP|UV). Default 'preferred' permet à certains
      // devices (Windows Hello PIN) de retourner UV=0 → AA24 on-chain.
      userVerification: 'required',
    },
  })) as Assertion | null

  if (!assertion) {
    throw new Error('Failed to sign user operation')
  }

  // Fix 4 (journal §20) — assert détection précoce de UV manquant.
  // SafeWebAuthnSharedSigner v0.2.1 require AUTH_FLAG_MASK = 0x05 (UP|UV).
  // Si l'authenticator retourne UV=0, on-chain revert silencieusement → AA24
  // cryptique côté bundler. Cet assert produit un message clair AVANT envoi.
  const authData = new Uint8Array(assertion.response.authenticatorData)
  const flags = authData[32] ?? 0
  const AUTH_FLAG_MASK = 0x05
  if ((flags & AUTH_FLAG_MASK) !== AUTH_FLAG_MASK) {
    throw new Error(
      `WebAuthn flags insuffisants (0x${flags.toString(16).padStart(2, '0')}, attendu UP|UV=0x05). ` +
      `Active la biométrie (Touch ID / Face ID / Windows Hello) sur ton device — ` +
      `un PIN seul ne suffit pas pour la validation Safe v0.2.1.`
    )
  }

  const webauthnSignatureData: WebauthnSignatureData = {
    authenticatorData: assertion.response.authenticatorData,
    clientDataFields: extractClientDataFields(assertion.response),
    rs: extractSignature(assertion.response.signature),
  }

  const webauthSignature: string = SafeAccount.createWebAuthnSignature(webauthnSignatureData)

  const SignerSignaturePair: SignerSignaturePair = {
    signer: passkey.pubkeyCoordinates,
    signature: webauthSignature,
  }

  userOp.signature = SafeAccount.formatSignaturesToUseroperationSignature(
    [SignerSignaturePair],
    { isInit: userOp.nonce == 0n, ...webauthnOverrides },
  );
  return await smartAccount.sendUserOperation(userOp, bundlerUrl)
}

export { signAndSendUserOp }
