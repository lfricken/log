import * as React from 'react';
import './App.css';
import io from "socket.io-client";
import * as x from "./models-shared";
import Chat from './Chat'

const sock = io();
sock.connect();
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

	// Fetch passwords after first mount
	componentDidMount()
	{
		// TODO this could use more explanation
		// const script = document.createElement('script');
		// script.src = "/socket.io/socket.io.js";
		// script.async = true;
		// document.body.appendChild(script);
	}

	render()
	{
		console.log('App render.')
		const { } = this.state;

		return (
			<div className="chatComp">
				<Chat socket={sock} />
			</div>
		);
	}
}

export default App;