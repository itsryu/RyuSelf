import WebSocket from 'ws';
import { Operation, GatewayIdentify, SocketEvent, EventType } from '../Types/GatewayTypes';
import { Logger } from '../Utils/Util';
import { EventEmitter } from 'node:events';
import { ClientOptions, ClientEvents } from '../Types/ClientTypes';
import { Message } from '../Classes/Message';

class Client {
    ws: WebSocket;
    logger: Logger = new Logger();
    event: EventEmitter = new EventEmitter();
    options: ClientOptions;

    constructor(options: ClientOptions) {
        this.ws = new WebSocket(process.env.GATEWAY_URL);
        this.options = options;
    }

    private connect(token: string): void {
        const send = (op: Operation, d?: any): void => {
            if (this.ws !== null && this.ws.readyState === WebSocket.OPEN)
                this.ws.send(JSON.stringify({ op, d }));
        };

        this.ws.on('open', () => {
            send(Operation.Identify, {
                token: token,
                intents: this.options.intents.reduce((a, b) => a | b, 0),
                properties: {
                    browser: 'linux',
                    device: 'chrome',
                    os: 'chrome'
                }
            } as GatewayIdentify);

            this.logger.info("WebSocket it's on CONNECTED state.", 'WebSocket');
        });

        this.ws.on('message', (data: string) => {
            const { op, t, d }: SocketEvent = JSON.parse(data);

            if (op === Operation.Hello) {
                setInterval(
                    () => send(Operation.Heartbeat, null),
                    (d as { heartbeat_interval: number }).heartbeat_interval
                );
            }

            if (op === Operation.Dispatch && t) {
                if ([EventType.READY].includes(t)) {
                    this.event.emit('ready', this);
                }

                if ([EventType.MESSAGE_CREATE].includes(t)) {
                    this.event.emit('messageCreate', new Message(d));
                }
            }
        });

        this.ws.on('close', () => {
            this.reconnectWebSocket(token);
            this.logger.error('Gateway connection closed.', 'WebSocket');
        });
    }

    public login(token: string): string {
        this.connect(token);
        return token;
    }

    public on<K extends keyof ClientEvents>(event: K, listener: (...args: ClientEvents[K]) => Promise<void> | void): void {
        this.event.on(event, listener as any);
    }

    public once<K extends keyof ClientEvents>(event: K, listener: (...args: ClientEvents[K]) => Promise<void> | void): void {
        this.event.on(event, listener as any);
    }

    private reconnectWebSocket(token: string) {
        this.logger.warn('Attempting to reconnect, wait..', 'WebSocket');
        this.login(token);
    }
}

export { Message, Client };