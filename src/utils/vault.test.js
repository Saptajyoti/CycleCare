import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { createVaultEnvelope, encryptVaultData, openVaultEnvelope } from "./vault.js";

const cryptoProvider = webcrypto;
const records = {
  periods: '[{"startDate":"2025-01-01"}]',
  symptoms: '[{"date":"2025-01-02","note":"private"}]',
};

test("encrypts vault records and opens them only with the correct five-digit PIN", async () => {
  const { envelope, key, metadata } = await createVaultEnvelope(records, "48291", cryptoProvider);
  const opened = await openVaultEnvelope(envelope, "48291", cryptoProvider);

  assert.deepEqual(opened.data, records);
  assert.equal(opened.metadata.version, 3);
  assert.equal(opened.metadata.iterations, 600000);
  await assert.rejects(openVaultEnvelope(envelope, "48290", cryptoProvider));
  await assert.rejects(createVaultEnvelope(records, "1234", cryptoProvider), /exactly five digits/);
  await assert.rejects(createVaultEnvelope(records, "123456", cryptoProvider), /exactly five digits/);

  const savedAgain = await encryptVaultData(records, key, metadata, cryptoProvider);
  assert.notEqual(JSON.parse(savedAgain).iv, JSON.parse(envelope).iv);
  assert.deepEqual(
    (await openVaultEnvelope(savedAgain, "48291", cryptoProvider)).data,
    records
  );
});

test("rejects modified authenticated vault metadata and malformed payloads", async () => {
  const { envelope } = await createVaultEnvelope(records, "48291", cryptoProvider);
  const payload = JSON.parse(envelope);
  payload.iterations = 310000;
  await assert.rejects(openVaultEnvelope(JSON.stringify(payload), "48291", cryptoProvider));
  await assert.rejects(openVaultEnvelope("not json", "48291", cryptoProvider), /format is invalid/);
});

test("encodes and encrypts health records larger than a single base64 chunk", async () => {
  const largeRecords = { note: "private".repeat(15000) };
  const { envelope } = await createVaultEnvelope(largeRecords, "48291", cryptoProvider);
  const opened = await openVaultEnvelope(envelope, "48291", cryptoProvider);

  assert.deepEqual(opened.data, largeRecords);
});

test("opens the existing version-one four-digit PIN format for migration", async () => {
  const saltBytes = cryptoProvider.getRandomValues(new Uint8Array(16));
  const salt = btoa(String.fromCharCode(...saltBytes));
  const material = await cryptoProvider.subtle.importKey(
    "raw",
    new TextEncoder().encode("1234"),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const key = await cryptoProvider.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBytes, iterations: 310000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  const iv = cryptoProvider.getRandomValues(new Uint8Array(12));
  const ciphertext = await cryptoProvider.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(records))
  );
  const legacy = JSON.stringify({
    version: 1,
    iterations: 310000,
    salt,
    iv: btoa(String.fromCharCode(...iv)),
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
  });

  const opened = await openVaultEnvelope(legacy, "1234", cryptoProvider);
  assert.deepEqual(opened.data, records);
  assert.equal(opened.metadata.version, 1);

  const upgraded = await createVaultEnvelope(opened.data, "58291", cryptoProvider);
  assert.deepEqual(
    (await openVaultEnvelope(upgraded.envelope, "58291", cryptoProvider)).data,
    records
  );
  await assert.rejects(
    openVaultEnvelope(upgraded.envelope, "1234", cryptoProvider)
  );
});

test("opens existing version-two passphrase vaults so they can be migrated", async () => {
  const saltBytes = cryptoProvider.getRandomValues(new Uint8Array(16));
  const salt = btoa(String.fromCharCode(...saltBytes));
  const material = await cryptoProvider.subtle.importKey(
    "raw",
    new TextEncoder().encode("legacy passphrase"),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const key = await cryptoProvider.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBytes, iterations: 600000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  const iv = cryptoProvider.getRandomValues(new Uint8Array(12));
  const additionalData = new TextEncoder().encode(`CycleCare vault|2|600000|${salt}`);
  const ciphertext = await cryptoProvider.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData },
    key,
    new TextEncoder().encode(JSON.stringify(records))
  );
  const legacy = JSON.stringify({
    version: 2,
    iterations: 600000,
    salt,
    iv: btoa(String.fromCharCode(...iv)),
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
  });

  const opened = await openVaultEnvelope(legacy, "legacy passphrase", cryptoProvider);
  assert.deepEqual(opened.data, records);
  assert.equal(opened.metadata.version, 2);
  const migrated = await createVaultEnvelope(opened.data, "56123", cryptoProvider);
  assert.deepEqual((await openVaultEnvelope(migrated.envelope, "56123", cryptoProvider)).data, records);
});
