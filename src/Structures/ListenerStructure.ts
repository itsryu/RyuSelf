import { RyuSelf } from '../SelfClient';
import { ClientEvents } from '../Types/ClientTypes';

type EventOptions = {
    name: keyof ClientEvents;
    once?: boolean;
};

export abstract class ListenerStructure {
    readonly client: RyuSelf;
    readonly options: EventOptions;

    constructor(client: RyuSelf, options: EventOptions) {
        this.client = client;
        this.options = options;
    }

    abstract eventExecute(...args: ClientEvents[keyof ClientEvents]): Promise<void> | void;
}