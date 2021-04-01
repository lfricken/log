import * as exp from "express";
import * as http from "http";
import * as io from "socket.io";
import * as path from "path";
import * as pg from "pg";
import * as dotenv from "dotenv";
import { Const, Core, Chat, ViewModel, UniqueId } from "../client/src/models-shared";
import { Model } from "./models-server";
import express from "express";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const process: any;

const use_env_arg = 2;
if (process.argv.length > use_env_arg)
{
	const envFile: string = process.argv[use_env_arg];
	dotenv.config({ path: envFile });
	console.log(`Using env file ${envFile}.`);
}

global.custom = {
	__root_static: path.join(process.cwd(), "/client/build/")
}

const expWrap = express();
const httpServer = http.createServer(expWrap);

const g = new Model.Games();
const ioWrap = new io.Server(httpServer);
{
	ioWrap.on("connect", (socket: io.Socket) =>
	{
		const auth = socket.handshake.auth as Core.IAuth;
		socket.join(auth.LobbyId);
		const { game, player, turn, makeLeader, type } = ModelsOnConnection(g, auth, socket.id);
		const pnum = player.Number;
		console.log(`Socket ${socket.id} connected. Number:${pnum} Name:${player.Nickname} Lobby:${auth.LobbyId}.`);

		// lobby leader
		if (makeLeader)
		{
			player.IsLobbyLeader = true;
			SendMessage(game, socket, Chat.Message.LeaderMsg(player));
		}

		// reconnect
		if (type === Core.ConnectionType.NewPlayer)
		{
			SendMessage(game, socket, Chat.Message.JoinMsg(player));
		}
		else if (type === Core.ConnectionType.Reconnect)
		{
			SendMessage(game, socket, Chat.Message.ReconnectMsg(player));
		}

		socket.on("disconnect", () =>
		{
			console.log(`Socket ${socket.id} disconnected. Number:${pnum} Name:${player.Nickname} Lobby:${auth.LobbyId}.`);

			const timeout = setTimeout(() =>
			{
				SendMessage(game, socket, Chat.Message.DisconnectMsg(player));
				player.IsConnected = false;

				// pick new lobby leader
				if (player.IsLobbyLeader)
				{
					for (const p of game.Players.values())
					{
						if (p.IsConnected)
						{
							p.IsLobbyLeader = true;
							SendMessage(game, socket, Chat.Message.LeaderMsg(p));
							break;
						}
					}
				}

			}, Const.DisconnectTimeoutMilliseconds);
			player.SetTimeout(timeout);
		});
		socket.on(Const.Chat, (message: Chat.Message) =>
		{
			Chat.Message.Validate(message);

			// change name notification
			if (message.Sender !== player.Nickname)
			{
				SendMessage(game, socket, Chat.Message.ChangeNameMsg(player, message.Sender));
				player.Nickname = message.Sender;
			}

			SendMessage(game, socket, Chat.Message.PlayerMsg(player, message));
		});
	});
}

function ModelsOnConnection(g: Model.Games, auth: Core.IAuth, socketId: string):
	{ game: Model.Game, player: Model.Player, turn: Model.Turn, makeLeader: boolean, type: Core.ConnectionType }
{
	const lid = auth.LobbyId;
	const uid = auth.UniqueId;
	const nickname = auth.Nickname;

	// create new game
	let makeLeader = false;
	if (!g.Games.has(lid))
	{
		makeLeader = true;
		g.Games.set(lid, new Model.Game(lid));
	}
	const game = g.Games.get(lid)!;

	// create new player
	let newPlayer = false;
	if (!game?.Players.has(uid))
	{
		newPlayer = true;
		game.Players.set(uid, new Model.Player(game.NumPlayers, nickname));
	}
	const player = game.Players.get(uid)!;

	// handle delayed timeout
	player.ClearTimeout();

	// ensure socket is correct
	player.SocketId = socketId;

	// check what kind of connection this was
	let type = Core.ConnectionType.NewPlayer;
	if (!newPlayer)
	{
		if (!player.IsConnected)
		{
			type = Core.ConnectionType.Reconnect;
		}
		else
		{
			type = Core.ConnectionType.NewSocket;
		}
	}
	player.IsConnected = true;

	const turn = player.LastTurn;

	return { game: game, player: player, turn: turn, makeLeader: makeLeader, type: type };
}
function SendMessage(game: Model.Game, socket: io.Socket, mes: Chat.Message): void
{
	const targetIds = Chat.Message.GetDestinations(mes.Text, game.Players);
	if (targetIds.length > 0)
		ioWrap.to(targetIds).emit(Const.Chat, mes);
}


// dynamic serve
{
	// pools will use environment variables
	// for connection information
	const pool = new pg.Pool(
		{
			connectionString: process.env.DATABASE_URL,
			ssl: process.env.DATABASE_SKIPSSL === "true" ? undefined : { rejectUnauthorized: false },
		}
	);
	// Put all API endpoints under '/api'
	expWrap.get("/api/passwords", async (req: exp.Request, res: exp.Response) =>
	{
		let xy = new Model.Turn();
		const data = [];
		const databaseRes = await pool.query("SELECT * FROM horses;"); //, (err, res) =>
		for (const row of databaseRes.rows)
		{
			data.push(JSON.stringify(row));
		}
		res.json(data);
		console.log(`Api response`);
	});
}


// static serve
{
	const x = __dirname;
	// if hosting in prod, use the build version
	expWrap.use(express.static(global.custom.__root_static));
	// The "catchall" handler: for any request.
	expWrap.get("*", (req: exp.Request, res: exp.Response) =>
	{
		res.sendFile(path.join(global.custom.__root_static, "index.html"));
	});
}


// host
{
	const port = process.env.PORT;
	httpServer.listen(port);
	console.log(`Server listening on port ${port}.`);
}
