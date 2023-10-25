
import { Snowflake } from 'discord-api-types/globals';
import { WebSocketManager } from './WebSocket/WebSocketManager';
import { ClientOptions } from '../Types/ClientTypes';
import Events from '../Utils/Events';
import BaseClient from './BaseClient';
import ErrorCodes from './Error/ErrorCodes';
import Errors from './Error/Errors';
import { WebSocketShardStatus } from '../Types/GatewayTypes';

/**
 * The main hub for interacting with the Discord API, and the starting point for any bot.
 * @extends {BaseClient}
 */
export class Client extends BaseClient {
    ws!: WebSocketManager;
    token?: string | null;
    readyTimestamp: number | null;
    options!: ClientOptions;

    /**
     * @param {ClientOptions} options Options for the client
     */
    constructor(options: ClientOptions) {
        super(options);

        Object.defineProperty(this, 'token', { writable: true });

        this.options = options;

        /**
        * The WebSocket manager of the client
        * @type {WebSocketManager}
        */
        this.ws = new WebSocketManager(this);

        if (!this.token && 'DISCORD_TOKEN' in process.env) {
            /**
             * Authorization token for the logged in bot.
             * If present, this defaults to `process.env.DISCORD_TOKEN` when instantiating the client
             * <warn>This should be kept private at all times.</warn>
             * @type {?string}
             */
            this.token = process.env.DISCORD_TOKEN;
        } else {
            this.token = null;
        }

        /**
        * Timestamp of the time the client was last {@link Status.Ready} at
        * @type {?number}
        */
        this.readyTimestamp = null;
    }

    /**
    * Returns whether the client has logged in, indicative of being able to access
    * properties such as `user` and `application`.
    * @returns {boolean}
    */
    isReady() {
        return this.ws.status === WebSocketShardStatus.Ready;
    }

    /**
    * Logs the client in, establishing a WebSocket connection to Discord.
    * @param {string} [token=this.token] Token of the account to log in with
    * @returns {Promise<string>} Token of the account used
    * @example
    * client.login('my token');
    */
    public login(token: Snowflake): Snowflake {
        if (!token || typeof token !== 'string') throw new Errors.DiscordjsError(ErrorCodes.TokenInvalid);

        this.token = token = token.replace(/^(Bot|Bearer)\s*/i, '');
        
        this.ws.emit(Events.Debug, `Provided token: ${this._censoredToken}`);
        this.ws.emit(Events.Debug, 'Preparing to connect to the gateway...');

        this.ws.internalConnection();
        return this.token;
    }

    /**
     * Partially censored client token for debug logging purposes.
    * @type {?string}
    * @readonly
    * @private
    */
    private get _censoredToken() {
        if (!this.token) return null;

        return this.token
            .split('.')
            .map((val, i) => (i > 1 ? val.replace(/./g, '*') : val))
            .join('.');
    }

    /**
    * Time at which the client was last regarded as being in the {@link Status.Ready} state
    * (each time the client disconnects and successfully reconnects, this will be overwritten)
    * @type {?Date}
    * @readonly
    */
    get readyAt() {
        return this.readyTimestamp && new Date(this.readyTimestamp);
    }

    /**
    * How long it has been since the client last entered the {@link Status.Ready} state in milliseconds
    * @type {?number}
    * @readonly
    */
    get uptime() {
        return this.readyTimestamp && Date.now() - this.readyTimestamp;
    }
}