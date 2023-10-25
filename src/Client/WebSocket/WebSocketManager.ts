import WebSocket from 'ws';
import { Operation, GatewayIdentify, SocketEvent, EventType, WebSocketEvents, WebSocketShardStatus } from '../../Types/GatewayTypes';
import { EventEmitter } from 'node:events';
import { setTimeout as sleep } from 'node:timers/promises';
import { Message } from '../../Classes/Message';
import Base from '../../Classes/Base';
import BaseClient from '../BaseClient';
import { Client } from '../Client';
import Events from '../../Utils/Events';
import { WebSocketShard } from './WebSocketShards';
import { Collection } from '../../Classes/Collection';
import { AsyncQueue } from '@sapphire/async-queue';
import { Util } from '../../Utils/Util';
import { SendRateLimitState } from '../../Types/ClientTypes';

export class WebSocketManager extends EventEmitter {
    _ws: WebSocket;
    client!: Client;
    shards: Collection<number, WebSocketShard>;
    private readonly sendQueue = new AsyncQueue();
    private sendRateLimitState: SendRateLimitState = Util.getInitialSendRateLimitState();
    initialConnectResolved = false;
    #status: WebSocketShardStatus = WebSocketShardStatus.Idle;

    constructor(client: Client) {
        super();

        /**
        * The client that instantiated this WebSocketManager
        * @type {Client}
        * @readonly
        * @name WebSocketManager#client
        */
        Object.defineProperty(this, 'client', { value: client });

        /**
        * A collection of all shards this manager handles
        * @type {Collection<number, WebSocketShard>}
        */
        this.shards = new Collection();

        /**
        * An array of queued events before this WebSocketManager became ready
        * @type {Object[]}
        * @private
        * @name WebSocketManager#packetQueue
        */
        Object.defineProperty(this, 'packetQueue', { value: [] });

        /**
        * The internal WebSocketManager from `@discordjs/ws`.
        * @type {WSWebSocketManager}
        * @private
        */
        this._ws = new WebSocket(process.env.GATEWAY_URL);
    }

    public get status(): WebSocketShardStatus {
        return this.#status;
    }

    /**
    * The average ping of all WebSocketShards
    * @type {number}
    * @readonly
    */
    get ping() {
        const sum = this.shards.reduce((a, b) => a + b.ping, 0);
        return sum / this.shards.size;
    }

    private async send(op: Operation, d?: any): Promise<void> {
        if (!this._ws) {
            throw new Error("WebSocketShard wasn't connected");
        }

        await this.sendQueue.wait();

        if (--this.sendRateLimitState.remaining <= 0) {
            const now = Date.now();

            if (this.sendRateLimitState.resetAt > now) {
                const sleepFor = this.sendRateLimitState.resetAt - now;

                this.debug(`Was about to hit the send rate limit, sleeping for ${sleepFor}ms`);
                const controller = new AbortController();

                const interrupted = await Promise.race([
                    sleep(sleepFor).then(() => false),
                    WebSocketManager.once(this, 'closed', { signal: controller.signal }).then(() => true)
                ]);

                if (interrupted) {
                    this.debug('Connection closed while waiting for the send rate limit to reset, re-queueing payload');
                    this.sendQueue.shift();
                    return this._ws.send(JSON.stringify({ op, d }));
                }

                controller.abort();
            }

            this.sendRateLimitState = Util.getInitialSendRateLimitState();
        }

        this.sendQueue.shift();

        if (this._ws !== null && this._ws.readyState === WebSocket.OPEN) this._ws.send(JSON.stringify({ op, d }));
    }

    public async internalConnection() {
        const controller = new AbortController();
        let promise;

        if (!this.initialConnectResolved) {
            // Sleep for the remaining time, but if the connection closes in the meantime, we shouldn't wait the remainder to avoid blocking the new conn
            promise = Promise.race([
                WebSocketManager.once(this, WebSocketEvents.Ready, { signal: controller.signal }),
                WebSocketManager.once(this, WebSocketEvents.Resumed, { signal: controller.signal })
            ]);
        }

        void this.connect();

        try {
            await promise;
        } catch ({ error }: any) {
            throw error;
        } finally {
            controller.abort();
        }

        this.initialConnectResolved = true;
    }

    private connect() {
        if (this.#status !== WebSocketShardStatus.Idle) {
            throw new Error("Tried to connect a shard that wasn't idle");
        }

        this.#status = WebSocketShardStatus.Connecting;

        this._ws.on('open', async () => {
            await this.identify();

            new Base(this.client);
            this.debug("WebSocket it's on CONNECTED state.");
        });

        this._ws.on('message', async (data: string) => {
            const { op, t, d }: SocketEvent = JSON.parse(data);

            if (op === Operation.Hello) {
                setInterval(
                    async () => await this.send(Operation.Heartbeat, null),
                    (d as { heartbeat_interval: number }).heartbeat_interval
                );
            }

            if (op === Operation.Reconnect) {
                this.debug('Reconnecting to the gateway...');

                await this.send(Operation.Resume, {
                    token: process.env.USER_TOKEN
                });
            }

            if (op === Operation.Dispatch && t) {
                if ([EventType.READY].includes(t)) {
                    this.emit('ready', new BaseClient());
                }

                if ([EventType.MESSAGE_CREATE].includes(t)) {
                    this.emit('messageCreate', new Message(this.client, d));
                }
            }
        });

        this._ws.on('close', () => {
            this.debug('Gateway connection closed.');
        });
    }

    private async identify() {
        await this.send(Operation.Identify, {
            token: this.client.token,
            intents: this.client.options.intents?.reduce((a, b) => a | b, 0),
            properties: {
                browser: 'linux',
                device: 'chrome',
                os: 'chrome'
            }
        } as GatewayIdentify);
    }

    /**
   * Emits a debug message.
   * @param {string} message The debug message
   * @param {?number} [shardId] The id of the shard that emitted this message, if any
   * @private
   */
    public debug(message: string, shardId?: number) {
        this.emit(Events.Debug, `[WS => ${typeof shardId === 'number' ? `Shard ${shardId}` : 'Manager'}] ${message}`);
    }
}