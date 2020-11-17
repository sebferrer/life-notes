import { getWeekOfMonth, getDayOfYear, getWeek, subDays } from 'date-fns';
import { IDetailedDate } from '../models/detailed.date';

export function getFormattedDate(date: Date): string {
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
	const formattedDate = getFormattedDate(date);

	return { day, month, year, week, dayOfWeek, dayOfYear, weekOfMonth, date, formattedDate };
}

export function getDateFromString(date: string): Date {
	return new Date(Date.parse(date));
}

export function getDetailedDates(start: string, nbDays: number): IDetailedDate[] {
	const startDate = new Date(start);
	const detailedDates = new Array<IDetailedDate>();
	for (let i = 1; i <= nbDays; i++) {
		detailedDates.push(getDetailedDate(subDays(startDate, i)));
	}
	return detailedDates;
}

export function subFormattedDate(date: string, nb: number) {
	return getFormattedDate(subDays(new Date(date), nb));
}
