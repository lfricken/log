/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/** Server side model. View Viewmodel (Model) */

import * as ViewModel from '../client/src/viewmodel';
import * as Shared from "../client/src/shared";

type UniqueId = string;



/** Indicates this model can map itself to a view model. */
interface IToVm<V>
{
	ToVm(): V;
}
/** Maps a Map of models to an array of their view models. */
function MapVmMap<X, M extends IToVm<V>, V>(a: Map<X, M>): V[]
{
	return Array.from(a.values()).map((m: M) => { return m.ToVm(); });
}
/** Maps an array of models to an array of their view models. */
function MapVmArray<M extends IToVm<V>, V>(a: Array<M>): V[]
{
	return a.map((m: M) => { return m.ToVm(); });
}
function shuffle<T>(array: T[]): T[]
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

	return array;
}

export class Settings
{
	public RandomMilTax: boolean = false;
}

/** Data about the player, indexed on UniqueId. */
export class PlayerConnection// implements IToVm<ViewModel.Player>
{
	public static NoSocket = "";
	/** The order this player joined in. */
	public Plid: number;
	public Score = 0;
	/** Id of the socket this player is using. Empty string if no socket. */
	public SocketId: string;
	/** 
	 * True if this player has not timed out. Does not imply a live socket.
	 * We don't use the socket because we want them to be able to switch sockets 
	 * without anyone noticing (refresh).
	 */
	public IsConnected: boolean
	/** True if this player has control of the lobby. */
	public IsLobbyLeader: boolean;
	/** The name this player goes by. */
	public Nickname: string;
	/** Callback for a timed disconnect. */
	public Timeout: NodeJS.Timeout | null;

	public constructor(plid: number, nickname: string)
	{
		this.Plid = plid;
		this.SocketId = PlayerConnection.NoSocket;
		this.IsConnected = true;
		this.IsLobbyLeader = false;
		this.Nickname = nickname;
		this.Timeout = null;
	}
	/** Sets up so we can disconnect this player after some time. */
	public SetTimeout(value: NodeJS.Timeout): void
	{
		// handle old timeout
		this.ClearTimeout();
		this.Timeout = value;
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
		return ViewModel.Player.DisplayName(this);
	}
}

/** Data about a given game, indexed on LobbyId. */
export class Game implements IToVm<ViewModel.Game>
{
	public Settings: Settings;
	/** UniqueId > Player */
	private PlayerConnections: Map<UniqueId, PlayerConnection>;
	/** Dictates player order */
	private Eras: Era[];

	public constructor()
	{
		this.Settings = new Settings();
		this.PlayerConnections = new Map<UniqueId, PlayerConnection>();
		this.Eras = [];
		this.Eras.push(new Era(this.Eras.length, null));
	}
	/** Obtains the current Era. */
	public get LatestEra(): Era
	{
		return this.Eras[this.Eras.length - 1];
	}
	/** Will create or retrieve a player. */
	public GetConnection(uid: UniqueId, nickname: string): { connection: PlayerConnection, isNewPlayer: boolean }
	{
		let isNewPlayer = false;
		if (!this.PlayerConnections.has(uid))
		{
			isNewPlayer = true;
			this.PlayerConnections.set(uid, new PlayerConnection(this.NumPlayers, nickname));

			if (this.PlayerConnections.size === 1)
				this.ConsiderNewLobbyLeader();

			this.LatestEra.AddNewPlayer(this.PlayerConnections.get(uid)!);
		}
		const connection = this.PlayerConnections.get(uid)!;

		return { connection, isNewPlayer };
	}
	/** Ends the turn and advances the game state by one unit. */
	public EndTurn(): void
	{
		// compute next turn state
		this.LatestEra.EndTurn();

		// check to see if we should make a new Era
		if (this.LatestEra.IsOver)
		{
			this.Eras.push(new Era(this.Eras.length, this.LatestEra));
		}
	}
	/** Will make the first player that is connected the lobby leader, and anyone else not. */
	public ConsiderNewLobbyLeader(): string
	{
		let newLeaderName = "";
		let needLeader = true;
		for (const p of this.PlayerConnections.values())
		{
			if (needLeader && p.IsConnected)
			{
				needLeader = false;
				newLeaderName = p.DisplayName;
				p.IsLobbyLeader = true;
			}
			else
			{
				p.IsLobbyLeader = false;
			}
		}
		return newLeaderName;
	}
	/** How many players are in this game, regardless of connection status. */
	public get NumPlayers(): number
	{
		return this.PlayerConnections.size;
	}
	/** Given a message, returns list of target SocketIds. */
	public GetDestinations(text: string): string[]
	{
		const targetIds: string[] = [];

		// given format #,#,#...@message
		// send to only player numbers
		let split = text.split('@');
		if (split.length > 1)
		{
			const targets = split[0].split(/(?:,| )+/); // split on comma and space
			// if a players number is contained in the targets list, add the target socket id
			for (const p of this.PlayerConnections.values())
			{
				if (targets.includes(p.Plid.toString()))
				{
					targetIds.push(p.SocketId);
				}
			}
		}
		else
		{
			for (const p of this.PlayerConnections.values())
			{
				targetIds.push(p.SocketId);
			}
		}

		return targetIds;
	}
	public ToVm(): ViewModel.Game
	{
		const vm = new ViewModel.Game();

		//vm.PlayerConnections = MapVmMap(this.PlayerConnections);
		vm.LatestEra = this.LatestEra.ToVm();

		return vm;
	}
}

/** Data about a players turn, indexed on turn number. */
export class Era implements IToVm<ViewModel.Era>
{
	/** Maps (order > player number) */
	private Order: number[];
	/** Maps (turn number > turn data) */
	private Turns: Turn[];
	public Eid: number;

	public constructor(eid: number, old: null | Era)
	{
		this.Eid = eid;
		this.Turns = [];
		if (old === null)
		{
			this.Turns.push(new Turn(null, true));
			this.Order = [];
		}
		else
		{
			// previous era ended
			this.Turns.push(new Turn(old.LatestTurn, true));

			// create new random order
			this.Order = Array.from(this.LatestTurn.Players.keys());
			shuffle(this.Order);
		}
	}
	/** Ends the turn and advances the game state by one unit. */
	public EndTurn(): void
	{
		const old = this.LatestTurn;
		const turn = new Turn(old, false);
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
		const minDead = Math.floor(this.LatestTurn.Players.length * Shared.Rules.EraMinDeadPercentage);

		return this.LatestTurn.NumDead >= minDead;
	}
	/** Adds a new player to this Era. */
	public AddNewPlayer(connection: PlayerConnection): void
	{
		this.Order.push(connection.Plid);
		this.LatestTurn.AddNewPlayer(connection);
	}
	public ToVm(): ViewModel.Era
	{
		const vm = new ViewModel.Era();
		return vm;
	}
}

/** Data about a players turn, indexed on turn number. */
export class Turn implements IToVm<ViewModel.Era>
{
	/** Maps (plid > player) */
	public Players!: PlayerTurn[];

	/** Pass old turn if it exists which will compute the new turn state. */
	public constructor(obj: null | Turn, isNewEra: boolean)
	{
		this.Players = [];
		if (obj === null)
		{

		}
		else
		{
			this.ComputeNewTurn(obj, isNewEra);
		}
	}
	private ComputeNewTurn(oldTurn: Turn, isNewEra: boolean): void
	{
		// score awarded at the beginning of an era
		const scoreDelta = oldTurn.GetScoreDelta(isNewEra);

		// copy player data
		for (const oldPlayer of oldTurn.Players)
		{
			const newPlayer = PlayerTurn.NewPlayerTurnFromOld(oldTurn, oldPlayer, isNewEra);
			newPlayer.Score += scoreDelta[newPlayer.Plid];
			this.Players.push(newPlayer);
		}
	}
	public GetTradeDelta(targetPlayer: PlayerTurn): number
	{
		let delta = 0;

		for (const player of this.Players)
		{
			if (player.Plid === targetPlayer.Plid) // cant trade with self
				continue;
			const pOther = player;

			// get trade decisions
			const us = targetPlayer.Trades.get(player.Plid);
			const them = pOther.Trades.get(targetPlayer.Plid);

			if (us === undefined || them === undefined)
				continue; // no trade route

			delta += Shared.Trade.GetDelta(us, them);
		}

		return delta;
	}
	public GetAttackDelta(targetPlayer: PlayerTurn):
		{ militaryDelta: number, moneyDelta: number, }
	{
		let militaryDelta = 0;
		let moneyDelta = 0;
		for (const player of this.Players)
		{
			if (player.Plid === targetPlayer.Plid) // cant attack self
				continue;

			// get trade decisions
			const us = targetPlayer.MilitaryAttacks.get(player.Plid) || 0;
			const them = player.MilitaryAttacks.get(targetPlayer.Plid) || 0;

			const delta = Shared.Military.GetDelta(targetPlayer.MilitaryMoney, us, them);
			militaryDelta += delta.militaryDelta;
			moneyDelta += delta.moneyDelta;
		}
		return { militaryDelta, moneyDelta };
	}
	/** Assuming this Era ended right now, who would get what score? */
	public GetScoreDelta(isNewEra: boolean): number[]
	{
		const scores = new Array(this.Players.length).fill(0);
		let leaderPlid = 0;
		let leaderMoney = 0;

		if (isNewEra)
		{
			for (const player of this.Players)
			{
				if (player.Money > leaderMoney)
				{
					leaderPlid = player.Plid;
					leaderMoney = player.Money;
				}
				if (player.IsDead)
					scores[player.Plid] = Shared.Score.Die;
				else
					scores[player.Plid] = Shared.Score.Live;
			}
			scores[leaderPlid] = Shared.Score.Lead;
		}

		return scores;
	}
	/** Adds a new player to this Turn. */
	public AddNewPlayer(connection: PlayerConnection): void
	{
		const player = PlayerTurn.NewPlayerTurnFromConnection(connection);
		this.Players.push(player);
	}

	public get NumDead(): number
	{
		let numDead = 0;
		for (const player of this.Players)
		{
			if (player.IsDead)
				numDead += 1;
		}
		return numDead;
	}

	public ToVm(): ViewModel.Era
	{
		const vm = new ViewModel.Era();
		return vm;
	}
}

/** Data about the player, indexed on UniqueId. */
export class PlayerTurn extends ViewModel.Player implements IToVm<ViewModel.Player>
{
	/** This player has this much money on this turn. */
	public Money: number;
	/** Total money this player has in military. */
	public MilitaryMoney: number;
	/** How much money this player is trying to add to their military. */
	public MilitaryDelta: number;
	/** Maps (plid > attack) */
	public MilitaryAttacks: Map<number, number>;
	/** Maps (plid > trade decision). */
	public Trades: Map<number, number>;


	public static NewPlayerTurnFromConnection(old: PlayerConnection): PlayerTurn
	{
		return new PlayerTurn(old);
	}
	public static NewPlayerTurnFromOld(oldTurn: Turn, oldPlayer: PlayerTurn, isNewEra: boolean): PlayerTurn
	{
		const player = new PlayerTurn(oldPlayer);

		if (!isNewEra)
		{
			// copy old values
			player.Money = oldPlayer.Money;
			player.MilitaryMoney = oldPlayer.MilitaryMoney;

			// do trades
			player.Money += oldTurn.GetTradeDelta(oldPlayer);

			// do military delta
			player.Money -= oldPlayer.MilitaryDelta;
			player.MilitaryMoney += oldPlayer.MilitaryDelta;

			// allocate our attack money
			for (const kvp of oldPlayer.MilitaryAttacks)
			{
				player.MilitaryMoney -= kvp[1];
			}

			// apply others attacks to us
			const deltas = oldTurn.GetAttackDelta(oldPlayer);
			player.Money += deltas.moneyDelta;
			player.MilitaryMoney += deltas.militaryDelta;
		}

		return player;
	}
	private constructor(old: ViewModel.Player)
	{
		super(old);

		this.Money = Shared.Rules.StartMoney;
		this.MilitaryMoney = 0;
		this.MilitaryDelta = 0;

		this.MilitaryAttacks = new Map<number, number>();
		this.Trades = new Map<number, number>();
	}
	public IsEqual(o: PlayerTurn): boolean
	{
		return this.Plid === o.Plid;
	}
	// public ToVmPrivate(): ViewModel.PlayerPrivate
	// {
	// 	const vm = {
	// 		TurnStates: this.TurnState,
	// 		TurnActions: this.TurnActions
	// 	};
	// 	return vm;
	// }
	/** Name that will be displayed to all other players. */
	public get DisplayName(): string
	{
		return ViewModel.Player.DisplayName(this);
	}
	/** True if this player has met the death condition. */
	public get IsDead(): boolean
	{
		return this.Money <= 0;
	}
	public ToVm(): ViewModel.Player
	{
		const vm = new ViewModel.Player(this);
		return vm;
	}
}


