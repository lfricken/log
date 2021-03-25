import * as React from 'react';
import './App.css';
import io from "socket.io-client";
import Chat from './Chat'
import LobbyJoin from './LobbyJoin';
import { FormEvent } from 'react';

const sock = io(); // { auth: { token: "abc" } }
console.log('App loading')
interface State
{

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
		return {};
	}

	// called before render
	componentWillMount()
	{
		this.socket = sock;
		this.socket.connect();
		// TODO this could use more explanation
		// const script = document.createElement('script');
		// script.src = "/socket.io/socket.io.js";
		// script.async = true;
		// document.body.appendChild(script);
	}
	componentWillUnmount()
	{
		this.socket.disconnect();
		// need to unsubscribe from socket
	}
	render()
	{
		console.log('App render.')

		return (
			<div className="chatComp">
				<LobbyJoin socket={this.socket} />
				<Chat socket={this.socket} />
			</div>
		);
	}
}

export default App;