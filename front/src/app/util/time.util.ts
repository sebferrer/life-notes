export function timeToMinutes(time: string, separator?: string): number {
	if (time == null) {
		return null;
	}
	separator = separator || ':';
	const splittedTime = time.split(separator);
	return parseInt(splittedTime[0], 10) * 60 + parseInt(splittedTime[1], 10);
}

export function timeToSeconds(time: string, separator?: string): number {
	return 60 * timeToMinutes(time, separator);
}

export function formatMinutes(minutes: number): string {
	if (minutes == null || minutes === 1440) {
		return '';
	}
	const hours = Math.trunc(minutes / 60);
	const remains = minutes % 60;
	if (minutes >= 0) {
		const fHours = hours > 9 ? hours.toString() : '0' + hours;
		const fRemains = remains > 9 ? remains.toString() : '0' + remains;
		return fHours + ':' + fRemains;
	}
	if (minutes > -1440) {
		return formatMinutes(1440 + minutes);
	}
	return '';
}

export function formatMinutesInDurationContracted(minutes: number): string {
	const formattedSplitted = formatMinutes(minutes).split(':');
	let hours = formattedSplitted[0];
	hours = hours.length > 1 && hours[0] === '0' ? hours.substring(1) : hours;
	return hours + 'h';
}

export function formatMinutesInDuration(minutes: number): string {
	const formattedSplitted = formatMinutes(minutes).split(':');
	let mins = formattedSplitted[1];
	mins = mins.length > 1 && mins[0] === '0' ? mins.substring(1) : mins;
	return formatMinutesInDurationContracted(minutes) + ',' + mins + 'min';
}
