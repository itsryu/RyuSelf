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

        if (message.author && [process.env.USER_ID].includes(message.author?.id)) {
            const prefix = process.env.PREFIX;

            if(message.content?.toLowerCase().startsWith(prefix)) {
                const [name, ...args] = message.content.slice(prefix.length).trim().split(/ +/g);
                const command = this.client.commands.get(name) || this.client.commands.find(command => command.data.options.aliases && command.data.options.aliases.includes(name));

                if(command) {
                    const commandExecute = new Promise((resolve, reject) => {
                        try {
                            resolve(command.commandExecute({ message, args, prefix }));
                        } catch (err) {
                            reject(err);
                        }
                    });

                    commandExecute.catch((err: Error) => {
                        this.client.logger.error(err.message, command.data.options.name);
                        this.client.logger.error(err?.stack as string, command.data.options.name);
                    });
                }
            }
        }
    }
}