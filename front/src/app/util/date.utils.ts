import { getWeekOfMonth, getDayOfYear, getWeek } from 'date-fns';
import { IDetailedDate } from '../models/detailed.date';

export function getFormattedDate(date: Date) {
	const hoursDiff = date.getHours() - date.getTimezoneOffset() / 60;
	const minutesDiff = (date.getHours() - date.getTimezoneOffset()) % 60;
	date.setHours(hoursDiff);
	date.setMinutes(minutesDiff);
	return date.toJSON().slice(0, 10).replace(/-/g, '-');
}

export function getDetailedDate(date: Date): IDetailedDate {
	const month = date.getMonth() + 1;
	const day = date.getDate();
	const year = date.getFullYear();
	const weekOfMonth = getWeekOfMonth(date);
	const week = getWeek(date);
	const dayOfYear = getDayOfYear(date);
	const dayOfWeek = date.getDay();

	return { day, month, year, week, dayOfWeek, dayOfYear, weekOfMonth };
}

export function getDateFromString(date: string) {
	return new Date(Date.parse(date));
}

export function getMonthMap(short?: boolean): Map<number, string> {
	short = short == null ? false : short;
	return short ? new Map([[1, 'Jan'], [2, 'Feb'], [3, 'Mar'], [4, 'Apr'], [5, 'May'], [6, 'Jun'],
	[7, 'Jul'], [8, 'Aug'], [9, 'Sep'], [10, 'Oct'], [11, 'Nov'], [12, 'Dec']]) :
		new Map([[1, 'January'], [2, 'February'], [3, 'March'], [4, 'April'], [5, 'May'], [6, 'June'],
		[7, 'July'], [8, 'August'], [9, 'September'], [10, 'October'], [11, 'November'], [12, 'December']]);
}

