import * as React from 'react';
import './App.css';
import io from "socket.io-client";
import { Chat } from './Chat'
import { Const, Core } from './models-shared';
import cookie from 'react-cookies'
//import { Util } from './models-client';

export namespace Util
{
	const oneYear = 31536000;
	export function LoadSaveDefaultCookie(key: string, defaultValue: string): string
	{
		let val = cookie.load(key);
		if (val === null || val === undefined)
		{
			val = defaultValue;
			cookie.save(key, val, { expires: new Date(Date.now() + oneYear) });
		}
		return val;
	}
	export function SaveCookie(key: string, val: string)
	{
		cookie.save(key, val, { expires: new Date(Date.now() + oneYear) });
	}
	export function GetUniqueId(len: number)
	{
		var result = '';
		var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		var charactersLength = characters.length;
		for (var i = 0; i < len; i++)
		{
			result += characters.charAt(Math.floor(Math.random() * charactersLength));
		}
		return result;
	}
}


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

	componentWillUnmount()
	{
		this.socket.disconnect();
		// need to unsubscribe from socket
	}
	render()
	{
		console.log('App render.')
		const nickname = Util.LoadSaveDefaultCookie(Const.CookieNickname, "Rando");

		return (
			<div className="chatComp">
				{/**<LobbyJoin socket={this.socket} />**/}
				<Chat nickname={nickname} socket={this.socket} />
			</div>
		);
	}
}

export default App;
