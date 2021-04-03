/** Shared logic between client and server. */

export type UniqueId = string;
export type LobbyId = string;

export enum ConnectionType
{
	NewPlayer,
	NewSocket,
	Reconnect,
}

export interface IAuth
{
	UniqueId: UniqueId;
	Nickname: string;
	LobbyId: LobbyId;
}

export const DisconnectTimeoutMilliseconds = 2000;
export const UniqueIdLength = 8;

/** Player messages (sending player messages) */
export const Chat = 'm';
/** Lobby events (players leaving and joining) */
export const Log = 'l';
/** Player action (like modifying trade posture) */
export const Action = 'a';




