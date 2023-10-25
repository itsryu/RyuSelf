
import { readdirSync } from 'fs';
import { Client } from './Client/Client';
import { ClientEvents, ClientOptions } from './Types/ClientTypes';
import { join } from 'path';
import { ListenerStructure } from './Structures/ListenerStructure';
import { Logger } from './Utils/Util';
import { CommandStructure } from './Structures/CommandStructure';
import { Collection } from './Classes/Collection';

export class RyuSelf extends Client {
    logger: Logger = new Logger();
    commands: Collection<string, CommandStructure> = new Collection();

    constructor(options: ClientOptions) {
        super(options);
    }

    async initialize() {
        await this.loadEvents('Listeners');
        await this.loadCommands('Commands');
        super.login(process.env.USER_TOKEN);

        process.on('uncaughtException', (err: Error) => this.logger.error((err as Error).stack as string, 'uncaughtException'));
        process.on('unhandledRejection', (err: Error) => this.logger.error((err as Error).stack as string, 'unhandledRejection'));
    }

    private async loadEvents(folderName: string): Promise<void> {
        const listenersFolders = readdirSync(join(__dirname, folderName), { withFileTypes: true }).filter((dirent) => dirent.isFile() && dirent.name.endsWith('.js')).map((dirent) => dirent.name);

        const listeners = await Promise.all(
            listenersFolders.map(async (file) => {
                const { default: EventClass }: { default: new (client: RyuSelf) => ListenerStructure } = await import(join(__dirname, folderName, file));
                const event = new EventClass(this);

                return event.options.once
                    ? this.ws.once(event.options.name, (...args) => event.eventExecute(...args as ClientEvents[keyof ClientEvents]))
                    : this.ws.on(event.options.name, (...args) => event.eventExecute(...args as ClientEvents[keyof ClientEvents]));
            })
        );

        this.logger.info(`Added ${listeners.flat().length} listeners to the client.`, folderName);
    }

    private async loadCommands(folderName: string): Promise<void> {
        const commandsFolders = readdirSync(join(__dirname, folderName), { withFileTypes: true }).filter((dirent) => dirent.isDirectory()).map((dirent) => dirent.name);

        const commands = await Promise.all(
            commandsFolders.map(async (folder) => {
                const commandFiles = readdirSync(join(__dirname, folderName, folder), { withFileTypes: true }).filter((dirent) => dirent.isFile() && dirent.name.endsWith('.js')).map((dirent) => dirent.name);

                const commandsSize = await Promise.all(
                    commandFiles.map(async (file) => {
                        const { default: CommandClass }: { default: new (client: RyuSelf) => CommandStructure } = await import(join(__dirname, folderName, folder, file));
                        const command = new CommandClass(this);

                        this.commands.set(command.data.options.name, command);
                    })
                );

                return commandsSize;
            })
        );

        this.logger.info(`Added ${commands.flat().length} commands to the client.`, folderName);
    }

}