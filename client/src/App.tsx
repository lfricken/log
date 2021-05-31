/** Primary Component. Index should only render this component. */

import * as React from 'react';
import io from "socket.io-client";
import { ChatComp } from './Chat';
import { AttacksComp } from './Attacks';
import { ReactNode } from 'react';
import * as Shared from './shared';
//import * as SharedReact from './sharedReact';
import * as View from './view';
import * as Vm from './viewmodel';
import './App.css';

interface Props
{

}
interface State
{
	lobby: Vm.ViewLobby;
}
class App extends React.Component<Props, State>
{
	state: State = App.getInitialState();
	lobbyId!: string;
	socket!: SocketIOClient.Socket;

	public static getInitialState(): State
	{
		return {
			lobby: new Vm.ViewLobby(),
		};
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

		this.socket.on(Shared.Event.ConnectionsChanged, this.onConnectionsChanged.bind(this));
		this.socket.on(Shared.Event.EraChanged, this.onEraChanged.bind(this));
		this.socket.on(Shared.Event.TurnChanged, this.onTurnChanged.bind(this));

		this.socket.on(Shared.Event.NicknameChanged, this.onNicknameChanged.bind(this));
	}
	public onAttackChange(attacks: number[]): void
	{
		this.socket.emit(Shared.Event.ChatMessage, attacks);
	}
	public onNicknameChanged(nicknames: string[]): void
	{
		const copy = Shared.clone(this.state.lobby);

		nicknames.forEach((name, plid) =>
		{
			copy.PlayerConnections[plid].Nickname = name;
		});
		this.setState({
			lobby: copy,
		});
	}
	public onTurnChanged(d: Vm.ViewTurn): void // new turn
	{
		console.log(`#turn${d.Number} #players${d.Players.length}`);
	}
	public onEraChanged(d: Vm.ViewEra): void // new era/game
	{
		console.log(`#era${d.Number}`);
	}
	// don't need Game change because game just has era
	public onConnectionsChanged(d: Vm.ViewPlayerConnection[]): void // someone joined the lobby
	{
		console.log(`#connections${d.length}`);
	}
	componentWillUnmount(): ReactNode
	{
		this.socket.disconnect();
		return null;
	}
	render(): ReactNode
	{
		const nickname = View.LoadSaveDefaultCookie(View.CookieNickname, "Rando");
		const lobby = this.state.lobby;
		const socket = this.socket;

		return (
			<div className="padding-small flex-row with-gaps">
				<div className="flex flex-column with-gaps">
					<div className="container_0 component">
						<ChatComp
							nickname={nickname}
							socket={this.socket}
						/>
					</div>
					<div className="container_1 component"></div>
				</div>
				<div className="flex flex-column with-gaps">
					<div className="container_2 component"></div>
					<div className="container_3 component">
						{this.renderAttacks(socket, lobby)}
					</div>
				</div>
			</div>
		);
	}
	public renderAttacks(socket: SocketIOClient.Socket, lobby: Vm.ViewLobby): React.ReactNode
	{
		if (lobby.Game !== null)
		{
			return <AttacksComp
				socket={socket}
				game={lobby.Game}
				nicknames={Vm.ViewLobby.GetNicknames(lobby)}
			/>;
		}
		return App.loadingNode();
	}
	public static loadingNode(): React.ReactNode
	{
		return <p>...loading...</p>;
	}
}

export default App;
