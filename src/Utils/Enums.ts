'use strict';

function createEnum(keys: string[]) {
    const obj = {};

    for (const [index, key] of keys.entries()) {
        if (key === null) continue;
        obj[key] = index;
        obj[index] = key;
    }
    
    return obj;
}

export { createEnum };
