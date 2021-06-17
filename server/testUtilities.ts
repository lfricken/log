/** Wire up ViewModel events events to Models. View (Viewmodel Model) */

import * as Shared from "../client/src/shared";
import { IMap } from "../client/src/shared";
import * as Models from "./model";

export function name(plid: number): string
{
	return "name" + plid;
}
export function uid(plid: number): string
{
	return "uid" + plid;
}
export function lid(): string
{
	return "lid";
}

export function setupLobby(settings: Shared.IGameSettings, players: number): Models.Lobby
{
	const l = new Models.Lobby(lid());
	for (let i = 0; i < players + 1; ++i)
	{
		l.GetConnection(uid(i), name(i));
	}
	IMap.Get(l.PlayerConnections, uid(0)).IsConnected = false;
	l.ConsiderNewLobbyLeader();
	l.CreateNewGame(settings);
	testLatestEra(settings, l.Game!, players);
	return l;
}

export function testLatestEra(settings: Shared.IGameSettings, g: Models.Game, numPlayersExpected: number): void
{
	const era = g.LatestEra;

	// there should be an order definition for each player
	expect(era.Order.length).toBe(numPlayersExpected);
	// only 1 turn
	expect(era.Turns.length).toBe(1);
	// should not be over
	expect(era.IsOver).toBe(false);
	// should have a positive idx
	expect(era.Number).toBeGreaterThanOrEqual(0);

	// new era turn 0 should start with no dead
	expect(era.LatestTurn.NumDead).toBe(0);

	const prevPlids = [];
	for (const player of IMap.Values(era.LatestTurn.Players))
	{
		// expect start of game money
		expect(player.Money).toBe(settings.EraStartMoney);
		// expect start of game military
		expect(player.Military).toBe(settings.EraStartMilitary);
		// no initial attacks
		expect(IMap.Length(player.MilitaryAttacks)).toBe(numPlayersExpected);
		// no initial trades
		expect(IMap.Length(player.Trades)).toBe(numPlayersExpected);
		// expect not dead
		expect(player.IsDead).toBe(false);
		// no negative score
		expect(player.Score).toBeGreaterThanOrEqual(0);
		// should have a positive idx
		expect(player.Plid).toBeGreaterThanOrEqual(0);
		// all unique plids
		expect(prevPlids.includes(player.Plid)).toBe(false);
		prevPlids.push(player.Plid);
	}
}
