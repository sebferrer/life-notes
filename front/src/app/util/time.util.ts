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

export function formatAMPM(time: string) {
	const splittedTime = time.split(':');
	let hours = parseInt(splittedTime[0]);
	let minutes = parseInt(splittedTime[1]);
	let ampm = hours >= 12 ? 'PM' : 'AM';
	hours = hours % 12;
	hours = hours ? hours : 12;
	const strHours = hours < 10 ? '0' + hours : hours;
	const strMinutes = minutes < 10 ? '0' + minutes : minutes;
	var strTime = strHours + ':' + strMinutes + ' ' + ampm;
	return strTime;
}

export function format24H(time: string) {
	const splittedAMPMTime = time.split(' ');
	if (splittedAMPMTime.length < 2 || (splittedAMPMTime[1] != 'AM' && splittedAMPMTime[1] != 'PM')) {
		return time;
	}
	const amPm = splittedAMPMTime[1];
	const splittedTime = time.split(':');
	let hours = parseInt(splittedTime[0]);
	let minutes = parseInt(splittedTime[1]);
	if (hours === 12) {
		hours = amPm === 'PM' ? hours : 0;
	} else {
		hours = amPm === 'PM' ? hours + 12 : hours;
	}
	const strHours = hours < 10 ? '0' + hours : hours;
	const strMinutes = minutes < 10 ? '0' + minutes : minutes;
	var strTime = strHours + ':' + strMinutes;
	return strTime;
}
