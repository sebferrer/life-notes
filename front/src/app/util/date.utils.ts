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
	const month = date.getUTCMonth() + 1;
	const day = date.getUTCDate();
	const year = date.getUTCFullYear();
	const weekOfMonth = getWeekOfMonth(date);
	const week = getWeek(date);
	const dayOfYear = getDayOfYear(date);
	const dayOfWeek = date.getDay();

	return { day, month, year, week, dayOfWeek, dayOfYear, weekOfMonth };
}
