import { GATE_HASH, GATE_ITERATIONS, GATE_SALT } from "./gate";

const SALT_KEY = "shoplog.vault.salt";

const hex = (bytes: Uint8Array) => [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");

const unhex = (s: string) => {
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return out;
};

const b64 = (bytes: Uint8Array) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

const unb64 = (s: string) => {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const same = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let v = 0;
  for (let i = 0; i < a.length; i++) v |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return v === 0;
};

async function derive(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bytes = new Uint8Array(new ArrayBuffer(salt.byteLength));
  bytes.set(salt);
  return crypto.subtle.deriveBits({ name: "PBKDF2", salt: bytes, iterations: GATE_ITERATIONS, hash: "SHA-256" }, base, 256);
}

/** Checks the shop password against the verifier baked into the app. */
export async function passwordMatches(password: string): Promise<boolean> {
  if (!password) return false;
  const bits = new Uint8Array(await derive(password, unhex(GATE_SALT)));
  return same(hex(bits), GATE_HASH);
}

/** Key for this browser's saved tickets and settings. The salt stays on the device; the key does not. */
export async function openVault(password: string): Promise<CryptoKey> {
  let saltHex = localStorage.getItem(SALT_KEY);
  if (!saltHex || !/^[0-9a-f]{32}$/.test(saltHex)) {
    saltHex = hex(crypto.getRandomValues(new Uint8Array(16)));
    localStorage.setItem(SALT_KEY, saltHex);
  }
  const bits = await derive(password, unhex(saltHex));
  return crypto.subtle.importKey("raw", bits, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function seal(key: CryptoKey, text: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(text)));
  return JSON.stringify({ v: 1, iv: b64(iv), ct: b64(ct) });
}

export async function unseal(key: CryptoKey, packed: string): Promise<string> {
  const o = JSON.parse(packed) as { iv: string; ct: string };
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(o.iv) }, key, unb64(o.ct));
  return new TextDecoder().decode(plain);
}
