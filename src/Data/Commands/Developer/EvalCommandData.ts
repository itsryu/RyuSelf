import { CommandData } from '../../../Structures/CommandStructure';

class EvalCommandDataConstructor extends CommandData {
    constructor() {
        super({
            name: 'eval',
            description: 'Evaluates a code.',
            aliases: ['ev'],
            config: {
                devOnly: true
            }
        });
    }
}

export const EvalCommandData = new EvalCommandDataConstructor();