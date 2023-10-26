import { GatewayDispatchEvents, GatewayOpcodes } from 'discord-api-types/v10';

export type Snowflake = string | number
export type PresenceStatus = 'online' | 'dnd' | 'idle' | 'invisible' | 'offline'

export enum WebSocketShardStatus {
	Idle,
	Connecting,
	Resuming,
	Ready,
}

export interface WebSocketShardDestroyOptions {
	code?: number;
	reason?: string;
	recover?: WebSocketShardDestroyRecovery;
}

export interface SessionInfo {
	resumeURL: string;
	sequence: number;
	sessionId: string;
	shardId: number;
}

export enum WebSocketShardDestroyRecovery {
	Reconnect,
	Resume,
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

export interface User {
    id: string;
    username: string;
    discriminator: string;
    avatar: string;
    avatar_decoration: null | any;
    public_flags: number;
    bot: boolean;
    display_name: null | string;
}

export interface ActivityTimestamps {
    start?: number
    end?: number
}

export enum ActivityTypes {
    Playing,
    Streaming,
    Listening,
    Watching,
    Custom,
    Competing,
}

export enum ActivityFlags {
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

export interface ActivitySecrets {
    join?: string
    spectate?: string
    match?: string
}

export interface ActivityParty {
    id?: string
    size?: [number, number]
}

export interface ActivityAssets {
    large_image?: string
    large_text?: string
    small_image?: string
    small_text?: string
}

export interface Emoji {
    name: string
    id?: Snowflake
    animated?: boolean
}

export interface Button {
    label: string
    url: string
}

export interface Activity {
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

export interface ClientStatus {
    mobile?: PresenceStatus
    desktop?: PresenceStatus
}

export interface Presence {
    user: User
    status: PresenceStatus
    guild_id: Snowflake
    activities: Activity[]
    client_status: ClientStatus
}

export enum CloseCodes {
	Normal = 1_000,
	Resuming = 4_200,
}

export type SocketEvent = {
    op: GatewayOpcodes;
    t?: GatewayDispatchEvents
    d: Presence | any
    s: number;
}

export interface IdentifyProperties {
    os: string
    browser: string
    device: string
}

export interface PresenceStructure {
    since: number | null
    activities: Activity[]
    status: PresenceStatus
    afk: boolean
}

export interface GatewayIdentify {
    token: string
    properties: IdentifyProperties
    compress?: boolean
    large_threshold?: number
    shard?: [number, number]
    presence?: PresenceStructure
    intents: number
}