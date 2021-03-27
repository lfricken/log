/* eslint-disable no-magic-numbers */
import sanitize from "sanitize-html";
import cookie from 'react-cookies'

export namespace Const
{
	export const UniqueIdLength = 8;
	export const Chat = 'm';
	export const CookieUniqueId = "uniqueid";
	export const CookieNickname = "nickname";
}

export namespace Util
{
	const oneYear = 31536000;
	export function LoadSaveDefaultCookie(key: keyof (Core.ICookie), defaultValue: string): string
	{
		let val = cookie.load(key);
		if (val === null || val === undefined)
		{
			val = defaultValue;
			cookie.save(key, val, { expires: new Date(Date.now() + oneYear) });
		}
		return val;
	}
	export function SaveCookie(key: keyof (Core.ICookie), val: string): void
	{
		cookie.save(key, val, { expires: new Date(Date.now() + oneYear) });
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
	export interface ICookie
	{
		uniqueid: string;
		nickname: string;
	}

	export interface IAuth
	{
		UniqueId: string;
		Nickname: string;
		LobbyId: string;
	}
}

export namespace Model
{
	export class Games
	{
		public constructor()
		{
			this.Games = new Map<string, Game>();
		}

		/** LobbyId > Game */
		public Games!: Map<string, Game>;
	}

	/**
	 * Data about a given game, indexed on LobbyId.
	 */
	export class Game
	{
		public constructor()
		{
			this.Players = new Map<string, Player>();
		}

		/** UniqueId (socket) > Player */
		public Players!: Map<string, Player>;
	}

	/**
	 * Data about the player, indexed on UniqueId.
	 */
	export class Player
	{
		public constructor()
		{
			this.Turns = new Map<number, Turn>();
		}

		/** Turn Number > Turn Data */
		public Turns!: Map<number, Turn>;
		/** The order this player joined in.  */
		public Number!: number;
		/** Id of the socket this player is using. */
		public SocketId!: string;
		/** True if this player has control of the lobby. */
		public IsLobbyLeader!: boolean;
		/** 
		 * True if this player is currently connected. We don't use the socket because we
		 * want them to be able to switch sockets without anyone noticing.
		 */
		public IsConnected!: boolean
		/** The name this player goes by. */
		public Nickname!: string;
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

		Nickname: string;
		Text: string;
		public constructor(name: string, message: string)
		{
			this.Nickname = name;
			this.Text = message;
			Message.Validate(this);
		}


		public static Validate(data: Message): boolean
		{
			data.Nickname = data.Nickname.slice(0, Message.MaxLenName)
			data.Text = data.Text.slice(0, Message.MaxLenMessage)
			data.Nickname = sanitize(data.Nickname);
			data.Text = sanitize(data.Text);

			if (data.Nickname.length < 2) return false;
			if (data.Text.length < 2) return false;

			return true;
		}
		public static GetDestinations(data: Message, players: Map<string, Model.Player>): string[] | null
		{
			// given format #,#,#...@message
			// send to only player numbers
			const split = data.Text.split('@');
			if (split.length > 1)
			{
				const targets = split[0].split(',');
				// if a players number is contained in the targets list, add the target socket id
				for (const p of players.values())
				{
					if (targets.includes(p.Number.toString()))
					{
						targets.push(p.SocketId);
					}
				}
				return targets;
			}
			else
				return null; // all
		}
		public static DisplayString(data: Message): string
		{
			if (data.Nickname.length === 0)
				return data.Text;
			else
				return data.Nickname + ": " + data.Text;
		}
	}
}












