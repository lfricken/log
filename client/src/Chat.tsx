import * as React from 'react';
import { ReactNode } from 'react';
import './Chat.css';
import * as ViewModels from "./viewmodels";
import * as Shared from "./shared";
import * as Client from "./client";

console.log('Chat loading')
interface Props
{
	nickname: string;
	socket: SocketIOClient.Socket
}
interface State
{
	nickname: string;
	messages: ViewModels.Message[];
}
export class ChatComp extends React.Component<Props, State>
{
	// Initialize state
	state!: State;
	chatInput!: HTMLInputElement;
	nameInput!: HTMLInputElement;
	chatView!: HTMLDivElement;

	constructor(props: Props)
	{
		super(props);
		this.state = {
			nickname: this.props.nickname,
			messages: []
		};
	}
	componentDidMount(): ReactNode
	{
		this.chatView = document.getElementById('chatView') as HTMLDivElement;
		this.chatInput = document.getElementById('chatInput') as HTMLInputElement;
		this.nameInput = document.getElementById('nameInput') as HTMLInputElement;

		this.props.socket.on(Shared.Chat, this.onNewMessage.bind(this));

		var chatForm = document.getElementById('chatForm') as HTMLFormElement;
		chatForm.addEventListener('submit', this.onSubmitMessage.bind(this));
		return null;
	}
	private onSubmitMessage(e: Event): void
	{
		e.preventDefault();
		const text = this.chatInput.value;
		const nickname = this.nameInput.value;
		const message = new ViewModels.Message(nickname, text);
		Client.SaveCookie(Client.CookieNickname, nickname);

		if (nickname !== "" && text !== "")
		{
			this.props.socket.emit(Shared.Chat, message);
			this.chatInput.value = '';
		}
	}
	private onNewMessage(m: ViewModels.Message): void
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
	render(): ReactNode
	{
		console.log('Chat render')
		const { nickname: name, messages } = this.state;

		return (
			<div className="chat">
				<div className="chatView" id="chatView">
					{messages.map((message, idx: number) =>
						<div
							className={message.Sender === "" ? 'official_message' : ''}
							key={idx}>
							{message.Text}
						</div>
					)}
				</div>
				<div className="row">
					<div className="column">
						<input className="nameInput" id="nameInput" autoComplete="off" defaultValue={name} />
					</div>
					<div className="column_end">
						<form id="chatForm">
							<input className="chatInput" id="chatInput" autoComplete="off" />
						</form>
					</div>
				</div>
			</div>
		);
	}
}

export default ChatComp;