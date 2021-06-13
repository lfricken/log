/** The component that lets players message eachother. */

import * as React from 'react';
import * as Vm from "./viewmodel";
import * as Shared from './shared';
import './Members.css';
import './Main.css';

interface Props
{
	Socket: SocketIOClient.Socket;
	LocalPlid: number;
	Connections: Vm.IViewPlayerConnection[];
	ActiveGame: boolean;
	onClickForceNextTurn: () => void;
	onClickStartGame: () => void;
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
	render(): React.ReactNode
	{
		const { Connections: connections } = this.props;

		return (
			<table>
				<tbody>
					<tr>
						<th>Name</th>
						<th>ID</th>
						<th></th>
						<th></th>
					</tr>
					{this.renderMemberList(connections, this.props.LocalPlid)}
				</tbody>
			</table >
		);
	}
	public renderMemberList(connections: Vm.IViewPlayerConnection[], localPlid: number): React.ReactNode
	{
		const numConnected = Vm.IViewLobby.GetNumConnected(connections);
		return connections.map((connection, plid) =>
			<tr key={Vm.IViewPlayerConnection.DisplayName(connection.Nickname, plid)}>
				<td className={plid === localPlid ? "bold" : ""}>
					{connection.Nickname}
				</td>
				<td className={plid === localPlid ? "bold" : ""}>
					{plid}
				</td>
				<td>
					{this.renderAdditionalInfo(numConnected, connection, plid)}
				</td>
				<td>
					{this.renderNextTurnButton(plid)}
				</td>
			</tr>
		);
	}
	public renderAdditionalInfo(numConnected: number, connection: Vm.IViewPlayerConnection, plid: number): React.ReactNode
	{
		if (connection.IsConnected)
		{
			return this.renderStartButton(numConnected, plid);
		}
		else
		{
			return "Disconnected";
		}
	}
	public renderStartButton(numConnected: number, plid: number): React.ReactNode
	{
		if (this.props.Connections[plid].IsHost) // local player is host
		{
			return <button
				disabled={plid !== this.props.LocalPlid || numConnected < Shared.MinPlayers}
				onClick={this.props.onClickStartGame}
			>
				Start New Game
			</button>;
		}
		else
		{
			return "";
		}
	}
	public renderNextTurnButton(plid: number): React.ReactNode
	{
		if (this.props.Connections[plid].IsHost) // local player is host
		{
			return <button
				disabled={plid !== this.props.LocalPlid || !this.props.ActiveGame}
				onClick={this.props.onClickForceNextTurn}
			>
				Force Next Turn
			</button>;
		}
		else
		{
			return "";
		}
	}
}

export default MembersComp;
