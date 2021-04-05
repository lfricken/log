/** Models that transfer data between client and server. View (Viewmodel) Model */

/* eslint-disable no-magic-numbers */
import ViewModel from "sanitize-html";
import { IPlayer } from "./shared";

type UniqueId = string;

// A message sent out to every client.
export class Message
{
	public static readonly MaxLenName: number = 7;
	public static readonly MaxLenMessage: number = 120;

	public Sender!: string;
	public Text!: string;
	public constructor(nickname: string, message: string, needsValidation: boolean = false)
	{
		this.Sender = nickname;
		this.Text = message;
		if (needsValidation)
			Message.Validate(this);
	}


	public static Validate(data: Message): boolean
	{
		data.Sender = data.Sender.slice(0, Message.MaxLenName)
		data.Text = data.Text.slice(0, Message.MaxLenMessage)
		data.Sender = ViewModel(data.Sender);
		data.Text = ViewModel(data.Text);

		if (data.Sender.length < 2) return false;
		if (data.Text.length < 2) return false;

		return true;
	}
	public static NameString(nickname: string, num: number): string
	{
		return `${nickname}(${num})`;
	}
	public static PlayerMsg(name: string, msg: Message): Message
	{
		return new Message(name, `${name}: ${msg.Text}`);
	}
	public static JoinMsg(name: string): Message
	{
		return new Message("", `${name} joined.`);
	}
	public static ReconnectMsg(name: string): Message
	{
		return new Message("", `${name} reconnected.`);
	}
	public static DoubleSocketMsg(target: number): Message
	{
		return new Message("", `${target}@You joined twice!`);
	}
	public static DisconnectMsg(name: string): Message
	{
		return new Message("", `${name} disconnected.`);
	}
	public static ChangeNameMsg(name: string, newName: string): Message
	{
		return new Message("", name + " changed their name to " + newName + ".");
	}
	public static LeaderMsg(name: string): Message
	{
		return new Message("", `${name} is the new lobby leader.`);
	}
	public static GetDestinations(text: string, players: Map<UniqueId, IPlayer>): string[]
	{
		const targetIds: string[] = [];

		// given format #,#,#...@message
		// send to only player numbers
		let split = text.split('@');
		if (split.length > 1)
		{
			const targets = split[0].split(/(?:,| )+/);
			// if a players number is contained in the targets list, add the target socket id
			for (const p of players.values())
			{
				if (targets.includes(p.Number.toString()))
				{
					targetIds.push(p.SocketId);
				}
			}
		}
		else
		{
			for (const p of players.values())
			{
				targetIds.push(p.SocketId);
			}
		}

		return targetIds;
	}
}
