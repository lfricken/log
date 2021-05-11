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

/** Data about a given game, indexed on LobbyId. */
export class Game implements IToVm<ViewModel.Game>
{
	public Settings: Settings;
	/** UniqueId > Player */
	private PlayerConnections: Map<UniqueId, PlayerConnection>;
	/** Dictates player order */
	private Eras: Map<number, Era>;

	public constructor()
	{
		this.Settings = new Settings();
		this.PlayerConnections = new Map<UniqueId, PlayerConnection>();
		this.Eras = new Map<number, Era>();
		this.Eras.set(0, new Era(null));
	}
	/** Obtains the current Era. */
	public get CurrentEra(): Era
	{
		return this.Eras.get(this.Eras.size - 1)!;
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

			this.CurrentEra.AddNewPlayer(this.PlayerConnections.get(uid)!);
		}
		const connection = this.PlayerConnections.get(uid)!;

		return { connection, isNewPlayer };
	}
	/** Ends the turn and advances the game state by one unit. */
	public EndTurn(): void
	{
		// compute next turn state
		this.CurrentEra.EndTurn();

		// check to see if we should make a new Era
		if (this.CurrentEra.IsOver)
		{
			this.Eras.set(this.Eras.size, new Era(this.CurrentEra));
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

		vm.PlayerConnections = MapVmMap(this.PlayerConnections);
		vm.CurrentEra = this.CurrentEra.ToVm();

		return vm;
	}
}

/** Data about the player, indexed on UniqueId. */
export class PlayerConnection implements IToVm<ViewModel.Player>
{
	public static NoSocket = "";
	/** The order this player joined in.  */
	public Plid: number;
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
	public ToVm(): ViewModel.Player
	{
		const vm = new ViewModel.Player(null);
		return vm;
	}
}

/** Data about a players turn, indexed on turn number. */
export class Era implements IToVm<ViewModel.Era>
{
	/** Maps (order > player number) */
	private Order: Map<number, number>;
	/** Maps (turn number > turn data) */
	private Turns: Map<number, Turn>;

	public constructor(old: null | Era)
	{
		this.Turns = new Map<number, Turn>();
		if (old === null)
		{
			this.Turns.set(0, new Turn(null, true));

			this.Order = new Map<number, number>();
		}
		else
		{
			this.Turns.set(0, new Turn(old.CurrentTurn, true));

			// create new random order
			this.Order = new Map<number, number>();
			const order = Array.from(old.Order.values());
			shuffle(order);
			for (let plid = 0; plid < order.length; ++plid)
			{
				this.Order.set(plid, order[plid]);
			}
		}
	}
	/** Ends the turn and advances the game state by one unit. */
	public EndTurn(): void
	{
		const old = this.CurrentTurn;
		const turn = new Turn(old, false);
		this.Turns.set(this.Turns.size, turn);
	}
	/** Gets the active Turn. */
	public get CurrentTurn(): Turn
	{
		return this.Turns.get(this.Turns.size - 1)!;
	}
	/** True if this Era should end, and a new one should begin. */
	public get IsOver(): boolean
	{
		// at least this many players need to be dead
		const minDead = Math.floor(this.CurrentTurn.Players.size * Shared.Rules.EraMinDeadPercentage);

		return this.CurrentTurn.NumDead >= minDead;
	}
	/** Adds a new player to this Era. */
	public AddNewPlayer(connection: PlayerConnection): void
	{
		this.Order.set(connection.Plid, connection.Plid);
		this.CurrentTurn.AddNewPlayer(connection);
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
	public Players!: Map<number, PlayerTurn>;

	/** Pass old turn if it exists which will compute the new turn state. */
	public constructor(obj: null | Turn, isNewEra: boolean)
	{
		this.Players = new Map<number, PlayerTurn>();
		if (obj === null)
		{

		}
		else
		{
			this.ComputeNewTurn(obj, isNewEra);
		}
	}
	private ComputeNewTurn(old: Turn, isNewEra: boolean): void
	{
		// copy player data
		for (let plid = 0; plid < old.Players.size; ++plid)
		{
			this.Players.set(plid, old.ComputeNewPlayerTurn(old, plid, isNewEra));
		}
		if (!isNewEra)
		{
			for (let plid = 0; plid < old.Players.size; ++plid)
			{
				this.ApplyCombat(plid);
			}
		}


		for (let plid = 0; plid < old.Players.size; ++plid)
		{
			const p = this.Players.get(plid)!;
			p.CheckIsDead();
		}
	}
	private ComputeNewPlayerTurn(old: Turn, plid: number, isNewEra: boolean): PlayerTurn
	{
		const pOld = old.Players.get(plid)!;

		if (isNewEra)
		{
			const p = new PlayerTurn(null);

			return p;
		}
		else
		{
			const p = new PlayerTurn(pOld);

			// do trades
			p.Money += this.TradeDelta(plid);

			// allocate military
			p.Money -= pOld.MilitaryDelta;
			p.MilitaryMoney += pOld.MilitaryDelta;

			// allocate attacks
			for (let plidOther = 0; plidOther < old.Players.size; ++plidOther)
			{
				p.MilitaryMoney -= pOld.MilitaryAttacks.get(plidOther) || 0;
			}

			return p;
		}
	}
	public TradeDelta(plid: number): number
	{
		let delta = 0;
		const p = this.Players.get(plid)!;

		for (let plidOther = 0; plidOther < this.Players.size; ++plidOther)
		{
			// get trade decisions
			const pOther = this.Players.get(plidOther)!;
			const us = p.Trades.get(plidOther);
			const them = pOther.Trades.get(plid);

			if (us === undefined || them === undefined)
				continue; // no trade route

			delta += Shared.Trade.GetDelta(us, them);
		}

		return delta;
	}
	private ApplyCombat(plid: number): PlayerTurn
	{
		const p = this.Players.get(plid)!;

		// do any combat
		for (let plidOther = 0; plidOther < this.Players.size; ++plidOther)
		{
			const pOther = this.Players.get(plidOther)!;
			// get trade decisions
			const us = p.MilitaryAttacks.get(plidOther) || 0;
			const them = pOther.MilitaryAttacks.get(plidOther) || 0;

			const { militaryDelta, moneyDelta, } = Shared.Military.GetDelta(p.MilitaryMoney, us, them);

			p.MilitaryMoney += militaryDelta;
			p.Money += moneyDelta;
		}

		return p;
	}
	/** Adds a new player to this Turn. */
	public AddNewPlayer(connection: PlayerConnection): void
	{
		const player = new PlayerTurn(null);

		this.Players.set(connection.Plid, player);
	}

	public get NumDead(): number
	{
		let numDead = 0;
		for (let i = 0; i < this.Players.size; ++i)
		{
			if (this.Players.get(i)!.IsDead)
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
	/** How much money this player is trying to add to their military. */
	public MilitaryDelta: number;
	/** Maps (plid > attack) */
	public MilitaryAttacks: Map<number, number>;
	/** Maps (plid > trade decision). */
	public Trades: Map<number, number>;
	private isDead: boolean;

	public constructor(old: null | PlayerTurn)
	{
		super(old);

		this.MilitaryMoney = 0;

		this.MilitaryDelta = 0;
		this.MilitaryAttacks = new Map<number, number>();
		this.Trades = new Map<number, number>();

		if (old === null)
		{
			this.isDead = false;
			this.Money = Shared.Rules.StartMoney;
		}
		else
		{
			this.Money = old.Money;
			this.MilitaryMoney = old.MilitaryMoney;
			this.isDead = old.isDead;
		}
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
	public CheckIsDead(): boolean
	{
		const oldValue = this.isDead;
		this.isDead = this.Money <= 0;
		return oldValue !== this.isDead; // true if value changed
	}
	/** True if this player has met the death condition. */
	public get IsDead(): boolean
	{
		return this.isDead;
	}
	public ToVm(): ViewModel.Player
	{
		const vm = new ViewModel.Player(this);
		return vm;
	}
}


