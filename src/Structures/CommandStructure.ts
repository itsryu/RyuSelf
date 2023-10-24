import { RyuSelf } from '../SelfClient';
import { type RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord-api-types/v10';

interface RawCommandData extends RESTPostAPIChatInputApplicationCommandsJSONBody {
    name: string;
    aliases:  string[];
    config: {
        devOnly: boolean,
    };
}

abstract class CommandData {
    options: RawCommandData;

    constructor(options: RawCommandData) {
        this.options = options;
    }
}

abstract class CommandStructure {
    client: RyuSelf;
    data: CommandData;

    constructor(client: RyuSelf, data: CommandData) {
        this.client = client;
        this.data = data;
    }

    commandExecute(...args: any[]): Promise<any> | any {
        return { args };
    }
}

export { CommandStructure, CommandData, RawCommandData };