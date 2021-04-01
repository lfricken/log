
import cookie from 'react-cookies';
import * as Shared from './shared';


export const CookieDurationSeconds = 31536000;
export const CookieUniqueId = "uniqueid";
export const CookieNickname = "nickname";

export interface ICookie
{
	uniqueid: Shared.UniqueId;
	nickname: string;
}
export function LoadSaveDefaultCookie(key: keyof (ICookie), defaultValue: string): string
{
	let val = cookie.load(key);
	if (val === null || val === undefined)
	{
		val = defaultValue;
		cookie.save(key, val, { expires: new Date(Date.now() + CookieDurationSeconds) });
	}
	return val;
}
export function SaveCookie(key: keyof (ICookie), val: string): void
{
	cookie.save(key, val, { expires: new Date(Date.now() + CookieDurationSeconds) });
}
export function GetUniqueId(len: number): string
{
	var result = '';
	var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	var charactersLength = characters.length;
	for (var i = 0; i < len; i++)
	{
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}
	return result;
}

