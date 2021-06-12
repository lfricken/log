/** The component that lets players message eachother. */

import * as React from 'react';
import * as Vm from "./viewmodel";
import * as Shared from './shared';
import './Attacks.css';
import './Main.css';
import { IMap } from './shared';

interface IActionsProps
{
	Data: Vm.IViewData;
	onAttackChanged: (plidToModify: number, plidToAttack: number, delta: number) => void;
	onTradeChanged: (plidToModify: number, plidToTrade: number) => void;
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
function renderRows(props: IActionsProps): React.ReactNode
{
	const localOrder = props.Data.LocalOrder;
	const localPlid = props.Data.LocalPlid;
	const game = props.Data.Game;
	const players = game.LatestEra.LatestTurn.Players;
	const attacks = players[localPlid].MilitaryAttacks;

	return game.LatestEra.Order.map((renderPlid, renderOrder) =>
		<tr key={`${game.LatestEra.LatestTurn.Number}_${renderPlid}`}>
			<td className={renderPlid === props.Data.LocalPlid ? "bold" : ""}>
				{Vm.IViewPlayerConnection.DisplayName(props.Data.Nicknames[renderPlid], renderPlid)}
			</td>
			<td className="text-center">
				{
					renderPlid === props.Data.LocalPlid ? getSelfText() :
						<div className="attack-container">
							<button onClick={(): void => props.onAttackChanged(localPlid, renderPlid, -1)}>-</button>
							<input
								className="attack-input"
								disabled
								data-value
								type="number"
								value={attacks[renderPlid]}
							/>
							<button onClick={(): void => props.onAttackChanged(localPlid, renderPlid, +1)}>+</button>
						</div>
				}
			</td>
			<td>
				{renderCommerceButtons(props, localOrder, renderOrder, renderPlid)}
			</td>
		</tr >
	);
}
function renderCommerceButtons(props: IActionsProps, localOrder: number, renderOrder: number, renderPlid: number): React.ReactNode
{
	const localPlid = props.Data.LocalPlid;
	const localPlayer = props.Data.Game.LatestEra.LatestTurn.Players[localPlid];
	const adjacentOrders = Vm.IViewEra.GetAdjacentOrders(localOrder, IMap.Length(props.Data.Game.LatestEra.LatestTurn.Players));
	if (adjacentOrders.indexOf(renderOrder) !== -1)
	{
		return <div className="attack-container">
			<button onClick={(): void => props.onTradeChanged(props.Data.LocalPlid, renderPlid)}>
				{getTradeButtonText(localPlayer.Trades[renderPlid])}
			</button>
		</div>;
	}
	return null;
}
function getTradeButtonText(tradeAction: number): string
{
	return tradeAction === Shared.Trade.ActionDefect ? "Steal" : "Trade";
}
function getSelfText(): string
{
	return "You";
}

