/** 
 * Models that transfer data between client and server. View (Viewmodel) Model 
 * ViewModels can only have constructors, fields, and static methods.
*/

/* eslint-disable no-magic-numbers */
import ViewModel from "sanitize-html";

type UniqueId = string;

export class Game
{
	/** Player number > player */
	public PlayerConnections!: Player[];
	/** Dictates player order */
	public Eras!: Era[];
}

/** Data about a players turn, indexed on turn number. */
export class Era
{
	/** Maps (order > player number) */
	public Order!: number[];
}

/** Fields a player must have. */
export class Player
{
	/** The order this player joined in.  */
	public Plid!: number;
	/** The name this player goes by. */
	public Nickname!: string;

	public static DisplayName(player: Player): string
	{
		return `${player.Nickname}(${player.Plid})`;
	}
}

/** Data that should go on a player, but is private to each player. */
export class PlayerPrivate
{
	/** Turn Number > Turn Data */
	public TurnStates!: TurnState[];
	/** Turn Number > Turn Data */
	public TurnActions!: TurnAction[];

	public static DisplayName(player: Player): string
	{
		return `${player.Nickname}(${player.Plid})`;
	}
}

/** Data about a player at the beginning of their turn. */
export class TurnState
{
	/** Any techs this player has unlocked. */
	//public UnlockedTechnologies!: string[];
	/** Resources the player has available to use. */
	public Money!: number;
}

/** Data about actions a player wants to take on their turn. */
export class TurnAction
{
	/** Maps (order > attack) */
	public Attacks!: number[];
	public Trades!: number[];
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
			Message.Validate(this);
	}


	public static Validate(data: Message): boolean
	{
		data.Sender = data.Sender.slice(0, Message.MaxLenName)
		data.Text = data.Text.slice(0, Message.MaxLenMessage)
		data.Sender = ViewModel(data.Sender);
		data.Text = ViewModel(data.Text);

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
