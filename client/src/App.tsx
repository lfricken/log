import * as React from 'react';
import './App.css';
import io from "socket.io-client";
import * as models from "../../shared/models-shared";

console.log('Client loading in browser.')
class App extends React.Component
{
	// Initialize state
	state = { passwords: [""] }

	// Fetch passwords after first mount
	componentDidMount()
	{
		//var socket = io();
		const script = document.createElement('script'); // d

		script.src = "/socket.io/socket.io.js";
		script.async = true;
		//script.innerHTML = "var socket = io().connect('http://localhost:3001', {reconnect: true});;"

		document.body.appendChild(script);
		this.getPasswords();

		const socket = io();
		socket.connect();
		// socket.on("FromAPI", data => {
		// 	setResponse(data);
		// });
	}

	getPasswords = () =>
	{
		// Get the passwords and store them in state
		fetch('/api/passwords')
			.then(res => res.json())
			.then(passwords => this.setState({ passwords }));
	}

	render()
	{
		console.log('Client rendering in browser.s')
		const { passwords } = this.state;

		if (passwords.length)
		{

		}

		return (
			<div className="App">
				{/* Render the passwords if we have them */}
				{passwords.length !== 0 ?
					(
						<div>
							<h1>5 Passwords.</h1>
							<ul className="passwords">
								{/*
								Generally it's bad to use "index" as a key.
								It's ok for this example because there will always
								be the same number of passwords, and they never
								change positions in the array.
							*/}
								{passwords.map((password, index) =>
									<li key={index}>
										{password}
									</li>
								)}
							</ul>
							<button
								className="more"
								onClick={this.getPasswords}>
								Get More
							</button>
						</div>
					)
					:
					(
						// Render a helpful message otherwise
						<div>
							<h1>No passwords :(</h1>
							<button
								className="more"
								onClick={this.getPasswords}>
								Try Again?
							</button>
						</div>
					)}
			</div>
		);
	}
}

export default App;