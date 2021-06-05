/** The component that lets players message eachother. */

import * as React from 'react';
import * as Vm from "./viewmodel";
import * as Shared from './shared';
import './Attacks.css';
import './Main.css';

export interface IActionsProps
{
	data: Vm.IViewData;
	onAttackChanged: (plid: number, delta: number) => void;
}

function onAttackChanged(e: React.MouseEvent<HTMLButtonElement>, props: IActionsProps, delta: number): void
{
	const { element, targetPlid } = getInputElementFor(e.currentTarget);
	let value = parseInt(element.value, 10);

	props.onAttackChanged(targetPlid, delta);
}
function getInputElementFor(e: HTMLButtonElement): { element: HTMLInputElement, targetPlid: number }
{
	const div = e.parentElement as HTMLDivElement;
	const element = div.querySelector(`input`) as HTMLInputElement;
	const targetPlid = plidFromDivId(div.id);
	return { element, targetPlid, };
}
function attackDivIdFromPlid(plid: number): string
{
	return "attack-div-" + plid;
}
function tradeDivIdFromPlid(plid: number): string
{
	return "trade-div-" + plid;
}
function plidFromDivId(divId: string): number
{
	const strings = divId.split('-');
	const plidString = strings[strings.length - 1];
	return parseInt(plidString, 10);
}
function trade(e: React.MouseEvent<HTMLButtonElement>): void 
{
	// let newAction = Shared.Trade.ActionCooperate;
	// const plid = parseInt(e.currentTarget.value, 10);
	// if (state.Trades[plid] === Shared.Trade.ActionCooperate)
	// {
	// 	newAction = Shared.Trade.ActionDefect;
	// }
	// else
	// {
	// 	newAction = Shared.Trade.ActionCooperate;
	// }
	// e.currentTarget.innerHTML = getButtonText(newAction);

	// const newState = [...state.Trades];
	// newState[plid] = newAction;
	// setState({ Trades: newState });
}
function getButtonText(tradeAction: number): string
{
	return tradeAction === Shared.Trade.ActionCooperate ? "Trade" : "Steal";
}
function renderCommerceButtons(localOrder: number, order: number, plid: number): React.ReactNode
{
	// if (order === localOrder - 1 || order === localOrder + 1)
	// {
	// 	return <div id={tradeDivIdFromPlid(plid)} className="attack-container">
	// 		<button value={plid} onClick={trade.bind(this)}>{getButtonText(state.Trades[plid])}</button>
	// 	</div>;
	// }
	return null;
}
function renderRows(props: IActionsProps): React.ReactNode
{
	const attacks = props.data.Game.LatestEra.LatestTurn.Players[props.data.LocalPlid].MilitaryAttacks;
	const def = props.data.Game.Settings.EraStartMilitary;

	return props.data.Game.LatestEra.Order.map((renderPlid, renderOrder) =>
		<tr>
			<td className={renderPlid === props.data.LocalPlid ? "bold" : ""}>
				{Vm.IViewPlayerConnection.DisplayName(props.data.Nicknames[renderPlid], renderPlid)}
			</td>
			<td className="text-center">
				{
					renderPlid === props.data.LocalPlid ? "You" :
						<div id={attackDivIdFromPlid(renderPlid)} className="attack-container">
							<button onClick={(e): void => onAttackChanged(e, props, -1)}>-</button>
							<input
								className="attack-input"
								disabled
								data-value
								type="number"
								value={Shared.IPlidMap.TryGet(attacks, renderPlid, def)}
							/>
							<button onClick={(e): void => onAttackChanged(e, props, +1)}>+</button>
						</div>
				}
			</td>
			<td>
				{/* {renderCommerceButtons(props, renderPlid)} */}
			</td>
		</tr >
	);
}
export function renderActions(props: IActionsProps): React.ReactNode
{
	return (
		<fieldset disabled={false} className="fieldset">
			<table >
				<tbody>
					<tr>
						<th>Name</th>
						<th>Attacks</th>
						<th>Commerce</th>
					</tr>
					{renderRows(props)}
				</tbody>
			</table >
		</fieldset>
	);
}

