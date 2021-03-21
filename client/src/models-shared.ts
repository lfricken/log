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

	Name: string;
	Message: string;
	public constructor(name: string, message: string)
	{
		this.Name = name;
		this.Message = message;
		ChatMessage.Validate(this);
	}


	public static Validate(data: ChatMessage): void
	{
		data.Name = data.Name.slice(0, ChatMessage.MaxLenName)
		data.Message = data.Message.slice(0, ChatMessage.MaxLenMessage)
		data.Name = sanitizeHtml(data.Name);
		data.Message = sanitizeHtml(data.Message);
	}
	public static DisplayString(data: ChatMessage): string
	{
		return data.Name + ": " + data.Message;
	}
}
//}












