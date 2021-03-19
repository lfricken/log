/**
 * Models shared between client and server.
 */



/**
 * Actions that a player has taken on their turn.
 */
export class PlayerTurnActions
{
	public TurnNumber: number;

	public constructor(turnNumber: any)
	{
		this.TurnNumber = turnNumber;
	}
}

/**
 * A message sent out to every client.
 */
export class PlayerChatMessageBroadcast
{
	public Name: string;
	public Message: string;

	public constructor(name: string, message: string)
	{
		this.Name = name;
		this.Message = message;
	}
}












