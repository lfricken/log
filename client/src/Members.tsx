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
	public renderAdditionalInfo(connection: Vm.ViewPlayerConnection): React.ReactNode
	{
		if (connection.IsConnected)
		{
			if (connection.IsLobbyLeader)
			{
				return "Leader";
			}
		}
		else
		{
			return "Disconnected";
		}
	}
	public renderMemberList(connections: Vm.ViewPlayerConnection[]): React.ReactNode
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
			</tr>
		);
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
					</tr>
					{this.renderMemberList(connections)}
				</tbody>
			</table >
		);
	}
}

export default MembersComp;
