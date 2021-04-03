/** Server side model. View Viewmodel (Model) */

import * as Shared from "../client/src/shared";

/**
 * Data about a given game, indexed on LobbyId.
 */
export class Game
{
	public constructor(lobbyId: string)
	{
		this.LobbyId = lobbyId;
		this.Players = new Map<Shared.UniqueId, Player>();
	}

	/** UniqueId (socket) > Player */
	public Players!: Map<Shared.UniqueId, Player>;
	public LobbyId!: string;

	public get NumPlayers(): number
	{
		return this.Players.size;
	}
	public GetDestinations(text: string): string[]
	{
		const targetIds: string[] = [];

		// given format #,#,#...@message
		// send to only player numbers
		let split = text.split('@');
		if (split.length > 1)
		{
			const targets = split[0].split(' ');
			// if a players number is contained in the targets list, add the target socket id
			for (const p of this.Players.values())
			{
				if (targets.includes(p.Number.toString()))
				{
					targetIds.push(p.SocketId);
				}
			}
		}
		else
		{
			for (const p of this.Players.values())
			{
				targetIds.push(p.SocketId);
			}
		}

		return targetIds;
	}
}

/**
 * Data about the player, indexed on UniqueId.
 */
export class Player
{
	public constructor(num: number, nickname: string)
	{
		this.Number = num;
		this.Nickname = nickname;
		this.IsConnected = true;
		this.Turns = [new Turn()];
		this.Timeout = null;
	}
	/** The order this player joined in.  */
	public Number!: number;
	/** Id of the socket this player is using. */
	public SocketId!: string;
	/** The name this player goes by. */
	public Nickname!: string;
	/** 
	 * True if this player is currently connected. We don't use the socket because we
	 * want them to be able to switch sockets without anyone noticing.
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





