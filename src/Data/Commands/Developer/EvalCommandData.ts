import { ApplicationCommandOptionType} from 'discord-api-types/v10';
import { CommandData } from '../../../Structures/CommandStructure';

class EvalCommandDataConstructor extends CommandData {
    constructor() {
        super({
            name: 'eval',
            description: 'Evaluates a code.',
            aliases: ['pong'],
            config: {
                devOnly: true
            },
            options: [
                {
                    name: 'code',
                    description: 'Insira um código:',
                    required: true,
                    type: ApplicationCommandOptionType.String
                }
            ]
        });
    }
}

export const EvalCommandData = new EvalCommandDataConstructor();