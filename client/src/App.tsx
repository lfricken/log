/** Primary Component. Index should only render this component. */

import * as React from 'react';
import io from "socket.io-client";
import { ChatComp } from './Chat';
import { AttacksComp } from './Attacks';
import { ReactNode } from 'react';
import * as Shared from './shared';
import * as View from './view';
import * as Vm from './viewmodel';
import './App.css';


interface Props
{

}
interface State
{
	Game: Vm.ViewGame;
}
class App extends React.Component<Props, State>
{
	state: State = App.getInitialState();
	lobbyId!: string;
	socket!: SocketIOClient.Socket;

	public static getInitialState(): State
	{
		return {
			Game: new Vm.ViewGame(null),
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

		this.socket.on(Shared.Event.GameChanged, this.onEraChanged.bind(this));
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
		const copy = new Vm.ViewGame(this.state.Game);

		nicknames.forEach((name, plid) =>
		{
			copy.PlayerConnections[plid].Nickname = name;
		});
		this.setState({
			Game: copy,
		});
	}
	public onTurnChanged(game: Vm.ViewGame): void
	{

	}
	public onEraChanged(game: Vm.ViewEra): void
	{

	}
	componentWillUnmount(): ReactNode
	{
		this.socket.disconnect();
		return null;
	}
	render(): ReactNode
	{
		const nickname = View.LoadSaveDefaultCookie(View.CookieNickname, "Rando");

		return (
			<div className="padding-small flex-row with-gaps">
				<div className="flex flex-column with-gaps">
					<div className="chat component">
						<ChatComp
							nickname={nickname}
							socket={this.socket}
						/>
					</div>
					<div className="log component">
						{/* <AttacksComp
							onAttackChange={this.onAttackChange.bind(this)}
							turnNumber={this.state.Game.LatestEra.LatestTurn.Number}
							nicknames={Vm.ViewGame.GetNicknames(this.state.Game)}
							order={this.state.Game.LatestEra.Order}
						/> */}
					</div>
				</div>
				<div className="flex flex-column with-gaps">
					<div className="lobby component"></div>
					<div className="actions component"></div>
					<div className="other component"></div>
				</div>
			</div>
		);
	}
}

export default App;
