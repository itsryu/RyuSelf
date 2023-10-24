
import { readdirSync } from 'fs';
import Client from './Client/Client';
import { ClientEvents, ClientOptions } from './Types/ClientTypes';
import { join } from 'path';
import { ListenerStructure } from './Structures/ListenerStructure';
import { Logger } from './Utils/Util';

export class RyuSelf extends Client {
    logger: Logger = new Logger();

    constructor(options: ClientOptions) {
        super(options);
    }

    async initialize() {
        await this.loadEvents();
        super.login(process.env.USER_TOKEN);

        process.on('uncaughtException', (err: Error) => this.logger.error((err as Error).stack as string, 'uncaughtException'));
        process.on('unhandledRejection', (err: Error) => this.logger.error((err as Error).stack as string, 'unhandledRejection'));
    }

    private async loadEvents(): Promise<void> {
        const listenersFolders = readdirSync(join(__dirname, 'Listeners'), { withFileTypes: true }).filter((dirent) => dirent.isFile() && dirent.name.endsWith('.js')).map((dirent) => dirent.name);

        const listeners = await Promise.all(
            listenersFolders.map(async (file) => {
                const { default: EventClass }: { default: new (client: Client) => ListenerStructure } = await import(join(__dirname, 'Listeners', file));
                const event = new EventClass(this);

                return event.options.once
                    ? this.ws.once(event.options.name, (...args) => event.eventExecute(...args as ClientEvents[keyof ClientEvents]))
                    : this.ws.on(event.options.name, (...args) => event.eventExecute(...args as ClientEvents[keyof ClientEvents]));
            })
        );

        this.logger.info(`Added ${listeners.flat().length} listeners to the client.`, 'Listeners');
    }
}