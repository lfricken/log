export { };

declare global
{
	namespace NodeJS
	{
		interface Global
		{
			custom: {
				__root_static: string;
			}
		}
	}
}
