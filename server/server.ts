import * as exp from "express";
import * as http from "http";
import * as io from "socket.io";
import * as path from "path";
import * as pg from "pg";
import * as dotenv from "dotenv";
import { Const, Core, Player } from "../client/src/models-shared";
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

const games: { [lobbyId: string]: number } = {};
// socket.io
{
	const ioWrap = new io.Server(httpServer);
	ioWrap.on("connection", (socket: io.Socket) =>
	{
		const authObj = socket.handshake.auth as Core.IAuth;
		socket.join(authObj.LobbyId);

		SendMessage(socket, new Player.ChatMessage("", `Player ${authObj.Nickname} connected.`));
		console.log(`User ${0} connected to lobby ${authObj.LobbyId}.`);


		socket.on("disconnect", () =>
		{
			SendMessage(socket, new Player.ChatMessage("", `Player ${authObj.Nickname} disconnected.`));

			console.log(`User ${0} disconnected.`);
		});
		socket.on(Const.Chat, (message: Player.ChatMessage) =>
		{
			const authObj = socket.handshake.auth as Core.IAuth;
			Player.ChatMessage.Validate(message);

			// change name notifications
			if (message.Nickname !== authObj.Nickname)
			{
				SendMessage(
					socket,
					new Player.ChatMessage("", `${authObj.Nickname} changed name to ${message.Nickname}.`)
				);
				authObj.Nickname = message.Nickname;
			}

			message.Nickname = authObj.Nickname;
			SendMessage(socket, message);

			console.log('message: ' + Player.ChatMessage.DisplayString(message));
		});
	});
}


function SendMessage(socket: io.Socket, message: Player.ChatMessage)
{
	const authObj = socket.handshake.auth as Core.IAuth;
	socket.to(authObj.LobbyId).emit(Const.Chat, message);
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
		let xy = new Player.TurnActions(0);
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
