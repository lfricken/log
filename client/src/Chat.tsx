import * as React from 'react';
import './Chat.css';
import io from "socket.io-client";
import * as x from "./models-shared";
import cookie from 'react-cookies'

console.log('Client loading in browser.')
interface State
{
	name: string;
	messages: x.ChatMessage[];
}
class Chat extends React.Component
{
	// Initialize state
	state: State = Chat.getInitialState();
	socket!: SocketIOClient.Socket;
	chatInput!: HTMLInputElement;
	chatView!: HTMLDivElement;


	private static getRandomName(): string
	{
		return "Rando";
	}
	public static getInitialState(): State
	{
		let nickname = cookie.load('name');
		if (nickname === null || nickname === undefined)
		{
			nickname = Chat.getRandomName();
			cookie.save('name', nickname, {});
		}
		// initial state has a message to welcome the new user onthe chat
		return {
			name: nickname,
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
		e.preventDefault();
		const mes = this.chatInput.value;
		if (mes !== "")
		{
			const message = new x.ChatMessage(this.state.name, mes);
			this.socket.emit('chat message', message);
			this.onReceiveMessage(message);
			this.chatInput.value = '';
		}
	}
	private onReceiveMessage(mes: x.ChatMessage): void
	{
		// follow the bottom of the chat if they are already looking there
		const pixelRange = 80;
		const follow = (this.chatView.scrollHeight - this.chatView.offsetHeight - this.chatView.scrollTop) < pixelRange;

		const messages = this.state.messages;
		messages.push(mes);
		this.setState({ messages });

		if (follow)
			this.chatView.scrollTop = this.chatView.scrollHeight;
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
			<div className="Chat">
				<div className="chatView" id="chatView">
					{messages.map((mes) =>
						<div>{x.ChatMessage.DisplayString(mes)}</div>
					)}
				</div>
				<form id="form" action="">
					<input className="chatInput" id="chatInput" autoComplete="off" />
				</form>
			</div>
		);
	}
}

export default Chat;