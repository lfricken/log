/** Shared logic between client and server. */
/* eslint-disable no-magic-numbers */

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

export class Rules
{
	public static EraMinDeadPercentage = 0.5;
	public static StartMoney = 10;
	public static StartMaxMilitaryPerTurn = 1;
}

export class Actions
{
	public static Cooperate = 1;
	public static Defect = -1;
	/** Player messages (sending player messages) */
	public static Chat = 'm';
	/** Lobby events (players leaving and joining) */
	public static Log = 'l';
	/** Player action (like modifying trade posture) */
	public static Action = 'a';
}

export class Trade
{
	public static CooperateBoth = 4;
	public static DefectBoth = 2;
	public static DefectWin = 8;
	public static DefectLose = 0;

	public static GetDelta(us: number, them: number): number
	{
		let delta = 0;
		if (us === Actions.Cooperate && them === Actions.Cooperate)
		{
			delta += Trade.CooperateBoth;
		}
		else if (us === Actions.Cooperate && them === Actions.Defect)
		{
			delta += Trade.DefectLose;
		}
		else if (us === Actions.Defect && them === Actions.Cooperate)
		{
			delta += Trade.DefectWin;
		}
		else if (us === Actions.Defect && them === Actions.Defect)
		{
			delta += Trade.DefectBoth;
		}
		return delta;
	}
}

export class Military
{
	/** When a player can't defend, how much more they lose from an attack. */
	public static PillageMultiplier = 2;
	/** How much each player can invest per turn in military. */
	public static MaxDelta = 2;
	public static Upkeep = 0.1;

	public static GetDelta(standingMilitary0: number, attacks0: number, attacks1: number):
		{ militaryDelta: number, moneyDelta: number, }
	{
		let militaryDelta = 0;
		let moneyDelta = 0;
		let remainingAttack = attacks1;

		remainingAttack -= attacks0;
		if (remainingAttack > 0) // some attacks remain after counter attacks
		{
			militaryDelta = -Math.min(remainingAttack, standingMilitary0);

			remainingAttack -= standingMilitary0;
			if (remainingAttack > 0) // some attacks remain after standing military
			{
				moneyDelta = -Military.PillageMultiplier * remainingAttack;
			}
		}

		return { militaryDelta, moneyDelta, };
	}
}
