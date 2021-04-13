/** Shared logic between client and server. */

/** When a new connection is made, how should we treat it? */
export enum ConnectionType
{
	/** This player was not in the game's player list. */
	NewPlayer,
	/** This player didn't time out, but did join with a new socket. */
	NewSocket,
	/** This player timed out but came back. */
	Reconnect,
}

/** Data exchanged in the socket handshake. */
export interface IAuth
{
	/** Each player is randomly assigned a random unique cookie id to differentiate them. */
	UniqueId: string;
	Nickname: string;
	LobbyId: string;
}

export const DisconnectTimeoutMilliseconds = 2000;
/** Currently 62^8 (218 trillion) combinations. */
export const UniqueIdLength = 8;

/** Player messages (sending player messages) */
export const Chat = 'm';
/** Lobby events (players leaving and joining) */
export const Log = 'l';
/** Player action (like modifying trade posture) */
export const Action = 'a';

