const CURRENT_VERSION = 3;
const CURRENT_ITERATIONS = 600000;
const LEGACY_VERSION = 1;
const LEGACY_ITERATIONS = 310000;
const PREVIOUS_VERSION = 2;
const PREVIOUS_ITERATIONS = 600000;

function encodeBase64(bytes) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function decodeBase64(value, expectedLength) {
  if (typeof value !== "string" || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error("Encrypted data format is invalid");
  }
  const bytes = Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
  if (expectedLength !== undefined && bytes.length !== expectedLength) {
    throw new Error("Encrypted data format is invalid");
  }
  return bytes;
}

function getAssociatedData(version, iterations, salt) {
  return new TextEncoder().encode(`CycleCare vault|${version}|${iterations}|${salt}`);
}

async function deriveEncryptionKey(secret, salt, iterations, cryptoProvider) {
  const material = await cryptoProvider.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return cryptoProvider.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptVaultData(data, key, metadata, cryptoProvider = globalThis.crypto) {
  const iv = cryptoProvider.getRandomValues(new Uint8Array(12));
  const parameters = { name: "AES-GCM", iv };
  if (metadata.version === CURRENT_VERSION) {
    parameters.additionalData = getAssociatedData(
      metadata.version,
      metadata.iterations,
      metadata.salt
    );
  }
  const ciphertext = await cryptoProvider.subtle.encrypt(
    parameters,
    key,
    new TextEncoder().encode(JSON.stringify(data))
  );
  return JSON.stringify({
    version: metadata.version,
    iterations: metadata.iterations,
    salt: metadata.salt,
    iv: encodeBase64(iv),
    ciphertext: encodeBase64(new Uint8Array(ciphertext)),
  });
}

export async function createVaultEnvelope(data, pin, cryptoProvider = globalThis.crypto) {
  if (!/^\d{5}$/.test(pin)) {
    throw new Error("The vault PIN must contain exactly five digits.");
  }
  const salt = cryptoProvider.getRandomValues(new Uint8Array(16));
  const metadata = {
    version: CURRENT_VERSION,
    iterations: CURRENT_ITERATIONS,
    salt: encodeBase64(salt),
  };
  const key = await deriveEncryptionKey(
    pin,
    salt,
    metadata.iterations,
    cryptoProvider
  );
  return {
    envelope: await encryptVaultData(data, key, metadata, cryptoProvider),
    key,
    metadata,
  };
}

export async function openVaultEnvelope(envelope, secret, cryptoProvider = globalThis.crypto) {
  let payload;
  try {
    payload = JSON.parse(envelope);
  } catch {
    throw new Error("Encrypted data format is invalid");
  }
  const validLegacy = payload?.version === LEGACY_VERSION &&
    payload.iterations === LEGACY_ITERATIONS;
  const validPrevious = payload?.version === PREVIOUS_VERSION &&
    payload.iterations === PREVIOUS_ITERATIONS;
  const validCurrent = payload?.version === CURRENT_VERSION &&
    payload.iterations === CURRENT_ITERATIONS;
  if (
    (!validLegacy && !validPrevious && !validCurrent) ||
    typeof payload.salt !== "string" ||
    typeof payload.iv !== "string" ||
    typeof payload.ciphertext !== "string"
  ) {
    throw new Error("Encrypted data format is invalid");
  }

  const saltBytes = decodeBase64(payload.salt, 16);
  const iv = decodeBase64(payload.iv, 12);
  const ciphertext = decodeBase64(payload.ciphertext);
  if (ciphertext.length < 16) throw new Error("Encrypted data format is invalid");
  const key = await deriveEncryptionKey(
    secret,
    saltBytes,
    payload.iterations,
    cryptoProvider
  );
  const parameters = { name: "AES-GCM", iv };
  if (validCurrent || validPrevious) {
    parameters.additionalData = getAssociatedData(
      payload.version,
      payload.iterations,
      payload.salt
    );
  }
  const plaintext = await cryptoProvider.subtle.decrypt(parameters, key, ciphertext);
  return {
    data: JSON.parse(new TextDecoder().decode(plaintext)),
    key,
    metadata: {
      version: payload.version,
      iterations: payload.iterations,
      salt: payload.salt,
    },
  };
}
