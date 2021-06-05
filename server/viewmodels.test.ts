/* eslint-disable no-magic-numbers */

import * as real from "../client/src/viewmodel";
import * as Util from "./testUtilities";
import * as Shared from "../client/src/shared";

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
		expect(gVm.LatestEra.LatestTurn.Players.length).toBe(numPlayers);
		gVm.LatestEra.LatestTurn.Players.forEach((player, i) =>
		{
			expect(player.Score).toBe(0);
			expect(player.Plid).toBe(i);
			expect(player.Military).toBe(0);
		});


		// local player
		{
			const player = gVm.LatestEra.LatestTurn.Players[localPlid];
			expect(player).toBeTruthy();
			expect(player.Money).toBe(10);
			expect(player.Military).toBe(0);

			for (const x in player.MilitaryAttacks)
			{
				expect(x).toBe("a");
			}

			expect(player.MilitaryAttacks).toBe(numPlayers);
			expect(player.Trades).toBe(numPlayers);
			expect(player.MilitaryDelta).toBe(0);
			expect(player.Plid).toBe(localPlid);
			expect(player.Score).toBe(0);
		}
	}
});

