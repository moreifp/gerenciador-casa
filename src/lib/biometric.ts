// Biometric (Face ID / fingerprint) app-lock helpers using WebAuthn platform authenticators.
// This is a local privacy lock: it gates the UI on this device. It does not replace login.

const CRED_KEY = 'biometric_credential_id';
const ENABLED_KEY = 'biometric_lock_enabled';

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach(b => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function isBiometricEnabled(): boolean {
  return localStorage.getItem(ENABLED_KEY) === 'true' && !!localStorage.getItem(CRED_KEY);
}

export function disableBiometric() {
  localStorage.removeItem(ENABLED_KEY);
  localStorage.removeItem(CRED_KEY);
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function registerBiometric(userId: string, userName: string): Promise<boolean> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userHandle = crypto.getRandomValues(new Uint8Array(16));

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: 'Orquídeas Wanda' },
      user: {
        id: userHandle,
        name: userName || userId,
        displayName: userName || 'Usuário',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },   // ES256
        { type: 'public-key', alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'discouraged',
      },
      timeout: 60000,
    },
  })) as PublicKeyCredential | null;

  if (!credential) return false;
  localStorage.setItem(CRED_KEY, toBase64Url(credential.rawId));
  localStorage.setItem(ENABLED_KEY, 'true');
  return true;
}

export async function verifyBiometric(): Promise<boolean> {
  const credId = localStorage.getItem(CRED_KEY);
  if (!credId) return false;
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  try {
    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [
          { type: 'public-key', id: fromBase64Url(credId).buffer as ArrayBuffer },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;
    return !!assertion;
  } catch {
    return false;
  }
}
