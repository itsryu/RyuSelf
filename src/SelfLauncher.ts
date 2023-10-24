import { RyuSelf } from './SelfClient';
import { GatewayIntentBits } from 'discord-api-types/v10';
import { config } from 'dotenv';

config();

new RyuSelf({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ]
}).initialize();