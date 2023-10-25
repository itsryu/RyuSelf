export type Snowflake = string | number
export type PresenceStatus = 'online' | 'dnd' | 'idle' | 'invisible' | 'offline'

export enum WebSocketShardStatus {
	Idle,
	Connecting,
	Resuming,
	Ready,
}

export enum WebSocketEvents {
    Closed = 'closed',
    Debug = 'debug',
    Dispatch = 'dispatch',
    Error = 'error',
    HeartbeatComplete = 'heartbeat',
    Hello = 'hello',
    Ready = 'ready',
    Resumed = 'resumed'
}
export interface SessionInfo {
	resumeURL: string;
	sequence: number;
	sessionId: string;
	shardCount: number;
	shardId: number;
}

enum Operation {
    Event,
    Dispatch = 0,
    Heartbeat = 1,
    Identify = 2,
    PresenceUpdate = 3,
    VoiceStateUpdate = 4,
    Resume = 6,
    Reconnect = 7,
    RequestGuildMembers = 8,
    InvalidSession = 9,
    Hello = 10,
    HeartbeatACK = 11,
}

enum EventType {
    PRESENCE_UPDATE = 'PRESENCE_UPDATE',
    READY = 'READY',
    GUILD_MEMBERS_CHUNK = 'GUILD_MEMBERS_CHUNK',
    MESSAGE_CREATE = 'MESSAGE_CREATE'
}

interface User {
    id: string;
    username: string;
    discriminator: string;
    avatar: string;
    avatar_decoration: null | any;
    public_flags: number;
    bot: boolean;
    display_name: null | string;
}

interface ActivityTimestamps {
    start?: number
    end?: number
}

enum ActivityTypes {
    Playing,
    Streaming,
    Listening,
    Watching,
    Custom,
    Competing,
}

enum ActivityFlags {
    Instance = 1 << 0,
    Join = 1 << 1,
    Spectate = 1 << 2,
    JoinRequest = 1 << 3,
    Sync = 1 << 4,
    Play = 1 << 5,
    PartyPrivacyFriends = 1 << 6,
    PartyPrivacyVoiceChannel = 1 << 7,
    Embedded = 1 << 8,
}

interface ActivitySecrets {
    join?: string
    spectate?: string
    match?: string
}

interface ActivityParty {
    id?: string
    size?: [number, number]
}

interface ActivityAssets {
    large_image?: string
    large_text?: string
    small_image?: string
    small_text?: string
}

interface Emoji {
    name: string
    id?: Snowflake
    animated?: boolean
}

interface Button {
    label: string
    url: string
}

interface Activity {
    name: string
    type: ActivityTypes
    id: string
    url?: string
    created_at: string
    timestamps?: ActivityTimestamps
    application_id?: Snowflake
    details?: string
    state?: string
    emoji?: Emoji
    party?: ActivityParty
    assets?: ActivityAssets
    secrets?: ActivitySecrets
    instance?: boolean
    flags?: ActivityFlags
    buttons?: Button[]
    session_id?: string
    sync_id?: string
}

interface ClientStatus {
    mobile?: PresenceStatus
    desktop?: PresenceStatus
}

interface Presence {
    user: User
    status: PresenceStatus
    guild_id: Snowflake
    activities: Activity[]
    client_status: ClientStatus
}

type SocketEvent = {
    op: Operation
    t?: EventType
    d: Presence | any
}

interface IdentifyProperties {
    os: string
    browser: string
    device: string
}

interface PresenceStructure {
    since: number | null
    activities: Activity[]
    status: PresenceStatus
    afk: boolean
}

interface GatewayIdentify {
    token: string
    properties: IdentifyProperties
    compress?: boolean
    large_threshold?: number
    shard?: [number, number]
    presence?: PresenceStructure
    intents: number
}

export {
    Activity,
    ActivityAssets,
    ActivityFlags,
    ActivityParty,
    ActivitySecrets,
    ActivityTimestamps,
    ActivityTypes,
    Button,
    ClientStatus,
    Emoji,
    EventType,
    Operation,
    Presence,
    SocketEvent,
    User,
    GatewayIdentify
};