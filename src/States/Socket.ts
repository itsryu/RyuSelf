import WebSocket from 'ws';
import { Operation, GatewayIdentify, SocketEvent, EventType } from '../Types/GatewayTypes';
import { EventEmitter } from 'node:events';
import { Message } from '../Classes/Message';
import Base from '../Classes/Base';
import BaseClient from '../Client/BaseClient';
import Client from '../Client/Client';
import Events from '../Utils/Events';
import { Status } from '../Utils/Status';

class Socket extends EventEmitter {
    status: Status;
    private _ws: WebSocket;
    client!: Client;

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
        * The current status of this WebSocketManager
        * @type {Status}
        */
        this.status = Status.Idle;

        this._ws = new WebSocket(process.env.GATEWAY_URL);
    }

    public connect() {
        const send = (op: Operation, d?: any): void => {
            if (this._ws !== null && this._ws.readyState === WebSocket.OPEN)
                this._ws.send(JSON.stringify({ op, d }));
        };

        this._ws.on('open', () => {
            send(Operation.Identify, {
                token: this.client.token,
                intents: this.client.options.intents?.reduce((a, b) => a | b, 0),
                properties: {
                    browser: 'linux',
                    device: 'chrome',
                    os: 'chrome'
                }
            } as GatewayIdentify);

            new Base(this);
            this.debug("WebSocket it's on CONNECTED state.");
        });

        this._ws.on('message', (data: string) => {
            const { op, t, d }: SocketEvent = JSON.parse(data);

            if (op === Operation.Hello) {
                setInterval(
                    () => send(Operation.Heartbeat, null),
                    (d as { heartbeat_interval: number }).heartbeat_interval
                );
            }

            if (op === Operation.Dispatch && t) {
                if ([EventType.READY].includes(t)) {
                    this.emit('ready', new BaseClient());
                }

                if ([EventType.MESSAGE_CREATE].includes(t)) {
                    this.emit('messageCreate', new Message(this, d));
                }
            }
        });

        this._ws.on('close', () => {
            this.debug('Gateway connection closed.');
        });
    }

    /**
   * Emits a debug message.
   * @param {string} message The debug message
   * @param {?number} [shardId] The id of the shard that emitted this message, if any
   * @private
   */
    private debug(message: string, shardId?: number) {
        this.emit(Events.Debug, `[WS => ${typeof shardId === 'number' ? `Shard ${shardId}` : 'Manager'}] ${message}`);
    }
}

export = Socket