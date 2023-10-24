import { type Snowflake, APIMessage, MessageType } from 'discord-api-types/v10';
import Base from './Base';
import { DiscordSnowflake } from '@sapphire/snowflake';
import { NonSystemMessageTypes } from '../Utils/Constants';
import Socket from '../States/Socket';
import { MessageReference } from '../Types';

/**
 * Represents a message on Discord.
 * @extends {Base}
 */
export class Message extends Base {
    channelId: string;
    createdTimestamp!: number;
    type!: MessageType | null;
    system!: boolean | null;
    pinned!: boolean | null;
    tts!: boolean | null;
    nonce?: string | number;
    id!: Snowflake;
    content!: string | null;
    position?: number | null;
    reference!: MessageReference | null;
    editedTimestamp!: number | null;


    constructor(client: Socket, data: APIMessage) {
        super(client);

        /**
        * The id of the channel the message was sent in
        * @type {Snowflake}
        */
        this.channelId = data.channel_id;

        this._patch(data);
    }

    private _patch(data: APIMessage) {
        /**
         * The message's id
         * @type {Snowflake}
         */
        this.id = data.id;

        /**
         * The timestamp the message was sent at
         * @type {number}
         */
        this.createdTimestamp = DiscordSnowflake.timestampFrom(this.id);

        if ('type' in data) {
            /**
             * The type of the message
             * @type {?MessageType}
             */
            this.type = data.type;

            /**
             * Whether or not this message was sent by Discord, not actually a user (e.g. pin notifications)
             * @type {?boolean}
             */
            this.system = !NonSystemMessageTypes.includes(this.type);
        } else {
            this.system ??= null;
            this.type ??= null;
        }

        if ('content' in data) {
            /**
             * The content of the message.
             * <info>This property requires the {@link GatewayIntentBits.MessageContent} privileged intent
             * in a guild for messages that do not mention the client.</info>
             * @type {?string}
             */
            this.content = data.content;
        } else {
            this.content ??= null;
        }

        if ('pinned' in data) {
            /**
             * Whether or not this message is pinned
             * @type {?boolean}
             */
            this.pinned = Boolean(data.pinned);
        } else {
            this.pinned ??= null;
        }

        if ('tts' in data) {
            /**
             * Whether or not the message was Text-To-Speech
             * @type {?boolean}
             */
            this.tts = data.tts;
        } else {
            this.tts ??= null;
        }

        if ('nonce' in data) {
            /**
             * A random number or string used for checking message delivery
             * <warn>This is only received after the message was sent successfully, and
             * lost if re-fetched</warn>
             * @type {?string}
             */
            this.nonce = data.nonce;
        } else {
            this.nonce ??= undefined;
        }

        if ('position' in data) {
            /**
             * A generally increasing integer (there may be gaps or duplicates) that represents
             * the approximate position of the message in a thread.
             * @type {?number}
             */
            this.position = data.position;
        } else {
            this.position ??= null;
        }

        // Discord sends null if the message has not been edited
        if (data.edited_timestamp) {
            /**
             * The timestamp the message was last edited at (if applicable)
             * @type {?number}
             */
            this.editedTimestamp = Date.parse(data.edited_timestamp);
        } else {
            this.editedTimestamp ??= null;
        }

        /**
         * Reference data sent in a message that contains ids identifying the referenced message.
         * This can be present in the following types of message:
         * * Crossposted messages (`MessageFlags.Crossposted`)
         * * {@link MessageType.ChannelFollowAdd}
         * * {@link MessageType.ChannelPinnedMessage}
         * * {@link MessageType.Reply}
         * * {@link MessageType.ThreadStarterMessage}
         * @see {@link https://discord.com/developers/docs/resources/channel#message-types}
         * @typedef {Object} MessageReference
         * @property {Snowflake} channelId The channel's id the message was referenced
         * @property {?Snowflake} guildId The guild's id the message was referenced
         * @property {?Snowflake} messageId The message's id that was referenced
         */
        if ('message_reference' in data) {
            /**
             * Message reference data
             * @type {?MessageReference}
             */
            this.reference = {
                channelId: data.message_reference?.channel_id,
                guildId: data.message_reference?.guild_id,
                messageId: data.message_reference?.message_id
            };
        } else {
            this.reference ??= null;
        }
    }

    public async reply(content: string): Promise<void> {
        const response = await fetch(`https://discord.com/api/v10/channels/${this.channelId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': process.env.USER_TOKEN,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: content,
                message_reference: {
                    channel_id: this.channelId,
                    message_id: this.id
                }
            })
        });

        if (!response.ok) {
            throw new Error('Something went wrong');
        }
    }

    public async edit(content: string): Promise<void> {
        const response = await fetch(`https://discord.com/api/v10/channels/${this.channelId}/messages/${this.id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': process.env.USER_TOKEN,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });

        if (!response.ok) {
            throw new Error('Something went wrong');
        }
    }

    public async react(emoji: string): Promise<void> {
        const response = await fetch(`https://discord.com/api/v10/channels/${this.channelId}/messages/${this.id}/reactions/${emoji}/@me`, {
            method: 'PUT',
            headers: {
                'Authorization': process.env.USER_TOKEN,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Something went wrong');
        }
    }

    public async delete(): Promise<void> {
        const response = await fetch(`https://discord.com/api/v10/channels/${this.channelId}/messages/${this.id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': process.env.USER_TOKEN,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Something went wrong');
        }
    }
}