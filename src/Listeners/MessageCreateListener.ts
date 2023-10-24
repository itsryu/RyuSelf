import { RyuSelf } from '../SelfClient';
import { Message } from '../Classes/Message';
import { ListenerStructure } from '../Structures/ListenerStructure';
import { Events } from '../Types/ClientTypes';
import { Util } from '../Utils/Util';

export default class MessageCreateListener extends ListenerStructure {
    constructor(client: RyuSelf) {
        super(client, {
            name: Events.MessageCreate
        });
    }

    eventExecute(message: Message) {
        if (['ryu', 'ryuzaki', '99hz'].some((msg) => message.content?.toLowerCase().includes(msg)) || message.content?.match(Util.GetMention(process.env.USER_ID))) {
            message.react('😉');
        }
    }
}