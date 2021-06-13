/** Shared logic between client and server. */
/* eslint-disable no-magic-numbers */


export function clone<T>(obj: T): T
{
	return JSON.parse(JSON.stringify(obj));
}

export interface IMap<V>
{
	[plid: number]: V;
}
export class IMap<V>
{
	public static From<V>(map: Map<number, V>): IMap<V>
	{
		const imap: IMap<V> = {};
		for (const kvp of map)
		{
			imap[kvp[0]] = kvp[1];
		}
		return imap;
	}
	public static Get<V>(map: IMap<V>, key: string): V
	{
		return map[key as unknown as number];
	}
	public static Set<V>(map: IMap<V>, key: string, value: V): void
	{
		map[key as unknown as number] = value;
	}
	public static *Kvp<V>(map: IMap<V>): Generator<{ k: string, v: V }>
	{
		const keys = IMap.Keys(map);
		for (const key of keys)
		{
			yield { k: key, v: map[key as unknown as number] };
		}
	}
	public static *Values<V>(map: IMap<V>): Generator<V>
	{
		const keys = IMap.Keys(map);
		for (const key of keys)
		{
			yield map[key as unknown as number];
		}
	}
	public static *Keys<V>(map: IMap<V>): Generator<string>
	{
		const keys = Object.keys(map);
		for (const key of keys)
		{
			yield key;
		}
	}
	public static Length<V>(map: IMap<V>): number
	{
		return Object.keys(map).length;
	}
	public static Has<V>(map: IMap<V>, k: number | string): boolean
	{
		return map[k as unknown as number] !== undefined;
	}
	public static KeyOf<V>(map: IMap<V>, checkValue: V): string | null
	{
		for (const { k: key, v: value } of IMap.Kvp(map))
		{
			if (value === checkValue)
				return key;
		}
		return null;
	}
}

/** When a new connection is made, how should we treat it? */
export enum ConnectionType
{
	/** This player was not in the game's player list. */
	NewPlayer,
	/** This player didn't time out, but did join with a new socket. */
	NewSocket,
	/** This player timed out but came back. */
	Reconnect,
}

/** Data exchanged in the socket handshake. */
export interface IAuth
{
	/** Each player is randomly assigned a random unique cookie id to differentiate them. */
	UniqueId: string;
	Nickname: string;
	LobbyId: string;
}

export const DisconnectTimeoutMilliseconds = 2000;
/** Currently 62^8 (218 trillion) combinations. */
export const UniqueIdLength = 8;
export const MinPlayers = 2;
export const MilitaryName = "Military";
export const MoneyName = "Money";
export const ScoreName = "Score";

export class Event
{
	/** Connection data changed. */
	public static OnConnected = 'o';
	/** Connection data changed. */
	public static Connections = 'c';
	/** Player/server messages. */
	public static Message = 'm';
	/** New turn/player updated their turn. */
	public static PlayerTurn = 'pt';
	/** Turn advanced. */
	public static WholeTurn = 'wt';
	/** New era. */
	public static Era = 'e';
	/** Started new game. */
	public static Game = 'g';
	/** Started new game. */
	public static ForceNextTurn = 'f';
}

/** Returns a configuration for game settings. */
export function GetSettings(config: SettingConfig): IGameSettings
{
	if (config === SettingConfig.Custom) // todo get custom settings from somewhere
		return GetSettings(SettingConfig.Default);
	else // SettingConfig.Default
		return {
			GameEndMaxEras: 1,

			EraEndMinDeadPercentage: 0.5,
			EraStartMoney: 10,
			EraStartMilitary: 0,

			ScoreDeathDelta: 0,
			ScoreSurvivorExtraDelta: 1,
			ScoreLeaderExtraDelta: 1,

			MilitaryTax: 0,
			MilitaryMaxDeltaPerTurn: 1,
			MilitaryPillageMultiplier: 2,

			TradeResultCooperateBoth: 4,
			TradeResultDefectBoth: 2,
			TradeResultDefectWin: 8,
			TradeResultDefectLose: 0,

			MilitaryMinAttack: 0,
			MilitaryMaxAttack: 9,
		};
}
export enum SettingConfig
{
	Default,
	Custom,
}

/** Rules and other random settings. */
export interface IGameSettings
{
	/** After how many turns will the Game end? */
	readonly GameEndMaxEras: number;

	/** What percentage of players need to die for the Era to end? */
	readonly EraEndMinDeadPercentage: number;
	/** How much money does each player start the Era with? */
	readonly EraStartMoney: number;
	/** How much military does each player start the Era with? */
	readonly EraStartMilitary: number;

	readonly ScoreDeathDelta: number;
	readonly ScoreSurvivorExtraDelta: number;
	readonly ScoreLeaderExtraDelta: number;

	/** Players military will be taxed this much per turn. */
	readonly MilitaryTax: number;
	/** Players can only invest this much in military per turn. */
	readonly MilitaryMaxDeltaPerTurn: number;
	/** When a players Money is attacked by Military how much more they lose from an attack. */
	readonly MilitaryPillageMultiplier: number;

	readonly TradeResultCooperateBoth: number;
	readonly TradeResultDefectBoth: number;
	readonly TradeResultDefectWin: number;
	readonly TradeResultDefectLose: number;

	readonly MilitaryMinAttack: number;
	readonly MilitaryMaxAttack: number;
}

export type IGameSettingsEditable = {
	-readonly [K in keyof IGameSettings]: IGameSettings[K]
}

export class Trade
{
	public static ActionCooperate = 0;
	public static ActionDefect = 1;

	public static GetDelta(settings: IGameSettings, us: number, them: number): number
	{
		if (us !== Trade.ActionDefect) us = Trade.ActionCooperate;
		if (them !== Trade.ActionDefect) them = Trade.ActionCooperate;

		let delta = 0;
		if (us === Trade.ActionCooperate && them === Trade.ActionCooperate)
		{
			delta += settings.TradeResultCooperateBoth;
		}
		else if (us === Trade.ActionCooperate && them === Trade.ActionDefect)
		{
			delta += settings.TradeResultDefectLose;
		}
		else if (us === Trade.ActionDefect && them === Trade.ActionCooperate)
		{
			delta += settings.TradeResultDefectWin;
		}
		else if (us === Trade.ActionDefect && them === Trade.ActionDefect)
		{
			delta += settings.TradeResultDefectBoth;
		}
		return delta;
	}
}

export class Military
{
	public static GetDelta(settings: IGameSettings, ourMilitary: number, ourAttacks: number, enemyAttacks: number):
		{ militaryDelta: number, moneyDelta: number, }
	{
		let militaryDelta = 0;
		let moneyDelta = 0;
		let remainingIncomingAttack = enemyAttacks;

		remainingIncomingAttack -= ourAttacks;
		if (remainingIncomingAttack > 0) // some attacks remain after counter attacks
		{
			militaryDelta = -Math.min(remainingIncomingAttack, ourMilitary);

			remainingIncomingAttack -= ourMilitary;
			if (remainingIncomingAttack > 0) // some attacks remain after standing military
			{
				moneyDelta = -settings.MilitaryPillageMultiplier * remainingIncomingAttack;
			}
		}

		return { militaryDelta, moneyDelta, };
	}
}
