/** Primary Component. Index should only render this component. */

import './Game.css';
import * as React from 'react';
import io from "socket.io-client";
import { Spinner } from "react-bootstrap";
import { ChatComp } from './Chat';
import * as Actions from './Attacks';
import { ReactNode } from 'react';
import * as Shared from './shared';
import * as View from './view';
import * as Vm from './viewmodel';
import MembersComp from './Members';
import { IMap } from './shared';
import debounce from "debounce";
import { toast, ToastOptions } from 'react-toastify';

interface Props
{

}
interface State
{
	Game: null | Vm.IViewGame;
	Connections: Vm.IViewPlayerConnection[];
	LocalPlid: number;
}
class Game extends React.Component<Props, State>
{
	state: State = Game.getInitialState();
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
		this.socket.on(Shared.Event.WholeTurn, this.onWholeTurnChanged.bind(this));
		this.socket.on(Shared.Event.PlayerTurn, this.onPlayerTurnChanged.bind(this));
		this.socket.on(Shared.Event.Era, this.onEraChanged.bind(this));
		this.socket.on(Shared.Event.Game, this.onGameChanged.bind(this));

		this.onClickStartGame = this.onClickStartGame.bind(this);
		this.onForceNextTurn = this.onForceNextTurn.bind(this);
		this.onTurnDone = this.onTurnDone.bind(this);
		this.onAttackChanged = this.onAttackChanged.bind(this);
		this.onTradeChanged = this.onTradeChanged.bind(this);
		this.onMilitaryChanged = this.onMilitaryChanged.bind(this);
		// eslint-disable-next-line no-magic-numbers
		this.showToast = debounce(this.showToast, 2000, true);
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
	public showToast(message: string): void
	{
		const toastSettings: ToastOptions = {
			position: "top-center",
			autoClose: 2500,
			hideProgressBar: true,
			closeOnClick: true,
			pauseOnHover: true,
			draggable: true,
		};
		toast.info(message, toastSettings);
	}
	public onClickStartGame(): void
	{
		this.socket.emit(Shared.Event.Game, Shared.GetSettings(Shared.SettingConfig.Deployment));
	}
	public onForceNextTurn(): void
	{
		const game = this.state.Game;
		if (game !== null)
		{
			this.socket.emit(Shared.Event.ForceNextTurn, {});
		}
	}
	public onTurnDone(): void
	{
		const game = this.state.Game;
		if (game !== null)
		{
			const localPlayerTurnState = game.LatestEra.LatestTurn.Players[this.state.LocalPlid];
			this.socket.emit(Shared.Event.PlayerTurn, localPlayerTurnState);
		}
	}
	public onAttackChanged(plidToModify: number, plidToAttack: number, delta: number): void
	{
		this.setState((prevState: Readonly<State>, _: Readonly<Props>) =>
		{
			const prevGame = prevState.Game!;
			const localPlayer = prevGame.LatestEra.LatestTurn.Players[prevState.LocalPlid];
			const prevTotalAttacks = Shared.Military.GetTotalAttacks(localPlayer.MilitaryAttacks);

			// total attacks should not exceed total military
			if (delta > 0 && prevTotalAttacks >= localPlayer.Military)
			{
				this.showToast(`You need more Military to attack with!`);
				return null;
			}

			const newValue = delta + localPlayer.MilitaryAttacks[plidToAttack];
			// should not be able to exceed min/max attack value
			if (newValue < prevGame.Settings.MilitaryMinAttack)
			{
				this.showToast(`You can't attack for less than ${prevGame.Settings.MilitaryMinAttack}.`);
				return null;
			}
			else if (newValue > prevGame.Settings.MilitaryMaxAttack) // max attack value
			{
				this.showToast(`You can't attack for more than ${prevGame.Settings.MilitaryMaxAttack}.`);
				return null;
			}

			const game = Shared.clone(prevGame);
			game.LatestEra.LatestTurn.Players[plidToModify].MilitaryAttacks[plidToAttack] = newValue;
			return { Game: game };
		});
	}
	public onTradeChanged(plidToModify: number, plidToTrade: number): void
	{
		this.setState((prevState: Readonly<State>, _: Readonly<Props>) =>
		{
			const prevGame = prevState.Game!;
			const prevTrades = prevGame.LatestEra.LatestTurn.Players[plidToModify].Trades;

			// toggle trade decision based on previous value
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
	public onMilitaryChanged(delta: number): void
	{
		this.setState((prevState: Readonly<State>, _: Readonly<Props>) =>
		{
			const prevGame = prevState.Game!;
			const game = Shared.clone(prevGame);
			const prevPlayer = prevGame.LatestEra.LatestTurn.Players[prevState.LocalPlid];

			const newValue = delta + prevPlayer.MilitaryDelta;
			// restrict military investment
			if (newValue < prevGame.Settings.MilitaryMinDeltaPerTurn)
			{
				this.showToast(`You can't buy less than ${prevGame.Settings.MilitaryMinDeltaPerTurn} Military!`);
				return null;
			}
			if (newValue > prevGame.Settings.MilitaryMaxDeltaPerTurn)
			{
				this.showToast(`You can't buy more than ${prevGame.Settings.MilitaryMaxDeltaPerTurn} Military!`);
				return null;
			}

			game.LatestEra.LatestTurn.Players[prevState.LocalPlid].MilitaryDelta = newValue;
			return { Game: game };
		});
	}
	/** Called right after we first connect so we know our Plid. */
	public onConnected(d: number): void // someone joined the lobby
	{
		console.log(`#plid${d}`);
		this.setState({
			LocalPlid: d,
		});
	}
	/** Lobby data changed. */
	public onConnectionsChanged(d: Vm.IViewPlayerConnection[]): void // someone joined the lobby
	{
		console.log(`#connections${d.length}`);
		this.setState({
			Connections: d,
		});
	}
	/** Someone modified their turn in a visible way. */
	public onPlayerTurnChanged(d: Vm.IViewPlayerTurn): void
	{
		console.log(`#turn for plid${d.Plid} changed`);
		this.setState((prevState: Readonly<State>, _: Readonly<Props>) =>
		{
			const prevGame = prevState.Game!;
			const game = Shared.clone(prevGame);
			game.LatestEra.LatestTurn.Players[d.Plid] = d;
			return { Game: game };
		});
	}
	/** The turn advanced. */
	public onWholeTurnChanged(d: Vm.IViewTurn): void
	{
		console.log(`#new turn #${d.Number}`);
		this.setState((prevState: Readonly<State>, _: Readonly<Props>) =>
		{
			const prevGame = prevState.Game!;
			const game = Shared.clone(prevGame);
			game.LatestEra.LatestTurn = d;
			return { Game: game };
		});
	}
	/** A new Era happened. */
	public onEraChanged(d: Vm.IViewEra): void
	{
		console.log(`#era${d.Number}`);
		this.setState((prevState: Readonly<State>, _: Readonly<Props>) =>
		{
			const prevGame = prevState.Game!;
			const game = Shared.clone(prevGame);
			game.LatestEra = d;
			return { Game: game };
		});
	}
	/** The whole game updated. */
	public onGameChanged(d: Vm.IViewGame): void
	{
		console.log(`game with #players${IMap.Length(d.LatestEra.LatestTurn.Players)}`);
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
						{this.renderConnections(this)}
					</div>
				</div>
				<div className="flex flex-column with-gaps">
					<div className="container_2 component">
						{this.renderEvents(this, data)}
					</div>
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
		return Game.loading();
	}
	public renderConnections(app: Game): React.ReactNode
	{
		if (this.state.Connections !== null && this.state.Connections.length > 0)
		{
			return <MembersComp
				Socket={this.socket}
				LocalPlid={this.state.LocalPlid}
				Connections={this.state.Connections}
				ActiveGame={this.state.Game !== null && !this.state.Game.IsOver}
				onClickForceNextTurn={app.onForceNextTurn}
				onClickStartGame={app.onClickStartGame}
			/>;
		}
		return Game.loading();
	}
	public renderEvents(app: Game, data: Vm.IViewData): React.ReactNode
	{
		const game = data.Game;
		const localPlid = data.LocalPlid;
		if (game !== null)
		{
			if (IMap.Has(game.LatestEra.LatestTurn.Players, localPlid))
			{
				const messages = game.LatestEra.LatestTurn.Players[localPlid].LastTurnEvents;
				return (
					<div className="full-size flex-column">
						<div className="flex message-view" id="chatView">
							{messages.map((message, idx) =>
								<div
									key={idx}>
									{message}
								</div>
							)}
						</div>
					</div>
				);
			}
		}
		return Game.gameNotStarted();
	}
	public renderActions(app: Game, data: Vm.IViewData): React.ReactNode
	{
		const game = data.Game;
		if (game !== null)
		{
			return Actions.renderActions({
				Data: data,
				onAttackChanged: app.onAttackChanged,
				onTradeChanged: app.onTradeChanged,
				onTurnDone: app.onTurnDone,
				onMilitaryChanged: app.onMilitaryChanged,
			});
		}
		return Game.gameNotStarted();
	}
	public static loading(): React.ReactNode
	{
		return <Spinner animation="border" />;
	}
	public static gameNotStarted(): React.ReactNode
	{
		return <div>...game has not started...</div>;
	}
}

export default Game;
