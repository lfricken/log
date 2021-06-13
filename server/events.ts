/** Wire up ViewModel events events to Models. View (Viewmodel Model) */

import * as io from "socket.io";
import * as ViewModel from "../client/src/viewmodel";
import * as Shared from "../client/src/shared";
import { Lobby, PlayerConnection, PlayerTurn } from "./model";
import { IViewPlayerConnection } from "../client/src/viewmodel";
import { IMap } from "../client/src/shared";

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
		const { lobby, connection: localCon, type, numSockets } = this.GetConnectionData(this, auth, socket.id);


		// eslint-disable-next-line max-len
		console.log(`Socket ${socket.id} connected. Uid:${auth.UniqueId} Number:${localCon.Plid} Name:${localCon.Nickname} Lobby:${auth.LobbyId}.`);

		// first notify of changes
		if (type === Shared.ConnectionType.NewPlayer)
			this.SendMessage(lobby, ViewModel.Message.JoinMsg(localCon.DisplayName));
		else if (type === Shared.ConnectionType.Reconnect) // reconnect		
			this.SendMessage(lobby, ViewModel.Message.ReconnectMsg(localCon.DisplayName));
		else if (type === Shared.ConnectionType.NewSocket && numSockets > 1)
			this.SendMessage(lobby, ViewModel.Message.DoubleSocketMsg(localCon.Plid, numSockets));

		// next update lobby leader
		const { changed } = lobby.ConsiderNewLobbyLeader();
		if (changed)
			this.SendMessage(lobby, ViewModel.Message.HostMsg(localCon.DisplayName));

		// finally update statuses
		this.SendConnectionStatus(lobby);
		this.SendData(lobby, [localCon.Plid.toString()], Shared.Event.OnConnected, localCon.Plid);
		if (lobby.Game !== null)
			this.SendData(lobby, [localCon.Plid.toString()], Shared.Event.StartNewGame, lobby.Game!.ToVm(localCon.Plid));

		// player disconnected
		socket.on("disconnect", () =>
		{
			// eslint-disable-next-line max-len
			console.log(`Socket ${socket.id} disconnected. Uid:${auth.UniqueId} Number:${localCon.Plid} Name:${localCon.Nickname} Lobby:${auth.LobbyId}.`);
			const index = localCon.SocketIds.indexOf(socket.id, 0);
			if (index > -1)
			{
				localCon.SocketIds.splice(index, 1);
			}
			if (localCon.SocketIds.length === 0)
			{
				localCon.SetTimeout(this, lobby);
			}
		});
		// player sent a message
		socket.on(Shared.Event.Message, (message: ViewModel.Message) =>
		{
			ViewModel.Message.ApplyValidation(message);

			// change name notification
			if (message.Sender !== localCon.Nickname)
			{
				const oldName = localCon.DisplayName;
				localCon.Nickname = message.Sender;
				const newName = localCon.DisplayName;
				this.SendMessage(lobby, ViewModel.Message.ChangeNameMsg(oldName, newName));
				this.SendConnectionStatus(lobby);
			}

			this.SendMessage(lobby, ViewModel.Message.PlayerMsg(localCon.DisplayName, message), localCon.Plid);
		});
		// start a new game with settings
		socket.on(Shared.Event.StartNewGame, (settings: Shared.IGameSettings) =>
		{
			console.log("new game");
			if (localCon.IsHost) // only lobby leader can do this
			{
				lobby.CreateNewGame(settings);

				this.SendMessage(lobby, ViewModel.Message.NewGameMsg(lobby.Game!.NumPlayers));
				for (const connection of IMap.Values(lobby.PlayerConnections))
				{
					const plid = connection.Plid;
					this.SendData(lobby, [plid.toString()], Shared.Event.StartNewGame, lobby.Game!.ToVm(plid));
				}
			}
		});
		// host forced next turn
		socket.on(Shared.Event.ForceNextTurn, (vm: {}) =>
		{
			console.log("force next turn");
			const game = lobby.Game;
			if (game !== null) // if there is a game
			{
				if (game.EndTurn()) // update Era
				{
					this.UpdateClientEra(lobby);
				}
				else // update Turn
				{
					this.UpdateClientTurn(lobby);
				}
			}
		});
		// player tried to modify their own turn
		socket.on(Shared.Event.PlayerTurn, (vm: ViewModel.IViewPlayerTurn) =>
		{
			console.log("player turn done");
			const game = lobby.Game;
			if (game !== null) // if there is a game
			{
				const wholeTurn = game.LatestEra.LatestTurn;
				const modifiedPlayerTurn = wholeTurn.Players[localCon.Plid];
				if (!modifiedPlayerTurn.IsDone) // if this player has not already ended their turn
				{
					// update turn
					modifiedPlayerTurn.FromVm(vm);
					modifiedPlayerTurn.IsDone = true;

					const allTurnsOver = wholeTurn.IsOver;
					if (allTurnsOver) // end the Turn
					{
						if (game.EndTurn()) // update Era
						{
							this.UpdateClientEra(lobby);
						}
						else // update Turn
						{
							this.UpdateClientTurn(lobby);
						}
					}
					else // update PlayerTurn
					{
						this.UpdateClientPlayerTurn(lobby, localCon.Plid);
					}
				}
			}
		});
	}
	private UpdateClientEra(lobby: Lobby): void
	{
		for (const loopConnection of IMap.Values(lobby.PlayerConnections))
		{
			const destPlid = loopConnection.Plid;
			this.SendData(lobby, [destPlid.toString()], Shared.Event.Era, lobby.Game!.LatestEra.ToVm(destPlid));
		}
	}
	private UpdateClientTurn(lobby: Lobby): void
	{
		for (const loopConnection of IMap.Values(lobby.PlayerConnections))
		{
			const destPlid = loopConnection.Plid;
			this.SendData(
				lobby,
				[destPlid.toString()],
				Shared.Event.WholeTurn,
				lobby.Game!.LatestEra.LatestTurn.ToVm(destPlid)
			);
		}
	}
	private UpdateClientPlayerTurn(lobby: Lobby, targetTurnPlid: number): void
	{
		const turn = lobby.Game!.LatestEra.LatestTurn;
		const latestTurn = turn.Players[targetTurnPlid];
		for (const loopConnection of IMap.Values(lobby.PlayerConnections))
		{
			const destPlid = loopConnection.Plid;
			let viewerTurn: null | PlayerTurn = null;
			if (IMap.Has(turn.Players, destPlid))
				viewerTurn = turn.Players[destPlid];

			this.SendData(lobby, [destPlid.toString()], Shared.Event.PlayerTurn, latestTurn.ToVm(viewerTurn));
		}
	}

	private GetConnectionData(w: ModelWireup, auth: Shared.IAuth, socketId: string):
		{ lobby: Lobby, connection: PlayerConnection, type: Shared.ConnectionType, numSockets: number }
	{
		/** lobby id */
		const lid = auth.LobbyId;
		/** unique cookie id */
		const uid = auth.UniqueId;
		const nickname = auth.Nickname;

		// try create new game
		if (!w.Lobbies.has(lid))
		{
			w.Lobbies.set(lid, new Lobby(lid));
		}
		const lobby = w.Lobbies.get(lid)!;
		const { connection, isNew } = lobby.GetConnection(uid, nickname);

		// handle delayed timeout
		connection.ClearTimeout();

		// ensure socket is correct
		connection.SocketIds.push(socketId); // the second connection is always right

		// check what kind of connection this was
		let type = Shared.ConnectionType.NewPlayer;
		if (!isNew)
		{
			if (!connection.IsConnected)
			{
				type = Shared.ConnectionType.Reconnect; // if it was previously unconnected
			}
			else
			{
				type = Shared.ConnectionType.NewSocket; // we already had a connection
			}
		}
		connection.IsConnected = true;

		return { lobby, connection, type, numSockets: connection.SocketIds.length };
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
	/** Sends the message to everyone unless the message is targeted. */
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
		this.SendData(lobby, targetPlids, Shared.Event.Message, message);
	}
	/** Sends connection status to everyone. */
	public SendConnectionStatus(lobby: Lobby): void
	{
		const c = lobby.ToVm(-1);
		this.SendData(lobby, [], Shared.Event.Connections, c.PlayerConnections);
	}
}






