/* eslint-disable no-magic-numbers */

import sanitizeHtml from "sanitize-html";

/**
 * Actions that a player has taken on their turn.
 */
export class PlayerTurnActions
{
	public TurnNumber: number;

	public constructor(turnNumber: number)
	{
		this.TurnNumber = turnNumber;
	}
}

/**
 * A message sent out to every client.
 */
export class PlayerChatMessage
{
	public static readonly MaxLenName: number = 15;
	public static readonly MaxLenMessage: number = 120;

	Name: string;
	Message: string;
	public constructor(name: string, message: string)
	{
		this.Name = name;
		this.Message = message;
		PlayerChatMessage.Validate(this);
	}


	public static Validate(data: PlayerChatMessage): void
	{
		data.Name.slice(0, PlayerChatMessage.MaxLenName)
		data.Message.slice(0, PlayerChatMessage.MaxLenMessage)
		data.Name = sanitizeHtml(data.Name);
		data.Message = sanitizeHtml(data.Message);
	}
	public static DisplayString(data: PlayerChatMessage): string
	{
		return data.Name + ": " + data.Message;
	}
}












