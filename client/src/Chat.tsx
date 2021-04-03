import * as React from 'react';
import { ReactNode } from 'react';
import './Chat.css';
import * as ViewModels from "./viewmodel";
import * as Shared from "./shared";
import * as View from "./view";

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
		View.SaveCookie(View.CookieNickname, nickname);

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
				<div className="wrapper">
					<div className="aside ord1" >
						<input id="nameInput" autoComplete="off" defaultValue={name} />
					</div>
					<div className="aside ord2" >
						<form id="chatForm">
							<input id="chatInput" autoComplete="off" />
						</form>
					</div>
				</div>
				<div className="wrapper">
					<header className="header">Header</header>
					<article className="main">
						<p>Pellentesque habitant morbi tristique senectus et netus et
						malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae,
						ultricies eget, tempor sit amet, ante. Donec eu libero sit amet quam egestas semper.
							Aenean ultricies mi vitae est. Mauris placerat eleifend leo.</p>
					</article>
					<div className="aside aside-1">Aside 1</div>
					<aside className="aside aside-2">Aside 2</aside>
					<footer className="footer">Footer</footer>
				</div>
			</div>
		);
	}
}

export default ChatComp;