
import { readdirSync } from 'fs';
import { Client } from './States/Client';
import { ClientOptions } from './Types/ClientTypes';
import { join } from 'path';
import { ListenerStructure } from './Structures/ListenerStructure';

export class RyuSelf extends Client{
    constructor(options: ClientOptions) {
        super(options);
    }

    initialize() {
        this.loadEvents();
        super.login(process.env.USER_TOKEN);
    }

    private async loadEvents(): Promise<void> {
        const listenersFolders = readdirSync(join(__dirname, 'Listeners'), { withFileTypes: true }).filter((dirent) => dirent.isFile() && dirent.name.endsWith('.js')).map((dirent) => dirent.name);

        const listeners = await Promise.all(
            listenersFolders.map(async (file) => {
                const { default: EventClass }: { default: new (client: Client) => ListenerStructure } = await import(join(__dirname, 'Listeners', file));
                const event = new EventClass(this);

                return event.options.once
                    ? this.once(event.options.name, (...args) => event.eventExecute(...args))
                    : this.on(event.options.name, (...args) => event.eventExecute(...args));
            })
        );

        this.logger.info(`Added ${listeners.flat().length} listeners to the client.`, 'Listeners');
    }
}