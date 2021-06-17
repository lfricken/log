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
	onMilitaryChanged: (delta: number) => void;
	onTradeChanged: (plidToModify: number, plidToTrade: number) => void;
	onTurnDone: () => void;
}
export function renderActions(props: IActionsProps): React.ReactNode
{
	let lockAll = false;
	const game = props.Data.Game;
	if (game !== null)
	{
		lockAll = lockAll || game.IsOver;
		const localPlayer = game.LatestEra.LatestTurn.Players[props.Data.LocalPlid];
		if (localPlayer !== null && localPlayer !== undefined)
			lockAll = lockAll || localPlayer.IsDone;
	}

	return (
		<fieldset disabled={lockAll} className="fieldset">
			<table >
				<tbody>
					<tr>
						<th>Name</th>
						<th>Attacks</th>
						<th>Commerce</th>
						<th>{Shared.MilitaryIcon}{Shared.MilitaryIcon}</th>
						<th>{Shared.MoneyIcon}{Shared.MoneyIcon}{Shared.MoneyIcon}</th>
						<th>{Shared.ScoreIcon}</th>
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
			{renderName(props, renderPlid)}
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
function renderName(props: IActionsProps, renderPlid: number): React.ReactNode
{
	const game = props.Data.Game;
	const renderPlayer = game.LatestEra.LatestTurn.Players[renderPlid];
	let classes = "no-wrap";
	classes += (renderPlid === props.Data.LocalPlid ? " bold" : "");
	classes += (renderPlayer.IsDead ? " name-dead" : "");
	return <td className={classes}>
		{Vm.IViewPlayerConnection.DisplayName(props.Data.Nicknames[renderPlid], renderPlid)}
	</td>;
}
function renderScore(props: IActionsProps, renderPlid: number): React.ReactNode
{
	return props.Data.Game.LatestEra.LatestTurn.Players[renderPlid].Score;
}
function renderMilitary(props: IActionsProps, renderPlid: number): React.ReactNode
{
	const renderPlayer = props.Data.Game.LatestEra.LatestTurn.Players[renderPlid];
	let modifier = 0;
	if (renderPlid === props.Data.LocalPlid)
	{
		modifier = Shared.Military.GetTotalAttacks(renderPlayer.MilitaryAttacks);
	}
	return renderPlayer.Military - modifier;
}
function renderMoney(props: IActionsProps, renderPlid: number): React.ReactNode
{
	const player = props.Data.Game.LatestEra.LatestTurn.Players[renderPlid];
	const playerMoney = parseInt(player.Money);
	if (isNaN(playerMoney))
		return "?";
	else
		return playerMoney - player.MilitaryDelta;
}
function renderDone(props: IActionsProps, renderPlid: number): React.ReactNode
{
	if (renderPlid === props.Data.LocalPlid)
	{
		return <button onClick={(): void => props.onTurnDone()}>
			Done
		</button>;
	}
	else
	{
		return (props.Data.Game.LatestEra.LatestTurn.Players[renderPlid].IsDone ? "Yes" : "No");
	}
}
function renderCommerceButtons(props: IActionsProps, renderOrder: number, renderPlid: number): React.ReactNode
{
	const game = props.Data.Game;
	const localPlid = props.Data.LocalPlid;
	if (IMap.Has(game.LatestEra.LatestTurn.Players, localPlid)) // this player is in the game
	{
		const localOrder = props.Data.LocalOrder;
		const localPlayer = game.LatestEra.LatestTurn.Players[localPlid];
		const renderPlayer = game.LatestEra.LatestTurn.Players[renderPlid];
		const adjacentOrders = Vm.IViewEra.GetAdjacentOrders(localOrder, IMap.Length(game.LatestEra.LatestTurn.Players));
		if (adjacentOrders.indexOf(renderOrder) !== -1)
		{
			return <div className="attack-container">
				<button
					disabled={renderPlayer.IsDead}
					onClick={(): void => props.onTradeChanged(props.Data.LocalPlid, renderPlid)}
				>
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

	let subtract: () => void;
	let add: () => void;
	let value: number;

	if (renderPlid === props.Data.LocalPlid)
	{
		value = players[localPlid].MilitaryDelta;
		subtract = (): void => props.onMilitaryChanged(-1);
		add = (): void => props.onMilitaryChanged(+1);
	}
	else if (!IMap.Has(players, localPlid))
	{
		return "?";
	}
	else
	{
		value = players[localPlid].MilitaryAttacks[renderPlid];
		subtract = (): void => props.onAttackChanged(localPlid, renderPlid, -1);
		add = (): void => props.onAttackChanged(localPlid, renderPlid, +1);
	}
	const renderPlayer = game.LatestEra.LatestTurn.Players[renderPlid];
	return <div className="attack-container no-wrap">
		<button disabled={renderPlayer.IsDead}
			onClick={subtract}>-</button>
		<input
			className="attack-input"
			disabled
			data-value
			type="number"
			value={value}
		/>
		<button
			disabled={renderPlayer.IsDead}
			onClick={add}>+</button>
	</div>;
}
function getTradeButtonText(tradeAction: number): string
{
	return tradeAction === Shared.Trade.ActionDefect ? "Steal" : "Trade";
}
function getSelfText(): string
{
	return "You";
}

