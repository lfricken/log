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
}
interface State
{

}
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
	public getInputElementFor(e: HTMLButtonElement): { element: HTMLInputElement, targetPlid: number }
	{
		const div = e.parentElement as HTMLDivElement;
		const element = div.querySelector(`input`) as HTMLInputElement;
		const targetPlid = this.plidFromDivId(div.id);
		return { element, targetPlid, };
	}
	public divIdFromPlid(plid: number): string
	{
		return "attack-div-" + plid;
	}
	public plidFromDivId(divId: string): number
	{
		const strings = divId.split('-');
		const plidString = strings[strings.length - 1];
		return parseInt(plidString, 10);
	}
	render(): React.ReactNode
	{
		const { connections } = this.props;

		const connectionsRows = connections.map((connection, plid) =>
			<tr>
				<td>
					{Vm.ViewPlayerConnection.DisplayName(connection.Nickname, plid)}
				</td>
				<td>
					<div id={this.divIdFromPlid(plid)} className="attack-container">

					</div>
				</td>
				<td>
					no{ }
				</td>
			</tr>
		);

		return (
			<table>
				<tbody>
					<tr>
						<th>Name</th>
						<th>ID</th>
						<th>Leader?</th>
					</tr>
					{connectionsRows}
				</tbody>
			</table >
		);
	}
}


export default MembersComp;