import { Snowflake } from 'discord-api-types/globals';

export interface MessageReference {
    channelId: Snowflake | undefined;
    guildId: Snowflake | undefined;
    messageId: Snowflake | undefined;
}
