export function getFormattedDate(date: Date) {
	const hoursDiff = date.getHours() - date.getTimezoneOffset() / 60;
	const minutesDiff = (date.getHours() - date.getTimezoneOffset()) % 60;
	date.setHours(hoursDiff);
	date.setMinutes(minutesDiff);
	return date.toJSON().slice(0, 10).replace(/-/g, '-');
}
