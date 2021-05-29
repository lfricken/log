/* eslint-disable no-magic-numbers */

import * as real from "../client/src/viewmodel";
import * as Util from "./testUtilities";

test('Targetted message gets sockets.', () =>
{

});

test('Models exist.', () =>
{
	const numPlayers = 3;
	const g = Util.setupGame(numPlayers);

	{
		const localPlid = 1;
		const vm = g.ToVm(localPlid);

		// exists
		expect(vm).toBeTruthy();
		expect(vm.LatestEra).toBeTruthy();
		expect(vm.PlayerConnections).toBeTruthy();

		// player connections setup properly
		expect(vm.PlayerConnections.length).toBe(numPlayers);
		// starting public player traits
		vm.PlayerConnections.forEach((player, i) =>
		{
			expect(player.Nickname).toBe(Util.name(i));
		});

		// latest era 
		expect(vm.LatestEra.Number).toBe(0);
		expect(vm.LatestEra.Order.length).toBe(numPlayers);

		// latest turn exists
		expect(vm.LatestEra.LatestTurn).toBeTruthy();


		expect(vm.LatestEra.LatestTurn.Number).toBe(0);
		expect(vm.LatestEra.LatestTurn.Players.length).toBe(numPlayers);
		vm.LatestEra.LatestTurn.Players.forEach((player, i) =>
		{
			expect(player.Score).toBe(0);
			expect(player.Plid).toBe(i);
			expect(player.Military).toBe(0);
		});


		// local player
		{
			expect(vm.LatestEra.LatestTurn.LocalPlayer).toBeTruthy();
			expect(vm.LatestEra.LatestTurn.LocalPlayer.Money).toBe(10);
			expect(vm.LatestEra.LatestTurn.LocalPlayer.Military).toBe(0);
			expect(vm.LatestEra.LatestTurn.LocalPlayer.MilitaryAttacks.size).toBe(0);
			expect(vm.LatestEra.LatestTurn.LocalPlayer.MilitaryDelta).toBe(0);
			expect(vm.LatestEra.LatestTurn.LocalPlayer.Plid).toBe(localPlid);
			expect(vm.LatestEra.LatestTurn.LocalPlayer.Score).toBe(0);
			expect(vm.LatestEra.LatestTurn.LocalPlayer.Trades.size).toBe(0);
		}
	}
});

