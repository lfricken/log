import * as React from 'react';
import './App.css';
import io from "socket.io-client";
import { Shared } from "./shared/models-shared";

console.log('Client loading in browser.')
interface State
{
	name: string;
	messages: Shared.ChatMessage[];
}
class App extends React.Component
{
	// Initialize state
	state: State = App.getInitialState();
	socket!: SocketIOClient.Socket;
	chatInput!: HTMLInputElement;
	chatView!: HTMLDivElement;

	public static getInitialState(): State
	{
		// initial state has a message to welcome the new user onthe chat
		return {
			name: "default name",
			messages: []
		};
	}

	// Fetch passwords after first mount
	componentDidMount()
	{
		// TODO this could use more explanation
		const script = document.createElement('script');
		script.src = "/socket.io/socket.io.js";
		script.async = true;
		document.body.appendChild(script);

		this.getPasswords();

		this.socket = io();
		this.socket.connect();
		this.socket.on('chat message', this.onReceiveMessage.bind(this));

		this.chatView = document.getElementById('chatView') as HTMLDivElement;
		this.chatInput = document.getElementById('chatInput') as HTMLInputElement;

		var form = document.getElementById('form') as HTMLFormElement;
		form.addEventListener('submit', this.onSendMessage.bind(this));
	}

	private onSendMessage(e: Event): void
	{
		const follow = this.chatView.scrollTop === (this.chatView.scrollHeight - this.chatView.offsetHeight);

		e.preventDefault();
		const mes = this.chatInput.value;
		if (mes !== "")
		{
			const message = new Shared.ChatMessage("name", mes);
			this.socket.emit('chat message', message);
			this.onReceiveMessage(message);
			this.chatInput.value = '';
		}

		if (follow)
			this.chatView.scrollTop = this.chatView.scrollHeight;
	}
	private onReceiveMessage(mes: Shared.ChatMessage): void
	{
		const messages = this.state.messages;
		messages.push(mes);
		this.setState({ messages });
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
		const { messages } = this.state;

		return (
			<div className="App">
				<div className="chat" id="chatView">
					{messages.map((mes) =>
						<div>{Shared.ChatMessage.DisplayString(mes)}</div>
					)}
				</div>
				<form id="form" action="">
					<input id="chatInput" autoComplete="off" />
					<button>Send</button>
				</form>

				{/*
					passwords.length !== 0 ?
						(
							<div>
								<h1>5 Passwords.</h1>
								<ul className="passwords">
									{
										Generally it's bad to use "index" as a key.
										It's ok for this example because there will always
										be the same number of passwords, and they never
										change positions in the array.
										
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
						)*/
				}
			</div>
		);
	}
}

export default App;