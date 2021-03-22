/* eslint-disable no-magic-numbers */

import sanitizeHtml from "sanitize-html";

//export namespace Shared
//{
// Actions that a player has taken on their turn.
export interface ICookie
{
	Name: string;
}

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
	public static readonly MaxLenName: number = 15;
	public static readonly MaxLenMessage: number = 120;

	NickName: string;
	Text: string;
	public constructor(name: string, message: string)
	{
		this.NickName = name;
		this.Text = message;
		ChatMessage.Validate(this);
	}


	public static Validate(data: ChatMessage): boolean
	{
		data.NickName = data.NickName.slice(0, ChatMessage.MaxLenName)
		data.Text = data.Text.slice(0, ChatMessage.MaxLenMessage)
		data.NickName = sanitizeHtml(data.NickName);
		data.Text = sanitizeHtml(data.Text);

		if (data.NickName.length < 2) return false;
		if (data.Text.length < 2) return false;

		return true;
	}
	public static DisplayString(data: ChatMessage): string
	{
		return data.NickName + ": " + data.Text;
	}
}
//}












