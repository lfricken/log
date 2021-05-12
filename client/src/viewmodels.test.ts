import * as real from "./viewmodel";

test('Targetted message gets sockets.', () =>
{

});

test('Message has max length after validation.', () =>
{
	const mes = new real.Message(
		"a name that is too long",
		"a message that is too longa message that is too longa message that is too longa message"
		+ "that is too longa message that is too longa message that is too longa message that is to"
		+ "o longa message that is too longa message that is too longa message that is too long"
		+ "o longa message that is too longa message that is too longa message that is too long"
		+ "o longa message that is too longa message that is too longa message that is too long",
		true
	);

	expect(mes.Text.length).toBeLessThanOrEqual(real.Message.MaxLenMessage);
});

