/**
 * src/services/ai/credentialVault.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative Client-Side BYOK Credential Lifecycle & Vault Engine for PromptHub.
 *
 * STRICT SECURITY INVARIANTS:
 * 1. ZERO Server-Side Key Persistence: User API keys are NEVER sent to or stored in
 *    the PromptHub database, Supabase tables, analytics, or server logs.
 * 2. Session-Only by Default: Unchecked "Remember" keys are held strictly in
 *    browser tab session memory and automatically destroyed on logout/tab close.
 * 3. Non-Extractable Web Crypto Encryption: Explicitly remembered keys are encrypted
 *    using AES-GCM 256-bit with non-extractable CryptoKeys stored in IndexedDB.
 * 4. Automatic Logout Cleanup: Logging out immediately wipes all temporary credentials
 *    and in-memory caches.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type AIProviderId =
  | 'aicredits'
  | 'openrouter'
  | 'sarvam'
  | 'deepgram'
  | 'assemblyai'
  | 'you_com'
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'deepseek'
  | 'groq'
  | 'mistral'
  | 'xai'
  | 'cohere'
  | 'together'
  | 'codecraft'
  | 'aihubmix'
  | 'tokenrouter'
  | 'bynara'
  | 'conduit'
  | 'bluesminds';

export interface CredentialMetadata {
  providerId: AIProviderId;
  isRemembered: boolean;
  keyMasked: string;
  updatedAt: number;
}

interface EncryptedVaultRecord {
  ivHex: string;
  ciphertextHex: string;
  updatedAt: number;
}

const DB_NAME = 'ph_credential_vault_db';
const DB_VERSION = 1;
const STORE_KEYS = 'vault_keys';
const MASTER_KEY_ID = 'ph_device_vault_master_key';

// Volatile in-memory cache for active session
const memoryVault: Map<string, string> = new Map();
const rememberedRegistry: Set<string> = new Set();

// Unique session nonce generated per browser tab load
export const SESSION_NONCE: string = (function () {
  if (typeof window === 'undefined') return 'server_noop';
  try {
    let nonce = sessionStorage.getItem('__ph_session_nonce__');
    if (!nonce) {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        nonce = crypto.randomUUID();
      } else {
        nonce = `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      }
      sessionStorage.setItem('__ph_session_nonce__', nonce);
    }
    return nonce;
  } catch {
    return `mem_${Date.now()}`;
  }
})();

// Helper: Open private IndexedDB for non-extractable CryptoKey storage
function openVaultDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_KEYS)) {
          db.createObjectStore(STORE_KEYS);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

// Helper: Get or generate non-extractable AES-GCM 256-bit CryptoKey
async function getOrCreateVaultKey(): Promise<CryptoKey | null> {
  if (typeof window === 'undefined' || typeof crypto === 'undefined' || !crypto.subtle) {
    return null;
  }

  const db = await openVaultDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_KEYS, 'readwrite');
      const store = tx.objectStore(STORE_KEYS);
      const getReq = store.get(MASTER_KEY_ID);

      getReq.onsuccess = async () => {
        if (getReq.result) {
          resolve(getReq.result as CryptoKey);
          return;
        }

        // Generate non-extractable 256-bit AES-GCM key (extractable: false prevents JS key dump)
        try {
          const newKey = await crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            false, // Non-extractable!
            ['encrypt', 'decrypt']
          );

          const putTx = db.transaction(STORE_KEYS, 'readwrite');
          const putStore = putTx.objectStore(STORE_KEYS);
          putStore.put(newKey, MASTER_KEY_ID);
          putTx.oncomplete = () => resolve(newKey);
          putTx.onerror = () => resolve(newKey);
        } catch {
          resolve(null);
        }
      };

      getReq.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

// Helper: Hex conversions
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const buffer = new ArrayBuffer(hex.length / 2);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// Helper: Encrypt plaintext using Web Crypto AES-GCM
async function encryptSecret(plaintext: string): Promise<EncryptedVaultRecord | null> {
  const key = await getOrCreateVaultKey();
  if (!key || typeof crypto === 'undefined' || !crypto.subtle) {
    return null;
  }

  try {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(plaintext);
    const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12))); // 96-bit standard IV

    const ciphertextBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      encoded as BufferSource
    );

    return {
      ivHex: bytesToHex(iv),
      ciphertextHex: bytesToHex(new Uint8Array(ciphertextBuffer)),
      updatedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

// Helper: Decrypt ciphertext using Web Crypto AES-GCM
async function decryptSecret(record: EncryptedVaultRecord): Promise<string | null> {
  const key = await getOrCreateVaultKey();
  if (!key || typeof crypto === 'undefined' || !crypto.subtle) {
    return null;
  }

  try {
    const iv = hexToBytes(record.ivHex);
    const ciphertext = hexToBytes(record.ciphertextHex);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      ciphertext as BufferSource
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch {
    return null;
  }
}

export class CredentialVault {
  private isInitialized = false;

  /**
   * Initializes the vault on app launch, restoring remembered credentials from encrypted storage.
   */
  public async init(): Promise<void> {
    if (this.isInitialized || typeof window === 'undefined') return;

    // Load any explicitly remembered keys from encrypted local storage into volatile cache
    try {
      const rememberedKeysJson = localStorage.getItem('ph_remembered_providers');
      if (rememberedKeysJson) {
        const rememberedList: string[] = JSON.parse(rememberedKeysJson);
        for (const providerId of rememberedList) {
          const encRecordStr = localStorage.getItem(`ph_vault_enc_${providerId}`);
          if (encRecordStr) {
            try {
              const encRecord: EncryptedVaultRecord = JSON.parse(encRecordStr);
              const decrypted = await decryptSecret(encRecord);
              if (decrypted && decrypted.trim()) {
                memoryVault.set(providerId, decrypted.trim());
                rememberedRegistry.add(providerId);
              }
            } catch {}
          }
        }
      }
    } catch {}

    // Load active session-only credentials from sessionStorage (scoped to current tab nonce)
    try {
      const sessionKeysJson = sessionStorage.getItem('ph_session_providers');
      if (sessionKeysJson) {
        const sessionList: string[] = JSON.parse(sessionKeysJson);
        for (const providerId of sessionList) {
          const key = sessionStorage.getItem(`ph_session_key_${providerId}`);
          if (key && key.trim()) {
            memoryVault.set(providerId, key.trim());
          }
        }
      }
    } catch {}

    this.isInitialized = true;
  }

  /**
   * Synchronous fast-path credential retrieval for immediate execution dispatch.
   */
  public getCredentialSync(providerId: string): string {
    const canonical = (providerId || '').toLowerCase().trim();
    if (!canonical) return '';

    // 1. Check volatile memory cache
    const inMem = memoryVault.get(canonical);
    if (inMem) return inMem;

    // 2. Check tab sessionStorage for active session key
    if (typeof window !== 'undefined') {
      try {
        const fromSession = sessionStorage.getItem(`ph_session_key_${canonical}`);
        if (fromSession && fromSession.trim()) {
          memoryVault.set(canonical, fromSession.trim());
          return fromSession.trim();
        }

        // Backward compatibility fallback for active session
        const legacySession = sessionStorage.getItem(`${canonical}_api_key`) || sessionStorage.getItem(`ph_byok_${canonical}`);
        if (legacySession && legacySession.trim()) {
          memoryVault.set(canonical, legacySession.trim());
          return legacySession.trim();
        }

        // Direct local storage fallback
        const localPlain = localStorage.getItem(`${canonical}_api_key`) || localStorage.getItem(`ph_byok_${canonical}`) || localStorage.getItem(`ph_session_key_${canonical}`);
        if (localPlain && localPlain.trim()) {
          memoryVault.set(canonical, localPlain.trim());
          return localPlain.trim();
        }

        // Environment variable fallback
        if (typeof import.meta !== 'undefined' && import.meta.env) {
          if (canonical === 'you_com' && import.meta.env.VITE_YOU_COM_API_KEY) {
            return String(import.meta.env.VITE_YOU_COM_API_KEY).trim();
          }
        }
      } catch {}
    }

    return '';
  }

  /**
   * Asynchronous credential retrieval (supports background decryption if needed).
   */
  public async getCredential(providerId: string): Promise<string> {
    const fast = this.getCredentialSync(providerId);
    if (fast) return fast;

    const canonical = (providerId || '').toLowerCase().trim();
    if (typeof window === 'undefined') return '';

    // If marked as remembered, attempt decryption
    if (rememberedRegistry.has(canonical) || localStorage.getItem(`ph_vault_enc_${canonical}`)) {
      try {
        const encRecordStr = localStorage.getItem(`ph_vault_enc_${canonical}`);
        if (encRecordStr) {
          const encRecord: EncryptedVaultRecord = JSON.parse(encRecordStr);
          const decrypted = await decryptSecret(encRecord);
          if (decrypted && decrypted.trim()) {
            memoryVault.set(canonical, decrypted.trim());
            rememberedRegistry.add(canonical);
            return decrypted.trim();
          }
        }
      } catch {}
    }

    return '';
  }

  /**
   * Save a credential.
   * DEFAULT: Scoped strictly to the active browser session (remember = false).
   * OPT-IN: Encrypted locally using Web Crypto AES-GCM (remember = true).
   */
  public async setCredential(
    providerId: string,
    apiKey: string,
    options: { remember?: boolean } = { remember: false }
  ): Promise<void> {
    const canonical = (providerId || '').toLowerCase().trim();
    const cleanKey = (apiKey || '').trim();

    if (!cleanKey) {
      await this.removeCredential(canonical);
      return;
    }

    // Always populate active volatile memory cache
    memoryVault.set(canonical, cleanKey);

    if (typeof window === 'undefined') return;

    if (options.remember) {
      // ── OPT-IN PERSISTENT LOCAL STORAGE ──
      // Encrypt with Web Crypto AES-GCM and save locally
      rememberedRegistry.add(canonical);
      const encRecord = await encryptSecret(cleanKey);
      if (encRecord) {
        try {
          localStorage.setItem(`ph_vault_enc_${canonical}`, JSON.stringify(encRecord));
          const remList = Array.from(rememberedRegistry);
          localStorage.setItem('ph_remembered_providers', JSON.stringify(remList));
        } catch {}
      }

      // Also mirror in sessionStorage for seamless active session access
      try {
        sessionStorage.setItem(`ph_session_key_${canonical}`, cleanKey);
      } catch {}
    } else {
      // ── DEFAULT: SESSION-ONLY STORAGE ──
      // Clean any persistent remembered record
      rememberedRegistry.delete(canonical);
      try {
        localStorage.removeItem(`ph_vault_enc_${canonical}`);
        const remList = Array.from(rememberedRegistry);
        localStorage.setItem('ph_remembered_providers', JSON.stringify(remList));
      } catch {}

      // Save exclusively in tab-scoped sessionStorage
      try {
        sessionStorage.setItem(`ph_session_key_${canonical}`, cleanKey);
        const sessionListJson = sessionStorage.getItem('ph_session_providers');
        const sessionList: string[] = sessionListJson ? JSON.parse(sessionListJson) : [];
        if (!sessionList.includes(canonical)) {
          sessionList.push(canonical);
          sessionStorage.setItem('ph_session_providers', JSON.stringify(sessionList));
        }
      } catch {}
    }

    // Clean legacy plaintext keys from un-consented localStorage
    if (!options.remember) {
      try {
        localStorage.removeItem(`${canonical}_api_key`);
        localStorage.removeItem(`ph_byok_${canonical}`);
      } catch {}
    }

    // Notify UI components
    try {
      window.dispatchEvent(
        new CustomEvent('ph_byok_keys_updated', {
          detail: { providerId: canonical, isRemembered: !!options.remember },
        })
      );
    } catch {}
  }

  /**
   * Remove credential for a specific provider.
   */
  public async removeCredential(providerId: string): Promise<void> {
    const canonical = (providerId || '').toLowerCase().trim();
    memoryVault.delete(canonical);
    rememberedRegistry.delete(canonical);

    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(`ph_session_key_${canonical}`);
        sessionStorage.removeItem(`${canonical}_api_key`);
        sessionStorage.removeItem(`ph_byok_${canonical}`);

        const sessionListJson = sessionStorage.getItem('ph_session_providers');
        if (sessionListJson) {
          const list: string[] = JSON.parse(sessionListJson);
          const filtered = list.filter((p) => p !== canonical);
          sessionStorage.setItem('ph_session_providers', JSON.stringify(filtered));
        }
      } catch {}

      try {
        localStorage.removeItem(`ph_vault_enc_${canonical}`);
        localStorage.removeItem(`${canonical}_api_key`);
        localStorage.removeItem(`ph_byok_${canonical}`);

        const remList = Array.from(rememberedRegistry);
        localStorage.setItem('ph_remembered_providers', JSON.stringify(remList));
      } catch {}

      try {
        window.dispatchEvent(
          new CustomEvent('ph_byok_keys_updated', {
            detail: { providerId: canonical, isRemoved: true },
          })
        );
      } catch {}
    }
  }

  /**
   * Check if a credential exists in vault (either active session or remembered).
   */
  public hasCredential(providerId: string): boolean {
    const canonical = (providerId || '').toLowerCase().trim();
    if (this.getCredentialSync(canonical).length > 0) return true;
    if (typeof window !== 'undefined') {
      try {
        if (localStorage.getItem(`ph_vault_enc_${canonical}`)) return true;
        if (localStorage.getItem(`${canonical}_api_key`)) return true;
        if (localStorage.getItem(`ph_byok_${canonical}`)) return true;
        if (sessionStorage.getItem(`ph_session_key_${canonical}`)) return true;
        if (sessionStorage.getItem(`${canonical}_api_key`)) return true;
        if (sessionStorage.getItem(`ph_byok_${canonical}`)) return true;
      } catch {}
    }
    return false;
  }

  /**
   * Check if a credential has explicit user consent to be remembered across browser restarts.
   */
  public isRemembered(providerId: string): boolean {
    const canonical = (providerId || '').toLowerCase().trim();
    return rememberedRegistry.has(canonical) || (typeof window !== 'undefined' && !!localStorage.getItem(`ph_vault_enc_${canonical}`));
  }

  /**
   * AUTOMATIC LOGOUT & SESSION CLEANUP:
   * Erases all temporary session-only credentials from browser storage and in-memory caches.
   * Remembered credentials (explicitly opted in) are preserved in encrypted form.
   */
  public clearTemporaryCredentials(): void {
    // Clear all in-memory keys that are NOT remembered
    for (const key of memoryVault.keys()) {
      if (!rememberedRegistry.has(key)) {
        memoryVault.delete(key);
      }
    }

    if (typeof window !== 'undefined') {
      try {
        // Clear all session storage credentials
        const sessionListJson = sessionStorage.getItem('ph_session_providers');
        if (sessionListJson) {
          const list: string[] = JSON.parse(sessionListJson);
          for (const providerId of list) {
            sessionStorage.removeItem(`ph_session_key_${providerId}`);
            sessionStorage.removeItem(`${providerId}_api_key`);
            sessionStorage.removeItem(`ph_byok_${providerId}`);
          }
          sessionStorage.removeItem('ph_session_providers');
        }

        // Clean any un-consented legacy local keys
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.endsWith('_api_key') || k.startsWith('ph_byok_'))) {
            const provider = k.replace('_api_key', '').replace('ph_byok_', '');
            if (!rememberedRegistry.has(provider)) {
              localStorage.removeItem(k);
            }
          }
        }

        window.dispatchEvent(new CustomEvent('ph_byok_keys_updated', { detail: { clearedTemporary: true } }));
      } catch {}
    }
  }

  /**
   * TOTAL PURGE / FORGET ALL API KEYS:
   * Permanently erases all credentials (temporary + remembered) and deletes device encryption keys.
   */
  public async clearAllCredentials(): Promise<void> {
    memoryVault.clear();
    rememberedRegistry.clear();

    if (typeof window !== 'undefined') {
      try {
        sessionStorage.clear();
      } catch {}

      try {
        // Remove all encrypted vault records and legacy keys from localStorage
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('ph_vault_enc_') || k.endsWith('_api_key') || k.startsWith('ph_byok_') || k === 'ph_remembered_providers')) {
            keysToRemove.push(k);
          }
        }
        for (const k of keysToRemove) {
          localStorage.removeItem(k);
        }

        // Clear master key from IndexedDB
        const db = await openVaultDB();
        if (db) {
          const tx = db.transaction(STORE_KEYS, 'readwrite');
          tx.objectStore(STORE_KEYS).clear();
        }

        window.dispatchEvent(new CustomEvent('ph_byok_keys_updated', { detail: { clearedAll: true } }));
      } catch {}
    }
  }

  /**
   * Get list of currently connected provider IDs.
   */
  public getConnectedProviders(allProviders: string[]): string[] {
    return allProviders.filter((p) => this.hasCredential(p));
  }

  /**
   * Get current session nonce.
   */
  public getSessionNonce(): string {
    return SESSION_NONCE;
  }

  /**
   * Mask an API key for safe UI display (e.g. "sk-proj-...4f8b").
   */
  public maskKey(apiKey: string): string {
    if (!apiKey || typeof apiKey !== 'string') return '';
    const clean = apiKey.trim();
    if (clean.length <= 8) return '••••••••';
    const prefix = clean.slice(0, 4);
    const suffix = clean.slice(-4);
    return `${prefix}••••••••${suffix}`;
  }
}

export const credentialVault = new CredentialVault();

// Auto-initialize on browser load
if (typeof window !== 'undefined') {
  credentialVault.init().catch(() => {});
}
