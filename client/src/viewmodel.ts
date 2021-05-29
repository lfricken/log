/** 
 * Models that transfer data between client and server. View (Viewmodel) Model 
 * ViewModels can only have constructors, fields, and static methods.
*/

/* eslint-disable no-magic-numbers */
import sanitize from "sanitize-html";

/** Fields a player must have. */
export class ViewPlayerConnection
{
	/** The order this player joined in. */
	public Nickname: string;

	public constructor(old: ViewPlayerConnection)
	{
		if (old === null)
		{
			this.Nickname = "bad";
		}
		else
		{
			this.Nickname = old.Nickname;
		}
	}
	public static DisplayName(nickname: string, plid: number): string
	{
		return `${nickname}(${plid})`;
	}
}

/** View data about the game in its current state. */
export class ViewGame
{
	/** Player number > player */
	public PlayerConnections!: ViewPlayerConnection[];
	/** Dictates player order */
	public LatestEra!: ViewEra;

	public constructor(old: null | ViewGame)
	{
		if (old === null)
		{
			this.PlayerConnections = [];
			this.LatestEra = new ViewEra();
		}
	}
	public static GetNicknames(game: ViewGame): string[]
	{
		const names: string[] = [];
		game.PlayerConnections.forEach((connection, _) =>
		{
			names.push(connection.Nickname);
		});
		return names;
	}
}

/** Data about a players turn, indexed on turn number. */
export class ViewEra
{
	/** Which Era is this? */
	public Number!: number;
	/** Order > Plid */
	public Order!: number[];
	/** The latest turn? */
	public LatestTurn!: ViewTurn;
}

/** Data about actions a player wants to take on their turn. */
export class ViewTurn
{
	/** Which turn is this? */
	public Number!: number;
	/** This players private data. */
	public LocalPlayer!: ViewPlayerTurnPrivate;
	/** Maps (plid > trade action) */
	public Players!: ViewPlayerTurnPublic[];
}

/** Publicly exposed to every player. */
export class ViewPlayerTurnPublic
{
	/** The order this player joined in. */
	public Plid!: number;
	/** How many points this player has. */
	public Score!: number;
	/** Total money this player has in military. */
	public Military!: number;
}

/** Data only visible to the player themselves. */
export class ViewPlayerTurnPrivate extends ViewPlayerTurnPublic
{
	/** Any techs this player has unlocked. */
	//public UnlockedTechnologies!: string[];
	/** Resources the player has available to use. */
	public Money!: number;
	/** How much money this player is trying to add to their military. */
	public MilitaryDelta!: number;
	/** Maps (plid > attack) */
	public MilitaryAttacks!: Map<number, number>;
	/** Maps (plid > trade decision). */
	public Trades!: Map<number, number>;
}

/** A message sent out to clients. */
export class Message
{
	public static readonly MaxLenName: number = 7;
	public static readonly MaxLenMessage: number = 120;
	public Sender!: string;
	public Text!: string;

	public constructor(nickname: string, message: string, needsValidation: boolean = false)
	{
		this.Sender = nickname;
		this.Text = message;
		if (needsValidation)
			Message.ApplyValidation(this);
	}
	public static ApplyValidation(data: Message): boolean
	{
		data.Sender = data.Sender.slice(0, Message.MaxLenName);
		data.Text = data.Text.slice(0, Message.MaxLenMessage);
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
		return new Message(name, `${name}: ${msg.Text}`, true);
	}
	public static JoinMsg(name: string): Message
	{
		return new Message("", `${name} joined.`);
	}
	public static ReconnectMsg(name: string): Message
	{
		return new Message("", `${name} reconnected.`);
	}
	public static DoubleSocketMsg(target: number): Message
	{
		return new Message("", `${target}@You joined twice!`);
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
