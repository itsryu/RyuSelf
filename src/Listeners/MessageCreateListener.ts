import { RyuSelf } from '../SelfClient';
import { Message } from '../Classes/Message';
import { ListenerStructure } from '../Structures/ListenerStructure';
import { Events } from '../Types/ClientTypes';

export default class MessageCreateListener extends ListenerStructure {
    constructor(client: RyuSelf) {
        super(client, {
            name: Events.MessageCreate
        });
    }

    eventExecute(message: Message): void {
        if (message.author?.id !== process.env.USER_ID) return;

        if (message.content === '👍🏻') {
            message.edit('👍🏿');
        }
    }
}