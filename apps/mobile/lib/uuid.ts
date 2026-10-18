import * as Crypto from 'expo-crypto';

/** RFC 4122 v4 from 16 random bytes. */
export function uuidFromBytes(b: Uint8Array): string {
  const bytes = Array.from(b);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Client-generated event id. expo-crypto's randomUUID is missing on web outside a secure context
 * (plain http on a LAN address), so fall back to random bytes.
 */
export function newId(): string {
  try {
    return Crypto.randomUUID();
  } catch {
    const bytes = new Uint8Array(16);
    try {
      Crypto.getRandomValues(bytes);
    } catch {
      for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    return uuidFromBytes(bytes);
  }
}
