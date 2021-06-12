/** 
 * Models that transfer data between client and server. View (Viewmodel) Model 
 * ViewModels can only have constructors, fields, and static methods.
*/

/* eslint-disable no-magic-numbers */
import sanitize from "sanitize-html";
import * as Shared from './shared';
import { IMap } from "./shared";

/** Fields a player must have. */
export interface IViewPlayerConnection
{
	/** The order this player joined in. */
	Nickname: string;
	IsHost: boolean;
	IsConnected: boolean;
}
/** Fields a player must have. */
export class IViewPlayerConnection
{
	public static DisplayName(nickname: string, plid: number): string
	{
		return `${nickname}(${plid})`;
	}
}

/** View data about the game in its current state. */
export interface IViewLobby
{
	/** Plid > player */
	PlayerConnections: IViewPlayerConnection[];
	Game: null | IViewGame;
}
export class IViewLobby
{
	public static GetNicknames(playerConnections: IViewPlayerConnection[]): string[]
	{
		const names: string[] = [];
		playerConnections.forEach((connection, _) =>
		{
			names.push(connection.Nickname);
		});
		return names;
	}
}

/** View data about the game in its current state. */
export interface IViewGame
{
	LatestEra: IViewEra;
	Settings: Shared.IGameSettings;
}

export interface IViewData
{
	Nicknames: string[];
	Game: IViewGame;
	LocalPlid: number;
	LocalOrder: number;
}

/** Data about a players turn, indexed on turn number. */
export interface IViewEra
{
	/** Which Era is this? */
	Number: number;
	/** Dictates player order. Order > Plid */
	Order: number[];
	/** The latest turn? */
	LatestTurn: IViewTurn;
}
export class IViewEra
{
	/** Returns a list of trade partners. */
	public static GetTradePartners(localPlid: number, orders: number[]): number[]
	{
		const localOrder = orders.indexOf(localPlid);
		const tradePartners = new Map<number, number>();
		const adjacent = IViewEra.GetAdjacentOrders(localPlid, orders.length);
		// add orders.length as a hack to get around negative modulus in JS because JS is garbage
		tradePartners.set(orders[adjacent[0]], 0);
		tradePartners.set(orders[adjacent[1]], 0);
		return Array.from(tradePartners.keys());
	}
	/** Gets the order numbers of players adjacent to the targetOrder */
	public static GetAdjacentOrders(targetOrder: number, numOrders: number): number[]
	{
		const neighbors: number[] = [];

		const n0 = (numOrders + targetOrder - 1) % numOrders;
		if (n0 !== targetOrder)
			neighbors.push(n0);

		const n1 = (numOrders + targetOrder + 1) % numOrders;
		if (n1 !== targetOrder)
			neighbors.push(n1);

		return neighbors;
	}
}

/** Data about actions a player wants to take on their turn. */
export interface IViewTurn
{
	/** Which turn is this? */
	Number: number;
	/** Maps (plid > trade action) */
	Players: IMap<IViewPlayerTurn>;
}

/** State for a players turn. */
export interface IViewPlayerTurn
{
	/** The order this player joined in. */
	Plid: number;
	/** How many points this player has. */
	Score: number;
	/** Total money this player has in military. */
	Military: number;
	/** Any techs this player has unlocked. */
	//public UnlockedTechnologies!: string[];
	/** Resources the player has available to use. */
	Money: string;
	/** How much money this player is trying to add to their military. */
	MilitaryDelta: number;
	/** Maps (plid > attack) */
	MilitaryAttacks: IMap<number>;
	/** Maps (plid > trade decision). */
	Trades: IMap<number>;
	/** True if this player is done with their turn. */
	IsDone: boolean;
}

/** A message sent out to clients. */
export class Message
{
	public Sender!: string;
	public Text!: string;

	public static readonly MaxLenName: number = 7;
	public static readonly MaxLenMessage: number = 120;
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
	public static DoubleSocketMsg(target: number, numSockets: number): Message
	{
		return new Message("", `${target}@You have ${numSockets - 1} other active connections to this lobby!`);
	}
	public static DisconnectMsg(name: string): Message
	{
		return new Message("", `${name} disconnected.`);
	}
	public static ChangeNameMsg(name: string, newName: string): Message
	{
		return new Message("", name + " changed their name to " + newName + ".");
	}
	public static HostMsg(name: string): Message
	{
		return new Message("", `${name} is the new host.`);
	}
	public static NewGameMsg(numPlayers: number): Message
	{
		return new Message("", `Game started with ${numPlayers} players.`);
	}
}
