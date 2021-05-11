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
	return g;
}

test('GetConnection adds a player', () =>
{
	const g = setupGame(1);
	expect(g.CurrentEra.CurrentTurn.Players.size).toBe(1);

	// get connection automatically adds aother new player
	const c1 = g.GetConnection(uid1, name1);
	expect(g.CurrentEra.CurrentTurn.Players.size).toBe(2);

	// uid was not preexisting, so it should be a new player
	expect(c1.isNewPlayer).toBe(true);
});

test('New Lobby Leader', () =>
{
	const g = setupGame(2);

	const c0 = g.GetConnection(uid0, name0);
	const c1 = g.GetConnection(uid1, name1);
	expect(g.CurrentEra.CurrentTurn.Players.size).toBe(2);

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
	expect(g.CurrentEra.CurrentTurn.Players.size).toBe(1);

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
		const t = g.CurrentEra.CurrentTurn;

		const p0 = t.Players.get(0)!;
		p0.Money = startMoney;
		p0.MilitaryMoney = startMilMoney;
	}

	// new turn, 1
	{
		const prevEra = g.CurrentEra;
		g.EndTurn();
		const t = g.CurrentEra.CurrentTurn;
		const p0 = t.Players.get(0)!;

		// nobody died so the era should not end
		expect(g.CurrentEra).toBe(prevEra);

		// no military delta
		expect(p0.Money).toBe(startMoney);
		expect(p0.MilitaryMoney).toBe(startMilMoney);

		p0.MilitaryDelta = delta;
	}

	// new turn, 2
	{
		const prevEra = g.CurrentEra;
		const prevTurn = g.CurrentEra.CurrentTurn;
		g.EndTurn();
		const t = g.CurrentEra.CurrentTurn;
		const p0 = t.Players.get(0)!;

		// nobody died so the era should not end
		expect(g.CurrentEra).toBe(prevEra);
		// but the turn should be different
		expect(t === prevTurn).toBe(false);
		expect(t === t).toBe(true);

		// military delta
		expect(p0.Money).toBe(startMoney - delta);
		expect(p0.MilitaryMoney).toBe(startMilMoney + delta);
	}

	// new turn, 3
	{
		const prevEra = g.CurrentEra;
		const prevTurn = g.CurrentEra.CurrentTurn;
		g.EndTurn();
		const t = g.CurrentEra.CurrentTurn;
		const p0 = t.Players.get(0)!;

		// nobody died so the era should not end
		expect(g.CurrentEra).toBe(prevEra);
		// but the turn should be different
		expect(t === prevTurn).toBe(false);
		expect(t === t).toBe(true);

		// military delta
		expect(p0.Money).toBe(startMoney - delta);
		expect(p0.MilitaryMoney).toBe(startMilMoney + delta);
	}
});

test('Trades', () =>
{
	{
		const delta = Shared.Trade.GetDelta(Shared.Actions.Cooperate, Shared.Actions.Cooperate);
		expect(delta).toBe(Shared.Trade.CooperateBoth);
	}
	{
		const delta = Shared.Trade.GetDelta(Shared.Actions.Cooperate, Shared.Actions.Defect);
		expect(delta).toBe(Shared.Trade.DefectLose);
	}
	{
		const delta = Shared.Trade.GetDelta(Shared.Actions.Defect, Shared.Actions.Cooperate);
		expect(delta).toBe(Shared.Trade.DefectWin);
	}
	{
		const delta = Shared.Trade.GetDelta(Shared.Actions.Defect, Shared.Actions.Defect);
		expect(delta).toBe(Shared.Trade.DefectBoth);
	}
});

test('Turn Trades', () =>
{

});

test('Attacks', () =>
{
	{
		const { militaryDelta, moneyDelta, } = Shared.Military.GetDelta(2, 0, 0);
		// attacks do nothing
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
});

test('Turn Attacks', () =>
{
	const g = setupGame(2);
	{
		const t = g.CurrentEra.CurrentTurn;
		let p0 = t.Players.get(0)!;
		const p1 = t.Players.get(1)!;

		p0.Money = 9;

		p1.Money = 10;
		p1.MilitaryMoney = 2;

		p0 = g.CurrentEra.CurrentTurn.Players.get(0)!;
		p0.MilitaryDelta = 1;
		g.EndTurn();
		p0 = g.CurrentEra.CurrentTurn.Players.get(0)!;
		p0.MilitaryDelta = 1;
		g.EndTurn();
		p0 = g.CurrentEra.CurrentTurn.Players.get(0)!;
		p0.MilitaryDelta = 1;
		g.EndTurn();
		p0 = g.CurrentEra.CurrentTurn.Players.get(0)!;
		p0.MilitaryDelta = 1;
		g.EndTurn();
		p0 = g.CurrentEra.CurrentTurn.Players.get(0)!;
		p0.MilitaryDelta = 1;
		g.EndTurn();
	}

	{
		const t = g.CurrentEra.CurrentTurn;
		const p0 = t.Players.get(0)!;
		const p1 = t.Players.get(1)!;

		// player should now have military
		expect(p0.Money).toBe(4);
		expect(p0.MilitaryMoney).toBe(5);
		// other play should be as is
		expect(p1.Money).toBe(10);
		expect(p1.MilitaryMoney).toBe(2);

		p0.MilitaryAttacks.set(1, 4);
		g.EndTurn();
	}

	{
		const t = g.CurrentEra.CurrentTurn;
		const p0 = t.Players.get(0)!;
		const p1 = t.Players.get(1)!;

		// player should now have military
		expect(p0.Money).toBe(4);
		expect(p0.MilitaryMoney).toBe(1);
		// other play should be as is
		expect(p1.Money).toBe(2);
		expect(p1.MilitaryMoney).toBe(0);
	}
});

test('Player Stays Dead', () =>
{
	const g = setupGame(4);
	{
		const t = g.CurrentEra.CurrentTurn;
		const p0 = t.Players.get(0)!;
		const p1 = t.Players.get(1)!;

		// player should not start era dead
		expect(p0.IsDead).toBe(false);
		expect(p1.IsDead).toBe(false);

		p0.Money = 0;

		// player 1 shouldn't be dead yet
		expect(p0.IsDead).toBe(false);
		expect(p1.IsDead).toBe(false);
	}

	{
		const prevEra = g.CurrentEra;
		g.EndTurn();
		// should have produced a new era
		expect(g.CurrentEra === prevEra).toBe(true);

		const t = g.CurrentEra.CurrentTurn;
		const p0 = t.Players.get(0)!;
		const p1 = t.Players.get(1)!;

		// players should not start era dead
		expect(p0.IsDead).toBe(true);
		expect(p1.IsDead).toBe(false);
	}
});

test('New Era', () =>
{
	const g = setupGame(2);
	{
		const t = g.CurrentEra.CurrentTurn;
		const p0 = t.Players.get(0)!;
		const p1 = t.Players.get(1)!;

		// player should not start era dead
		expect(p0.IsDead).toBe(false);
		expect(p1.IsDead).toBe(false);

		p0.Money = 0;

		// player 1 shouldn't be dead yet
		expect(p0.IsDead).toBe(false);
		expect(p1.IsDead).toBe(false);
	}

	{
		const prevEra = g.CurrentEra;
		g.EndTurn();

		// new era should be different
		expect(g.CurrentEra === prevEra).toBe(false);

		const t = g.CurrentEra.CurrentTurn;
		const p0 = t.Players.get(0)!;
		const p1 = t.Players.get(1)!;

		// should have produced a new era 
		expect(g.CurrentEra === prevEra).toBe(false);
		// players should not start era dead
		expect(p0.IsDead).toBe(false);
		expect(p1.IsDead).toBe(false);
	}
});

