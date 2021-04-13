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
	return Array.from(a.values()).map((m: M) => { return m.ToVm() });
}
/** Maps an array of models to an array of their view models. */
function MapVmArray<M extends IToVm<V>, V>(a: Array<M>): V[]
{
	return a.map((m: M) => { return m.ToVm() });
}



/** Data about a given game, indexed on LobbyId. */
export class Game implements IToVm<ViewModel.Game>
{
	/** UniqueId > Player */
	public PlayerConnections: Map<UniqueId, PlayerConnection>;
	/** Dictates player order */
	public Eras: Map<number, Era>;

	public constructor()
	{
		this.PlayerConnections = new Map<UniqueId, PlayerConnection>();
		this.Eras = new Map<number, Era>();
	}
	public ToVm(): ViewModel.Game
	{
		const vm = new ViewModel.Game();
		return vm;
	}


	public get NumPlayers(): number
	{
		return this.PlayerConnections.size;
	}
	public GetDestinations(text: string): string[]
	{
		const targetIds: string[] = [];

		// given format #,#,#...@message
		// send to only player numbers
		let split = text.split('@');
		if (split.length > 1)
		{
			const targets = split[0].split(/(?:,| )+/);
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
	/** True if this player has control of the lobby. */
	public IsLobbyLeader: boolean;
	/** 
	 * True if this player has not timed out. Does not imply a live socket.
	 * We don't use the socket because we want them to be able to switch sockets 
	 * without anyone noticing (refresh).
	 */
	public IsConnected: boolean
	/** The name this player goes by. */
	public Nickname: string;
	/** Callback for a timed disconnect. */
	public Timeout: NodeJS.Timeout | null;

	public constructor(plid: number, nickname: string)
	{
		this.Plid = plid;
		this.SocketId = PlayerConnection.NoSocket;
		this.IsLobbyLeader = false;
		this.IsConnected = true;
		this.Nickname = nickname;
		this.Timeout = null;
	}
	public ToVm(): ViewModel.Player
	{
		const vm = new ViewModel.Player();
		return vm;
	}
	public SetTimeout(value: NodeJS.Timeout): void
	{
		// handle old timeout
		this.ClearTimeout();
		this.Timeout = value;
	}
	public ClearTimeout(): void
	{
		if (this.Timeout !== null)
		{
			clearTimeout(this.Timeout);
			this.Timeout = null;
		}
	}
	public get DisplayName(): string
	{
		return ViewModel.Player.DisplayName(this);
	}
}

/** Data about a players turn, indexed on turn number. */
export class Era implements IToVm<ViewModel.Era>
{
	/** Maps (order > player number) */
	public Order: Map<number, number>;
	/** Maps (turn number > turn data) */
	public Turns: Map<number, number>;

	public constructor()
	{
		this.Order = new Map<number, number>();
		this.Turns = new Map<number, number>();
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

	public constructor()
	{
		this.Players = new Map<number, Player>();
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
	public TurnStates: TurnState[];
	/** Turn Number > Turn Data */
	public TurnActions: TurnAction[];

	public constructor()
	{
		super();
		this.TurnStates = [];
		this.TurnActions = [];
	}
	public ToVm(): ViewModel.Player
	{
		const vm = new ViewModel.Player();
		return vm;
	}
	public ToVmPrivate(): ViewModel.PlayerPrivate
	{
		const vm = {
			TurnStates: this.TurnStates,
			TurnActions: this.TurnActions
		};
		return vm;
	}
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





