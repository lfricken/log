/** The component that lets players message eachother. */

import * as React from 'react';
import $ from 'jquery';
import * as ViewModel from "./viewmodel";
import * as Shared from "./shared";
import * as View from "./view";
import './Attacks.css';
import './Main.css';

const AttackMin = 0;
const AttackMax = 10;
interface Props
{

}
interface State
{

}
export class AttacksComp extends React.Component<Props, State>
{

	state!: State;

	constructor(props: Props)
	{
		super(props);
		this.state = {};
	}
	componentDidMount(): React.ReactNode
	{
		return null;
	}
	public increase(e: React.MouseEvent): void
	{
		const input = $(e.target).parent().find('[data-value]');

		var value = input.val() as number;
		if (value < AttackMax)
			value++;

		if (value > AttackMax)
			value = AttackMax;

		input.val(value);
	}
	public decrease(e: React.MouseEvent): void
	{
		const input = $(e.target).parent().find('[data-value]');

		var value = input.val() as number;
		if (value > AttackMin)
			value--;

		if (value < AttackMin)
			value = AttackMin;

		input.val(value);
	}
	render(): React.ReactNode
	{
		const { } = this.state;
		const defaultVal = 0;

		return (
			<div className="">
				<div className="container">
					<button onClick={this.decrease.bind(this)}>-</button>
					<input disabled data-value type="number" value={defaultVal} />
					<button onClick={this.increase.bind(this)}>+</button>
				</div>
			</div>
		);
	}
}

export default AttacksComp;