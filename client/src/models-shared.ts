/* eslint-disable no-magic-numbers */

import e from "express";
import sanitize from "sanitize-html";

export namespace Const
{
	export const UniqueIdLength = 8;
	export const Chat = 'm';
	export const CookieUniqueId = "uniqueid";
	export const CookieNickname = "nickname";

}
export namespace Core
{
	export interface ICookie
	{
		Name: string;
	}

	export interface IPlayerData
	{
		UniqueId: string;
		Nickname: string;
	}

	export interface IAuth extends IPlayerData
	{
		LobbyId: string;
	}
}

/**
 * lobbyId: game
 *   uniqueId: GameState
 * 
 */
export namespace Player
{
	export class GameState implements Core.IPlayerData
	{
		public UniqueId!: string;
		public Nickname!: string;

		public IsLobbyLeader!: boolean;
		public IsConnected!: boolean

		public Actions!: TurnState;
	}

	// Actions that a player has taken on their turn.
	export class TurnState
	{
		public TurnNumber: number;

		public constructor(turnNumber: number)
		{
			this.TurnNumber = turnNumber;
		}
	}

	// A message sent out to every client.
	export class ChatMessage
	{
		public static readonly MaxLenName: number = 9;
		public static readonly MaxLenMessage: number = 120;

		Nickname: string;
		Text: string;
		public constructor(name: string, message: string)
		{
			this.Nickname = name;
			this.Text = message;
			ChatMessage.Validate(this);
		}


		public static Validate(data: ChatMessage): boolean
		{
			data.Nickname = data.Nickname.slice(0, ChatMessage.MaxLenName)
			data.Text = data.Text.slice(0, ChatMessage.MaxLenMessage)
			data.Nickname = sanitize(data.Nickname);
			data.Text = sanitize(data.Text);

			if (data.Nickname.length < 2) return false;
			if (data.Text.length < 2) return false;

			return true;
		}
		public static DisplayString(data: ChatMessage): string
		{
			if (data.Nickname.length === 0)
				return data.Text;
			else
				return data.Nickname + ": " + data.Text;
		}
	}
}












