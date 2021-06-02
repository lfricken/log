/** The component that lets players message eachother. */

import * as React from 'react';
import * as Vm from "./viewmodel";
import * as Shared from './shared';
import './Members.css';
import './Main.css';

const AttackMin = 0;
const AttackMax = 9;
interface Props
{
	socket: SocketIOClient.Socket;
	localPlid: number;
	connections: Vm.ViewPlayerConnection[];
	activeGame: boolean;
}
interface State { }
export class MembersComp extends React.Component<Props, State>
{
	state!: State;

	constructor(props: Props)
	{
		super(props);
	}
	componentDidMount(): React.ReactNode
	{
		return null;
	}
	public onClickNextTurn(e: React.MouseEvent<HTMLButtonElement>): void
	{
		this.props.socket.emit(Shared.Event.Turn, {});
	}
	public onClickStartGame(e: React.MouseEvent<HTMLButtonElement>): void
	{
		this.props.socket.emit(Shared.Event.Game, Shared.GetSettings(Shared.SettingConfig.Default));
	}
	public renderMemberList(connections: Vm.ViewPlayerConnection[], localPlid: number): React.ReactNode
	{
		return connections.map((connection, plid) =>
			<tr>
				<td className={plid === localPlid ? "bold" : ""}>
					{connection.Nickname}
				</td>
				<td className={plid === localPlid ? "bold" : ""}>
					{plid}
				</td>
				<td>
					{this.renderAdditionalInfo(connection, plid)}
				</td>
				<td>
					{this.renderNextTurnButton(plid)}
				</td>
			</tr>
		);
	}
	public renderAdditionalInfo(connection: Vm.ViewPlayerConnection, plid: number): React.ReactNode
	{
		if (connection.IsConnected)
		{
			return this.renderStartButton(plid);
		}
		else
		{
			return "Disconnected";
		}
	}
	public renderStartButton(plid: number): React.ReactNode
	{
		if (this.props.connections[plid].IsHost) // local player is host
		{
			return <button
				disabled={plid !== this.props.localPlid}
				onClick={this.onClickStartGame.bind(this)}
			>
				Start Game
			</button>;
		}
		else
		{
			return "";
		}
	}
	public renderNextTurnButton(plid: number): React.ReactNode
	{
		if (this.props.connections[plid].IsHost) // local player is host
		{
			return <button
				disabled={plid !== this.props.localPlid || !this.props.activeGame}
				onClick={this.onClickNextTurn.bind(this)}
			>
				Next Turn
			</button>;
		}
		else
		{
			return "";
		}
	}
	render(): React.ReactNode
	{
		const { connections } = this.props;

		return (
			<table>
				<tbody>
					<tr>
						<th>Name</th>
						<th>ID</th>
						<th></th>
						<th></th>
					</tr>
					{this.renderMemberList(connections, this.props.localPlid)}
				</tbody>
			</table >
		);
	}
}

export default MembersComp;
