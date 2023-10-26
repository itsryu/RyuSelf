import WebSocket, { Data } from 'ws';
import { WebSocketEvents, WebSocketShardStatus, CloseCodes, WebSocketShardDestroyRecovery, SessionInfo, WebSocketShardDestroyOptions } from '../../Types/GatewayTypes';
import { EventEmitter } from 'node:events';
import { setTimeout as sleep } from 'node:timers/promises';
import { Message } from '../../Classes/Message';
import { Base } from '../../Classes/Base';
import BaseClient from '../BaseClient';
import { Client } from '../Client';
import { WebSocketShard } from './WebSocketShards';
import { Collection } from '../../Classes/Collection';
import { AsyncQueue } from '@sapphire/async-queue';
import { Util } from '../../Utils/Util';
import { SendRateLimitState } from '../../Types/ClientTypes';
import type { Inflate } from 'zlib-sync';
import { inflate } from 'node:zlib';
import { GatewayCloseCodes, GatewayDispatchEvents, GatewayHelloData, GatewayIdentifyData, GatewayMessageCreateDispatchData, GatewayOpcodes, GatewayReadyDispatchData, GatewayReceivePayload } from 'discord-api-types/v10';
import WebSocketShardEvents from '../../Utils/WebSocketShardEvents';
import { TextDecoder } from 'node:util';
import { Status } from '../../Utils/Status';
import Events from '../../Utils/Events';

const getZlibSync = Util.lazy(() => import('zlib-sync').then((mod) => mod.default).catch(() => null));
export class WebSocketManager extends EventEmitter {
    _ws: WebSocket;

    client!: Client;

    private useIdentifyCompress = false;

    private inflate: Inflate | null = null;

    private readonly textDecoder = new TextDecoder();

    shards: Collection<number, WebSocketShard>;

    isAck = true;

    heartbeatInterval: NodeJS.Timer | null = null;

    private lastHeartbeatAt = -1;

    private replayedEvents = 0;

    // Indicates if we failed to connect to the ws url (ECONNREFUSED/ECONNRESET)
    private failedToConnectDueToNetworkError = false;

    public readonly id!: number;

    private initialHeartbeatTimeoutController: AbortController | null = null;

    private readonly timeoutAbortControllers = new Collection<WebSocketEvents, AbortController>();

    private readonly sendQueue = new AsyncQueue();

    private sendRateLimitState: SendRateLimitState = Util.getInitialSendRateLimitState();

    initialConnectResolved = false;

    #status: WebSocketShardStatus = WebSocketShardStatus.Idle;
    
    _status!: Status;

    session!: SessionInfo;

    gateway!: string;

    totalShards?: number;

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
    get ping(): number {
        const sum = this.shards.reduce((a, b) => a + b.ping, 0);
        return sum / this.shards.size;
    }

    private async send(op: GatewayOpcodes, d?: any): Promise<void> {
        if (!this._ws) {
            throw new Error("WebSocketShard wasn't connected");
        }

        await this.sendQueue.wait();

        if (--this.sendRateLimitState.remaining <= 0) {
            const now = Date.now();

            if (this.sendRateLimitState.resetAt > now) {
                const sleepFor = this.sendRateLimitState.resetAt - now;

                this.debug([`Was about to hit the send rate limit, sleeping for ${sleepFor}ms`]);
                const controller = new AbortController();

                const interrupted = await Promise.race([
                    sleep(sleepFor).then(() => false),
                    WebSocketManager.once(this, 'closed', { signal: controller.signal }).then(() => true)
                ]);

                if (interrupted) {
                    this.debug(['Connection closed while waiting for the send rate limit to reset, re-queueing payload']);
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

    private async heartbeat(requested = false) {
        if (!this.isAck && !requested) {
            return this.destroy({ reason: 'Zombie connection', recover: WebSocketShardDestroyRecovery.Resume });
        }

        const session = await this.session;

        await this.send(GatewayOpcodes.Heartbeat, session ?? null);

        this.lastHeartbeatAt = Date.now();
        this.isAck = false;
    }

    private connect() {
        if (this.#status !== WebSocketShardStatus.Idle) {
            throw new Error("Tried to connect a shard that wasn't idle");
        }

        const shards = Array.isArray(this.client.options.shards) ? this.client.options.shards : [this.client.options.shards];

        for (const id of shards) {
            if (id) {
                if (!this.shards.has(id)) {
                    const shard = new WebSocketShard(this, id);

                    this.shards.set(id, shard);

                    shard.manager.on(WebSocketShardEvents.AllReady, unavailableGuilds => {
                        /**
                         * Emitted when a shard turns ready.
                         * @event Client#shardReady
                         * @param {number} id The shard id that turned ready
                         * @param {?Set<Snowflake>} unavailableGuilds Set of unavailable guild ids, if any
                         */
                        this.client.emit(Events.ShardReady, shard.id, unavailableGuilds);
                    });

                    shard.status = Status.Connecting;
                }
            }
        }

        this.#status = WebSocketShardStatus.Connecting;

        this._ws.onopen = async () => {
            this.totalShards = typeof this.client.options.shards === 'object' ?  this.client.options.shards.length : this.client.options.shards;

            await this.identify();

            new Base(this.client);
            this.debug(["WebSocket it's on CONNECTED state."]);
        };

        this._ws.onmessage = (event) => {
            void this.onMessage(event.data, event.data instanceof ArrayBuffer);
        };

        this._ws.onerror = (event) => {
            this.onError(event.error);
        };

        this._ws.onclose = (event) => {
            void this.onClose(event.code);
        };

    }

    private async onMessage(data: Data, isBinary: boolean) {
        const payload = await this.unpackMessage(data, isBinary);

        if (payload) {
            const { op, t, d, s }: GatewayReceivePayload = payload;

            if (op === GatewayOpcodes.Heartbeat) {
                await this.heartbeat(true);
            }

            if (op === GatewayOpcodes.HeartbeatAck) {
                this.isAck = true;

                const ackAt = Date.now();
                this.emit(WebSocketEvents.HeartbeatComplete, {
                    ackAt,
                    heartbeatAt: this.lastHeartbeatAt,
                    latency: ackAt - this.lastHeartbeatAt
                });
            }

            if (op === GatewayOpcodes.Hello) {
                const { heartbeat_interval } = d as GatewayHelloData;

                this.emit(WebSocketEvents.Hello);

                const jitter = Math.random();
                const firstWait = Math.floor(heartbeat_interval * jitter);
                this.debug([`Preparing first heartbeat of the connection with a jitter of ${jitter}; waiting ${firstWait}ms`]);

                try {
                    const controller = new AbortController();
                    this.initialHeartbeatTimeoutController = controller;
                    await sleep(firstWait, undefined, { signal: controller.signal });
                } catch {
                    this.debug(['Cancelled initial heartbeat due to #destroy being called']);
                    return;
                } finally {
                    this.initialHeartbeatTimeoutController = null;
                }

                await this.heartbeat();

                this.debug([`First heartbeat sent, starting to beat every ${heartbeat_interval}ms`]);
                this.heartbeatInterval = setInterval(() => void this.heartbeat(), heartbeat_interval);

            }

            if (op === GatewayOpcodes.InvalidSession) {
                this.debug([`Invalid session; will attempt to resume: ${payload.d.toString()}`]);

                if (payload.d && this.session) {
                    await this.resume(this.session);
                } else {
                    await this.destroy({
                        reason: 'Invalid session',
                        recover: WebSocketShardDestroyRecovery.Reconnect
                    });
                }
            }

            if (op === GatewayOpcodes.Reconnect) {
                await this.destroy({
                    reason: 'Told to reconnect by Discord',
                    recover: WebSocketShardDestroyRecovery.Resume
                });
            }

            if (op === GatewayOpcodes.Dispatch && t) {
                if (this.#status === WebSocketShardStatus.Resuming) {
                    this.replayedEvents++;
                }

                if ([GatewayDispatchEvents.Resumed].includes(t)) {
                    this.#status = WebSocketShardStatus.Ready;
                    this.debug([`Resumed and replayed ${this.replayedEvents} events`]);

                    this.emit(WebSocketShardEvents.Resumed);
                }


                if ([GatewayDispatchEvents.Ready].includes(t)) {
                    this.#status = WebSocketShardStatus.Ready;

                    const { resume_gateway_url, session_id } = d as GatewayReadyDispatchData;

                    const session = {
                        sequence: s,
                        sessionId: session_id,
                        shardId: this.id,
                        resumeURL: resume_gateway_url
                    };

                    this.session = session;
                    this.gateway = resume_gateway_url;

                    this.emit(WebSocketShardEvents.Ready, new BaseClient(this.client));
                }

                if ([GatewayDispatchEvents.MessageCreate].includes(t)) {
                    this.emit('messageCreate', new Message(this.client, (d as GatewayMessageCreateDispatchData)));
                }

                this.emit(WebSocketEvents.Dispatch, { data });
            }
        }
    }

    private onError(error: Error) {
        if ('code' in error && ['ECONNRESET', 'ECONNREFUSED'].includes(error.code as string)) {
            this.debug(['Failed to connect to the gateway URL specified due to a network error']);
            this.failedToConnectDueToNetworkError = true;
            return;
        }

        this.emit(WebSocketEvents.Error, { error });
    }

    private async unpackMessage(data: Data, isBinary: boolean): Promise<GatewayReceivePayload | null> {
        // Deal with no compression
        if (!isBinary) {
            try {
                return JSON.parse(data as string) as GatewayReceivePayload;
            } catch {
                // This is a non-JSON payload / (at the time of writing this comment) emitted by bun wrongly interpreting custom close codes https://github.com/oven-sh/bun/issues/3392
                return null;
            }
        }

        const decompressable = new Uint8Array(data as ArrayBuffer);

        // Deal with identify compress
        if (this.useIdentifyCompress) {
            return new Promise((resolve, reject) => {
                inflate(decompressable, { chunkSize: 65_535 }, (err, result) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve(JSON.parse(this.textDecoder.decode(result)) as GatewayReceivePayload);
                });
            });
        }

        // Deal with gw wide zlib-stream compression
        if (this.inflate) {
            const l = decompressable.length;
            const flush =
                l >= 4 &&
                decompressable[l - 4] === 0x00 &&
                decompressable[l - 3] === 0x00 &&
                decompressable[l - 2] === 0xff &&
                decompressable[l - 1] === 0xff;

            const zlib = (await getZlibSync())!;
            this.inflate.push(Buffer.from(decompressable), flush ? zlib.Z_SYNC_FLUSH : zlib.Z_NO_FLUSH);

            if (this.inflate.err) {
                this.emit(WebSocketEvents.Error, {
                    error: new Error(`${this.inflate.err}${this.inflate.msg ? `: ${this.inflate.msg}` : ''}`)
                });
            }

            if (!flush) {
                return null;
            }

            const { result } = this.inflate;
            if (!result) {
                return null;
            }

            return JSON.parse(typeof result === 'string' ? result : this.textDecoder.decode(result)) as GatewayReceivePayload;
        }

        this.debug([
            'Received a message we were unable to decompress',
            `isBinary: ${isBinary.toString()}`,
            `useIdentifyCompress: ${this.useIdentifyCompress.toString()}`,
            `inflate: ${Boolean(this.inflate).toString()}`
        ]);

        return null;
    }

    private async resume(session: SessionInfo) {
        this.debug([
            'Resuming session',
            `resume url: ${session.resumeURL}`,
            `sequence: ${session.sequence}`,
            `shard id: ${this.id.toString()}`
        ]);

        this.#status = WebSocketShardStatus.Resuming;
        this.replayedEvents = 0;

        return await this.send(GatewayOpcodes.Resume, {
            token: this.client.token,
            session_id: session.sessionId,
            seq: session.sequence
        });
    }

    private async identify() {
        this.debug(['Waiting for identify throttle']);

        const d: GatewayIdentifyData = {
            token: this.client.token as string,
            properties: {
                browser: 'linux',
                device: 'chrome',
                os: 'chrome'
            },
            intents: this.client.options.intents?.reduce((a, b) => a | b, 0) || 0
        };

        await this.send(GatewayOpcodes.Identify, d);
    }

    private async destroy(options: WebSocketShardDestroyOptions = {}) {
        if (this.#status === WebSocketShardStatus.Idle) {
            this.debug(['Tried to destroy a shard that was idle']);
            return;
        }

        if (!options.code) {
            options.code = options.recover === WebSocketShardDestroyRecovery.Resume ? CloseCodes.Resuming : CloseCodes.Normal;
        }

        this.debug([
            'Destroying shard',
            `Reason: ${options.reason ?? 'none'}`,
            `Code: ${options.code}`,
            `Recover: ${options.recover === undefined ? 'none' : WebSocketShardDestroyRecovery[options.recover]!}`
        ]);

        // Reset state
        this.isAck = true;

        if (this.initialHeartbeatTimeoutController) {
            this.initialHeartbeatTimeoutController.abort();
            this.initialHeartbeatTimeoutController = null;
        }

        this.lastHeartbeatAt = -1;

        for (const controller of this.timeoutAbortControllers.values()) {
            controller.abort();
        }

        this.timeoutAbortControllers.clear();

        this.failedToConnectDueToNetworkError = false;


        if (this._ws) {
            // No longer need to listen to messages
            this._ws.onmessage = null;
            // Prevent a reconnection loop by unbinding the main close event
            this._ws.onclose = null;

            const shouldClose = this._ws.readyState === WebSocket.OPEN;

            this.debug([
                'Connection status during destroy',
                `Needs closing: ${shouldClose}`,
                `Ready state: ${this._ws.readyState}`
            ]);

            if (shouldClose) {
                let outerResolve: () => void;
                const promise = new Promise<void>((resolve) => {
                    outerResolve = resolve;
                });

                this._ws.onclose = outerResolve!;

                this._ws.close(options.code, options.reason);

                await promise;
                this.emit(WebSocketEvents.Closed, { code: options.code });
            }

            // Lastly, remove the error event.
            // Doing this earlier would cause a hard crash in case an error event fired on our `close` call
            this._ws.onerror = null;
        } else {
            this.debug(['Destroying a shard that has no connection; please open an issue on GitHub']);
        }

        this.#status = WebSocketShardStatus.Idle;

        if (options.recover !== undefined) {
            // There's cases (like no internet connection) where we immediately fail to connect,
            // causing a very fast and draining reconnection loop.
            await sleep(500);
            return this.internalConnection();
        }
    }

    private onClose(code: number) {
        this.emit(WebSocketShardEvents.Close, { code });

        switch (code) {
            case CloseCodes.Normal: {
                return this.destroy({
                    code,
                    reason: 'Got disconnected by Discord',
                    recover: WebSocketShardDestroyRecovery.Reconnect
                });
            }

            case CloseCodes.Resuming: {
                break;
            }

            case GatewayCloseCodes.UnknownError: {
                this.debug([`An unknown error occurred: ${code}`]);
                return this.destroy({ code, recover: WebSocketShardDestroyRecovery.Resume });
            }

            case GatewayCloseCodes.UnknownOpcode: {
                this.debug(['An invalid opcode was sent to Discord.']);
                return this.destroy({ code, recover: WebSocketShardDestroyRecovery.Resume });
            }

            case GatewayCloseCodes.DecodeError: {
                this.debug(['An invalid payload was sent to Discord.']);
                return this.destroy({ code, recover: WebSocketShardDestroyRecovery.Resume });
            }

            case GatewayCloseCodes.NotAuthenticated: {
                this.debug(['A request was somehow sent before the identify/resume payload.']);
                return this.destroy({ code, recover: WebSocketShardDestroyRecovery.Reconnect });
            }

            case GatewayCloseCodes.AuthenticationFailed: {
                this.emit(WebSocketEvents.Error, {
                    error: new Error('Authentication failed')
                });
                return this.destroy({ code });
            }

            case GatewayCloseCodes.AlreadyAuthenticated: {
                this.debug(['More than one auth payload was sent.']);
                return this.destroy({ code, recover: WebSocketShardDestroyRecovery.Reconnect });
            }

            case GatewayCloseCodes.InvalidSeq: {
                this.debug(['An invalid sequence was sent.']);
                return this.destroy({ code, recover: WebSocketShardDestroyRecovery.Reconnect });
            }

            case GatewayCloseCodes.RateLimited: {
                this.debug(['The WebSocket rate limit has been hit, this should never happen']);
                return this.destroy({ code, recover: WebSocketShardDestroyRecovery.Reconnect });
            }

            case GatewayCloseCodes.SessionTimedOut: {
                this.debug(['Session timed out.']);
                return this.destroy({ code, recover: WebSocketShardDestroyRecovery.Resume });
            }

            case GatewayCloseCodes.InvalidShard: {
                this.emit(WebSocketEvents.Error, {
                    error: new Error('Invalid shard')
                });
                return this.destroy({ code });
            }

            case GatewayCloseCodes.ShardingRequired: {
                this.emit(WebSocketEvents.Error, {
                    error: new Error('Sharding is required')
                });
                return this.destroy({ code });
            }

            case GatewayCloseCodes.InvalidAPIVersion: {
                this.emit(WebSocketEvents.Error, {
                    error: new Error('Used an invalid API version')
                });
                return this.destroy({ code });
            }

            case GatewayCloseCodes.InvalidIntents: {
                this.emit(WebSocketEvents.Error, {
                    error: new Error('Used invalid intents')
                });
                return this.destroy({ code });
            }

            case GatewayCloseCodes.DisallowedIntents: {
                this.emit(WebSocketEvents.Error, {
                    error: new Error('Used disallowed intents')
                });
                return this.destroy({ code });
            }

            default: {
                this.debug([`The gateway closed with an unexpected code ${code}, attempting to ${this.failedToConnectDueToNetworkError ? 'reconnect' : 'resume'}.`]);
                return this.destroy({
                    code,
                    recover: this.failedToConnectDueToNetworkError
                        ? WebSocketShardDestroyRecovery.Reconnect
                        : WebSocketShardDestroyRecovery.Resume
                });
            }
        }
    }

    public debug(messages: [string, ...string[]]) {
        const message = `${messages[0]}${messages.length > 1
            ? `\n${messages
                .slice(1)
                .map((m) => `	${m}`)
                .join('\n')}`
            : ''}`;

        this.emit(WebSocketEvents.Debug, { message });
    }
}