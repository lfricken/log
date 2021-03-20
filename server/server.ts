import * as exp from "express";
import * as http from "http";
import * as io from "socket.io";
import * as path from "path";
import * as pg from "pg";
import * as dotenv from "dotenv";
import * as proxy from "http-proxy-middleware";
import * as models from "../client/src/shared/models-shared";
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


// socket.io
{
	const ioWrap = new io.Server(httpServer);
	ioWrap.on("connection", (socket: io.Socket) =>
	{
		socket.broadcast.emit('hi');
		console.log(`User ${0} connected.`);
		socket.on("disconnect", () =>
		{
			console.log(`User ${0} disconnected.`);
		});
		socket.on('chat message', (msgText: string) =>
		{
			const message = new models.PlayerChatMessage("dude", msgText);
			models.PlayerChatMessage.Validate(message);
			socket.broadcast.emit('chat message', message);
			console.log('message: ' + models.PlayerChatMessage.DisplayString(message));
		});
	});
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
		let x = new models.PlayerTurnActions(0);

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
	if (process.env.USE_STATIC_PROXY === "true")
		// if we are localhosting, use the react watch server
		// this needs to happen after the api endpoints or they will get proxied too
		expWrap.use(proxy.createProxyMiddleware({ target: 'http://localhost:3000', changeOrigin: true }));
	else
		// if hosting in prod, use the build version
		expWrap.use(express.static(global.custom.__root_static));

	// The "catchall" handler: for any request.
	expWrap.get("*", (req: exp.Request, res: exp.Response) =>
	{
		res.sendFile(path.join("index.html"));
	});
}


// host
{
	const port = process.env.PORT;
	httpServer.listen(port);
	console.log(`Server listening on port ${port}.`);
}
