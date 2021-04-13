/** Wire up ViewModel events events to Models. View (Viewmodel Model) */

import * as io from "socket.io";
import * as ViewModel from "../client/src/viewmodel";
import * as Shared from "../client/src/shared";
import { Game, Player, PlayerConnection } from "./model";

type LobbyId = string;

export class ModelWireup
{
	/** LobbyId > Game */
	public Games!: Map<LobbyId, Game>;
	public ioWrap: io.Server;

	public constructor(ioWrap: io.Server)
	{
		this.ioWrap = ioWrap;
		this.ioWrap.on("connect", (socket: io.Socket) => { this.OnConnection(socket); });

		this.Games = new Map<LobbyId, Game>();
	}

	private OnConnection(socket: io.Socket): void
	{
		const auth = socket.handshake.auth as Shared.IAuth;
		socket.join(auth.LobbyId);
		const { game, player: playerConn, makeLeader, type, isDoubleSocket } = this.GetConnectionData(this, auth, socket.id);
		const plid = playerConn.Plid;
		console.log(`Socket ${socket.id} connected. Number:${plid} Name:${playerConn.Nickname} Lobby:${auth.LobbyId}.`);

		const t = playerConn.ToVm();

		// lobby leader
		if (makeLeader)
		{
			playerConn.IsLobbyLeader = true;
			this.SendMessage(game, socket, ViewModel.Message.LeaderMsg(playerConn.DisplayName));
		}

		// reconnect
		if (type === Shared.ConnectionType.NewPlayer)
		{
			this.SendMessage(game, socket, ViewModel.Message.JoinMsg(playerConn.DisplayName));
		}
		else if (type === Shared.ConnectionType.Reconnect)
		{
			this.SendMessage(game, socket, ViewModel.Message.ReconnectMsg(playerConn.DisplayName));
		}
		if (isDoubleSocket)
		{
			this.SendMessage(game, socket, ViewModel.Message.DoubleSocketMsg(playerConn.Plid));
		}

		socket.on("disconnect", () =>
		{
			console.log(`Socket ${socket.id} disconnected. Number:${plid} Name:${playerConn.Nickname} Lobby:${auth.LobbyId}.`);
			playerConn.SocketId = PlayerConnection.NoSocket;
			const timeout = setTimeout(() =>
			{
				this.SendMessage(game, socket, ViewModel.Message.DisconnectMsg(playerConn.DisplayName));
				playerConn.IsConnected = false;

				// pick new lobby leader
				if (playerConn.IsLobbyLeader)
				{
					for (const p of game.PlayerConnections.values())
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
			playerConn.SetTimeout(timeout);
		});
		socket.on(Shared.Chat, (message: ViewModel.Message) =>
		{
			ViewModel.Message.Validate(message);

			// change name notification
			if (message.Sender !== playerConn.Nickname)
			{
				const oldName = playerConn.DisplayName;
				playerConn.Nickname = message.Sender;
				const newName = playerConn.DisplayName;
				this.SendMessage(game, socket, ViewModel.Message.ChangeNameMsg(oldName, newName));
			}

			this.SendMessage(game, socket, ViewModel.Message.PlayerMsg(playerConn.DisplayName, message), playerConn.SocketId);
		});
		// socket.on(Shared.Action, (message: ViewModel.TurnAction) =>
		// {

		// });
	}

	private GetConnectionData(g: ModelWireup, auth: Shared.IAuth, socketId: string):
		{ game: Game, player: PlayerConnection, makeLeader: boolean, type: Shared.ConnectionType, isDoubleSocket: boolean }
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
			g.Games.set(lid, new Game());
		}
		const game = g.Games.get(lid)!;

		// try create new player
		let newPlayer = false;
		if (!game?.PlayerConnections.has(uid))
		{
			newPlayer = true;
			game.PlayerConnections.set(uid, new PlayerConnection(game.NumPlayers, nickname));
		}
		const player = game.PlayerConnections.get(uid)!;

		// handle delayed timeout
		player.ClearTimeout();

		// ensure socket is correct
		let isDoubleSocket = false;
		if (player.SocketId !== PlayerConnection.NoSocket)
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
	private SendMessage(game: Game, socket: io.Socket, mes: ViewModel.Message, additionalTarget: string = ""): void
	{
		const targetIds = game.GetDestinations(mes.Text);
		targetIds.push(additionalTarget);
		if (targetIds.length > 0)
			this.ioWrap.to(targetIds).emit(Shared.Chat, mes);
	}
}






