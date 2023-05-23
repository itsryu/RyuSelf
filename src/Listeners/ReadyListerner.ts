import { RyuSelf } from '../SelfClient';
import { ListenerStructure } from '../Structures/ListenerStructure';
import { Events } from '../Types/ClientTypes';

export default class ReadyListener extends ListenerStructure {
    constructor(client: RyuSelf) {
        super(client, {
            name: Events.Ready,
            once: true
        });
    }

    eventExecute(): void {
        this.client.logger.info('User connected successfully to WS', 'Ready');
    }
}