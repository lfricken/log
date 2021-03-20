import * as React from 'react';
import './App.css';
import io from "socket.io-client";
import sanitizeHtml from "sanitize-html";
import * as models from "./shared/models-shared";

console.log('Client loading in browser.')
class App extends React.Component
{
	// Initialize state
	state = { passwords: [""] }

	// Fetch passwords after first mount
	componentDidMount()
	{
		// TODO this could use more explanation
		const script = document.createElement('script');
		script.src = "/socket.io/socket.io.js";
		script.async = true;
		document.body.appendChild(script);

		this.getPasswords();

		const socket = io();
		socket.connect();

		var messages = document.getElementById('messages') as HTMLUListElement;
		var form = document.getElementById('form') as HTMLFormElement;
		var input = document.getElementById('input') as HTMLInputElement;

		form.addEventListener('submit', function (e)
		{
			e.preventDefault();
			if (input.value !== "")
			{
				socket.emit('chat message', input.value);
				input.value = '';
			}
		});

		socket.on('chat message', function (msg: models.PlayerChatMessage)
		{
			var item = document.createElement('li');
			item.textContent = models.PlayerChatMessage.DisplayString(msg);
			messages.appendChild(item);
			window.scrollTo(0, document.body.scrollHeight);
		});
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
		console.log('Client rendering in browser.')
		const { passwords } = this.state;

		return (
			<div className="App">
				<div className="abc" id="messages"></div>
				<form id="form" action="">
					<input id="input" autoComplete="off" />
					<button>Send</button>
				</form>
				{/* Render the passwords if we have them */}
				{passwords.length !== 0 ?
					(
						<div>
							<h1>5 Passwords.</h1>
							<ul className="passwords">
								{
									/*
									Generally it's bad to use "index" as a key.
									It's ok for this example because there will always
									be the same number of passwords, and they never
									change positions in the array.
									*/
								}
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
					)
				}
			</div>
		);
	}
}

export default App;