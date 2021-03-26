/* eslint-disable no-magic-numbers */

import sanitize from "sanitize-html";

export namespace Const
{
	export const Chat: string = 'm';
	export const Connect: string = 'c';
	export const Disconnect: string = 'd';

}
export namespace Core
{
	export interface ICookie
	{
		Name: string;
	}

	export interface IAuth
	{
		Nickname: string;
		LobbyId: string;
	}
}

export namespace Player
{
	// Actions that a player has taken on their turn.
	export class TurnActions
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












