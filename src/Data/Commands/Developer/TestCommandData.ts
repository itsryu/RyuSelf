import { CommandData } from '../../../Structures/CommandStructure';

class TestCommandDataConstructor extends CommandData {
    constructor() {
        super({
            name: 'test',
            description: 'Test a code.',
            aliases: ['teste'],
            config: {
                devOnly: true
            }
        });
    }
}

export const TestCommandData = new TestCommandDataConstructor();