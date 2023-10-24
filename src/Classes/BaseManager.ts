'use strict';

import Client from '../Client/Client';

/**
 * Manages the API methods of a data model.
 * @abstract
 */
class BaseManager {
    client!: Client;

    constructor(client: Client) {
        /**
         * The client that instantiated this Manager
         * @name BaseManager#client
         * @type {Client}
         * @readonly
         */
        Object.defineProperty(this, 'client', { value: client });
    }
}

export = BaseManager
