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

export class Event
{
	/** Lobby events (players leaving and joining) */
	public static Log = 'l';
	/** Player messages (sending player messages) */
	public static ChatMessage = 'm';
	/**  */
	public static GameChanged = 'g';
	/**  */
	public static EraChanged = 'e';
	/**  */
	public static TurnChanged = 't';
	/**  */
	public static NicknameChanged = 'n';
}

export class Score
{
	public static Die = 0;
	public static Live = 1;
	public static Lead = 2;
}

export class Trade
{
	public static ActionCooperate = 1;
	public static ActionDefect = -1;

	public static ResultCooperateBoth = 4;
	public static ResultDefectBoth = 2;
	public static ResultDefectWin = 8;
	public static ResultDefectLose = 0;

	public static GetDelta(us: number, them: number): number
	{
		let delta = 0;
		if (us === Trade.ActionCooperate && them === Trade.ActionCooperate)
		{
			delta += Trade.ResultCooperateBoth;
		}
		else if (us === Trade.ActionCooperate && them === Trade.ActionDefect)
		{
			delta += Trade.ResultDefectLose;
		}
		else if (us === Trade.ActionDefect && them === Trade.ActionCooperate)
		{
			delta += Trade.ResultDefectWin;
		}
		else if (us === Trade.ActionDefect && them === Trade.ActionDefect)
		{
			delta += Trade.ResultDefectBoth;
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

	public static GetDelta(ourMilitary: number, ourAttacks: number, enemyAttacks: number):
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
				moneyDelta = -Military.PillageMultiplier * remainingIncomingAttack;
			}
		}

		return { militaryDelta, moneyDelta, };
	}
}
