import { GatewayIntentBits } from 'discord-api-types/v10';
import { Client } from '../Client/Client';
import { Message } from '../Classes/Message';

interface ClientEvents {
    debug: [{ message: string }];
    warn: [message: string];
    error: [error: Error];
    messageCreate: [message: Message];
    ready: [client: Client];
}

export interface SendRateLimitState {
    remaining: number;
    resetAt: number;
}

interface ClientOptions {
    intents?: GatewayIntentBits[];
    shards?: number | number[];
    waitGuildTimeout?: number;
}

export enum Events {
    Ready = 'ready',
    MessageCreate = 'messageCreate',
    Error = 'error',
    Warn = 'warn',
    Debug = 'debug',
}

export {
    ClientEvents,
    ClientOptions
};