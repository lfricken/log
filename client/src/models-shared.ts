/* eslint-disable no-magic-numbers */
import sanitize from "sanitize-html";
import cookie from 'react-cookies';

export type UniqueId = string;
export type LobbyId = string;

export namespace Const
{
	export const DisconnectTimeoutMilliseconds = 2000;
	export const UniqueIdLength = 8;

	/** Player messages (sending player messages) */
	export const Chat = 'm';
	/** Lobby events (players leaving and joining) */
	export const Log = 'l';
	/** Player action (like modifying trade posture) */
	export const Action = 'a';

	export const CookieDurationSeconds = 31536000;
	export const CookieUniqueId = "uniqueid";
	export const CookieNickname = "nickname";
}

export namespace Util
{
	export function LoadSaveDefaultCookie(key: keyof (Core.ICookie), defaultValue: string): string
	{
		let val = cookie.load(key);
		if (val === null || val === undefined)
		{
			val = defaultValue;
			cookie.save(key, val, { expires: new Date(Date.now() + Const.CookieDurationSeconds) });
		}
		return val;
	}
	export function SaveCookie(key: keyof (Core.ICookie), val: string): void
	{
		cookie.save(key, val, { expires: new Date(Date.now() + Const.CookieDurationSeconds) });
	}
	export function GetUniqueId(len: number): string
	{
		var result = '';
		var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		var charactersLength = characters.length;
		for (var i = 0; i < len; i++)
		{
			result += characters.charAt(Math.floor(Math.random() * charactersLength));
		}
		return result;
	}
}

export namespace Core
{
	export enum ConnectionType
	{
		NewPlayer,
		NewSocket,
		Reconnect,
	}

	export interface ICookie
	{
		uniqueid: UniqueId;
		nickname: string;
	}

	export interface IAuth
	{
		UniqueId: UniqueId;
		Nickname: string;
		LobbyId: LobbyId;
	}
}

export namespace ViewModel
{
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
}

export namespace Chat
{
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
		public static GetDestinations(text: string, players: Map<UniqueId, ViewModel.Player>): string[]
		{
			const targetIds: string[] = [];

			// given format #,#,#...@message
			// send to only player numbers
			let split = text.split('@');
			if (split.length > 1)
			{
				const targets = split[0].split(' ');
				// if a players number is contained in the targets list, add the target socket id
				for (const p of players.values())
				{
					if (targets.includes(p.Number.toString()))
					{
						targetIds.push(p.SocketId);
					}
				}
			}
			else
			{
				for (const p of players.values())
				{
					targetIds.push(p.SocketId);
				}
			}

			return targetIds;
		}
		public static NameString(nickname: string, num: number): string
		{
			return `${nickname}(${num})`;
		}
		public static PlayerMsg(player: ViewModel.Player, msg: Message): Message
		{
			return new Message(player.Nickname, `${Message.NameString(player.Nickname, player.Number)}: ${msg.Text}`);
		}
		public static JoinMsg(player: ViewModel.Player): Message
		{
			return new Message("", `${Message.NameString(player.Nickname, player.Number)} joined.`);
		}
		public static ReconnectMsg(player: ViewModel.Player): Message
		{
			return new Message("", `${Message.NameString(player.Nickname, player.Number)} reconnected.`);
		}
		public static DisconnectMsg(player: ViewModel.Player): Message
		{
			return new Message("", `${Message.NameString(player.Nickname, player.Number)} disconnected.`);
		}
		public static ChangeNameMsg(player: ViewModel.Player, newName: string): Message
		{
			return new Message("",
				Message.NameString(player.Nickname, player.Number)
				+ " changed their name to "
				+ Message.NameString(newName, player.Number)
			);
		}
		public static LeaderMsg(player: ViewModel.Player): Message
		{
			return new Message("", `${Message.NameString(player.Nickname, player.Number)} is the new lobby leader.`);
		}
	}
}












