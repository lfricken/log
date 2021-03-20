export { };

declare global
{
	namespace NodeJS
	{
		interface Global
		{
			custom: {
				__rootPublic: string;
			}
		}
	}
}
