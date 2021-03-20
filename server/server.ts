import * as exp from "express";
import * as http from "http";
import * as io from "socket.io";
import * as path from "path";
import * as pg from "pg";
import * as dotenv from "dotenv";
import * as proxy from "http-proxy-middleware";
import * as models from "../shared/models-shared";
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
const ioWrap = new io.Server(httpServer);

ioWrap.on("connection", (socket: io.Socket) =>
{
	console.log(`a user connected`);
	socket.on("disconnect", () =>
	{
		console.log("user disconnected");
	});
});


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
	expWrap.get("/api/passwords", async (req: any, res: exp.Response) =>
	{
		let x = new models.PlayerTurnActions(0);

		const data = [];

		const databaseRes = await pool.query("SELECT * FROM horses;"); //, (err, res) =>

		for (const row of databaseRes.rows)
		{
			data.push(JSON.stringify(row));
		}
		res.json(data);

		console.log(`Sent data back to clients.ss`);
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
	console.log(`Server listening on ${port}`);
}
