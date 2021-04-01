import * as exp from "express";
import * as http from "http";
import * as io from "socket.io";
import * as path from "path";
import * as pg from "pg";
import * as dotenv from "dotenv";
import express from "express";
import * as ViewModels from "../client/src/viewmodels";
import * as Models from "./models";
import * as Shared from "../client/src/shared";

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

const g = new Models.Games();
const ioWrap = new io.Server(httpServer);
{
	ioWrap.on("connect", (socket: io.Socket) =>
	{
		const auth = socket.handshake.auth as Shared.IAuth;
		socket.join(auth.LobbyId);
		const { game, player, turn, makeLeader, type } = ModelsOnConnection(g, auth, socket.id);
		const pnum = player.Number;
		console.log(`Socket ${socket.id} connected. Number:${pnum} Name:${player.Nickname} Lobby:${auth.LobbyId}.`);

		// lobby leader
		if (makeLeader)
		{
			player.IsLobbyLeader = true;
			SendMessage(game, socket, ViewModels.Message.LeaderMsg(player.DisplayName));
		}

		// reconnect
		if (type === Shared.ConnectionType.NewPlayer)
		{
			SendMessage(game, socket, ViewModels.Message.JoinMsg(player.DisplayName));
		}
		else if (type === Shared.ConnectionType.Reconnect)
		{
			SendMessage(game, socket, ViewModels.Message.ReconnectMsg(player.DisplayName));
		}

		socket.on("disconnect", () =>
		{
			console.log(`Socket ${socket.id} disconnected. Number:${pnum} Name:${player.Nickname} Lobby:${auth.LobbyId}.`);

			const timeout = setTimeout(() =>
			{
				SendMessage(game, socket, ViewModels.Message.DisconnectMsg(player.DisplayName));
				player.IsConnected = false;

				// pick new lobby leader
				if (player.IsLobbyLeader)
				{
					for (const p of game.Players.values())
					{
						if (p.IsConnected)
						{
							p.IsLobbyLeader = true;
							SendMessage(game, socket, ViewModels.Message.LeaderMsg(player.DisplayName));
							break;
						}
					}
				}

			}, Shared.DisconnectTimeoutMilliseconds);
			player.SetTimeout(timeout);
		});
		socket.on(Shared.Chat, (message: ViewModels.Message) =>
		{
			ViewModels.Message.Validate(message);

			// change name notification
			if (message.Sender !== player.Nickname)
			{
				const oldName = player.DisplayName;
				player.Nickname = message.Sender;
				const newName = player.DisplayName;
				SendMessage(game, socket, ViewModels.Message.ChangeNameMsg(oldName, newName));
			}

			SendMessage(game, socket, ViewModels.Message.PlayerMsg(player.DisplayName, message));
		});
	});
}

function ModelsOnConnection(g: Models.Games, auth: Shared.IAuth, socketId: string):
	{ game: Models.Game, player: Models.Player, turn: Models.Turn, makeLeader: boolean, type: Shared.ConnectionType }
{
	const lid = auth.LobbyId;
	const uid = auth.UniqueId;
	const nickname = auth.Nickname;

	// create new game
	let makeLeader = false;
	if (!g.Games.has(lid))
	{
		makeLeader = true;
		g.Games.set(lid, new Models.Game(lid));
	}
	const game = g.Games.get(lid)!;

	// create new player
	let newPlayer = false;
	if (!game?.Players.has(uid))
	{
		newPlayer = true;
		game.Players.set(uid, new Models.Player(game.NumPlayers, nickname));
	}
	const player = game.Players.get(uid)!;

	// handle delayed timeout
	player.ClearTimeout();

	// ensure socket is correct
	player.SocketId = socketId;

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

	const turn = player.LastTurn;

	return { game: game, player: player, turn: turn, makeLeader: makeLeader, type: type };
}
function SendMessage(game: Models.Game, socket: io.Socket, mes: ViewModels.Message): void
{
	const targetIds = game.GetDestinations(mes.Text);
	if (targetIds.length > 0)
		ioWrap.to(targetIds).emit(Shared.Chat, mes);
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
		let xy = new Models.Turn();
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
