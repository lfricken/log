/** Wire up ViewModel events events to Models. View (Viewmodel Model) */

import * as io from "socket.io";
import * as ViewModel from "../client/src/viewmodel";
import * as Shared from "../client/src/shared";
import { Game, Turn, Player } from "./model";


export class ModelWireup
{
	/** LobbyId > Game */
	public Games!: Map<Shared.LobbyId, Game>;
	public ioWrap: io.Server;

	public constructor(ioWrap: io.Server)
	{
		this.ioWrap = ioWrap;
		this.ioWrap.on("connect", (socket: io.Socket) => { this.OnConnection(socket); });

		this.Games = new Map<Shared.LobbyId, Game>();
	}

	private OnConnection(socket: io.Socket): void
	{
		const auth = socket.handshake.auth as Shared.IAuth;
		socket.join(auth.LobbyId);
		const { game, player, makeLeader, type, isDoubleSocket } = this.GetConnectionData(this, auth, socket.id);
		const pnum = player.Number;
		console.log(`Socket ${socket.id} connected. Number:${pnum} Name:${player.Nickname} Lobby:${auth.LobbyId}.`);

		// lobby leader
		if (makeLeader)
		{
			player.IsLobbyLeader = true;
			this.SendMessage(game, socket, ViewModel.Message.LeaderMsg(player.DisplayName));
		}

		// reconnect
		if (type === Shared.ConnectionType.NewPlayer)
		{
			this.SendMessage(game, socket, ViewModel.Message.JoinMsg(player.DisplayName));
		}
		else if (type === Shared.ConnectionType.Reconnect)
		{
			this.SendMessage(game, socket, ViewModel.Message.ReconnectMsg(player.DisplayName));
		}
		if (isDoubleSocket)
		{
			this.SendMessage(game, socket, ViewModel.Message.DoubleSocketMsg(player.Number));
		}

		socket.on("disconnect", () =>
		{
			console.log(`Socket ${socket.id} disconnected. Number:${pnum} Name:${player.Nickname} Lobby:${auth.LobbyId}.`);
			player.SocketId = Player.NoSocket;
			const timeout = setTimeout(() =>
			{
				this.SendMessage(game, socket, ViewModel.Message.DisconnectMsg(player.DisplayName));
				player.IsConnected = false;

				// pick new lobby leader
				if (player.IsLobbyLeader)
				{
					for (const p of game.Players.values())
					{
						if (p.IsConnected)
						{
							p.IsLobbyLeader = true;
							this.SendMessage(game, socket, ViewModel.Message.LeaderMsg(p.DisplayName));
							break;
						}
					}
				}

			}, Shared.DisconnectTimeoutMilliseconds);
			player.SetTimeout(timeout);
		});
		socket.on(Shared.Chat, (message: ViewModel.Message) =>
		{
			ViewModel.Message.Validate(message);

			// change name notification
			if (message.Sender !== player.Nickname)
			{
				const oldName = player.DisplayName;
				player.Nickname = message.Sender;
				const newName = player.DisplayName;
				this.SendMessage(game, socket, ViewModel.Message.ChangeNameMsg(oldName, newName));
			}

			this.SendMessage(game, socket, ViewModel.Message.PlayerMsg(player.DisplayName, message));
		});
		socket.on(Shared.Action, (message: ViewModel.TurnAction) =>
		{

		});
	}

	private GetConnectionData(g: ModelWireup, auth: Shared.IAuth, socketId: string):
		{ game: Game, player: Player, makeLeader: boolean, type: Shared.ConnectionType, isDoubleSocket: boolean }
	{
		/**lobby id */
		const lid = auth.LobbyId;
		/** unique cookie id */
		const uid = auth.UniqueId;
		const nickname = auth.Nickname;

		// try create new game
		let makeLeader = false;
		if (!g.Games.has(lid))
		{
			makeLeader = true;
			g.Games.set(lid, new Game(lid));
		}
		const game = g.Games.get(lid)!;

		// try create new player
		let newPlayer = false;
		if (!game?.Players.has(uid))
		{
			newPlayer = true;
			game.Players.set(uid, new Player(game.NumPlayers, nickname));
		}
		const player = game.Players.get(uid)!;

		// handle delayed timeout
		player.ClearTimeout();

		// ensure socket is correct
		let isDoubleSocket = false;
		if (player.SocketId !== Player.NoSocket)
			isDoubleSocket = true; // double connections
		player.SocketId = socketId; // the second connection is always right

		// check what kind of connection this was
		let type = Shared.ConnectionType.NewPlayer;
		if (!newPlayer)
		{
			if (!player.IsConnected)
			{
				type = Shared.ConnectionType.Reconnect;
			}
			else
			{
				type = Shared.ConnectionType.NewSocket;
			}
		}
		player.IsConnected = true;

		return { game: game, player: player, makeLeader: makeLeader, type: type, isDoubleSocket };
	}
	private SendMessage(game: Game, socket: io.Socket, mes: ViewModel.Message): void
	{
		const targetIds = game.GetDestinations(mes.Text);
		if (targetIds.length > 0)
			this.ioWrap.to(targetIds).emit(Shared.Chat, mes);
	}
}






