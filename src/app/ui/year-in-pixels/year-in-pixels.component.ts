import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DaysService } from 'src/app/infra';
import { GlobalService } from 'src/app/infra/global.service';
import { DayOverviewViewModel } from 'src/app/models/day.overview.view.model';
import * as moment from 'moment';

// One pixel per day of the year, colored by the pain of the target symptom
@Component({
	selector: 'app-year-in-pixels',
	templateUrl: './year-in-pixels.component.html',
	styleUrls: ['./year-in-pixels.component.scss']
})
export class YearInPixelsComponent implements OnInit {

	public readonly months = Array.from({ length: 12 }, (_, i) => i + 1);
	public readonly dayNumbers = Array.from({ length: 31 }, (_, i) => i + 1);
	// Pain levels of the calendar colors
	public readonly painLevels = [0, 1, 2, 3, 4, 5];
	public readonly todayDate = moment().format('YYYY-MM-DD');
	public year: number;
	// Days of each month (index 0 for January), undefined until the first year is loaded
	public monthDays: DayOverviewViewModel[][];

	constructor(
		public globalService: GlobalService,
		private daysService: DaysService,
		private route: ActivatedRoute
	) { }

	public ngOnInit(): void {
		const year = Number(this.route.snapshot.paramMap.get('year'));
		this.loadYear(Number.isInteger(year) && year > 0 ? year : moment().year());
	}

	public loadYear(year: number): void {
		this.year = year;
		this.daysService.getYearDaysOverviews(year).subscribe(months => {
			// A faster tap on the arrows asked for another year meanwhile
			if (year === this.year) {
				this.monthDays = months.map(days => days.map(day => new DayOverviewViewModel(day)));
			}
		});
	}

	public previous(): void {
		this.loadYear(this.year - 1);
	}

	public next(): void {
		this.loadYear(this.year + 1);
	}

	// null when the month is shorter
	public getDay(month: number, dayNumber: number): DayOverviewViewModel {
		return this.monthDays[month - 1][dayNumber - 1] || null;
	}

	public pixelClass(day: DayOverviewViewModel): string {
		if (day.date > this.todayDate) {
			return 'future';
		}
		const pain = day.findSymptomPain(this.globalService.targetSymptomKey);
		// Unlike the calendar, a day without data isn't shown as a day without pain: the year would look all green
		return pain == null ? 'no-data' : this.levelClass(pain);
	}

	// Reversed with the scale of the symptom
	public levelClass(level: number): string {
		return 'color-' + this.globalService.getPainColorClass(this.globalService.targetSymptomKey, level);
	}

	// Same labels as the calendar charts
	public levelLabel(level: number): string {
		return this.globalService.painScale === 10 && level > 0 ? (level * 2 - 1) + '-' + (level * 2) : String(level);
	}
}
