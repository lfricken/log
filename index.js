const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);

const path = require('path');
const { Pool, Client } = require('pg')



io.on('connection', (socket) => {
	console.log(`a user connected ${0}`);
	socket.on('disconnect', () => {
		console.log('user disconnected');
	});
});




// pools will use environment variables
// for connection information
const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	ssl: process.env.DATABASE_SKIPSSL ? null : { rejectUnauthorized: false },
});



// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'client/build')));

// Put all API endpoints under '/api'
app.get('/api/passwords', async (req, res) => {
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
app.get('*', (req, res) => {
	res.sendFile(path.join(__dirname + '/client/build/index.html'));
});

const port = process.env.PORT || 3001;
server.listen(port);

console.log(`Server listening on ${port}`);
