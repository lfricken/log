/** The component that lets players message eachother. */

import * as React from 'react';
import * as ViewModel from "./viewmodel";
import * as Shared from "./shared";
import * as View from "./view";
import './Attacks.css';
import './Main.css';

const AttackMin = 0;
const AttackMax = 9;
interface Props
{
	playerNames: string[];
	onAttackChange: (attacks: number[]) => void;
}
interface State
{
	Attacks: number[];
}
export class AttacksComp extends React.Component<Props, State>
{
	state!: State;

	constructor(props: Props)
	{
		super(props);
		const Attacks = new Array<number>();
		for (var i = 0; i < props.playerNames.length; i++)
		{
			Attacks.push(0);
		}
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
		const { element, targetIdx } = this.getInputFor(e.currentTarget);
		var value = parseInt(element.value, 10);

		value += delta;
		if (value < AttackMin)
			value = AttackMin;
		else if (value > AttackMax)
			value = AttackMax;

		element.value = value.toString();

		// now update state
		const Attacks = [...this.state.Attacks]; // shallow copy
		Attacks[targetIdx] = value;
		this.setState({ Attacks });
		this.props.onAttackChange(Attacks);
	}
	public getInputFor(e: HTMLButtonElement): { element: HTMLInputElement, targetIdx: number }
	{
		const div = e.parentElement as HTMLDivElement;
		const element = div.querySelector(`input`) as HTMLInputElement;
		const names = div.id.split('-');
		const numId = names[names.length - 1];
		const targetIdx = parseInt(numId, 10);
		return { element, targetIdx };
	}
	render(): React.ReactNode
	{
		const { Attacks } = this.state;

		const attackDivList = this.props.playerNames.map((name, idx) =>
			<tr>
				<td>
					{name}
				</td>
				<td>
					<div id={"attack-div-" + idx} className="attack-container">
						<button onClick={this.decrease.bind(this)}>-</button>
						<input className="attack-input" disabled data-value type="number" value={Attacks[idx]} />
						<button onClick={this.increase.bind(this)}>+</button>
					</div>
				</td>
			</tr>
		);

		return (
			<table>
				<tr>
					<th>Name</th>
					<th>Attacks</th>
				</tr>
				{attackDivList}
			</table >
		);
	}
}


export default AttacksComp;