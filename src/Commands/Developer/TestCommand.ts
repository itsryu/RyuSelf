import { CommandStructure } from '../../Structures/CommandStructure';
import { RyuSelf } from '../../SelfClient';
import { Message } from '../../Classes/Message';
import { TestCommandData } from '../../Data/Commands/Developer/TestCommandData';

export default class TestCommand extends CommandStructure {
    constructor(client: RyuSelf) {
        super(client, TestCommandData);
    }

    async commandExecute({ message }: { message: Message }): Promise<any> {
        const msg = await message.reply('testando');
        console.log(msg);
    }
}