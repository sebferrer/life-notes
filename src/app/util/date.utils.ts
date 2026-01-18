import { getWeekOfMonth, getDayOfYear, getWeek, subDays } from 'date-fns';
import { IDetailedDate } from '../models/detailed.date';
import * as moment from 'moment';

/*
export function getFormattedDate(date: Date): string {
	const hoursDiff = date.getHours() - date.getTimezoneOffset() / 60;
	const minutesDiff = (date.getHours() - date.getTimezoneOffset()) % 60;
	date.setHours(hoursDiff);
	date.setMinutes(minutesDiff);
	return date.toJSON().slice(0, 10).replace(/-/g, '-');
}*/

export function getDetailedDate(formattedDate: string): IDetailedDate {
	const date = moment(formattedDate).toDate();
	const month = date.getMonth() + 1;
	const day = date.getDate();
	const year = date.getFullYear();
	const weekOfMonth = getWeekOfMonth(date);
	const week = getWeek(date);
	const dayOfYear = getDayOfYear(date);
	const dayOfWeek = date.getDay() || 7;

	return { day, month, year, week, dayOfWeek, dayOfYear, weekOfMonth, date, formattedDate };
}

export function getDateFromString(date: string): Date {
	return moment(Date.parse(date)).toDate();
}

export function getDetailedDates(start: string, nbDays: number): IDetailedDate[] {
	const startDate = moment(start).toDate();
	const detailedDates = new Array<IDetailedDate>();
	for (let i = 1; i <= nbDays; i++) {
		detailedDates.push(getDetailedDate(moment(subDays(startDate, i)).format('YYYY-MM-DD')));
	}
	return detailedDates;
}

export function subFormattedDate(date: string, nb: number) {
	return moment(subDays(moment(date).toDate(), nb)).format('YYYY-MM-DD');
}
