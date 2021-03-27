import * as React from 'react';
import './App.css';
import io from "socket.io-client";
import { ChatComp } from './Chat'
import { Const, Core, Util } from './models-shared';
import { ReactNode } from 'react';


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

		const uniqueId = Util.LoadSaveDefaultCookie(Const.CookieUniqueId, Util.GetUniqueId(Const.UniqueIdLength));
		const nickname = Util.LoadSaveDefaultCookie(Const.CookieNickname, "Rando");

		const authObj: Core.IAuth = { UniqueId: uniqueId, Nickname: nickname, LobbyId: this.lobbyId };

		this.socket = io.connect({ reconnection: false, auth: authObj });
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
		const nickname = Util.LoadSaveDefaultCookie(Const.CookieNickname, "Rando");

		return (
			<div className="chatComp">
				{/**<LobbyJoin socket={this.socket} />**/}
				<ChatComp nickname={nickname} socket={this.socket} />
			</div>
		);
	}
}

export default App;
