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
	connections: Vm.ViewPlayerConnection[];
	localPlid: number;
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
	public renderMemberList(connections: Vm.ViewPlayerConnection[], localPlid: number): React.ReactNode
	{
		return connections.map((connection, plid) =>
			<tr>
				<td>
					{connection.Nickname}
				</td>
				<td>
					{plid}
				</td>
				<td>
					{this.renderAdditionalInfo(connection)}
				</td>
				<td>
					{this.renderAction(connection, plid, localPlid)}
				</td>
			</tr>
		);
	}
	public renderAdditionalInfo(connection: Vm.ViewPlayerConnection): React.ReactNode
	{
		if (connection.IsConnected)
		{
			if (connection.IsHost)
			{
				return "Leader";
			}
		}
		else
		{
			return "Disconnected";
		}
	}
	public renderAction(connection: Vm.ViewPlayerConnection, plid: number, localPlid: number): React.ReactNode
	{
		if (connection.IsHost && plid === localPlid) // local player is host
		{
			return <button onClick={this.handleClick}> Start Game </button>;
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
