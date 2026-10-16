import { encodeWatchSet, decodeWatchSet } from './watchSetEncoding.js';
import assert from 'assert';

const test = (name, fn) => {
    try {
        fn();
        console.log(`✓ ${name}`);
    } catch (err) {
        console.error(`✗ ${name}`);
        console.error(`  ${err.message}`);
        process.exit(1);
    }
};

// Basic encoding/decoding roundtrip
test('encodes 10 watch IDs and decodes back to same', () => {
    const ids = [1, 5, 10, 15, 20, 25, 30, 35, 40, 45];
    const encoded = encodeWatchSet(ids);
    assert.ok(encoded, 'Encoding should produce a result');
    assert.strictEqual(typeof encoded, 'string', 'Encoding should produce a string');
    
    const decoded = decodeWatchSet(encoded);
    assert.deepStrictEqual(decoded, ids, 'Decoded IDs should match original');
});

// Edge cases: low and high IDs
test('encodes with min and max IDs', () => {
    const ids = [1, 1, 1, 1, 1, 255, 255, 255, 255, 255];
    const encoded = encodeWatchSet(ids);
    assert.ok(encoded);
    const decoded = decodeWatchSet(encoded);
    assert.deepStrictEqual(decoded, ids);
});

// Invalid inputs
test('returns null for non-array input', () => {
    assert.strictEqual(encodeWatchSet(null), null);
    assert.strictEqual(encodeWatchSet(undefined), null);
});

test('returns null for wrong length array', () => {
    assert.strictEqual(encodeWatchSet([1, 2, 3]), null);
    assert.strictEqual(encodeWatchSet([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]), null);
});

test('returns null for array with invalid IDs', () => {
    const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, -1]; // negative ID
    assert.strictEqual(encodeWatchSet(ids), null);
});

test('returns null for array with IDs > 255', () => {
    const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 256];
    assert.strictEqual(encodeWatchSet(ids), null);
});

// Decoding invalid input
test('returns null for invalid encoded string', () => {
    assert.strictEqual(decodeWatchSet(null), null);
    assert.strictEqual(decodeWatchSet(undefined), null);
    assert.strictEqual(decodeWatchSet(''), null);
});

test('returns null for encoded string with invalid characters', () => {
    assert.strictEqual(decodeWatchSet('invalid!!'), null);
});

test('returns null for too-short encoded string', () => {
    const encoded = encodeWatchSet([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const truncated = encoded.slice(0, -1);
    assert.strictEqual(decodeWatchSet(truncated), null);
});

// URL-safe characters
test('encoded string uses only URL-safe alphabet', () => {
    const ids = [50, 100, 150, 75, 25, 125, 175, 200, 225, 250];
    const encoded = encodeWatchSet(ids);
    assert.ok(/^[0-9A-Za-z\-_.+/]*$/.test(encoded), 'Encoded string should only contain URL-safe characters');
});

// Compact encoding
test('encoded string is relatively short (< 20 chars for 10 IDs)', () => {
    const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const encoded = encodeWatchSet(ids);
    assert.ok(encoded.length <= 20, `Encoded length ${encoded.length} should be <= 20`);
});

console.log('\nAll tests passed!');
