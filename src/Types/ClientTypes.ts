import { GatewayIntentBits } from 'discord-api-types/v10';
import { Client } from '../States/Client';
import { Message } from '../Classes/Message';

interface ClientEvents {
    debug: [message: string];
    warn: [message: string];
    error: [error: Error];
    messageCreate: [message: Message];
    ready: [client: Client];
}

interface ClientOptions {
    intents: GatewayIntentBits[]
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