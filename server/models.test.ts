/* eslint-disable no-magic-numbers */

// https://stackoverflow.com/q/35987055/2167822


import * as Shared from "../client/src/shared";
import { IMap } from "../client/src/shared";
import * as Vm from "../client/src/viewmodel";
import * as Models from "./model";
import * as Util from "./testUtilities";

test('IMap', () =>
{
	{
		const size = 2;

		const imap: IMap<number> = {};
		imap[0] = 4;
		IMap.Set(imap, "v", 4);
		expect(IMap.Length(imap)).toBe(size);

		let count = 0;
		for (const kvp of IMap.Keys(imap))
		{
			count++;
		}
		expect(count).toBe(size);
	}

	{
		const map: IMap<string> = {};
		map[4] = "val";

		for (const { k, v } of IMap.Kvp(map))
		{
			expect(k).toBe((4).toString());
			expect(v).toBe("val");
		}
		for (const v of IMap.Values(map))
		{
			expect(v).toBe("val");
		}
		for (const k of IMap.Keys(map))
		{
			expect(k).toBe("4");
		}
		expect(IMap.Length(map)).toBe(1);

		expect(IMap.Has(map, 4)).toBe(true);
		expect(IMap.Has(map, 5)).toBe(false);

		expect(IMap.KeyOf(map, "hi")).toBe(null);
		expect(IMap.KeyOf(map, "val")).toBe((4).toString());

		expect(IMap.Length(map)).toBe(1);
	}
});

test('GetConnection adds a player', () =>
{
	const settings = Shared.GetSettings(Shared.SettingConfig.Test) as Shared.IGameSettingsEditable;
	const l = Util.setupLobby(settings, 1);
	const game = l.Game!;
	// setup game should automatically add 1 player
	expect(IMap.Length(game.LatestEra.LatestTurn.Players)).toBe(1);

	const numConnections = IMap.Length(l.PlayerConnections);
	const c1 = l.GetConnection(Util.uid(numConnections), Util.name(numConnections));
	// get connection automatically adds aother new player
	expect(IMap.Length(l.PlayerConnections)).toBe(numConnections + 1);

	// uid was not preexisting, so it should be a new player
	expect(c1.isNew).toBe(true);
});

test('New Lobby Leader', () =>
{

	const settings = Shared.GetSettings(Shared.SettingConfig.Test) as Shared.IGameSettingsEditable;
	const l = Util.setupLobby(settings, 2);
	const game = l.Game!;

	const c0 = l.GetConnection(Util.uid(0), Util.name(0));
	const c1 = l.GetConnection(Util.uid(1), Util.name(1));
	const c2 = l.GetConnection(Util.uid(2), Util.name(2));
	expect(IMap.Length(game.LatestEra.LatestTurn.Players)).toBe(2);

	// uid was preexisting, so it should not be a new player
	expect(c0.isNew).toBe(false);
	expect(c0.connection.IsHost).toBe(false);

	// uid was preexisting, so it should not be a new player
	expect(c1.isNew).toBe(false);
	expect(c1.connection.IsHost).toBe(true);

	expect(c2.isNew).toBe(false);
	expect(c2.connection.IsHost).toBe(false);

	// sticks with the same leader
	{
		const { leaderName } = l.ConsiderNewLobbyLeader();
		expect(leaderName).toBe(c1.connection.DisplayName);
		expect(c0.connection.IsHost).toBe(false);
		expect(c1.connection.IsHost).toBe(true);
		expect(c2.connection.IsHost).toBe(false);
	}

	// picks a new leader
	{
		c1.connection.IsConnected = false;
		const { leaderName } = l.ConsiderNewLobbyLeader();
		expect(leaderName).toBe(c2.connection.DisplayName);
		expect(c0.connection.IsHost).toBe(false);
		expect(c1.connection.IsHost).toBe(false);
		expect(c2.connection.IsHost).toBe(true);
	}
});

test('Models Created', () =>
{
	const settings = Shared.GetSettings(Shared.SettingConfig.Test) as Shared.IGameSettingsEditable;
	const l = Util.setupLobby(settings, 1);
	const game = l.Game!;

	// get connection automatically adds a new player
	const c1 = l.GetConnection(Util.uid(1), Util.name(1));
	expect(IMap.Length(game.LatestEra.LatestTurn.Players)).toBe(1);

	// uid was preexisting, so it should not be a new player
	expect(c1.isNew).toBe(false);
	// player id should reflect join order
	expect(c1.connection.Plid).toBe(1);
	// should not have a socket id yet because the caller needs to assign that
	expect(c1.connection.SocketIds.length).toBe(0);
	// first player should be lobby leader
	expect(c1.connection.IsHost).toBe(true);
	// new player should default to connected
	expect(c1.connection.IsConnected).toBe(true);
	// should have the name we gave them
	expect(c1.connection.Nickname).not.toBe(Util.name(1));
	expect(c1.connection.Nickname).toContain(Util.name(1));
});

test('Trade Partners Calculated', () =>
{
	const settings = Shared.GetSettings(Shared.SettingConfig.Test) as Shared.IGameSettingsEditable;
	{
		const plid = 0;
		const l = Util.setupLobby(settings, 2);
		const tradePartners = Vm.IViewEra.GetTradePartners(plid, [0, 1]);
		expect(tradePartners.length).toBe(1);
		expect(tradePartners.indexOf(1)).not.toBe(-1);
	}
	{
		const plid = 1;
		const l = Util.setupLobby(settings, 2);
		const tradePartners = Vm.IViewEra.GetTradePartners(plid, [0, 1]);
		expect(tradePartners.length).toBe(1);
		expect(tradePartners.indexOf(0)).not.toBe(-1);
	}
	{ // 3 players, middle player
		const plid = 1;
		const l = Util.setupLobby(settings, 3);
		const tradePartners = Vm.IViewEra.GetTradePartners(plid, [0, 1, 2]);
		expect(tradePartners.length).toBe(2);
		expect(tradePartners.indexOf(0)).not.toBe(-1);
		expect(tradePartners.indexOf(1)).toBe(-1);
		expect(tradePartners.indexOf(2)).not.toBe(-1);
	}
	{ // 4 players, last player
		const plid = 3;
		const l = Util.setupLobby(settings, 4);
		const tradePartners = Vm.IViewEra.GetTradePartners(plid, [0, 1, 2, 3]);
		expect(tradePartners.length).toBe(2);
		expect(tradePartners.indexOf(0)).not.toBe(-1);
		expect(tradePartners.indexOf(1)).toBe(-1);
		expect(tradePartners.indexOf(2)).not.toBe(-1);
		expect(tradePartners.indexOf(3)).toBe(-1);
	}
	{ // 4 players, scramble order
		const plid = 2;
		const l = Util.setupLobby(settings, 4);
		const tradePartners = Vm.IViewEra.GetTradePartners(plid, [0, 3, 1, 2]);
		expect(tradePartners.length).toBe(2);
		expect(tradePartners.indexOf(0)).not.toBe(-1);
		expect(tradePartners.indexOf(1)).not.toBe(-1);
		expect(tradePartners.indexOf(2)).toBe(-1);
		expect(tradePartners.indexOf(3)).toBe(-1);
	}
});

test('New Turn', () =>
{
	let lastMoney = 0;
	const delta = 2;
	const startMoney = 7;
	const startMilMoney = 5;
	const settings = Shared.GetSettings(Shared.SettingConfig.Test) as Shared.IGameSettingsEditable;
	settings.TradeResultCooperateBoth = 0;

	// new turn, 0
	const l = Util.setupLobby(settings, 2);
	const game = l.Game!;
	{
		expect(game.LatestEra.IsOver).toBe(false);
		const t = game.LatestEra.LatestTurn;


		let p1: null | Models.PlayerTurn = null;
		for (const kvp of IMap.Kvp(t.Players))
		{
			p1 = kvp.v;
			break;
		}
		for (const kvp of IMap.Kvp(t.Players))
		{
			// expect start of game money
			expect(kvp.v.Money).toBe(settings.EraStartMoney);
		}

		if (p1 !== null)
		{
			p1.Money = startMoney;
			p1.Military = startMilMoney;

			lastMoney = p1.Money;
		}
	}

	// new turn, 1
	{
		const prevEra = game.LatestEra;
		game.EndTurn();
		const t = game.LatestEra.LatestTurn;
		const p1 = t.Players[1];

		// nobody died so the era should not end
		expect(game.LatestEra.Number).toBe(prevEra.Number);

		// we automatically trade
		expect(p1.Money).toBe(lastMoney);
		// no military delta
		expect(p1.Military).toBe(startMilMoney);

		p1.MilitaryDelta = delta;
		lastMoney = p1.Money;
	}

	// new turn, 2
	{
		const prevEra = game.LatestEra;
		const prevTurn = game.LatestEra.LatestTurn;
		game.EndTurn();
		const t = game.LatestEra.LatestTurn;
		const p1 = t.Players[1];

		// nobody died so the era should not end
		expect(game.LatestEra.Number).toBe(prevEra.Number);
		// but the turn should be different
		expect(t === prevTurn).toBe(false);
		expect(t === t).toBe(true);

		// military delta
		expect(p1.Money).toBe(lastMoney - delta);
		expect(p1.Military).toBe(startMilMoney + delta);
		lastMoney = p1.Money;
	}

	// new turn, 3
	{
		const prevEra = game.LatestEra;
		const prevTurn = game.LatestEra.LatestTurn;
		game.EndTurn();
		const t = game.LatestEra.LatestTurn;
		const p1 = t.Players[1];

		// nobody died so the era should not end
		expect(game.LatestEra.Number).toBe(prevEra.Number);
		// but the turn should be different
		expect(t === prevTurn).toBe(false);
		expect(t === t).toBe(true);

		// military delta
		expect(p1.Money).toBe(lastMoney);
		expect(p1.Military).toBe(startMilMoney + delta);
	}
});

test('Trades', () =>
{
	const settings = Shared.GetSettings(Shared.SettingConfig.Test) as Shared.IGameSettingsEditable;
	{
		const delta = Shared.Trade.GetDelta(settings, Shared.Trade.ActionCooperate, Shared.Trade.ActionCooperate);
		// double cooperate
		expect(delta).toBe(settings.TradeResultCooperateBoth);
	}
	{
		const delta = Shared.Trade.GetDelta(settings, Shared.Trade.ActionCooperate, Shared.Trade.ActionDefect);
		// cooperate and defect
		expect(delta).toBe(settings.TradeResultDefectLose);
	}
	{
		const delta = Shared.Trade.GetDelta(settings, Shared.Trade.ActionDefect, Shared.Trade.ActionCooperate);
		// defect and cooperate
		expect(delta).toBe(settings.TradeResultDefectWin);
	}
	{
		const delta = Shared.Trade.GetDelta(settings, Shared.Trade.ActionDefect, Shared.Trade.ActionDefect);
		// double defect
		expect(delta).toBe(settings.TradeResultDefectBoth);
	}
});

test('Attacks Overlap', () =>
{
	const settings = Shared.GetSettings(Shared.SettingConfig.Test) as Shared.IGameSettingsEditable;
	settings.TradeResultCooperateBoth = 0;

	const l = Util.setupLobby(settings, 3);
	const game = l.Game!;
	{
		// get military
		const t = game.LatestEra.LatestTurn;
		const p3 = t.Players[3];
		const p1 = t.Players[1];
		const p2 = t.Players[2];

		p3.MilitaryDelta = 3;
		p1.MilitaryDelta = 3;
		p2.MilitaryDelta = 0;
		game.EndTurn();
	}
	{
		// attack
		const t = game.LatestEra.LatestTurn;
		const p3 = t.Players[3];
		const p1 = t.Players[1];
		const p2 = t.Players[2];

		expect(p3.Military).toBe(3);
		expect(p1.Military).toBe(3);
		expect(p2.Military).toBe(0);

		p3.MilitaryAttacks[2] = 2;
		p1.MilitaryAttacks[2] = 2;
		game.EndTurn();
	}
	{
		// see damage
		const t = game.LatestEra.LatestTurn;
		const p3 = t.Players[3];
		const p1 = t.Players[1];
		const p2 = t.Players[2];

		expect(p3.Military).toBe(1);
		expect(p1.Military).toBe(1);
		expect(p2.Military).toBe(0);
		expect(p2.Money).toBeLessThan(p1.Money);
	}
});

test('Attacks', () =>
{
	const settings = Shared.GetSettings(Shared.SettingConfig.Test) as Shared.IGameSettingsEditable;
	settings.TradeResultCooperateBoth = 0;

	// test military exchanges
	{
		const { militaryDelta, moneyDelta, } = Shared.Military.GetDelta(settings, 2, 0, 0);
		// empty attacks do nothing
		expect(militaryDelta).toBe(0);
		expect(moneyDelta).toBe(0);
	}
	{
		const { militaryDelta, moneyDelta, } = Shared.Military.GetDelta(settings, 2, 3, 1);
		// attacks overcome enemy
		expect(militaryDelta).toBe(0);
		expect(moneyDelta).toBe(0);
	}
	{
		const { militaryDelta, moneyDelta, } = Shared.Military.GetDelta(settings, 2, 3, 4);
		// enemy attacks damage our military
		expect(militaryDelta).toBe(-1);
		expect(moneyDelta).toBe(0);
	}
	{
		const { militaryDelta, moneyDelta, } = Shared.Military.GetDelta(settings, 2, 3, 8);
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

		const l = Util.setupLobby(settings, 2);
		const game = l.Game!;
		{
			const t = game.LatestEra.LatestTurn;
			const p2 = t.Players[2];
			const p1 = t.Players[1];

			p2.Money = p0money;
			p2.Military = p0military;

			p1.Money = p1money;
			p1.Military = p1military;
		}

		{
			const p1 = game.LatestEra.LatestTurn.Players[1];
			p1.MilitaryAttacks[2] = p1attack; // attack player 2 for 1
			game.EndTurn();
		}

		{
			const t = game.LatestEra.LatestTurn;
			const p2 = t.Players[2];
			const p1 = t.Players[1];

			// player should now have military
			expect(p2.Money).toBe(p0money + settings.TradeResultCooperateBoth);
			expect(p2.Military).toBe(p0military - p1attack);
			// other play should be as is
			expect(p1.Money).toBe(p1money + settings.TradeResultCooperateBoth);
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

		const l = Util.setupLobby(settings, 2);
		const game = l.Game!;
		const targetPid = 2;
		{
			const t = game.LatestEra.LatestTurn;
			let p2 = t.Players[targetPid];
			const p1 = t.Players[1];

			p2.Money = p0money;

			p1.Money = p1money;
			p1.Military = 2;

			p2 = game.LatestEra.LatestTurn.Players[targetPid];
			p2.MilitaryDelta = 1;
			game.EndTurn();
			p2 = game.LatestEra.LatestTurn.Players[targetPid];
			p2.MilitaryDelta = 1;
			game.EndTurn();
			p2 = game.LatestEra.LatestTurn.Players[targetPid];
			p2.MilitaryDelta = 1;
			game.EndTurn();
			p2 = game.LatestEra.LatestTurn.Players[targetPid];
			p2.MilitaryDelta = 1;
			game.EndTurn();
			p2 = game.LatestEra.LatestTurn.Players[targetPid];
			p2.MilitaryDelta = 1;
			game.EndTurn();
			p2 = game.LatestEra.LatestTurn.Players[targetPid];
			p2.MilitaryDelta = 1;
			game.EndTurn();
		}

		{
			const t = game.LatestEra.LatestTurn;
			const p2 = t.Players[targetPid];
			const p1 = t.Players[1];

			// player should now have military
			expect(p2.Money).toBe(p0money - p0military);
			expect(p2.Military).toBe(p0military);
			// other play should be as is
			expect(p1.Money).toBe(p1money);
			expect(p1.Military).toBe(2);

			p2.MilitaryAttacks[1] = p0attack;
			game.EndTurn();
		}

		{
			const t = game.LatestEra.LatestTurn;
			const p2 = t.Players[targetPid];
			const p1 = t.Players[1];

			// player should now have military
			expect(p2.Money).toBe(p0money - p0military);
			expect(p2.Military).toBe(p0military - p0attack);
			// other play should be as is
			expect(p1.Money).toBe(p1money - p1moneyDamage);
			expect(p1.Military).toBe(0);
		}
	}
});

test('Player Death', () =>
{
	const settings = Shared.GetSettings(Shared.SettingConfig.Test) as Shared.IGameSettingsEditable;
	settings.TradeResultCooperateBoth = 0;

	const l = Util.setupLobby(settings, 4);
	const game = l.Game!;
	{
		const t = game.LatestEra.LatestTurn;
		const p2 = t.Players[2];
		const p1 = t.Players[1];

		// player should not start era dead
		expect(p2.IsDead).toBe(false);
		expect(p1.IsDead).toBe(false);

		p2.Money = -5;

		// player 1 should be dead now
		expect(p2.IsDead).toBe(true);
		expect(p1.IsDead).toBe(false);
	}

	{
		const prevEra = game.LatestEra;
		game.EndTurn();
		// should not have produced a new era yet
		expect(game.LatestEra.Number).toBe(prevEra.Number);

		const t = game.LatestEra.LatestTurn;
		const p2 = t.Players[2];
		const p1 = t.Players[1];

		// players should stay dead
		expect(p2.IsDead).toBe(true);
		expect(p1.IsDead).toBe(false);

		p1.Money = 0;
	}
	{
		const prevEra = game.LatestEra;
		game.EndTurn();
		// new era should be different
		expect(game.LatestEra.Number).toBeGreaterThan(prevEra.Number);
		// a new era has occured
		Util.testLatestEra(settings, game, 4);
	}
});

test('New Era', () =>
{
	const settings = Shared.GetSettings(Shared.SettingConfig.Test) as Shared.IGameSettingsEditable;
	settings.TradeResultCooperateBoth = 0;

	const l = Util.setupLobby(settings, 3);
	const game = l.Game!;
	{
		const t = game.LatestEra.LatestTurn;
		const p3 = t.Players[3];
		const p1 = t.Players[1];
		const p2 = t.Players[2];

		p3.Money = 0;
		p1.Money = 10;
		p2.Money = 11;
	}

	{
		const prevEra = game.LatestEra;
		game.EndTurn();
		// new era should be different
		expect(game.LatestEra.Number).toBeGreaterThan(prevEra.Number);
		// a new era has occured
		Util.testLatestEra(settings, game, 3);

		const t = game.LatestEra.LatestTurn;
		const p3 = t.Players[3];
		const p1 = t.Players[1];
		const p2 = t.Players[2];
		// score died
		expect(p3.Score).toBe(0);
		// score survivor
		expect(p1.Score).toBe(1);
		// score leader
		expect(p2.Score).toBe(2);

		// should have produced a new era 
		expect(game.LatestEra.Number).not.toBe(prevEra.Number);
		// players should not start era dead
		expect(p3.IsDead).toBe(false);
		expect(p1.IsDead).toBe(false);


		p3.Money = 0;
		p1.Money = 10;
		p2.Money = 11;
	}
	{
		const prevEra = game.LatestEra;
		game.EndTurn();
		// new era should be different
		expect(game.LatestEra.Number).toBeGreaterThan(prevEra.Number);
		// a new era has occured
		Util.testLatestEra(settings, game, 3);

		const t = game.LatestEra.LatestTurn;
		const p3 = t.Players[3];
		const p1 = t.Players[1];
		const p2 = t.Players[2];
		// score died
		expect(p3.Score).toBe(0);
		// score survivor
		expect(p1.Score).toBe(2);
		// score leader
		expect(p2.Score).toBe(4);
	}
});

test('Run Game', () =>
{
	const settings = Shared.GetSettings(Shared.SettingConfig.Test) as Shared.IGameSettingsEditable;
	settings.TradeResultCooperateBoth = 0;
	const l = Util.setupLobby(settings, 3);
	testNewGame(l);
	testNewGame(l);
	testNewGame(l);
});
function testNewGame(l: Models.Lobby): void
{
	const settings = Shared.GetSettings(Shared.SettingConfig.Test) as Shared.IGameSettingsEditable;
	settings.TradeResultCooperateBoth = 0;
	l.CreateNewGame(settings);
	const game = l.Game!;
	{
		for (let i = 0; i < settings.GameEndMaxEras - 2; ++i)
		{
			game.LatestEra.LatestTurn.Players[2].Money = 0;
			game.LatestEra.LatestTurn.Players[1].Money += 1;
			const prevEra = game.LatestEra;
			game.EndTurn();
			// new era should be different
			expect(game.LatestEra.Number).toBeGreaterThan(prevEra.Number);
			Util.testLatestEra(settings, game, game.NumPlayers); // a new era has occured
			// should have produced a new era 
			expect(game.LatestEra.Number).not.toBe(prevEra.Number);
			expect(game.GetStatus().isOver).toBe(false);
			// score died
			expect(game.LatestEra.LatestTurn.Players[2].Score).toBe(0);
		}
	}
	{
		game.LatestEra.LatestTurn.Players[2].Money = 0;
		game.LatestEra.LatestTurn.Players[1].Money += 1;
		const prevEra = game.LatestEra;
		game.EndTurn();
		// new era should be different
		expect(game.LatestEra.Number).toBeGreaterThan(prevEra.Number);
		Util.testLatestEra(settings, game, game.NumPlayers); // a new era has occured
		// should have produced a new era 
		expect(game.LatestEra.Number).not.toBe(prevEra.Number);
		expect(game.GetStatus().isOver).toBe(true);
		// score died
		expect(game.LatestEra.LatestTurn.Players[2].Score).toBe(0);

		const p1 = game.LatestEra.LatestTurn.Players[1];
		// expect winner
		expect(game.GetCurrentWinner().Plid).toBe(p1.Plid);
	}
}

