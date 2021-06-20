/** The component that lets players message eachother. */
import * as View from "./view";
import * as React from 'react';
import * as Vm from "./viewmodel";
import * as Shared from "./shared";
import './Chat.css';
import './Main.css';

interface Props
{
	Socket: SocketIOClient.Socket
}
interface State
{
	Nickname: string;
	Messages: Vm.Message[];
}
export class ChatComp extends React.Component<Props, State>
{
	state!: State;
	chatInput!: HTMLInputElement;
	nameInput!: HTMLInputElement;
	chatView!: HTMLDivElement;

	constructor(props: Props)
	{
		const clientNickname = View.LoadSaveDefaultCookie(View.CookieNickname, "Rando");
		super(props);
		this.state = {
			Nickname: clientNickname,
			Messages: [],
		};
	}
	componentDidMount(): React.ReactNode
	{
		this.chatView = document.getElementById('chatView') as HTMLDivElement;
		this.chatInput = document.getElementById('chatInput') as HTMLInputElement;
		this.nameInput = document.getElementById('nameInput') as HTMLInputElement;

		this.props.Socket.on(Shared.Event.Message, this.onNewMessage.bind(this));

		var chatForm = document.getElementById('chatForm') as HTMLFormElement;
		chatForm.addEventListener('submit', this.onSubmitMessage.bind(this));
		return null;
	}
	private onSubmitMessage(e: Event): void
	{
		e.preventDefault();
		const text = this.chatInput.value;
		const nickname = this.nameInput.value;
		const message = new Vm.Message(nickname, text, true);
		View.SaveCookie(View.CookieNickname, nickname);

		if (nickname !== "" && text !== "")
		{
			this.props.Socket.emit(Shared.Event.Message, message);
			this.chatInput.value = '';
		}
	}
	private onNewMessage(m: Vm.Message): void
	{
		// follow the bottom of the chat if they are already looking there
		const pixelFollowRange = 80;
		const follow = (this.chatView.scrollHeight - this.chatView.offsetHeight - this.chatView.scrollTop) < pixelFollowRange;

		this.setState((prevState: Readonly<State>, _: Readonly<Props>) =>
		{
			const messages = Shared.clone(prevState.Messages);
			messages.push(m);
			return { Messages: messages };
		});

		if (follow)
			this.chatView.scrollTop = this.chatView.scrollHeight;
	}
	render(): React.ReactNode
	{
		const { Nickname: name, Messages: messages } = this.state;

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
							maxLength={Vm.Message.MaxLenName}
							autoComplete="off"
							autoCapitalize="on"
							defaultValue={name}
						/>
					</div>
					<div className="flex no-min-width padding-small flex-row" >
						<form className="flex flex-row" id="chatForm">
							<input
								className="flex"
								id="chatInput"
								maxLength={Vm.Message.MaxLenMessage}
								autoComplete="off"
							/>
						</form>
					</div>
				</div>
			</div>
		);
	}
}

export default ChatComp;
