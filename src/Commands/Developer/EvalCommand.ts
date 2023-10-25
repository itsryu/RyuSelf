import { inspect } from 'node:util';
import { CommandStructure } from '../../Structures/CommandStructure';
import { RyuSelf } from '../../SelfClient';
import { Message } from '../../Classes/Message';
import { EvalCommandData } from '../../Data/Commands/Developer/EvalCommandData';

export default class EvalCommand extends CommandStructure {
    constructor(client: RyuSelf) {
        super(client, EvalCommandData);
    }

    async commandExecute({ message, args }: { message: Message, args: string[] }): Promise<any> {
        const code = args.join(' ') ?? '';

        try {
            const result = await Promise.any([eval(code), Promise.reject()]);
            const evaled = inspect(result, { depth: 0 });

            message.reply( `\`\`\`js\n${evaled.slice(0, 1970)}\`\`\``);
        } catch (err) {
            message.reply( `\`\`\`js\n${(err as Error).message.slice(0, 2000)}\`\`\``);
        }
    }
}