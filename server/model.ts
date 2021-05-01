/** Server side model. View Viewmodel (Model) */

import * as ViewModel from '../client/src/viewmodel';

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



/** Data about a given game, indexed on LobbyId. */
export class Game implements IToVm<ViewModel.Game>
{
	/** UniqueId > Player */
	private PlayerConnections: Map<UniqueId, PlayerConnection>;
	/** Dictates player order */
	private Eras: Map<number, Era>;

	public constructor()
	{
		this.PlayerConnections = new Map<UniqueId, PlayerConnection>();
		this.Eras = new Map<number, Era>();
		this.Eras.set(0, new Era(null));
	}
	public ToVm(): ViewModel.Game
	{
		const vm = new ViewModel.Game();

		vm.PlayerConnections = MapVmMap(this.PlayerConnections);
		vm.CurrentEra = this.CurrentEra.ToVm();

		return vm;
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

		// check to see if we should make a new Era

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
	public ToVm(): ViewModel.Player
	{
		const vm = new ViewModel.Player();
		return vm;
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

/** Data about a players turn, indexed on turn number. */
export class Era implements IToVm<ViewModel.Era>
{
	/** Maps (order > player number) */
	private Order: Map<number, number>;
	/** Maps (turn number > turn data) */
	private Turns: Map<number, Turn>;

	public constructor(old: Era | null)
	{
		this.Turns = new Map<number, Turn>();
		if (old === null)
		{
			this.Turns.set(0, new Turn(null));

			this.Order = new Map<number, number>();
		}
		else
		{
			this.Turns.set(0, new Turn(old.CurrentTurn));

			this.Order = new Map<number, number>();
			const order = Array.from(old.Order.values());
			shuffle(order);
			for (let plid = 0; plid < order.length; ++plid)
			{
				this.Order.set(plid, order[plid]);
			}
		}
	}
	/** Gets the active Turn. */
	public get CurrentTurn(): Turn
	{
		return this.Turns.get(this.Turns.size - 1)!;
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
	public Players: Map<number, Player>;

	public constructor(obj: Turn | PlayerConnection | null)
	{
		this.Players = new Map<number, Player>();
		if (obj === null)
		{
		}
		else if (obj instanceof Turn)
		{
			const turn = obj as Turn;
			for (let plid = 0; plid < turn.Players.size; ++plid)
			{
				this.Players.set(plid, new Player(turn.Players.get(plid)!));
			}
		}
		else if (obj instanceof PlayerConnection)
		{
			const connection = obj as PlayerConnection;

		}
	}
	/** Adds a new player to this Turn. */
	public AddNewPlayer(connection: PlayerConnection): void
	{
		const player = new Player(null);

		this.Players.set(connection.Plid, player);
	}

	public ToVm(): ViewModel.Era
	{
		const vm = new ViewModel.Era();
		return vm;
	}
}

/** Data about the player, indexed on UniqueId. */
export class Player extends ViewModel.Player implements IToVm<ViewModel.Player>
{
	/** Turn Number > Turn Data */
	public TurnState: TurnState;
	/** Turn Number > Turn Data */
	public TurnActions: TurnAction;

	public constructor(old: Player | null)
	{
		super();
		this.TurnState = new TurnState();
		this.TurnActions = new TurnAction();
	}
	public ToVm(): ViewModel.Player
	{
		const vm = new ViewModel.Player();
		return vm;
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
}

/** Data about a player at the beginning of their turn. */
export class TurnState implements IToVm<ViewModel.TurnState>
{
	/** Resources */
	public Money: number;

	public constructor()
	{
		this.Money = 0;
	}
	public ToVm(): ViewModel.TurnState
	{
		const vm = new ViewModel.TurnState();
		vm.Money = this.Money;
		return vm;
	}
}

/** Data about actions a player wants to take on their turn. */
export class TurnAction implements IToVm<ViewModel.TurnAction>
{
	/** Maps (order > attack) */
	public Attacks: number[];
	/** Maps (possible trades > trade decision) */
	public Trades: number[];

	public constructor()
	{
		this.Attacks = [];
		this.Trades = [];
	}
	public ToVm(): ViewModel.TurnAction
	{
		const vm = new ViewModel.TurnAction();
		// vm = 
		// 	Attacks: [...this.Attacks],
		// 	Trades: [...this.Trades],
		// }
		return vm;
	}
}





