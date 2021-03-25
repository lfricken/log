import * as React from 'react';
import './Chat.css';
import * as Shared from "./models-shared";
import cookie from 'react-cookies'

console.log('Chat loading')
const ChatNameKey: string = "nickname";
interface Props
{
	socket: SocketIOClient.Socket
}
interface State
{
	nickname: string;
	messages: Shared.ChatMessage[];
}
class Chat extends React.Component<Props, State>
{
	// Initialize state
	state: State = Chat.getInitialState();
	chatInput!: HTMLInputElement;
	nameInput!: HTMLInputElement;
	chatView!: HTMLDivElement;

	private static getRandomName(): string
	{
		return "Rando";
	}
	public static getInitialState(): State
	{
		let nickname = cookie.load(ChatNameKey);
		if (nickname === null || nickname === undefined)
		{
			nickname = Chat.getRandomName();
			cookie.save(ChatNameKey, nickname, {});
		}
		// initial state has a message to welcome the new user onthe chat
		return {
			nickname: nickname,
			messages: []
		};
	}
	componentDidMount()
	{
		this.chatView = document.getElementById('chatView') as HTMLDivElement;
		this.chatInput = document.getElementById('chatInput') as HTMLInputElement;
		this.nameInput = document.getElementById('nameInput') as HTMLInputElement;

		this.props.socket.on('chat message', this.onNewMessage.bind(this));

		var chatForm = document.getElementById('chatForm') as HTMLFormElement;
		chatForm.addEventListener('submit', this.onSubmitMessage.bind(this));
	}
	private onSubmitMessage(e: Event): void
	{
		e.preventDefault();
		const text = this.chatInput.value;
		const nickname = this.nameInput.value;
		const message = new Shared.ChatMessage(nickname, text);
		cookie.save(ChatNameKey, nickname, {});
		if (nickname !== "" && text !== "")
		{
			this.props.socket.emit('chat message', message);
			this.onNewMessage(message);
			this.chatInput.value = '';
		}
	}
	private onNewMessage(m: Shared.ChatMessage): void
	{
		// follow the bottom of the chat if they are already looking there
		const pixelRange = 80;
		const follow = (this.chatView.scrollHeight - this.chatView.offsetHeight - this.chatView.scrollTop) < pixelRange;

		const messages = this.state.messages;
		messages.push(m);
		this.setState({ messages });

		if (follow)
			this.chatView.scrollTop = this.chatView.scrollHeight;
	}
	render()
	{
		console.log('Chat render')
		const { nickname: name, messages } = this.state;

		return (
			<div className="chat">
				<div className="chatView" id="chatView">
					{messages.map((message, idx: number) =>
						<div key={idx}>{Shared.ChatMessage.DisplayString(message)}</div>
					)}
				</div>
				<div className="row">
					<div className="column">
						<input className="nameInput" id="nameInput" autoComplete="off" defaultValue={name} />
					</div>
					<div className="column">
						<form id="chatForm">
							<input className="chatInput" id="chatInput" autoComplete="off" />
						</form>
					</div>
				</div>
			</div>
		);
	}
}

export default Chat;