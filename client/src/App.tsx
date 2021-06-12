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
import { IMap } from './shared';

interface Props
{

}
interface State
{
	Game: null | Vm.IViewGame;
	Connections: Vm.IViewPlayerConnection[];
	LocalPlid: number;
}
class App extends React.Component<Props, State>
{
	state: State = App.getInitialState();
	socket!: SocketIOClient.Socket;

	public static getInitialState(): State
	{
		return {
			Game: null,
			Connections: [],
			LocalPlid: -1,
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

		this.onAttackChanged = this.onAttackChanged.bind(this);
		this.onTradeChanged = this.onTradeChanged.bind(this);
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
			LocalPlid: d,
		});
	}
	// don't need Game change because game just has era
	public onConnectionsChanged(d: Vm.IViewPlayerConnection[]): void // someone joined the lobby
	{
		console.log(`#connections${d.length}`);
		this.setState({
			Connections: d,
		});
	}
	public onTurnChanged(d: Vm.IViewTurn): void
	{
		console.log(`#turn${d.Number} #players${IMap.Length(d.Players)}`);
	}
	public onEraChanged(d: Vm.IViewEra): void
	{
		console.log(`#era${d.Number}`);
	}
	public onAttackChanged(plidToModify: number, plidToAttack: number, delta: number): void
	{
		this.setState((prevState: Readonly<State>, _: Readonly<Props>) =>
		{
			const prevGame = prevState.Game!;
			const attacks = prevGame.LatestEra.LatestTurn.Players[prevState.LocalPlid].MilitaryAttacks;
			const prevValue = attacks[plidToAttack];

			let value = delta + prevValue;
			if (value < prevGame.Settings.MilitaryMinAttack)
				value = prevGame.Settings.MilitaryMinAttack;
			else if (value > prevGame.Settings.MilitaryMaxAttack)
				value = prevGame.Settings.MilitaryMaxAttack;

			const game = Shared.clone(prevGame);
			game.LatestEra.LatestTurn.Players[plidToModify].MilitaryAttacks[plidToAttack] = value;
			return { Game: game };
		});
	}
	public onTradeChanged(plidToModify: number, plidToTrade: number): void
	{
		this.setState((prevState: Readonly<State>, _: Readonly<Props>) =>
		{
			const prevGame = prevState.Game!;
			const prevTrades = prevGame.LatestEra.LatestTurn.Players[plidToModify].Trades;

			let value: number;
			if (prevTrades[plidToTrade] === Shared.Trade.ActionDefect)
				value = Shared.Trade.ActionCooperate;
			else
				value = Shared.Trade.ActionDefect;

			const game = Shared.clone(prevGame);
			game.LatestEra.LatestTurn.Players[plidToModify].Trades[plidToTrade] = value;
			return { Game: game };
		});
	}
	public onGameChanged(d: Vm.IViewGame): void
	{
		console.log(`new game with #players${IMap.Length(d.LatestEra.LatestTurn.Players)}`);
		this.setState({
			Game: d,
		});
	}
	render(): ReactNode
	{
		const data: Vm.IViewData = {
			Game: null as unknown as Vm.IViewGame,
			Nicknames: [],
			LocalPlid: this.state.LocalPlid,
			LocalOrder: -1,
		};
		const { Game: game } = this.state;
		if (game !== null)
		{
			data.Game = game;
			data.LocalOrder = game!.LatestEra.Order.indexOf(this.state.LocalPlid);
			data.Nicknames = Vm.IViewLobby.GetNicknames(this.state.Connections);
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
		if (this.state.Connections !== null && this.state.Connections.length > 0)
		{
			return <ChatComp Socket={this.socket} />;
		}
		return App.loading();
	}
	public renderConnections(): React.ReactNode
	{
		if (this.state.Connections !== null && this.state.Connections.length > 0)
		{
			return <MembersComp
				Socket={this.socket}
				LocalPlid={this.state.LocalPlid}
				Connections={this.state.Connections}
				ActiveGame={this.state.Game !== null}
			/>;
		}
		return App.loading();
	}
	public renderActions(app: App, data: Vm.IViewData): React.ReactNode
	{
		if (this.state.Game !== null)
		{
			const players = data.Game.LatestEra.LatestTurn.Players;
			if (players[data.LocalPlid] !== null && players[data.LocalPlid] !== undefined)
			{
				return Actions.renderActions({
					Data: data,
					onAttackChanged: app.onAttackChanged,
					onTradeChanged: app.onTradeChanged,
				});
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
