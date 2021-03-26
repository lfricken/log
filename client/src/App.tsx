import * as React from 'react';
import './App.css';
import io from "socket.io-client";
import { Chat, ChatNameKey } from './Chat'
import { Core } from './models-shared';
import { FormEvent } from 'react';
import cookie from 'react-cookies'

console.log('App loading')
interface Props
{

}
interface State
{

}
class App extends React.Component<Props, State>
{
	state: State = App.getInitialState();
	lobbyId!: string;
	socket!: SocketIOClient.Socket;

	public static getInitialState(): State
	{
		return {};
	}
	// called before render
	constructor(props: Props)
	{
		super(props);

		const splitUrl = window.location.href.split('/');
		this.lobbyId = splitUrl[splitUrl.length - 1];

		let nickname = cookie.load(ChatNameKey);
		if (nickname === null || nickname === undefined)
			nickname = "Rando";
		const authObj: Core.IAuth = { Nickname: nickname, LobbyId: this.lobbyId };

		this.socket = io.connect({ reconnection: false, auth: authObj });
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
				{/**<LobbyJoin socket={this.socket} />**/}
				<Chat socket={this.socket} />
			</div>
		);
	}
}

export default App;