/** Wire up ViewModel events events to Models. View (Viewmodel Model) */

import * as Shared from "../client/src/shared";
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
export const defaultSettings = Shared.GetSettings(Shared.SettingConfig.Default);

export function setupLobby(players: number): Models.Lobby
{
	const l = new Models.Lobby(lid());
	for (let i = 0; i < players; ++i)
	{
		l.GetConnection(uid(i), name(i));
	}
	l.ConsiderNewLobbyLeader();
	l.CreateNewGame(defaultSettings);
	testLatestEra(l.Game!);
	return l;
}

export function testLatestEra(g: Models.Game): void
{
	const era = g.LatestEra;

	// there should be an order definition for each player
	expect(era.Order.length).toBe(era.LatestTurn.Players.size);
	// only 1 turn
	expect(era.Turns.length).toBe(1);
	// should not be over
	expect(era.IsOver).toBe(false);
	// should have a positive idx
	expect(era.Number).toBeGreaterThanOrEqual(0);

	// new era turn 0 should start with no dead
	expect(era.LatestTurn.NumDead).toBe(0);

	const prevPlids = [];
	for (const player of era.LatestTurn.Players.values())
	{
		// expect start of game money
		expect(player.Money).toBe(defaultSettings.EraStartMoney);
		// expect start of game military
		expect(player.Military).toBe(defaultSettings.EraStartMilitary);
		// no initial attacks
		expect(player.MilitaryAttacks.size).toBe(0);
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
