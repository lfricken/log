/* eslint-disable no-magic-numbers */
import sanitize from "sanitize-html";
import { LobbyId, UniqueId } from "./shared";


export class Games
{
	public constructor()
	{
		this.Games = new Map<LobbyId, Game>();
	}

	/** LobbyId > Game */
	public Games!: Map<LobbyId, Game>;
}

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

	/** UniqueId (socket) > Player */
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


// A message sent out to every client.
export class Message
{
	public static readonly MaxLenName: number = 7;
	public static readonly MaxLenMessage: number = 120;

	public Sender!: string;
	public Text!: string;
	public constructor(nickname: string, message: string)
	{
		this.Sender = nickname;
		this.Text = message;
		Message.Validate(this);
	}


	public static Validate(data: Message): boolean
	{
		data.Sender = data.Sender.slice(0, Message.MaxLenName)
		data.Text = data.Text.slice(0, Message.MaxLenMessage)
		data.Sender = sanitize(data.Sender);
		data.Text = sanitize(data.Text);

		if (data.Sender.length < 2) return false;
		if (data.Text.length < 2) return false;

		return true;
	}
	public static NameString(nickname: string, num: number): string
	{
		return `${nickname}(${num})`;
	}
	public static PlayerMsg(name: string, msg: Message): Message
	{
		return new Message(name, `${name}: ${msg.Text}`);
	}
	public static JoinMsg(name: string): Message
	{
		return new Message("", `${name} joined.`);
	}
	public static ReconnectMsg(name: string): Message
	{
		return new Message("", `${name} reconnected.`);
	}
	public static DisconnectMsg(name: string): Message
	{
		return new Message("", `${name} disconnected.`);
	}
	public static ChangeNameMsg(name: string, newName: string): Message
	{
		return new Message("", name + " changed their name to " + newName + ".");
	}
	public static LeaderMsg(name: string): Message
	{
		return new Message("", `${name} is the new lobby leader.`);
	}
}
