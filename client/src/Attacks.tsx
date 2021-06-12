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
	onTurnDone: () => void;
}
export function renderActions(props: IActionsProps): React.ReactNode
{
	let lockAll = false;
	const game = props.Data.Game;
	if (game !== null)
	{
		const localPlayer = game.LatestEra.LatestTurn.Players[props.Data.LocalPlid];
		if (localPlayer !== null && localPlayer !== undefined)
			lockAll = localPlayer.IsDone;
	}

	return (
		<fieldset disabled={lockAll} className="fieldset">
			<table >
				<tbody>
					<tr>
						<th>Name</th>
						<th>Attacks</th>
						<th>Commerce</th>
						<th>Military</th>
						<th>Money</th>
						<th>Score</th>
						<th>Done?</th>
					</tr>
					{renderRows(props)}
				</tbody>
			</table >
		</fieldset>
	);
}
function renderRows(props: IActionsProps): React.ReactNode
{
	const era = props.Data.Game.LatestEra;

	return era.Order.map((renderPlid, renderOrder) =>
		<tr key={`${era.LatestTurn.Number}_${renderPlid}`}>
			<td className={renderPlid === props.Data.LocalPlid ? "bold" : ""}>
				{Vm.IViewPlayerConnection.DisplayName(props.Data.Nicknames[renderPlid], renderPlid)}
			</td>
			<td className="text-center">
				{renderAttacks(props, renderPlid)}
			</td>
			<td>
				{renderCommerceButtons(props, renderOrder, renderPlid)}
			</td>
			<td>
				{renderMilitary(props, renderPlid)}
			</td>
			<td>
				{renderMoney(props, renderPlid)}
			</td>
			<td>
				{renderScore(props, renderPlid)}
			</td>
			<td>
				{renderDone(props, renderPlid)}
			</td>
		</tr>
	);
}
function renderScore(props: IActionsProps, renderPlid: number): React.ReactNode
{
	return props.Data.Game.LatestEra.LatestTurn.Players[renderPlid].Score;
}
function renderMilitary(props: IActionsProps, renderPlid: number): React.ReactNode
{
	return props.Data.Game.LatestEra.LatestTurn.Players[renderPlid].Military;
}
function renderMoney(props: IActionsProps, renderPlid: number): React.ReactNode
{
	return props.Data.Game.LatestEra.LatestTurn.Players[renderPlid].Money;
}
function renderDone(props: IActionsProps, renderPlid: number): React.ReactNode
{
	return (props.Data.Game.LatestEra.LatestTurn.Players[renderPlid].IsDone ? "Done" : " ");
}
function renderCommerceButtons(props: IActionsProps, renderOrder: number, renderPlid: number): React.ReactNode
{
	const game = props.Data.Game;
	const localPlid = props.Data.LocalPlid;
	if (IMap.Has(game.LatestEra.LatestTurn.Players, localPlid)) // this player is in the game
	{
		const localOrder = props.Data.LocalOrder;
		const localPlayer = game.LatestEra.LatestTurn.Players[localPlid];
		const adjacentOrders = Vm.IViewEra.GetAdjacentOrders(localOrder, IMap.Length(game.LatestEra.LatestTurn.Players));
		if (adjacentOrders.indexOf(renderOrder) !== -1)
		{
			return <div className="attack-container">
				<button onClick={(): void => props.onTradeChanged(props.Data.LocalPlid, renderPlid)}>
					{getTradeButtonText(localPlayer.Trades[renderPlid])}
				</button>
			</div>;
		}
	}
	return null; // player not in the game
}
function renderAttacks(props: IActionsProps, renderPlid: number): React.ReactNode
{
	const localPlid = props.Data.LocalPlid;
	const game = props.Data.Game;
	const players = game.LatestEra.LatestTurn.Players;

	if (renderPlid === props.Data.LocalPlid)
		return getSelfText();
	else if (!IMap.Has(players, localPlid))
	{
		return "?";
	}
	else
	{
		const attacks = players[localPlid].MilitaryAttacks;
		return <div className="attack-container">
			<button onClick={(): void => props.onAttackChanged(localPlid, renderPlid, -1)}>-</button>
			<input
				className="attack-input"
				disabled
				data-value
				type="number"
				value={attacks[renderPlid]}
			/>
			<button onClick={(): void => props.onAttackChanged(localPlid, renderPlid, +1)}>+</button>
		</div>;
	}
}
function getTradeButtonText(tradeAction: number): string
{
	return tradeAction === Shared.Trade.ActionDefect ? "Steal" : "Trade";
}
function getSelfText(): string
{
	return "You";
}

