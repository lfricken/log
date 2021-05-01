/* eslint-disable no-magic-numbers */
import * as Models from "./model";


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

test('ConsiderNewLobbyLeader', () =>
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

test('Eras, Turns, and Players get created', () =>
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

test('EndTurn produces new Turn', () =>
{

});

test('EndTurn produces new Era', () =>
{

});

