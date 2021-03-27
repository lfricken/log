import * as real from "./models-shared";

test('Targetted message gets sockets.', () =>
{

});

test('Message has max length after validation.', () =>
{
	const mes = new real.Chat.Message(
		"a name that is too long",
		"a message that is too longa message that is too longa message that is too longa message"
		+ "that is too longa message that is too longa message that is too longa message that is to"
		+ "o longa message that is too longa message that is too longa message that is too long"
		+ "o longa message that is too longa message that is too longa message that is too long"
		+ "o longa message that is too longa message that is too longa message that is too long"
	)

	expect(mes.Text.length <= real.Chat.Message.MaxLenMessage).toBe(true);
});

