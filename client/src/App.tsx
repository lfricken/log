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
import MembersComp from './Members';

interface Props
{

}
interface State
{
	game: null | Vm.ViewGame;
	connections: Vm.ViewPlayerConnection[];
}
class App extends React.Component<Props, State>
{
	state: State = App.getInitialState();
	socket!: SocketIOClient.Socket;

	public static getInitialState(): State
	{
		return {
			game: null,
			connections: [],
		};
	}
	// called before render
	constructor(props: Props)
	{
		super(props);

		const splitUrl = window.location.href.split('/');
		const lobbyId = splitUrl[splitUrl.length - 1];

		const uniqueId = View.LoadSaveDefaultCookie(View.CookieUniqueId, View.GetUniqueId(Shared.UniqueIdLength));
		const nickname = View.LoadSaveDefaultCookie(View.CookieNickname, "Rando");
		const authObj: Shared.IAuth = { UniqueId: uniqueId, Nickname: nickname, LobbyId: lobbyId };
		this.socket = io({ autoConnect: false, reconnection: false, auth: authObj });
	}
	componentDidMount(): React.ReactNode
	{
		this.socket.connect();
		this.socket.on(Shared.Event.Connection, this.onConnectionsChanged.bind(this));
		this.socket.on(Shared.Event.Turn, this.onTurnChanged.bind(this));
		this.socket.on(Shared.Event.Era, this.onEraChanged.bind(this));
		this.socket.on(Shared.Event.Game, this.onGameChanged.bind(this));
		return null;
	}
	componentWillUnmount(): ReactNode
	{
		this.socket.disconnect();
		return null;
	}
	// don't need Game change because game just has era
	public onConnectionsChanged(d: Vm.ViewPlayerConnection[]): void // someone joined the lobby
	{
		console.log(`#connections${d.length}`);
		this.setState({
			connections: d,
		});
	}
	public onTurnChanged(d: Vm.ViewTurn): void
	{
		console.log(`#turn${d.Number} #players${d.Players.length}`);
	}
	public onEraChanged(d: Vm.ViewEra): void
	{
		console.log(`#era${d.Number}`);
	}
	public onGameChanged(d: Vm.ViewGame): void
	{
		console.log(`new game with #players${d.LatestEra.LatestTurn.Players.length}`);
	}
	render(): ReactNode
	{
		const clientNickname = View.LoadSaveDefaultCookie(View.CookieNickname, "Rando");
		const socket = this.socket;
		const { game, connections, } = this.state;
		const nicknames = Vm.ViewLobby.GetNicknames(connections);

		return (
			<div className="padding-small flex-row with-gaps">
				<div className="flex flex-column with-gaps">
					<div className="container_0 component">
						<ChatComp
							nickname={clientNickname}
							socket={this.socket}
						/>
					</div>
					<div className="container_1 component">
						{this.renderMembers(socket, connections)}
					</div>
				</div>
				<div className="flex flex-column with-gaps">
					<div className="container_2 component"></div>
					<div className="container_3 component">
						{this.renderAttacks(socket, game, nicknames)}
					</div>
				</div>
			</div>
		);
	}
	public renderAttacks(socket: SocketIOClient.Socket, game: null | Vm.ViewGame, nicknames: string[]): React.ReactNode
	{
		if (game !== null)
		{
			return <AttacksComp
				socket={socket}
				game={game}
				nicknames={nicknames}
			/>;
		}
		return App.loadingNode();
	}
	public renderMembers(socket: SocketIOClient.Socket, connections: Vm.ViewPlayerConnection[]): React.ReactNode
	{
		if (connections !== null && connections.length > 0)
		{
			return <MembersComp
				socket={socket}
				connections={connections}
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
