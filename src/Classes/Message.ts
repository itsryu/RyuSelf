import { type Snowflake, APIMessage, APIUser } from 'discord-api-types/v10';

export class Message {
    message: APIMessage;
    author!: APIUser | null;
    id!: Snowflake;
    content!: string | null;

    constructor(message: APIMessage) {
        this.message = message;
        this._patch(message);
    }

    private _patch(data: APIMessage) {
        if ('content' in data) {
            this.content = data.content;
        } else {
            this.content ??= null;
        }

        if ('author' in data) {
            this.author = data.author;
        } else {
            this.author ??= null;
        }
    }

    public async reply(content: string): Promise<void> {
        await fetch(`https://discord.com/api/v10/channels/${this.message.channel_id}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': process.env.USER_TOKEN,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: content,
                message_reference: {
                    channel_id: this.message.channel_id,
                    message_id: this.message.id
                }
            })
        });
    }

    public async edit(content: string): Promise<void> {
        await fetch(`https://discord.com/api/v10/channels/${this.message.channel_id}/messages/${this.message.id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': process.env.USER_TOKEN,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: content
            })
        });
    }
}