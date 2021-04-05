/** Server side model. View Viewmodel (Model) */

import { IPlayer } from "../client/src/shared";

type UniqueId = string;


/**
 * Data about a given game, indexed on LobbyId.
 */
export class Game
{
	public constructor(lobbyId: string)
	{
		this.LobbyId = lobbyId;
		this.Players = new Map<UniqueId, Player>();
	}

	/** UniqueId > Player */
	public Players!: Map<UniqueId, Player>;
	public LobbyId!: string;

	public get NumPlayers(): number
	{
		return this.Players.size;
	}
}

/**
 * Data about the player, indexed on UniqueId.
 */
export class Player implements IPlayer
{
	public static NoSocket = "";

	public constructor(num: number, nickname: string)
	{
		this.Number = num;
		this.Nickname = nickname;
		this.IsConnected = true;
		this.Turns = [new Turn()];
		this.Timeout = null;
		this.SocketId = Player.NoSocket;
	}
	/** The order this player joined in.  */
	public Number!: number;
	/** Id of the socket this player is using. Empty string if no socket. */
	public SocketId!: string;
	/** The name this player goes by. */
	public Nickname!: string;
	/** 
	 * True if this player has not timed out. Does not imply a live socket.
	 * We don't use the socket because we want them to be able to switch sockets 
	 * without anyone noticing (refresh).
	 */
	public IsConnected!: boolean
	/** Turn Number > Turn Data */
	public Turns!: Turn[];
	public get LastTurn(): Turn
	{
		return this.Turns[this.Turns.length - 1];
	}
	public SetTimeout(value: NodeJS.Timeout): void
	{
		// handle old timeout
		this.ClearTimeout();
		this.Timeout = value;
	}
	public ClearTimeout(): void
	{
		if (this.Timeout !== null)
		{
			clearTimeout(this.Timeout);
			this.Timeout = null;
		}
	}
	public get DisplayName(): string
	{
		return `${this.Nickname}(${this.Number})`;
	}
	/** Id of the socket this player is using. */
	public Timeout!: NodeJS.Timeout | null;


	/** True if this player has control of the lobby. */
	public IsLobbyLeader!: boolean;
}

/**
 * Data about a players turn, indexed on turn number.
 */
export class Turn
{

}





