import * as React from 'react';
import './App.css';
import io from "socket.io-client";
import { ChatComp } from './Chat'
import { ReactNode } from 'react';
import * as Shared from './shared';
import * as View from './view';


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

		const uniqueId = View.LoadSaveDefaultCookie(View.CookieUniqueId, View.GetUniqueId(Shared.UniqueIdLength));
		const nickname = View.LoadSaveDefaultCookie(View.CookieNickname, "Rando");

		const authObj: Shared.IAuth = { UniqueId: uniqueId, Nickname: nickname, LobbyId: this.lobbyId };

		this.socket = io({ autoConnect: false, reconnection: false, auth: authObj });
		this.socket.connect();
		// TODO this could use more explanation
		// const script = document.createElement('script');
		// script.src = "/socket.io/socket.io.js";
		// script.async = true;
		// document.body.appendChild(script);
	}

	componentWillUnmount(): ReactNode
	{
		this.socket.disconnect();
		// need to unsubscribe from socket

		return null;
	}
	render(): ReactNode
	{
		console.log('App render.')
		const nickname = View.LoadSaveDefaultCookie(View.CookieNickname, "Rando");

		return (
			<div className="chatComp">
				{/**<LobbyJoin socket={this.socket} />**/}
				<ChatComp nickname={nickname} socket={this.socket} />
			</div>
		);
	}
}

export default App;
