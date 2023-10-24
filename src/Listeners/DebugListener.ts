import { RyuSelf } from '../SelfClient';
import { ListenerStructure } from '../Structures/ListenerStructure';
import { Events } from '../Types/ClientTypes';

export default class DebugListener extends ListenerStructure {
    constructor(client: RyuSelf) {
        super(client, {
            name: Events.Debug
        });
    }

    eventExecute(message: string) {
        this.client.logger.info(message, 'DEBUG');
    }
}