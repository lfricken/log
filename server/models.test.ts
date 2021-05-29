/* eslint-disable no-magic-numbers */

// https://stackoverflow.com/q/35987055/2167822


import * as Shared from "../client/src/shared";
import * as Models from "./model";
import * as Util from "./testUtilities";


test('GetConnection adds a player', () =>
{
	const g = Util.setupGame(1);
	// setup game should automatically add 1 player
	expect(g.LatestEra.LatestTurn.Players.length).toBe(1);

	const c1 = g.GetConnection(Util.uid(1), Util.name(1));
	// get connection automatically adds aother new player
	expect(g.LatestEra.LatestTurn.Players.length).toBe(2);

	// uid was not preexisting, so it should be a new player
	expect(c1.isNewPlayer).toBe(true);
});

test('New Lobby Leader', () =>
{
	const g = Util.setupGame(2);

	const c0 = g.GetConnection(Util.uid(0), Util.name(0));
	const c1 = g.GetConnection(Util.uid(1), Util.name(1));
	expect(g.LatestEra.LatestTurn.Players.length).toBe(2);

	// uid was preexisting, so it should not be a new player
	expect(c0.isNewPlayer).toBe(false);
	expect(c0.connection.IsLobbyLeader).toBe(true);

	// uid was preexisting, so it should not be a new player
	expect(c1.isNewPlayer).toBe(false);
	expect(c1.connection.IsLobbyLeader).toBe(false);

	// sticks with the same leader
	let leaderName = "";
	leaderName = g.ConsiderNewLobbyLeader();
	expect(leaderName).toBe(c0.connection.DisplayName);
	expect(c0.connection.IsLobbyLeader).toBe(true);
	expect(c1.connection.IsLobbyLeader).toBe(false);

	// picks a new leader
	c0.connection.IsConnected = false;
	leaderName = g.ConsiderNewLobbyLeader();
	expect(leaderName).toBe(c1.connection.DisplayName);
	expect(c0.connection.IsLobbyLeader).toBe(false);
	expect(c1.connection.IsLobbyLeader).toBe(true);
});

test('Models Created', () =>
{
	const g = Util.setupGame(1);

	// get connection automatically adds a new player
	const c0 = g.GetConnection(Util.uid(0), Util.name(0));
	expect(g.LatestEra.LatestTurn.Players.length).toBe(1);

	// uid was preexisting, so it should not be a new player
	expect(c0.isNewPlayer).toBe(false);
	// player id should reflect join order
	expect(c0.connection.Plid).toBe(0);
	// should not have a socket id yet because the caller needs to assign that
	expect(c0.connection.SocketId).toBe("");
	// first player should be lobby leader
	expect(c0.connection.IsLobbyLeader).toBe(true);
	// new player should default to connected
	expect(c0.connection.IsConnected).toBe(true);
	// should have the name we gave them
	expect(c0.connection.Nickname).toBe(Util.name(0));
});

test('New Turn', () =>
{
	const delta = 2;
	const startMoney = 7;
	const startMilMoney = 5;
	const settings = Models.GetSettings(Models.SettingConfig.Default);

	// new turn, 0
	const g = Util.setupGame(2);
	{
		expect(g.LatestEra.IsOver).toBe(false);
		const t = g.LatestEra.LatestTurn;


		const p0 = t.Players[0];
		const p1 = t.Players[1];

		// expect start of game money
		expect(p0.Money).toBe(settings.EraStartMoney);
		// expect start of game money
		expect(p1.Money).toBe(settings.EraStartMoney);


		p0.Money = startMoney;
		p0.Military = startMilMoney;
	}

	// new turn, 1
	{
		const prevEra = g.LatestEra;
		g.EndTurn();
		const t = g.LatestEra.LatestTurn;
		const p0 = t.Players[0];

		// nobody died so the era should not end
		expect(g.LatestEra.Number).toBe(prevEra.Number);

		// no military delta
		expect(p0.Money).toBe(startMoney);
		expect(p0.Military).toBe(startMilMoney);

		p0.MilitaryDelta = delta;
	}

	// new turn, 2
	{
		const prevEra = g.LatestEra;
		const prevTurn = g.LatestEra.LatestTurn;
		g.EndTurn();
		const t = g.LatestEra.LatestTurn;
		const p0 = t.Players[0];

		// nobody died so the era should not end
		expect(g.LatestEra.Number).toBe(prevEra.Number);
		// but the turn should be different
		expect(t === prevTurn).toBe(false);
		expect(t === t).toBe(true);

		// military delta
		expect(p0.Money).toBe(startMoney - delta);
		expect(p0.Military).toBe(startMilMoney + delta);
	}

	// new turn, 3
	{
		const prevEra = g.LatestEra;
		const prevTurn = g.LatestEra.LatestTurn;
		g.EndTurn();
		const t = g.LatestEra.LatestTurn;
		const p0 = t.Players[0];

		// nobody died so the era should not end
		expect(g.LatestEra.Number).toBe(prevEra.Number);
		// but the turn should be different
		expect(t === prevTurn).toBe(false);
		expect(t === t).toBe(true);

		// military delta
		expect(p0.Money).toBe(startMoney - delta);
		expect(p0.Military).toBe(startMilMoney + delta);
	}
});

test('Trades', () =>
{
	{
		const delta = Shared.Trade.GetDelta(Shared.Trade.ActionCooperate, Shared.Trade.ActionCooperate);
		// double cooperate
		expect(delta).toBe(Shared.Trade.ResultCooperateBoth);
	}
	{
		const delta = Shared.Trade.GetDelta(Shared.Trade.ActionCooperate, Shared.Trade.ActionDefect);
		// cooperate and defect
		expect(delta).toBe(Shared.Trade.ResultDefectLose);
	}
	{
		const delta = Shared.Trade.GetDelta(Shared.Trade.ActionDefect, Shared.Trade.ActionCooperate);
		// defect and cooperate
		expect(delta).toBe(Shared.Trade.ResultDefectWin);
	}
	{
		const delta = Shared.Trade.GetDelta(Shared.Trade.ActionDefect, Shared.Trade.ActionDefect);
		// double defect
		expect(delta).toBe(Shared.Trade.ResultDefectBoth);
	}
});

test('Attacks', () =>
{
	// test military exchanges
	{
		const { militaryDelta, moneyDelta, } = Shared.Military.GetDelta(2, 0, 0);
		// empty attacks do nothing
		expect(militaryDelta).toBe(0);
		expect(moneyDelta).toBe(0);
	}
	{
		const { militaryDelta, moneyDelta, } = Shared.Military.GetDelta(2, 3, 1);
		// attacks overcome enemy
		expect(militaryDelta).toBe(0);
		expect(moneyDelta).toBe(0);
	}
	{
		const { militaryDelta, moneyDelta, } = Shared.Military.GetDelta(2, 3, 4);
		// enemy attacks damage our military
		expect(militaryDelta).toBe(-1);
		expect(moneyDelta).toBe(0);
	}
	{
		const { militaryDelta, moneyDelta, } = Shared.Military.GetDelta(2, 3, 8);
		// enemy attacks destroy our military and pillage
		expect(militaryDelta).toBe(-2);
		expect(moneyDelta).toBe(-6);
	}

	// test attack that only hits military
	{
		const p0money = 9;
		const p0military = 3;

		const p1money = 8;
		const p1military = 6;
		const p1attack = 1;

		const g = Util.setupGame(2);
		{
			const t = g.LatestEra.LatestTurn;
			const p0 = t.Players[0];
			const p1 = t.Players[1];

			p0.Money = p0money;
			p0.Military = p0military;

			p1.Money = p1money;
			p1.Military = p1military;
		}

		{
			const p1 = g.LatestEra.LatestTurn.Players[1];
			p1.MilitaryAttacks.set(0, p1attack); // attack player 0 for 1
			g.EndTurn();
		}

		{
			const t = g.LatestEra.LatestTurn;
			const p0 = t.Players[0];
			const p1 = t.Players[1];

			// player should now have military
			expect(p0.Money).toBe(p0money);
			expect(p0.Military).toBe(p0military - p1attack);
			// other play should be as is
			expect(p1.Money).toBe(p1money);
			expect(p1.Military).toBe(p1military - p1attack);
		}
	}

	// test attack that destroys military and money
	{
		const p0money = 9;
		const p0military = 6;
		const p0attack = 5;

		const p1money = 10;
		const p1moneyDamage = 6;

		const g = Util.setupGame(2);
		{
			const t = g.LatestEra.LatestTurn;
			let p0 = t.Players[0];
			const p1 = t.Players[1];

			p0.Money = p0money;

			p1.Money = p1money;
			p1.Military = 2;

			p0 = g.LatestEra.LatestTurn.Players[0];
			p0.MilitaryDelta = 1;
			g.EndTurn();
			p0 = g.LatestEra.LatestTurn.Players[0];
			p0.MilitaryDelta = 1;
			g.EndTurn();
			p0 = g.LatestEra.LatestTurn.Players[0];
			p0.MilitaryDelta = 1;
			g.EndTurn();
			p0 = g.LatestEra.LatestTurn.Players[0];
			p0.MilitaryDelta = 1;
			g.EndTurn();
			p0 = g.LatestEra.LatestTurn.Players[0];
			p0.MilitaryDelta = 1;
			g.EndTurn();
			p0 = g.LatestEra.LatestTurn.Players[0];
			p0.MilitaryDelta = 1;
			g.EndTurn();
		}

		{
			const t = g.LatestEra.LatestTurn;
			const p0 = t.Players[0];
			const p1 = t.Players[1];

			// player should now have military
			expect(p0.Money).toBe(p0money - p0military);
			expect(p0.Military).toBe(p0military);
			// other play should be as is
			expect(p1.Money).toBe(p1money);
			expect(p1.Military).toBe(2);

			p0.MilitaryAttacks.set(1, p0attack);
			g.EndTurn();
		}

		{
			const t = g.LatestEra.LatestTurn;
			const p0 = t.Players[0];
			const p1 = t.Players[1];

			// player should now have military
			expect(p0.Money).toBe(p0money - p0military);
			expect(p0.Military).toBe(p0military - p0attack);
			// other play should be as is
			expect(p1.Money).toBe(p1money - p1moneyDamage);
			expect(p1.Military).toBe(0);
		}
	}
});

test('Player Death', () =>
{
	const g = Util.setupGame(4);
	{
		const t = g.LatestEra.LatestTurn;
		const p0 = t.Players[0];
		const p1 = t.Players[1];

		// player should not start era dead
		expect(p0.IsDead).toBe(false);
		expect(p1.IsDead).toBe(false);

		p0.Money = 0;

		// player 1 should be dead now
		expect(p0.IsDead).toBe(true);
		expect(p1.IsDead).toBe(false);
	}

	{
		const prevEra = g.LatestEra;
		g.EndTurn();
		// should not have produced a new era yet
		expect(g.LatestEra.Number).toBe(prevEra.Number);

		const t = g.LatestEra.LatestTurn;
		const p0 = t.Players[0];
		const p1 = t.Players[1];

		// players should stay dead
		expect(p0.IsDead).toBe(true);
		expect(p1.IsDead).toBe(false);

		p1.Money = 0;
	}
	{
		const prevEra = g.LatestEra;
		g.EndTurn();
		// new era should be different
		expect(g.LatestEra.Number).toBeGreaterThan(prevEra.Number);
		// a new era has occured
		Util.testNewEra(g.LatestEra);
	}
});

test('New Era', () =>
{
	const g = Util.setupGame(3);
	{
		const t = g.LatestEra.LatestTurn;
		const p0 = t.Players[0];
		const p1 = t.Players[1];
		const p2 = t.Players[2];

		p0.Money = 0;
		p1.Money = 10;
		p2.Money = 11;
	}

	{
		const prevEra = g.LatestEra;
		g.EndTurn();
		// new era should be different
		expect(g.LatestEra.Number).toBeGreaterThan(prevEra.Number);
		// a new era has occured
		Util.testNewEra(g.LatestEra);

		const t = g.LatestEra.LatestTurn;
		const p0 = t.Players[0];
		const p1 = t.Players[1];
		const p2 = t.Players[2];
		// score died
		expect(p0.Score).toBe(0);
		// score survivor
		expect(p1.Score).toBe(1);
		// score leader
		expect(p2.Score).toBe(2);

		// should have produced a new era 
		expect(g.LatestEra.Number).not.toBe(prevEra.Number);
		// players should not start era dead
		expect(p0.IsDead).toBe(false);
		expect(p1.IsDead).toBe(false);


		p0.Money = 0;
		p1.Money = 10;
		p2.Money = 11;
	}
	{
		const prevEra = g.LatestEra;
		g.EndTurn();
		// new era should be different
		expect(g.LatestEra.Number).toBeGreaterThan(prevEra.Number);
		// a new era has occured
		Util.testNewEra(g.LatestEra);

		const t = g.LatestEra.LatestTurn;
		const p0 = t.Players[0];
		const p1 = t.Players[1];
		const p2 = t.Players[2];
		// score died
		expect(p0.Score).toBe(0);
		// score survivor
		expect(p1.Score).toBe(2);
		// score leader
		expect(p2.Score).toBe(4);

	}
});

test('New Game', () =>
{
	const g = Util.setupGame(3);
	{
		for (let i = 0; i < 4; ++i)
		{
			g.LatestEra.LatestTurn.Players[0].Money = 0;
			g.LatestEra.LatestTurn.Players[1].Money += 1;
			const prevEra = g.LatestEra;
			g.EndTurn();
			// new era should be different
			expect(g.LatestEra.Number).toBeGreaterThan(prevEra.Number);
			Util.testNewEra(g.LatestEra); // a new era has occured
			// should have produced a new era 
			expect(g.LatestEra.Number).not.toBe(prevEra.Number);
			expect(g.IsOver).toBe(false);
			// score died
			expect(g.LatestEra.LatestTurn.Players[0].Score).toBe(0);
		}
	}
	{
		g.LatestEra.LatestTurn.Players[0].Money = 0;
		g.LatestEra.LatestTurn.Players[1].Money += 1;
		const prevEra = g.LatestEra;
		g.EndTurn();
		// new era should be different
		expect(g.LatestEra.Number).toBeGreaterThan(prevEra.Number);
		Util.testNewEra(g.LatestEra); // a new era has occured
		// should have produced a new era 
		expect(g.LatestEra.Number).not.toBe(prevEra.Number);
		expect(g.IsOver).toBe(true);
		// score died
		expect(g.LatestEra.LatestTurn.Players[0].Score).toBe(0);

		const p1 = g.LatestEra.LatestTurn.Players[1];
		// expect winner
		expect(g.GetCurrentWinner().Plid).toBe(p1.Plid);
	}
});

