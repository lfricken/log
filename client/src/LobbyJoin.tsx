import React from 'react';
import { FormEvent, FormEventHandler } from 'react';
import './Chat.css';

interface Props
{
	socket: SocketIOClient.Socket
}
interface State
{
	lobbyId: string;
}
class LobbyJoin extends React.Component<Props, State>
{
	onLobbyChange(e: FormEvent<HTMLFormElement>)
	{
		e.preventDefault();
		const lobbyId = "";
		this.setState({ lobbyId });
	}
	onInputChange(e: FormEvent<HTMLInputElement>)
	{
		const lobbyId = e.currentTarget.value;
		this.setState({ lobbyId });
	}
	render()
	{
		console.log('Lobby render')

		return (
			<div className="lobby">
				<form id="lobbyForm" onSubmit={this.onLobbyChange.bind(this)}>
					Lobby:
					<input
						className="lobbyInput"
						id="lobbyInput"
						autoComplete="off"
						onChange={this.onInputChange.bind(this)}
						defaultValue="Test"
					/>
				</form>
			</div>
		);
	}
}

export default LobbyJoin;