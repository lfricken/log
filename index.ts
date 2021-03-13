import * as exp from 'express';
import * as http from 'http';
import * as io from 'socket.io';
import * as path from 'path';
import * as pg from 'pg';

import express from 'express';
const expWrap = express();
const httpServer = http.createServer(expWrap);
const ioWrap = new io.Server(httpServer);




ioWrap.on('connection', (socket: io.Socket) => {
	console.log(`a user connected ${0}`);
	socket.on('disconnect', () => {
		console.log('user disconnected');
	});
});




// pools will use environment variables
// for connection information
const pool = new pg.Pool({
	connectionString: process.env.DATABASE_URL,
	ssl: process.env.DATABASE_SKIPSSL ? undefined : { rejectUnauthorized: false },
});



// Serve static files from the React app
expWrap.use(express.static(path.join(__dirname, 'client/build')));

// Put all API endpoints under '/api'
expWrap.get('/api/passwords', async (req: exp.Request, res: exp.Response) => {
	let data = [];

	let databaseRes = await pool.query('SELECT * FROM horses;');//, (err, res) => 

	for (let row of databaseRes.rows) {
		data.push(JSON.stringify(row));
	}
	res.json(data);

	console.log(`Sent data back to client`);
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
expWrap.get('*', (req: exp.Request, res: exp.Response) => {
	res.sendFile(path.join(__dirname + '/client/build/index.html'));
});

const port = process.env.PORT || 3001;
httpServer.listen(port);

console.log(`Server listening on ${port}`);