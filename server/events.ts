/** Wire up ViewModel events events to Models. View (Viewmodel Model) */

import * as io from "socket.io";
import * as ViewModel from "../client/src/viewmodel";
import * as Shared from "../client/src/shared";
import { Lobby, PlayerConnection } from "./model";
import { ViewPlayerConnection } from "../client/src/viewmodel";

type LobbyId = string;

export class ModelWireup
{
	/** LobbyId > Game */
	public Lobbies!: Map<LobbyId, Lobby>;
	public ioWrap: io.Server;

	public constructor(ioWrap: io.Server)
	{
		this.ioWrap = ioWrap;
		this.ioWrap.on("connect", (socket: io.Socket) => { this.OnConnection(socket); });

		this.Lobbies = new Map<LobbyId, Lobby>();
	}

	private OnConnection(socket: io.Socket): void
	{
		const auth = socket.handshake.auth as Shared.IAuth;
		socket.join(auth.LobbyId);
		const { lobby, player, type, numSockets } = this.GetConnectionData(this, auth, socket.id);
		const plid = player.Plid;
		// eslint-disable-next-line max-len
		console.log(`Socket ${socket.id} connected. Uid:${auth.UniqueId} Number:${plid} Name:${player.Nickname} Lobby:${auth.LobbyId}.`);

		//const t = player.ToVm();

		// lobby leader
		if (player.IsLobbyLeader)
			this.SendMessage(lobby, ViewModel.Message.LeaderMsg(player.DisplayName));

		if (type === Shared.ConnectionType.NewPlayer)
		{
			this.SendMessage(lobby, ViewModel.Message.JoinMsg(player.DisplayName));
		}
		else if (type === Shared.ConnectionType.Reconnect) // reconnect
		{
			this.SendMessage(lobby, ViewModel.Message.ReconnectMsg(player.DisplayName));
		}
		if (type === Shared.ConnectionType.NewSocket)
		{
			this.SendMessage(lobby, ViewModel.Message.DoubleSocketMsg(player.Plid, numSockets));
		}
		else
		{
			this.SendConnectionStatus(lobby);
		}

		socket.on("disconnect", () =>
		{
			// eslint-disable-next-line max-len
			console.log(`Socket ${socket.id} disconnected. Uid:${auth.UniqueId} Number:${plid} Name:${player.Nickname} Lobby:${auth.LobbyId}.`);
			const index = player.SocketIds.indexOf(socket.id, 0);
			if (index > -1)
			{
				player.SocketIds.splice(index, 1);
			}
			if (player.SocketIds.length === 0)
			{
				player.SetTimeout(this, lobby);
			}
		});
		socket.on(Shared.Event.ChatMessage, (message: ViewModel.Message) =>
		{
			ViewModel.Message.ApplyValidation(message);

			// change name notification
			if (message.Sender !== player.Nickname)
			{
				const oldName = player.DisplayName;
				player.Nickname = message.Sender;
				const newName = player.DisplayName;
				this.SendMessage(lobby, ViewModel.Message.ChangeNameMsg(oldName, newName));
			}

			this.SendMessage(lobby, ViewModel.Message.PlayerMsg(player.DisplayName, message), player.Plid);
		});
		socket.on(Shared.Event.TurnChanged, (turn: ViewModel.ViewPlayerTurnPrivate) =>
		{

		});
	}

	private GetConnectionData(w: ModelWireup, auth: Shared.IAuth, socketId: string):
		{ lobby: Lobby, player: PlayerConnection, type: Shared.ConnectionType, numSockets: number }
	{
		/**lobby id */
		const lid = auth.LobbyId;
		/** unique cookie id */
		const uid = auth.UniqueId;
		const nickname = auth.Nickname;

		// try create new game
		if (!w.Lobbies.has(lid))
		{
			w.Lobbies.set(lid, new Lobby());
		}
		const lobby = w.Lobbies.get(lid)!;
		const { connection, isNewPlayer } = lobby.GetConnection(uid, nickname);

		// handle delayed timeout
		connection.ClearTimeout();

		// ensure socket is correct
		connection.SocketIds.push(socketId); // the second connection is always right

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

		return { lobby, player: connection, type, numSockets: connection.SocketIds.length };
	}
	/**
	 * 
	 * @param lobby 
	 * @param event 
	 * @param targetPlids Pass empty to send to all connections.
	 * @param data 
	 */
	public SendData(lobby: Lobby, targetPlids: string[], event: string, data: unknown): void
	{
		const targetSocketIds = lobby.GetDestinations(targetPlids);
		if (targetSocketIds.length > 0)
			this.ioWrap.to(targetSocketIds).emit(event, data);
	}
	public SendMessage(lobby: Lobby, message: ViewModel.Message, additionalTarget: number = -1): void
	{
		let targetPlids: string[] = [];
		// given format #,#,#...@message
		// send to only those plids
		let split = message.Text.split('@');
		if (split.length > 1)
		{
			targetPlids = split[0].split(/(?:,| )+/); // split on comma and space
			targetPlids.push(additionalTarget.toString());
		}
		this.SendData(lobby, targetPlids, Shared.Event.ChatMessage, message);
	}
	public SendConnectionStatus(lobby: Lobby): void
	{
		const c = lobby.ToVm(-1);
		this.SendData(lobby, [], Shared.Event.ConnectionsChanged, c.PlayerConnections);
	}
}






