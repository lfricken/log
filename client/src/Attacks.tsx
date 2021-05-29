/** The component that lets players message eachother. */

import * as React from 'react';
import * as ViewModel from "./viewmodel";
import './Attacks.css';
import './Main.css';

const AttackMin = 0;
const AttackMax = 9;
interface Props
{
	turnNumber: number;
	/** Order > Plid */
	order: number[];
	/** Plid > Nickname */
	nicknames: string[];
	/** Plid > Attack */
	onAttackChange: (attacks: number[]) => void;
}
interface State
{
	/** Plid > Attack */
	Attacks: number[];
}
export class AttacksComp extends React.Component<Props, State>
{
	state!: State;

	constructor(props: Props)
	{
		super(props);
		const Attacks = new Array<number>();
		for (const _ of props.order)
			Attacks.push(0);
		this.state = { Attacks };
	}
	componentDidMount(): React.ReactNode
	{
		return null;
	}
	public increase(e: React.MouseEvent<HTMLButtonElement>): void { this.applyDelta(e, +1); }
	public decrease(e: React.MouseEvent<HTMLButtonElement>): void { this.applyDelta(e, -1); }
	public applyDelta(e: React.MouseEvent<HTMLButtonElement>, delta: number): void
	{
		const { element, targetPlid } = this.getInputElementFor(e.currentTarget);
		let value = parseInt(element.value, 10);

		value += delta;
		if (value < AttackMin)
			value = AttackMin;
		else if (value > AttackMax)
			value = AttackMax;

		element.value = value.toString();

		// now update state
		const Attacks = [...this.state.Attacks]; // shallow copy
		Attacks[targetPlid] = value;
		this.setState({ Attacks });
		this.props.onAttackChange(Attacks);
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
		const { Attacks } = this.state;

		const attackRows = this.props.order.map((plid, order) =>
			<tr>
				<td>
					{ViewModel.ViewPlayerConnection.DisplayName(this.props.nicknames[plid], plid)}
				</td>
				<td>
					<div id={this.divIdFromPlid(plid)} className="attack-container">
						<button onClick={this.decrease.bind(this)}>-</button>
						<input className="attack-input" disabled data-value type="number" value={Attacks[plid]} />
						<button onClick={this.increase.bind(this)}>+</button>
					</div>
				</td>
			</tr>
		);

		return (
			<table>
				<tbody>
					<tr>
						<th>Name</th>
						<th>Attacks</th>
					</tr>
					{attackRows}
				</tbody>
			</table >
		);
	}
}


export default AttacksComp;