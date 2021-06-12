/* eslint-disable no-magic-numbers */

import * as real from "../client/src/viewmodel";
import * as Util from "./testUtilities";
import * as Shared from "../client/src/shared";
import { IMap } from "../client/src/shared";

test('Targetted message gets sockets.', () =>
{

});

test('Models exist.', () =>
{
	const numPlayers = 3;
	const settings = Shared.GetSettings(Shared.SettingConfig.Default);
	const l = Util.setupLobby(settings, numPlayers);

	{
		const localPlid = 1;
		const lVm = l.ToVm(localPlid);
		const gVm = lVm.Game!;
		// exists
		expect(gVm).toBeTruthy();
		expect(gVm.LatestEra).toBeTruthy();
		expect(lVm.PlayerConnections).toBeTruthy();

		// player connections setup properly
		expect(lVm.PlayerConnections.length).toBe(numPlayers);
		// starting public player traits
		lVm.PlayerConnections.forEach((player, i) =>
		{
			expect(player.Nickname).toBe(Util.name(i));
		});

		// latest era 
		expect(gVm.LatestEra.Number).toBe(0);
		expect(gVm.LatestEra.Order.length).toBe(numPlayers);

		// latest turn exists
		expect(gVm.LatestEra.LatestTurn).toBeTruthy();


		expect(gVm.LatestEra.LatestTurn.Number).toBe(0);
		expect(IMap.Length(gVm.LatestEra.LatestTurn.Players)).toBe(numPlayers);
		for (const kvp of IMap.Kvp(gVm.LatestEra.LatestTurn.Players))
		{
			const player = kvp.v;
			expect(player.Score).toBe(0);
			expect(player.Plid).toBe(kvp.k);
			expect(player.Military).toBe(0);
		}


		// local player
		{
			const player = gVm.LatestEra.LatestTurn.Players[localPlid];
			expect(player).toBeTruthy();
			expect(player.Money).toBe((10).toString());
			expect(player.Military).toBe(0);

			for (const x in player.MilitaryAttacks)
			{
				x.length;
			}
			const y = { test: "val" };
			for (const x in y)
			{
				x.length;
			}

			const len = IMap.Length(player.MilitaryAttacks);
			expect(len).toBe(numPlayers);
			expect(IMap.Length(player.Trades)).toBe(numPlayers);
			expect(player.MilitaryDelta).toBe(0);
			expect(player.Plid).toBe(localPlid);
			expect(player.Score).toBe(0);
		}
	}
});

