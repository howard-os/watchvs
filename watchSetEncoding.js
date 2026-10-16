// Compact alphabet for 64 characters (2^6 for 6-bit encoding)
const WATCH_ALPHABET = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';

// Encode array of watch IDs to compact string with mode prefix
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
    
    // Convert each ID to 8-bit binary and concatenate
    let binaryParts = [];
    for (let i = 0; i < watchIds.length; i++) {
        const id = watchIds[i];
        const numId = parseInt(id);
        if (!Number.isInteger(numId) || numId < 1 || numId > 255) {
            console.error('Invalid ID at index', i, ':', id);
            return null;
        }
        binaryParts.push(numId.toString(2).padStart(8, '0'));
    }
    
    let binary = binaryParts.join('');
    
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
    
    const encoded = `${mode}:${result}`;
    console.log('Encoded:', watchIds, 'mode:', mode, '=>', encoded);
    return encoded;
}

// Decode compact string back to watch ID array with mode
function decodeWatchSet(encoded) {
    try {
        if (!encoded || typeof encoded !== 'string') return null;
        
        // Parse mode and data
        const colonIndex = encoded.indexOf(':');
        if (colonIndex !== 1) {
            console.error('Invalid encoded format (missing mode prefix):', encoded);
            return null;
        }
        
        const mode = encoded.substring(0, 1);
        const data = encoded.substring(2);
        
        if (mode !== 'c' && mode !== 'r') {
            console.error('Invalid mode:', mode);
            return null;
        }
        
        // Convert characters back to 6-bit binary
        let binary = '';
        for (let i = 0; i < data.length; i++) {
            const decimal = WATCH_ALPHABET.indexOf(data[i]);
            if (decimal === -1) {
                console.error('Invalid character in encoded string:', data[i]);
                return null;
            }
            binary += decimal.toString(2).padStart(6, '0');
        }
        
        // Extract 8-bit chunks as watch IDs
        let watchIds = [];
        for (let i = 0; i + 8 <= binary.length; i += 8) {
            const chunk = binary.substr(i, 8);
            const id = parseInt(chunk, 2);
            watchIds.push(id);
        }
        
        if (watchIds.length !== 10) {
            console.error('Decoded wrong number of IDs:', watchIds.length);
            return null;
        }
        
        console.log('Decoded:', encoded, '=>', watchIds, 'mode:', mode);
        return { watchIds, mode };
    } catch (e) {
        console.error('Error decoding watch set:', e);
        return null;
    }
}

export { encodeWatchSet, decodeWatchSet };
