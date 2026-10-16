// Compact alphabet for 64 characters (2^6 for 6-bit encoding)
const WATCH_ALPHABET = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';

// Calculate binomial coefficient C(n, k)
function binomial(n, k) {
    if (k > n || k < 0) return 0;
    if (k === 0 || k === n) return 1;
    if (k > n - k) k = n - k;
    
    let result = 1;
    for (let i = 0; i < k; i++) {
        result = result * (n - i) / (i + 1);
    }
    return Math.round(result);
}

// Convert sorted array of watch IDs (1-211) to combination index
// Uses combinatorial number system (combinadic)
function rankCombination(watchIds) {
    // Convert 1-based IDs to 0-based indices and ensure sorted
    const indices = watchIds.map(id => id - 1).sort((a, b) => a - b);
    
    let rank = 0;
    for (let i = 0; i < indices.length; i++) {
        // Add C(indices[i], i+1) to the rank
        rank += binomial(indices[i], i + 1);
    }
    return rank;
}

// Convert combination index back to sorted array of watch IDs (1-211)
function unrankCombination(rank, k = 10, n = 211) {
    const indices = [];
    let r = rank;
    
    // Work backwards from position k to 1
    for (let i = k; i >= 1; i--) {
        // Find largest c such that C(c, i) <= r
        let c = i - 1;
        while (c < n && binomial(c + 1, i) <= r) {
            c++;
        }
        
        indices.unshift(c);
        r -= binomial(c, i);
    }
    
    // Convert 0-based indices back to 1-based IDs
    return indices.map(idx => idx + 1);
}

// Encode combination index into binary string
function encodeCombinationIndex(index) {
    // C(211, 10) ≈ 2.6e17, needs ~57 bits
    let binary = index.toString(2);
    
    // Pad to 57 bits
    binary = binary.padStart(57, '0');
    
    return binary;
}

// Decode binary string back to combination index
function decodeCombinationIndex(binary) {
    return parseInt(binary, 2);
}

// Encode array of watch IDs to compact string with mode encoded as single bit
function encodeWatchSet(watchIds, mode = 'c') {
    // Validate IDs
    if (!watchIds || watchIds.length !== 10) {
        console.error('Invalid watchIds:', watchIds);
        return null;
    }
    
    if (mode !== 'c' && mode !== 'r') {
        console.error('Invalid mode:', mode);
        return null;
    }
    
    let binary;
    
    // For choice mode, use combinatorial indexing
    if (mode === 'c') {
        const sorted = [...watchIds].sort((a, b) => a - b);
        const combIndex = rankCombination(sorted);
        binary = encodeCombinationIndex(combIndex);
    } else {
        // For ranking mode, still use 8-bit IDs (need to preserve order)
        let binaryParts = [];
        for (let i = 0; i < watchIds.length; i++) {
            const numId = parseInt(watchIds[i]);
            if (!Number.isInteger(numId) || numId < 1 || numId > 255) {
                console.error('Invalid ID at index', i, ':', numId);
                return null;
            }
            binaryParts.push(numId.toString(2).padStart(8, '0'));
        }
        binary = binaryParts.join('');
    }
    
    // Prepend mode bit: 0 for choice, 1 for ranking
    const modeBit = mode === 'r' ? '1' : '0';
    binary = modeBit + binary;
    
    // Pad to multiple of 6 bits for clean encoding
    while (binary.length % 6 !== 0) {
        binary += '0';
    }
    
    // Convert 6-bit chunks to characters
    let result = '';
    for (let i = 0; i < binary.length; i += 6) {
        const chunk = binary.substr(i, 6);
        const decimal = parseInt(chunk, 2);
        result += WATCH_ALPHABET[decimal];
    }
    
    console.log('Encoded:', watchIds, 'mode:', mode, '=>', result);
    return result;
}

// Decode compact string back to watch ID array with mode
function decodeWatchSet(encoded) {
    try {
        if (!encoded || typeof encoded !== 'string') return null;
        
        // Convert characters to 6-bit binary
        let binary = '';
        for (let i = 0; i < encoded.length; i++) {
            const decimal = WATCH_ALPHABET.indexOf(encoded[i]);
            if (decimal === -1) {
                console.error('Invalid character in encoded string:', encoded[i]);
                return null;
            }
            binary += decimal.toString(2).padStart(6, '0');
        }
        
        // Extract mode from first bit
        const modeBit = binary.substring(0, 1);
        const mode = modeBit === '1' ? 'r' : 'c';
        binary = binary.substring(1);
        
        let watchIds;
        
        if (mode === 'c') {
            // Decode choice mode using combinatorial indexing
            const combBinary = binary.substr(0, 57);
            const combIndex = decodeCombinationIndex(combBinary);
            watchIds = unrankCombination(combIndex, 10, 211);
        } else {
            // Decode ranking mode from 8-bit IDs
            watchIds = [];
            for (let i = 0; i + 8 <= binary.length; i += 8) {
                const chunk = binary.substr(i, 8);
                const id = parseInt(chunk, 2);
                watchIds.push(id);
            }
            
            if (watchIds.length !== 10) {
                console.error('Decoded wrong number of IDs:', watchIds.length);
                return null;
            }
        }
        
        console.log('Decoded:', encoded, '=>', watchIds, 'mode:', mode);
        return { watchIds, mode };
    } catch (e) {
        console.error('Error decoding watch set:', e);
        return null;
    }
}

export { encodeWatchSet, decodeWatchSet };
