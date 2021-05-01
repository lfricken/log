/** Wire up ViewModel events events to Models. View (Viewmodel Model) */

import * as io from "socket.io";
import * as ViewModel from "../client/src/viewmodel";
import * as Shared from "../client/src/shared";
import { Game, PlayerTurn, PlayerConnection } from "./model";

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
		const { game, player, type, isDoubleSocket } = this.GetConnectionData(this, auth, socket.id);
		const plid = player.Plid;
		console.log(`Socket ${socket.id} connected. Number:${plid} Name:${player.Nickname} Lobby:${auth.LobbyId}.`);

		const t = player.ToVm();

		// lobby leader
		if (player.IsLobbyLeader)
			this.SendMessage(game, socket, ViewModel.Message.LeaderMsg(player.DisplayName));

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
			this.SendMessage(game, socket, ViewModel.Message.DoubleSocketMsg(player.Plid));
		}

		socket.on("disconnect", () =>
		{
			console.log(`Socket ${socket.id} disconnected. Number:${plid} Name:${player.Nickname} Lobby:${auth.LobbyId}.`);
			player.SocketId = PlayerConnection.NoSocket;
			const timeout = setTimeout(() =>
			{
				this.SendMessage(game, socket, ViewModel.Message.DisconnectMsg(player.DisplayName));
				player.IsConnected = false;

				// pick new lobby leader
				if (player.IsLobbyLeader)
				{
					const leaderName = game.ConsiderNewLobbyLeader();
					this.SendMessage(game, socket, ViewModel.Message.LeaderMsg(leaderName));
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

			this.SendMessage(game, socket, ViewModel.Message.PlayerMsg(player.DisplayName, message), player.SocketId);
		});
		// socket.on(Shared.Action, (message: ViewModel.TurnAction) =>
		// {

		// });
	}

	private GetConnectionData(g: ModelWireup, auth: Shared.IAuth, socketId: string):
		{ game: Game, player: PlayerConnection, isNewPlayer: boolean, type: Shared.ConnectionType, isDoubleSocket: boolean }
	{
		/**lobby id */
		const lid = auth.LobbyId;
		/** unique cookie id */
		const uid = auth.UniqueId;
		const nickname = auth.Nickname;

		// try create new game
		if (!g.Games.has(lid))
		{
			g.Games.set(lid, new Game());
		}
		const game = g.Games.get(lid)!;
		const { connection, isNewPlayer } = game.GetConnection(uid, nickname);

		// handle delayed timeout
		connection.ClearTimeout();

		// ensure socket is correct
		let isDoubleSocket = false;
		if (connection.SocketId !== PlayerConnection.NoSocket)
			isDoubleSocket = true; // double connections
		connection.SocketId = socketId; // the second connection is always right

		// check what kind of connection this was
		let type = Shared.ConnectionType.NewPlayer;
		if (!isNewPlayer)
		{
			if (!connection.IsConnected)
			{
				type = Shared.ConnectionType.Reconnect;
			}
			else
			{
				type = Shared.ConnectionType.NewSocket;
			}
		}
		connection.IsConnected = true;

		return { game, player: connection, isNewPlayer, type, isDoubleSocket };
	}
	private SendMessage(game: Game, socket: io.Socket, mes: ViewModel.Message, additionalTarget: string = ""): void
	{
		const targetIds = game.GetDestinations(mes.Text);
		targetIds.push(additionalTarget);
		if (targetIds.length > 0)
			this.ioWrap.to(targetIds).emit(Shared.Chat, mes);
	}
}






