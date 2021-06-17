/* eslint-disable no-magic-numbers */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/** Server side model. View Viewmodel (Model) */

import * as Vm from '../client/src/viewmodel';
import * as Shared from "../client/src/shared";
import { ModelWireup } from './events';
import { IGameSettings, IMap } from '../client/src/shared';
import { settings } from 'node:cluster';

type UniqueId = string;

/** Randomly shuffles an array. */
function shuffle<T>(array: T[]): void
{
	let currentIndex = array.length;
	let temp: T;
	let randomIndex: number;

	// While there remain elements to shuffle...
	while (currentIndex !== 0)
	{
		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;

		// And swap it with the current element.
		temp = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temp;
	}
}

function getRandomEmblem(takenEmblems: string[]): string
{
	/**
	const emblems = [
		"🍅",
		"🥝",
		"🥑",
		"🥕",
		"🌽",
		"🥦",
		"🍍",
		"🍇",
		"🥒",
		"🍌",
		"🍉",
		"🌶️",
		"🍊",
		"🍆",
		"🍗",
		"🥩",
		"🍤",
		"🥓",
		"🍞",
		"🍹",
		"🥣",
		"🍡",
		"🌭",
		"🍩",
		"🥞",
		"♨️",
	]; */
	const emblems = [
		"🙂",
		"😃",
		"😁",
		"😞",
		"😕",
		"🥺",
		"😳",
		"😎",
		"🙃",
		"😑",
		"😠",
		"😲",
		"😵",
		"😍",
		"😘",
		"🤒",
		"🤥",
		"🙄",
		"😴",
		"🧐",
		"😶",
	];
	if (emblems.length === takenEmblems.length) // none left!
		return emblems[0];

	let chosenEmblem = "";
	let randomIndex = Math.floor(Math.random() * emblems.length);
	let gotOne = false;
	do 
	{
		chosenEmblem = emblems[randomIndex];
		gotOne = takenEmblems.indexOf(chosenEmblem) === -1;
		randomIndex++; // try the next one maybe
	} while (!gotOne);

	return chosenEmblem;
}

/** Data about the player, indexed on UniqueId. */
export class PlayerConnection// implements IToVm<ViewModel.Player>
{
	public static NoSocket = "";
	/** The order this player joined in. */
	public Plid: number;
	public Score = 0;
	/** Id of the socket this player is using. Empty string if no socket. */
	public SocketIds: string[];
	/** 
	 * True if this player has not timed out. Does not imply a live socket.
	 * We don't use the socket because we want them to be able to switch sockets 
	 * without anyone noticing (refresh).
	 */
	public IsConnected: boolean
	/** True if this player has control of the lobby. */
	public IsHost: boolean;
	/** The name this player goes by. */
	public get Nickname(): string { return this.Emblem + this._nickname; }
	public get TextOnlyNickname(): string { return this._nickname; }
	public set Nickname(value: string) { this._nickname = value; }
	private _nickname: string;
	private Emblem: string;
	/** Callback for a timed disconnect. */
	public Timeout: NodeJS.Timeout | null;

	public constructor(plid: number, nickname: string, emblem: string)
	{
		this.Emblem = emblem;
		this.Plid = plid;
		this.SocketIds = [];
		this.IsConnected = true;
		this.IsHost = false;
		this._nickname = nickname;
		this.Timeout = null;
	}
	/** Sets up so we can disconnect this player after some time. */
	public SetTimeout(events: ModelWireup, lobby: Lobby): void
	{
		this.ClearTimeout();

		this.Timeout = setTimeout(
			() =>
			{
				// on real timeout disconnect
				events.SendMessage(lobby, Vm.Message.DisconnectMsg(this.DisplayName));
				events.SendConnectionStatus(lobby);
				this.IsConnected = false;

				// pick new lobby leader
				if (this.IsHost)
				{
					const { leaderName, changed } = lobby.ConsiderNewLobbyLeader();
					if (changed)
						events.SendMessage(lobby, Vm.Message.HostMsg(leaderName));
				}
				events.SendConnectionStatus(lobby);

				if (lobby.NumLiveConnections === 0)
				{
					events.Lobbies.delete(lobby.Lid);
				}
			},
			Shared.DisconnectTimeoutMilliseconds
		);
	}
	/** Removes any timeout object. */
	public ClearTimeout(): void
	{
		if (this.Timeout !== null)
		{
			clearTimeout(this.Timeout);
			this.Timeout = null;
		}
	}
	/** Name that will be displayed to all players. */
	public get DisplayName(): string
	{
		return Vm.IViewPlayerConnection.DisplayName(this.Nickname, this.Plid);
	}
	public ToVm(): Vm.IViewPlayerConnection
	{
		const vm = new Vm.IViewPlayerConnection();
		vm.Nickname = this.Nickname;
		vm.IsHost = this.IsHost;
		vm.IsConnected = this.IsConnected;
		return vm;
	}
}

/** Data about a given game, indexed on LobbyId. */
export class Lobby
{
	public Lid;
	/** UniqueId > Player */
	public PlayerConnections: IMap<PlayerConnection>;
	public Game: null | Game;
	public TakenEmblems: string[];

	public constructor(lid: string)
	{
		this.TakenEmblems = [];
		this.Lid = lid;
		this.Game = null;
		this.PlayerConnections = {};
	}
	/** Will create or retrieve a connection. */
	public GetConnection(uid: UniqueId, nickname: string): { connection: PlayerConnection, isNew: boolean }
	{
		let isNew = false;
		let connection: PlayerConnection;
		if (IMap.Has(this.PlayerConnections, uid)) // already have a connection
		{
			connection = IMap.Get(this.PlayerConnections, uid);
		}
		else // new connection
		{
			const emblem = getRandomEmblem(this.TakenEmblems);
			this.TakenEmblems.push(emblem);

			connection = new PlayerConnection(this.NumTotalConnections, nickname, emblem);
			isNew = true;
			IMap.Set(this.PlayerConnections, uid, connection);
		}

		return { connection, isNew };
	}
	/** How many players are in this lobby, regardless of connection status. */
	public get NumTotalConnections(): number
	{
		return IMap.Length(this.PlayerConnections);
	}
	/** How many players are in this lobby and connected. */
	public get NumLiveConnections(): number
	{
		let num = 0;
		for (const { v: connection } of IMap.Kvp(this.PlayerConnections))
		{
			if (connection.IsConnected)
				num++;
		}
		return num;
	}
	public CreateNewGame(settings: Shared.IGameSettings): void
	{
		var liveConnections = Array.from(IMap.Values(this.PlayerConnections)).filter(function (connection)
		{
			return connection.IsConnected;
		});

		this.Game = new Game(settings, liveConnections);
	}
	/** Will make the first player that is connected the lobby leader, and anyone else not. */
	public ConsiderNewLobbyLeader(): { leaderName: string, changed: boolean }
	{
		let changed = false;
		let leaderName = "";
		let needLeader = true;
		for (const p of IMap.Values(this.PlayerConnections))
		{
			if (needLeader && p.IsConnected)
			{
				needLeader = false;

				leaderName = p.DisplayName;
				changed = !p.IsHost;
				p.IsHost = true;
			}
			else
			{
				p.IsHost = false;
			}
		}
		return { leaderName, changed, };
	}
	/** 
	 * Given a list of target plids, returns list of target socketIds.
	 * Pass empty to get all destinations for this lobby.
	 */
	public GetDestinations(targetPlids: string[]): string[]
	{
		let targetSocketIds: string[] = [];
		if (targetPlids.length > 0)
		{
			// if a players number is contained in the targets list, add the target socket id
			for (const p of IMap.Values(this.PlayerConnections))
			{
				if (targetPlids.includes(p.Plid.toString()))
				{
					targetSocketIds = targetSocketIds.concat(p.SocketIds);
				}
			}
		}
		else
		{
			for (const p of IMap.Values(this.PlayerConnections))
			{
				targetSocketIds = targetSocketIds.concat(p.SocketIds);
			}
		}

		return targetSocketIds;
	}
	public ToVm(localPlid: number): Vm.IViewLobby
	{
		const vm = new Vm.IViewLobby();
		vm.PlayerConnections = [];
		for (const connection of IMap.Values(this.PlayerConnections))
		{
			vm.PlayerConnections.push(connection.ToVm());
		}
		if (this.Game === null)
			vm.Game = null;
		else
			vm.Game = this.Game.ToVm(localPlid);
		return vm;
	}
}

/** Data about a given game, indexed on LobbyId. */
export class Game
{
	public Settings: Shared.IGameSettings;
	/** Dictates player order */
	public Eras: Era[];
	/** How many players are in this game. */
	public NumPlayers: number;

	public constructor(settings: Shared.IGameSettings, playerConnections: PlayerConnection[])
	{
		this.NumPlayers = playerConnections.length;
		this.Settings = { ...settings };
		this.Eras = [];
		this.Eras.push(new Era(this.NumPlayers, 0, this.Settings, null, true));

		const plids: number[] = [];
		playerConnections.forEach((connection, _) =>
		{
			plids.push(connection.Plid);
		});
		playerConnections.forEach((connection, _) =>
		{
			this.LatestEra.AddNewPlayer(plids, connection);
		});
		const tempEra = this.LatestEra;
		this.Eras = [];
		this.Eras.push(new Era(this.NumPlayers, 0, this.Settings, tempEra, true));
	}
	/** Obtains the current Era. */
	public get LatestEra(): Era
	{
		return this.Eras[this.Eras.length - 1];
	}
	/** Ends the turn and advances the game state by one unit. Returns true if there was a new Era. */
	public EndTurn(): boolean
	{
		// compute next turn state
		this.LatestEra.EndTurn();

		// check to see if we should make a new Era
		const newEra = this.LatestEra.IsOver;
		if (newEra)
		{
			this.Eras.push(new Era(this.NumPlayers, this.Eras.length, this.Settings, this.LatestEra, false));
		}

		const status = this.GetStatus();
		if (status.isOver)
		{
			const winner = this.GetCurrentWinner();
			const players = this.LatestEra.LatestTurn.Players;
			for (const player of IMap.Values(players))
			{
				player.LastTurnEvents.push(Vm.Message.GameOverStr());
				if (status.endedEarly)
					player.LastTurnEvents.push(Vm.Message.GameOverScoreReasonStr(winner.Nickname, winner.Plid));
				else
					player.LastTurnEvents.push(Vm.Message.GameOverEraReasonStr());
				player.LastTurnEvents.push(Vm.Message.WinnerStr(winner.Nickname, winner.Plid, winner.Score));
			}
		}

		return newEra;
	}
	public GetStatus(): { isOver: boolean, endedEarly: boolean }
	{
		// N eras need to have ENDED which means we need to be on the N+1 era
		if (this.Eras.length === this.Settings.GameEndMaxEras + 1)
			return { isOver: true, endedEarly: false, };

		// no players left
		if (this.NumPlayers < 2)
			return { isOver: true, endedEarly: true, };

		// find the top scores
		const players = this.LatestEra.LatestTurn.Players;
		const scores = [];
		for (const player of IMap.Values(players))
			scores.push(player.Score);

		const scoreDiff = scores[0] - scores[1];
		const remainingEras = this.Settings.GameEndMaxEras - this.Eras.length;
		const possibleScoreGain = remainingEras * (this.Settings.ScoreLeaderExtraDelta + this.Settings.ScoreSurvivorExtraDelta);
		// could second place even catch up?
		if (scoreDiff > possibleScoreGain)
			return { isOver: true, endedEarly: true, };

		return { isOver: false, endedEarly: false, };
	}
	/** Returns the score leader. */
	public GetCurrentWinner(): PlayerTurn
	{
		const winners: PlayerTurn[] = [];
		const players = this.LatestEra.LatestTurn.Players;
		let topScore = 0;
		// find the top score
		for (const player of IMap.Values(players))
		{
			if (player.Score > topScore)
				topScore = player.Score;
		}
		// if there are ties, just randomly choose one
		for (const player of IMap.Values(players))
		{
			if (player.Score === topScore)
				winners.push(player);
		}
		shuffle(winners);
		return winners[0];
	}
	public ToVm(localPlid: number): Vm.IViewGame
	{
		const status = this.GetStatus();

		const vm: Vm.IViewGame =
		{
			LatestEra: this.LatestEra.ToVm(localPlid),
			Settings: this.Settings,
			IsOver: status.isOver,
		};
		return vm;
	}
}

/** Data about a players turn, indexed on turn number. */
export class Era
{
	public Settings: Shared.IGameSettings;
	/** Which turn is this? */
	public Number: number;
	/** Order > Plid */
	public Order: number[];
	/** Maps (turn number > turn data) */
	public Turns: Turn[];
	public NumPlayers: number;

	public constructor(numPlayers: number, number: number, settings: Shared.IGameSettings, old: null | Era, isFirstEra: boolean)
	{
		this.NumPlayers = numPlayers;
		this.Settings = settings;
		this.Number = number;
		this.Turns = [];
		this.Order = [];
		if (old === null)
		{
			this.Turns.push(new Turn(this.NumPlayers, this.Settings, this.Turns.length, this, null, true, true));
		}
		else
		{
			// create new random order
			for (const players of IMap.Values(old.LatestTurn.Players))
			{
				this.Order.push(players.Plid);
			}
			shuffle(this.Order);

			// previous era ended
			this.Turns.push(new Turn(this.NumPlayers, this.Settings, this.Turns.length, this, old.LatestTurn, true, isFirstEra));
		}
	}
	/** Ends the turn and advances the game state by one unit. */
	public EndTurn(): void
	{
		const turn = new Turn(this.NumPlayers, this.Settings, this.Turns.length, this, this.LatestTurn, false, false);
		this.Turns.push(turn);
	}
	/** Gets the active Turn. */
	public get LatestTurn(): Turn
	{
		return this.Turns[this.Turns.length - 1];
	}
	/** True if this Era should end. */
	public get IsOver(): boolean
	{
		// at least this many players need to be dead
		const minDead = Math.max(1, Math.floor(IMap.Length(this.LatestTurn.Players) * this.Settings.EraEndMinDeadPercentage));
		return this.LatestTurn.NumDead >= minDead;
	}
	/** Adds a new player to this Era. */
	public AddNewPlayer(plids: number[], connection: PlayerConnection): void
	{
		this.Order.push(connection.Plid);
		this.LatestTurn.AddNewPlayer(this, plids, connection);
	}
	public ToVm(localPlid: number): Vm.IViewEra
	{
		const vm: Vm.IViewEra =
		{
			Number: this.Number,
			Order: [...this.Order], // shallow copy
			LatestTurn: this.LatestTurn.ToVm(localPlid),
		};
		return vm;
	}
}

/** Data about a players turn, indexed on turn number. */
export class Turn
{
	public Settings: Shared.IGameSettings;
	public Number: number;
	/** Maps (plid > player) */
	public Players: IMap<PlayerTurn>;

	/** Pass old turn if it exists which will compute the new turn state. */
	public constructor(
		numPlayers: number,
		settings: Shared.IGameSettings,
		number: number,
		currentEra: Era,
		oldTurn: null | Turn,
		isNewEra: boolean,
		isFirstEra: boolean
	)
	{
		this.Settings = settings;
		this.Number = number;
		this.Players = {};
		if (oldTurn === null)
		{

		}
		else // Given an old turn, build the new turn
		{
			// score awarded at the beginning of an era
			const scoreDeltas = oldTurn.GetScoreDelta(!isFirstEra && isNewEra);
			const globalEvents: string[] = [];

			const numPlayers = currentEra.NumPlayers;
			const maxMoney = Array(numPlayers).fill(0);
			if (isNewEra)
			{
				for (let i = 0; i < Math.ceil(numPlayers / 2); ++i)
				{
					maxMoney[i] = 30 + Math.floor(Math.random() * 15);
				}
				shuffle(maxMoney);
			}

			// copy player data
			let i = 0;
			for (const oldPlayer of IMap.Values(oldTurn.Players))
			{
				const newPlayer = PlayerTurn.NewPlayerTurnFromOld(this.Settings,
					numPlayers, currentEra, oldTurn, oldPlayer, isNewEra, globalEvents, maxMoney[i]);
				newPlayer.Score += scoreDeltas[newPlayer.Plid];
				this.Players[newPlayer.Plid] = newPlayer;
				++i;
			}

			if (isFirstEra)
			{
				for (const player of IMap.Values(this.Players))
					player.LastTurnEvents = [];
			}
			else if (isNewEra)
			{
				globalEvents.push(Vm.Message.EndEraStr(currentEra.Number - 1));
				for (const eachPlayer of IMap.Values(this.Players))
				{
					const scoreDelta = scoreDeltas[eachPlayer.Plid];
					if (scoreDelta > 0)
					{
						globalEvents.push(Vm.Message.ScoreStr(eachPlayer.Nickname, eachPlayer.Plid, scoreDelta));
					}
				}
				// give each player the global events
				for (const player of IMap.Values(this.Players))
					player.LastTurnEvents = player.LastTurnEvents.concat(globalEvents);
			}
			for (const player of IMap.Values(this.Players))
			{
				if (player.MaxMoney === 0)
					player.LastTurnEvents.push(`You have no max ${Shared.MoneyIcon} this Era.`);
				else
					player.LastTurnEvents.push(`Your max ${Shared.MoneyIcon} is ${player.MaxMoney} this Era.`);
			}
		}
	}
	/** Returns the changes in money for the given player due to trade. */
	public GetTradeDelta(targetPlayer: PlayerTurn, currentEra: Era, lastTurnEvents: string[]): number
	{
		let delta = 0;

		const tradePlids = Vm.IViewEra.GetTradePartners(targetPlayer.Plid, currentEra.Order);

		for (const plid of tradePlids)
		{
			// cannot trade with self or a dead player
			const otherPlayer = currentEra.LatestTurn.Players[plid]!;
			if (otherPlayer.IsDead || otherPlayer.IsSamePlayer(targetPlayer))
				continue;

			// get trade decisions
			const us = targetPlayer.Trades[otherPlayer.Plid] || Shared.Trade.ActionCooperate;
			const them = otherPlayer.Trades[targetPlayer.Plid] || Shared.Trade.ActionCooperate;

			const thisDelta = Shared.Trade.GetDelta(this.Settings, us, them);
			delta += thisDelta;
			// let the player know what happened
			lastTurnEvents.push(Vm.Message.TradeStr(us, them, otherPlayer.Nickname, otherPlayer.Plid, thisDelta));
		}

		return delta;
	}
	/** Returns the changes in military and money for the given player due to attacks. */
	public GetAttackDelta(existingMilitary: number, targetPlayer: PlayerTurn, lastTurnEvents: string[]):
		{ militaryDelta: number, moneyDelta: number, }
	{
		let militaryDelta = 0;
		let moneyDelta = 0;
		for (const otherPlayer of IMap.Values(this.Players))
		{
			// cannot attack self or a dead player
			if (otherPlayer.IsDead || otherPlayer.IsSamePlayer(targetPlayer))
				continue;

			// get trade decisions
			const us = targetPlayer.MilitaryAttacks[otherPlayer.Plid] || 0;
			const them = otherPlayer.MilitaryAttacks[targetPlayer.Plid] || 0;

			const delta = Shared.Military.GetDelta(this.Settings, existingMilitary, us, them);
			militaryDelta += delta.militaryDelta;
			moneyDelta += delta.moneyDelta;

			// future deltas need to know what the new military will be after previous exchanges
			existingMilitary += delta.militaryDelta;

			// let the player know what happened
			if (them !== 0)
				lastTurnEvents.push(Vm.Message.AttackInStr(
					otherPlayer.Nickname, otherPlayer.Plid, them, delta.militaryDelta, delta.moneyDelta));
			if (us !== 0)
				lastTurnEvents.push(Vm.Message.AttackOutStr(otherPlayer.Nickname, otherPlayer.Plid, us));
		}
		return { militaryDelta, moneyDelta };
	}
	/** Assuming this Era ended right now, who would get what score? */
	public GetScoreDelta(isNewEra: boolean): IMap<number>
	{
		const scores = new IMap<number>();
		let leaderPlid = 0;
		let leaderMoney = 0;

		for (const player of IMap.Values(this.Players))
		{
			scores[player.Plid] = 0;
			if (isNewEra)
			{
				if (player.Money > leaderMoney)
				{
					leaderPlid = player.Plid;
					leaderMoney = player.Money;
				}
				if (player.IsDead)
					scores[player.Plid] += this.Settings.ScoreDeathDelta;
				else
					scores[player.Plid] += this.Settings.ScoreSurvivorExtraDelta;
			}
		}
		if (isNewEra)
			scores[leaderPlid] += this.Settings.ScoreLeaderExtraDelta;

		return scores;
	}
	/** Adds a new player to this Turn. */
	public AddNewPlayer(era: Era, plids: number[], connection: PlayerConnection): void
	{
		const player = PlayerTurn.NewPlayerTurnFromConnection(era, plids, connection, 0);
		this.Players[player.Plid] = player;
	}
	/** Returns the number of dead players currently. */
	public get NumDead(): number
	{
		let numDead = 0;
		for (const player of IMap.Values(this.Players)) 
		{
			if (player.IsDead)
				numDead++;
		}
		return numDead;
	}
	/** True if this Turn should end. */
	public get IsOver(): boolean
	{
		// at least this many players need to be dead
		for (const player of IMap.Values(this.Players))
		{
			if (!player.IsDead && !player.IsDone)
				return false;
		}
		return true;
	}
	public ToVm(localPlid: number): Vm.IViewTurn
	{
		const vm: Vm.IViewTurn =
		{
			Number: this.Number,
			Players: {},
		};

		const self = this.Players[localPlid] || null;

		for (const player of IMap.Values(this.Players))
		{
			vm.Players[player.Plid] = player.ToVm(self);
		}
		return vm;
	}
}

/** Data about the player, indexed on UniqueId. */
export class PlayerTurn
{
	/** Is this player done with their turn? */
	public Nickname: string;
	/** Is this player done with their turn? */
	public IsDone: boolean;
	/** The order this player joined in. */
	public Plid: number;
	/** How many points this player has. */
	public Score: number;
	/** Total money this player has in military. */
	public Military: number;
	/** This player has this much money on this turn. */
	public Money: number;
	/** How much money this player is trying to add to their military. */
	public MilitaryDelta: number;
	/** Maps (plid > attack) */
	public MilitaryAttacks!: IMap<number>;
	/** Maps (plid > trade decision). */
	public Trades: IMap<number>;
	/** Arbitrary list of relevant events. */
	public LastTurnEvents: string[];
	/** Max money this player can have, or 0 if unlimited. */
	public MaxMoney: number;

	/** Creates a new PlayerTurn from a connection. */
	public static NewPlayerTurnFromConnection(
		era: Era, plids: number[], connection: PlayerConnection, maxMoney: number): PlayerTurn
	{
		const player = new PlayerTurn(connection.Nickname, plids, connection.Plid, 0);
		player.ResetForNewEra(era.Settings, maxMoney);
		return player;
	}
	/** Creates a new PlayerTurn from their old turn. */
	public static NewPlayerTurnFromOld(settings: IGameSettings,
		numPlayers: number, currentEra: Era, oldTurn: Turn, oldPlayer: PlayerTurn, isNewEra: boolean,
		globalEvents: string[], maxMoney: number): PlayerTurn
	{
		const player = new PlayerTurn(oldPlayer.Nickname, currentEra.Order, oldPlayer.Plid, oldPlayer.Score);

		if (isNewEra)
		{
			player.ResetForNewEra(oldTurn.Settings, maxMoney);
			player.LastTurnEvents = [...oldPlayer.LastTurnEvents];
		}
		else
		{
			// copy old values
			player.MaxMoney = oldPlayer.MaxMoney;
			player.Money = oldPlayer.Money;
			player.Military = oldPlayer.Military;
			if (!player.IsDead)
			{
				player.LastTurnEvents.push(Vm.Message.EndTurnStr(oldTurn.Number, player.Military, player.Money));

				// get interest
				if (settings.InterestRateDivisor !== 0)
				{
					const interestPayment = Math.floor(oldPlayer.Money / settings.InterestRateDivisor);
					player.Money += interestPayment;
					player.LastTurnEvents.push(Vm.Message.GainInterestStr(settings.InterestRateDivisor, interestPayment));
				}

				// do trades
				player.Money += oldTurn.GetTradeDelta(oldPlayer, currentEra, player.LastTurnEvents);

				// do military delta
				player.Money -= oldPlayer.MilitaryDelta;
				player.Military += oldPlayer.MilitaryDelta;
				if (oldPlayer.MilitaryDelta !== 0)
					player.LastTurnEvents.push(Vm.Message.PurchaseMilitaryStr(oldPlayer.MilitaryDelta, -oldPlayer.MilitaryDelta));

				// allocate our attack money
				for (const attack of IMap.Values(oldPlayer.MilitaryAttacks))
				{
					player.Military -= attack;
				}

				// apply others attacks to us
				const deltas = oldTurn.GetAttackDelta(player.Military, oldPlayer, player.LastTurnEvents);
				player.Money += deltas.moneyDelta;
				player.Military += deltas.militaryDelta;

				if (player.MaxMoney !== 0)
				{
					if (player.Money > player.MaxMoney)
					{
						player.Money = player.MaxMoney;
					}
				}

				if (player.IsDead)
				{
					player.LastTurnEvents.push(Vm.Message.YouDiedStr(player.Money));
					globalEvents.push(Vm.Message.OtherDiedStr(player.Nickname, player.Plid));
				}
			}
			player.IsDone = player.IsDead; // if a player is dead, they can't take actions
		}

		return player;
	}
	/** Intentionally private. Use the static factories above. */
	private constructor(nickname: string, plidList: number[], plid: number, score: number)
	{
		this.MaxMoney = 0;
		this.Nickname = nickname;
		this.IsDone = false;
		this.Plid = plid;
		this.Score = score;

		this.LastTurnEvents = [];
		this.MilitaryAttacks = {};
		this.Trades = {};
		for (const plid of plidList)
		{
			this.MilitaryAttacks[plid] = 0;
			this.Trades[plid] = Shared.Trade.ActionCooperate;
		}

		this.MilitaryDelta = 0;
		this.Money = 0;
		this.Military = 0;
	}
	/** Constructs this player turns values as if it was the start of a new Era. */
	public ResetForNewEra(settings: Shared.IGameSettings, maxMoney: number): void
	{
		this.MaxMoney = maxMoney;
		this.Money = settings.EraStartMoney;
		this.Military = settings.EraStartMilitary;
	}
	public IsSamePlayer(o: null | PlayerTurn): boolean
	{
		if (o !== null)
			return this.Plid === o.Plid;
		else
			return false;
	}
	/** True if this player has met the death condition. */
	public get IsDead(): boolean
	{
		return this.Money <= 0;
	}
	public ToVm(viewerTurn: null | PlayerTurn): Vm.IViewPlayerTurn
	{
		const isSelf = this.IsSamePlayer(viewerTurn);

		const vm: Vm.IViewPlayerTurn = {
			MilitaryAttacks: { ...this.MilitaryAttacks },
			Trades: { ...this.Trades },
			MilitaryDelta: isSelf ? this.MilitaryDelta : 0,
			Military: this.Military,
			Money: isSelf ? this.Money.toString() : "?",
			Plid: this.Plid,
			Score: this.Score,
			IsDone: this.IsDone,
			LastTurnEvents: [...this.LastTurnEvents],
			IsDead: this.IsDead,
		};

		return vm;
	}
	public FromVm(settings: IGameSettings, vm: Vm.IViewPlayerTurn): void
	{
		if (vm !== null && vm !== undefined)
		{
			// military delta must be less than Money
			if (vm.MilitaryDelta > settings.MilitaryMaxDeltaPerTurn)
			{
				vm.MilitaryDelta = settings.MilitaryMaxDeltaPerTurn;
			}
			this.MilitaryDelta = vm.MilitaryDelta;

			// military attacks must be less than new total Military
			let militaryAttackSum = 0;
			for (const attack of IMap.Values(vm.MilitaryAttacks))
			{
				militaryAttackSum += attack;
			}
			if (militaryAttackSum > this.Military + vm.MilitaryDelta)
			{
				vm.MilitaryAttacks = {};
			}
			this.MilitaryAttacks = { ...vm.MilitaryAttacks };

			// TODO validation
			this.Trades = { ...vm.Trades };
		}
	}
}
