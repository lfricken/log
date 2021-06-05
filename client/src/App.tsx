/** Primary Component. Index should only render this component. */

import * as React from 'react';
import io from "socket.io-client";
import { ChatComp } from './Chat';
import * as Actions from './Attacks';
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
	game: null | Vm.IViewGame;
	connections: Vm.IViewPlayerConnection[];
	localPlid: number;
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
			localPlid: -1,
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
		this.socket.on(Shared.Event.OnConnected, this.onConnected.bind(this));
		this.socket.on(Shared.Event.Connections, this.onConnectionsChanged.bind(this));
		this.socket.on(Shared.Event.Turn, this.onTurnChanged.bind(this));
		this.socket.on(Shared.Event.Era, this.onEraChanged.bind(this));
		this.socket.on(Shared.Event.Game, this.onGameChanged.bind(this));
	}
	componentDidMount(): React.ReactNode
	{
		// we should not modify state until after mount
		this.socket.connect();
		return null;
	}
	componentWillUnmount(): ReactNode
	{
		this.socket.disconnect();
		return null;
	}
	/** Called right after we first connect so we know our Plid. */
	public onConnected(d: number): void // someone joined the lobby
	{
		console.log(`#plid${d}`);
		this.setState({
			localPlid: d,
		});
	}
	// don't need Game change because game just has era
	public onConnectionsChanged(d: Vm.IViewPlayerConnection[]): void // someone joined the lobby
	{
		console.log(`#connections${d.length}`);
		this.setState({
			connections: d,
		});
	}
	public onTurnChanged(d: Vm.IViewTurn): void
	{
		console.log(`#turn${d.Number} #players${d.Players.length}`);
	}
	public onEraChanged(d: Vm.IViewEra): void
	{
		console.log(`#era${d.Number}`);
	}
	public onAttackChanged(plidToModify: number, plidToAttack: number, delta: number): void
	{
		this.setState((prevState: Readonly<State>, _: Readonly<Props>) =>
		{
			const prevGame = prevState.game!;
			const attacks = prevGame.LatestEra.LatestTurn.Players[prevState.localPlid].MilitaryAttacks;
			const prevValue = Shared.IPlidMap.TryGet(attacks, plidToAttack, prevGame.Settings.EraStartMilitary);
			let value = delta + prevValue;
			if (value < prevGame.Settings.MilitaryMinAttack)
				value = prevGame.Settings.MilitaryMinAttack;
			else if (value > prevGame.Settings.MilitaryMaxAttack)
				value = prevGame.Settings.MilitaryMaxAttack;

			const game = Shared.clone(prevGame);
			game.LatestEra.LatestTurn.Players[plidToModify].MilitaryAttacks[plidToAttack] = value;
			return { game };
		});
	}
	public onGameChanged(d: Vm.IViewGame): void
	{
		console.log(`new game with #players${d.LatestEra.LatestTurn.Players.length}`);
		this.setState({
			game: d,
		});
	}
	render(): ReactNode
	{
		const data: Vm.IViewData = {
			Game: null as unknown as Vm.IViewGame,
			Nicknames: [],
			LocalPlid: this.state.localPlid,
			LocalOrder: -1,
		};
		const { game } = this.state;
		if (game !== null)
		{
			data.Game = game;
			data.LocalOrder = game!.LatestEra.Order.indexOf(this.state.localPlid);
			data.Nicknames = Vm.IViewLobby.GetNicknames(this.state.connections);
		}

		return (
			<div className="padding-small flex-row with-gaps">
				<div className="flex flex-column with-gaps">
					<div className="container_0 component">
						{this.renderChat()}
					</div>
					<div className="container_1 component">
						{this.renderConnections()}
					</div>
				</div>
				<div className="flex flex-column with-gaps">
					<div className="container_2 component"></div>
					<div className="container_3 component">
						{this.renderActions(this, data)}
					</div>
				</div>
			</div>
		);
	}
	public renderChat(): React.ReactNode
	{
		if (this.state.connections !== null && this.state.connections.length > 0)
		{
			return <ChatComp
				socket={this.socket}
			/>;
		}
		return App.loading();
	}
	public renderConnections(): React.ReactNode
	{
		if (this.state.connections !== null && this.state.connections.length > 0)
		{
			return <MembersComp
				socket={this.socket}
				localPlid={this.state.localPlid}
				connections={this.state.connections}
				activeGame={this.state.game !== null}
			/>;
		}
		return App.loading();
	}
	public renderActions(app: App, data: Vm.IViewData): React.ReactNode
	{
		if (this.state.game !== null)
		{
			const players = data.Game.LatestEra.LatestTurn.Players;
			if (players[data.LocalPlid] !== undefined)
			{
				return Actions.renderActions({ data, onAttackChanged: app.onAttackChanged.bind(app) });
			}
			else
			{
				return App.gameNotIncluded();
			}
		}
		return App.gameNotStarted();
	}
	public static loading(): React.ReactNode
	{
		return <p>...loading...</p>;
	}
	public static gameNotStarted(): React.ReactNode
	{
		return <p>...game has not started...</p>;
	}
	public static gameNotIncluded(): React.ReactNode
	{
		return <p>...the current game does not have you in it...</p>;
	}
}

export default App;
