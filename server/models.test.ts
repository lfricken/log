/* eslint-disable no-magic-numbers */

// https://stackoverflow.com/q/35987055/2167822


import * as Models from "./model";
import * as Shared from "../client/src/shared";

const uid0 = "uid0";
const uid1 = "uid1";
const name0 = "name0";
const name1 = "name1";

function setupGame(players: number): Models.Game
{
	const g = new Models.Game();
	for (let i = 0; i < players; ++i)
	{
		g.GetConnection("uid" + i, "name" + i);
	}
	testNewEra(g.LatestEra);
	return g;
}

function testNewEra(era: Models.Era): void
{
	// there should be an order definition for each player
	expect(era.Order.length).toBe(era.LatestTurn.Players.length);
	// only 1 turn
	expect(era.Turns.length).toBe(1);
	// should not be over
	expect(era.IsOver).toBe(false);
	// should have a positive idx
	expect(era.Eid).toBeGreaterThanOrEqual(0);

	// new era turn 0 should start with no dead
	expect(era.LatestTurn.NumDead).toBe(0);

	const prevPlids = [];
	for (const player of era.LatestTurn.Players)
	{
		// expect start of game money
		expect(player.Money).toBe(Shared.Rules.StartMoney);
		// expect start of game military
		expect(player.Military).toBe(Shared.Rules.StartMilitary);
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

test('GetConnection adds a player', () =>
{
	const g = setupGame(1);
	// setup game should automatically add 1 player
	expect(g.LatestEra.LatestTurn.Players.length).toBe(1);

	const c1 = g.GetConnection(uid1, name1);
	// get connection automatically adds aother new player
	expect(g.LatestEra.LatestTurn.Players.length).toBe(2);

	// uid was not preexisting, so it should be a new player
	expect(c1.isNewPlayer).toBe(true);
});

test('New Lobby Leader', () =>
{
	const g = setupGame(2);

	const c0 = g.GetConnection(uid0, name0);
	const c1 = g.GetConnection(uid1, name1);
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
	const g = setupGame(1);

	// get connection automatically adds a new player
	const c0 = g.GetConnection(uid0, name0);
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
	expect(c0.connection.Nickname).toBe(name0);
});

test('New Turn', () =>
{
	const delta = 2;
	const startMoney = 7;
	const startMilMoney = 5;

	// new turn, 0
	const g = setupGame(2);
	{
		expect(g.LatestEra.IsOver).toBe(false);
		const t = g.LatestEra.LatestTurn;


		const p0 = t.Players[0];
		const p1 = t.Players[1];

		// expect start of game money
		expect(p0.Money).toBe(Shared.Rules.StartMoney);
		// expect start of game money
		expect(p1.Money).toBe(Shared.Rules.StartMoney);


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
		expect(g.LatestEra.Eid).toBe(prevEra.Eid);

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
		expect(g.LatestEra.Eid).toBe(prevEra.Eid);
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
		expect(g.LatestEra.Eid).toBe(prevEra.Eid);
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
		const delta = Shared.Trade.GetDelta(Shared.Actions.Cooperate, Shared.Actions.Cooperate);
		// double cooperate
		expect(delta).toBe(Shared.Trade.CooperateBoth);
	}
	{
		const delta = Shared.Trade.GetDelta(Shared.Actions.Cooperate, Shared.Actions.Defect);
		// cooperate and defect
		expect(delta).toBe(Shared.Trade.DefectLose);
	}
	{
		const delta = Shared.Trade.GetDelta(Shared.Actions.Defect, Shared.Actions.Cooperate);
		// defect and cooperate
		expect(delta).toBe(Shared.Trade.DefectWin);
	}
	{
		const delta = Shared.Trade.GetDelta(Shared.Actions.Defect, Shared.Actions.Defect);
		// double defect
		expect(delta).toBe(Shared.Trade.DefectBoth);
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

		const g = setupGame(2);
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

		const g = setupGame(2);
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
	const g = setupGame(4);
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
		expect(g.LatestEra.Eid).toBe(prevEra.Eid);

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
		expect(g.LatestEra.Eid).toBeGreaterThan(prevEra.Eid);
		// a new era has occured
		testNewEra(g.LatestEra);
	}
});

test('New Era', () =>
{
	const g = setupGame(3);
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
		expect(g.LatestEra.Eid).toBeGreaterThan(prevEra.Eid);
		// a new era has occured
		testNewEra(g.LatestEra);

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
		expect(g.LatestEra.Eid).not.toBe(prevEra.Eid);
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
		expect(g.LatestEra.Eid).toBeGreaterThan(prevEra.Eid);
		// a new era has occured
		testNewEra(g.LatestEra);

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

