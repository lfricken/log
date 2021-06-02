/* eslint-disable no-magic-numbers */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/** Server side model. View Viewmodel (Model) */

import * as Vm from '../client/src/viewmodel';
import * as Shared from "../client/src/shared";
import { ModelWireup } from './events';

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
	public Nickname: string;
	/** Callback for a timed disconnect. */
	public Timeout: NodeJS.Timeout | null;

	public constructor(plid: number, nickname: string)
	{
		this.Plid = plid;
		this.SocketIds = [];
		this.IsConnected = true;
		this.IsHost = false;
		this.Nickname = nickname;
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
		return Vm.ViewPlayerConnection.DisplayName(this.Nickname, this.Plid);
	}
	public ToVm(): Vm.ViewPlayerConnection
	{
		const vm = new Vm.ViewPlayerConnection();
		vm.Nickname = this.Nickname;
		vm.IsHost = this.IsHost;
		vm.IsConnected = this.IsConnected;
		return vm;
	}
}

/** Data about a given game, indexed on LobbyId. */
export class Lobby
{
	/** UniqueId > Player */
	public Lid;
	public PlayerConnections: Map<UniqueId, PlayerConnection>;
	public Game: null | Game;

	public constructor(lid: string)
	{
		this.Lid = lid;
		this.Game = null;
		this.PlayerConnections = new Map<UniqueId, PlayerConnection>();
	}
	/** Will create or retrieve a connection. */
	public GetConnection(uid: UniqueId, nickname: string): { connection: PlayerConnection, isNew: boolean }
	{
		let isNew = false;
		let connection: PlayerConnection;
		if (this.PlayerConnections.has(uid)) // already have a connection
		{
			connection = this.PlayerConnections.get(uid)!;
		}
		else // new connection
		{
			connection = new PlayerConnection(this.NumTotalConnections, nickname);
			isNew = true;
			this.PlayerConnections.set(uid, connection);
		}

		return { connection, isNew };
	}
	/** How many players are in this lobby, regardless of connection status. */
	public get NumTotalConnections(): number
	{
		return this.PlayerConnections.size;
	}
	/** How many players are in this lobby and connected. */
	public get NumLiveConnections(): number
	{
		let num = 0;
		this.PlayerConnections.forEach(c => { num++; });
		return num;
	}
	public CreateNewGame(settings: Shared.IGameSettings): void
	{
		var liveConnections = Array.from(this.PlayerConnections.values()).filter(function (connection)
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
		for (const p of this.PlayerConnections.values())
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
			for (const p of this.PlayerConnections.values())
			{
				if (targetPlids.includes(p.Plid.toString()))
				{
					targetSocketIds = targetSocketIds.concat(p.SocketIds);
				}
			}
		}
		else
		{
			for (const p of this.PlayerConnections.values())
			{
				targetSocketIds = targetSocketIds.concat(p.SocketIds);
			}
		}

		return targetSocketIds;
	}
	public ToVm(localPlid: number): Vm.ViewLobby
	{
		const vm = new Vm.ViewLobby();
		vm.PlayerConnections = [];
		this.PlayerConnections.forEach((connection, _) =>
		{
			vm.PlayerConnections.push(connection.ToVm());
		});
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

	public constructor(settings: Shared.IGameSettings, playerConnections: PlayerConnection[])
	{
		this.Settings = { ...settings };
		this.Eras = [];
		this.Eras.push(new Era(this.Settings, this.Eras.length, null));
		playerConnections.forEach((connection, _) =>
		{
			this.LatestEra.AddNewPlayer(connection);
		});
	}
	/** Obtains the current Era. */
	public get LatestEra(): Era
	{
		return this.Eras[this.Eras.length - 1];
	}
	/** Ends the turn and advances the game state by one unit. */
	public EndTurn(): void
	{
		// compute next turn state
		this.LatestEra.EndTurn();

		// check to see if we should make a new Era
		if (this.LatestEra.IsOver)
		{
			this.Eras.push(new Era(this.Settings, this.Eras.length, this.LatestEra));
		}
	}
	/** How many players are in this game, regardless of connection status. */
	public get NumPlayers(): number
	{
		return this.LatestEra.LatestTurn.Players.size;
	}
	public get IsOver(): boolean
	{
		// N eras need to have ENDED which means we need to be on the N+1 era
		return this.Eras.length === this.Settings.GameEndMaxTurns + 1;
	}
	/** Returns the score leader. */
	public GetCurrentWinner(): PlayerTurn
	{
		const winners: PlayerTurn[] = [];
		const players = this.LatestEra.LatestTurn.Players;
		let topScore = 0;
		// find the top score
		for (const player of players.values())
		{
			if (player.Score > topScore)
				topScore = player.Score;
		}
		// if there are ties, just randomly choose one
		for (const player of players.values())
		{
			if (player.Score === topScore)
				winners.push(player);
		}
		shuffle(winners);
		return winners[0];
	}
	public ToVm(localPlid: number): Vm.ViewGame
	{
		const vm = new Vm.ViewGame();
		vm.LatestEra = this.LatestEra.ToVm(localPlid);
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

	public constructor(settings: Shared.IGameSettings, number: number, old: null | Era)
	{
		this.Settings = settings;
		this.Number = number;
		this.Turns = [];
		if (old === null)
		{
			this.Turns.push(new Turn(this.Settings, this.Turns.length, null, true));
			this.Order = [];
		}
		else
		{
			// previous era ended
			this.Turns.push(new Turn(this.Settings, this.Turns.length, old.LatestTurn, true));

			// create new random order
			this.Order = Array.from(this.LatestTurn.Players.keys());
			shuffle(this.Order);
		}
	}
	/** Ends the turn and advances the game state by one unit. */
	public EndTurn(): void
	{
		const turn = new Turn(this.Settings, this.Turns.length, this.LatestTurn, false);
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
		const minDead = Math.max(1, Math.floor(this.LatestTurn.Players.size * this.Settings.EraEndMinDeadPercentage));
		return this.LatestTurn.NumDead >= minDead;
	}
	/** Adds a new player to this Era. */
	public AddNewPlayer(connection: PlayerConnection): void
	{
		this.Order.push(connection.Plid);
		this.LatestTurn.AddNewPlayer(connection);
	}
	public ToVm(localPlid: number): Vm.ViewEra
	{
		const vm = new Vm.ViewEra();
		vm.Number = this.Number;
		vm.Order = [...this.Order]; // shallow copy
		vm.LatestTurn = this.LatestTurn.ToVm(localPlid);
		return vm;
	}
}

/** Data about a players turn, indexed on turn number. */
export class Turn
{
	public Settings: Shared.IGameSettings;
	public Number!: number;
	/** Maps (plid > player) */
	public Players!: Map<number, PlayerTurn>;

	/** Pass old turn if it exists which will compute the new turn state. */
	public constructor(settings: Shared.IGameSettings, number: number, oldTurn: null | Turn, isNewEra: boolean)
	{
		this.Settings = settings;
		this.Number = number;
		this.Players = new Map<number, PlayerTurn>();
		if (oldTurn === null)
		{

		}
		else
		{
			this.ComputeNewTurn(oldTurn, isNewEra);
		}
	}
	/** Given an old turn, build the new turn. */
	private ComputeNewTurn(oldTurn: Turn, isNewEra: boolean): void
	{
		// score awarded at the beginning of an era
		const scoreDelta = oldTurn.GetScoreDelta(isNewEra);

		// copy player data
		for (const oldPlayer of oldTurn.Players.values())
		{
			const newPlayer = PlayerTurn.NewPlayerTurnFromOld(oldTurn, oldPlayer, isNewEra);
			newPlayer.Score += scoreDelta[newPlayer.Plid];
			this.Players.set(newPlayer.Plid, newPlayer);
		}
	}
	/** Returns the changes in money for the given player due to trade. */
	public GetTradeDelta(targetPlayer: PlayerTurn): number
	{
		let delta = 0;

		for (const player of this.Players.values())
		{
			if (player.Plid === targetPlayer.Plid) // cant trade with self
				continue;
			const pOther = player;

			// get trade decisions
			const us = targetPlayer.Trades.get(player.Plid);
			const them = pOther.Trades.get(targetPlayer.Plid);

			if (us === undefined || them === undefined)
				continue; // no trade route

			delta += Shared.Trade.GetDelta(this.Settings, us, them);
		}

		return delta;
	}
	/** Returns the changes in military and money for the given player due to attacks. */
	public GetAttackDelta(targetPlayer: PlayerTurn): { militaryDelta: number, moneyDelta: number, }
	{
		let militaryDelta = 0;
		let moneyDelta = 0;
		for (const player of this.Players.values())
		{
			if (player.Plid === targetPlayer.Plid) // cant attack self
				continue;

			// get trade decisions
			const us = targetPlayer.MilitaryAttacks.get(player.Plid) || 0;
			const them = player.MilitaryAttacks.get(targetPlayer.Plid) || 0;

			const delta = Shared.Military.GetDelta(this.Settings, targetPlayer.Military, us, them);
			militaryDelta += delta.militaryDelta;
			moneyDelta += delta.moneyDelta;
		}
		return { militaryDelta, moneyDelta };
	}
	/** Assuming this Era ended right now, who would get what score? */
	public GetScoreDelta(isNewEra: boolean): number[]
	{
		const scores = new Array(this.Players.size).fill(0);
		let leaderPlid = 0;
		let leaderMoney = 0;

		if (isNewEra)
		{
			for (const player of this.Players.values())
			{
				if (player.Money > leaderMoney)
				{
					leaderPlid = player.Plid;
					leaderMoney = player.Money;
				}
				scores[player.Plid] = 0;
				if (player.IsDead)
					scores[player.Plid] += this.Settings.ScoreDeathDelta;
				else
					scores[player.Plid] += this.Settings.ScoreSurvivorExtraDelta;
			}
			scores[leaderPlid] += this.Settings.ScoreLeaderExtraDelta;
		}

		return scores;
	}
	/** Adds a new player to this Turn. */
	public AddNewPlayer(connection: PlayerConnection): void
	{
		const player = PlayerTurn.NewPlayerTurnFromConnection(this.Settings, connection);
		this.Players.set(player.Plid, player);
	}
	/** Returns the number of dead players currently. */
	public get NumDead(): number
	{
		let numDead = 0;
		this.Players.forEach((player, _) =>
		{
			if (player.IsDead)
				numDead++;
		});
		return numDead;
	}
	public ToVm(localPlid: number): Vm.ViewTurn
	{
		const vm = new Vm.ViewTurn();
		vm.Number = this.Number;
		vm.Players = [];
		this.Players.forEach((player, _) =>
		{
			if (localPlid === player.Plid)
				vm.LocalPlayer = player.ToVmPrivate();
			vm.Players.push(player.ToVmPublic());
		});
		return vm;
	}
}

/** Data about the player, indexed on UniqueId. */
export class PlayerTurn
{
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
	public MilitaryAttacks: Map<number, number>;
	/** Maps (plid > trade decision). */
	public Trades: Map<number, number>;

	/** Creates a new PlayerTurn from a connection. */
	public static NewPlayerTurnFromConnection(settings: Shared.IGameSettings, connection: PlayerConnection): PlayerTurn
	{
		const player = new PlayerTurn(connection.Plid, 0);
		player.ResetForNewEra(settings);
		return player;
	}
	/** Creates a new PlayerTurn from their old turn. */
	public static NewPlayerTurnFromOld(oldTurn: Turn, oldPlayer: PlayerTurn, isNewEra: boolean): PlayerTurn
	{
		const player = new PlayerTurn(oldPlayer.Plid, oldPlayer.Score);

		if (isNewEra)
		{
			player.ResetForNewEra(oldTurn.Settings);
		}
		else
		{
			// copy old values
			player.Money = oldPlayer.Money;
			player.Military = oldPlayer.Military;

			// do trades
			player.Money += oldTurn.GetTradeDelta(oldPlayer);

			// do military delta
			player.Money -= oldPlayer.MilitaryDelta;
			player.Military += oldPlayer.MilitaryDelta;

			// allocate our attack money
			for (const kvp of oldPlayer.MilitaryAttacks)
			{
				player.Military -= kvp[1];
			}

			// apply others attacks to us
			const deltas = oldTurn.GetAttackDelta(oldPlayer);
			player.Money += deltas.moneyDelta;
			player.Military += deltas.militaryDelta;
		}

		return player;
	}
	/** Intentionally private. Use the static factories above. */
	private constructor(plid: number, score: number)
	{
		this.Plid = plid;
		this.Score = score;

		this.MilitaryAttacks = new Map<number, number>();
		this.Trades = new Map<number, number>();
		this.MilitaryDelta = 0;
		this.Money = 0;
		this.Military = 0;
	}
	/** Constructs this player turns values as if it was the start of a new Era. */
	public ResetForNewEra(settings: Shared.IGameSettings): void
	{
		this.Money = settings.EraStartMoney;
		this.Military = settings.EraStartMilitary;
	}
	public IsSamePlayer(o: PlayerTurn): boolean
	{
		return this.Plid === o.Plid;
	}
	/** True if this player has met the death condition. */
	public get IsDead(): boolean
	{
		return this.Money <= 0;
	}
	public ToVmPublic(): Vm.ViewPlayerTurnPublic
	{
		const vm = new Vm.ViewPlayerTurnPublic();
		vm.Military = this.Military;
		vm.Plid = this.Plid;
		vm.Score = this.Score;
		return vm;
	}
	public ToVmPrivate(): Vm.ViewPlayerTurnPrivate
	{
		const vm = new Vm.ViewPlayerTurnPrivate();
		vm.MilitaryAttacks = new Map<number, number>();
		vm.MilitaryDelta = this.MilitaryDelta;
		vm.Military = this.Military;
		vm.Money = this.Money;
		vm.Plid = this.Plid;
		vm.Score = this.Score;
		vm.Trades = new Map<number, number>();
		return vm;
	}
}
