/** The component that lets players message eachother. */

import * as React from 'react';
import { ReactNode } from 'react';
import * as ViewModel from "./viewmodel";
import * as Shared from "./shared";
import * as View from "./view";
import './Chat.css';
import './Main.css';

interface Props
{
	nickname: string;
	socket: SocketIOClient.Socket
}
interface State
{
	nickname: string;
	messages: ViewModel.Message[];
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
		const message = new ViewModel.Message(nickname, text);
		View.SaveCookie(View.CookieNickname, nickname);

		if (nickname !== "" && text !== "")
		{
			this.props.socket.emit(Shared.Chat, message);
			this.chatInput.value = '';
		}
	}
	private onNewMessage(m: ViewModel.Message): void
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
		const { nickname: name, messages } = this.state;
		const maxNameLen = ViewModel.Message.MaxLenName;

		return (
			<div className="full-size flex-column">
				<div className="flex message-view" id="chatView">
					{messages.map((message, idx: number) =>
						<div
							className={message.Sender === "" ? 'server-message' : ''}
							key={idx}>
							{message.Text}
						</div>
					)}
				</div>
				<div className="flex-row">
					<div className="padding-small flex-row" >
						<input
							className="nickname-box-width"
							id="nameInput"
							autoComplete="off"
							autoCapitalize="off"
							maxLength={maxNameLen}
							defaultValue={name}
						/>
					</div>
					<div className="flex no-min-width padding-small flex-row" >
						<form className="flex flex-row" id="chatForm">
							<input className="flex" id="chatInput" autoComplete="off" />
						</form>
					</div>
				</div>
			</div>
		);
	}
}

export default ChatComp;