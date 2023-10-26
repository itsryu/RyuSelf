import { Client } from '../Client/Client';

/**
 * Represents a data model that is identifiable by a Snowflake (i.e. Discord API data models).
 * @abstract
 */
export class Base {
    client!: Client;

    constructor(client: Client) {
        /**
         * The client that instantiated this
         * @name Base#client
         * @type {Client}
         * @readonly
         */
        Object.defineProperty(this, 'client', { value: client });
    }

    _clone() {
        return Object.assign(Object.create(this), this);
    }
}