/** Shared logic between client and server. */
/* eslint-disable no-magic-numbers */


export function clone<T>(obj: T): T
{
	return { ...obj };
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

export class Event
{
	/** Lobby events (players leaving and joining) */
	public static Log = 'l';
	/** Player messages (sending player messages) */
	public static ChatMessage = 'm';
	/**  */
	public static ConnectionsChanged = 'c';
	/**  */
	public static EraChanged = 'e';
	/**  */
	public static TurnChanged = 't';
	/**  */
	public static NicknameChanged = 'n';
}

/** Returns a configuration for game settings. */
export function GetSettings(config: SettingConfig): IGameSettings
{
	if (config === SettingConfig.Custom) // todo get custom settings from somewhere
		return GetSettings(SettingConfig.Default);
	else // SettingConfig.Default
		return {
			GameEndMaxTurns: 5,

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
	readonly GameEndMaxTurns: number;

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
}

export class Trade
{
	public static ActionCooperate = 1;
	public static ActionDefect = -1;

	public static GetDelta(settings: IGameSettings, us: number, them: number): number
	{
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
