import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import { DaysService, ImporterExporterService } from 'src/app/infra';
import { getDetailedDate } from 'src/app/util/date.utils';
import { DayOverviewViewModel } from 'src/app/models/day.overview.view.model';
import { IDetailedDate } from 'src/app/models/detailed.date';
import { GlobalService } from 'src/app/infra/global.service';
import { ISymptom } from 'src/app/models/symptom.model';
import { ICustomType } from 'src/app/models/custom-type.model';
import { TranslocoService } from '@ngneat/transloco';
import { CalendarPieChartViewModel } from 'src/app/models/chartjs/calendar.pie.chart.view.model';
import { BedTimeChartViewModel } from 'src/app/models/chartjs/bedtime.chart.view.model';
import { WakeUpChartViewModel } from 'src/app/models/chartjs/wakeup.chart.view.model';
import { SleepChartViewModel } from 'src/app/models/chartjs/sleep.chart.view.model';
import { DialogInfoComponent } from '../dialog/dialog-info';
import { MatDialog } from '@angular/material/dialog';
import * as moment from 'moment';
import { ActivatedRoute } from '@angular/router';
import { endOfToday } from 'date-fns';

@Component({
	selector: 'app-monthly-report',
	templateUrl: './monthly-report.component.html',
	styleUrls: ['./monthly-report.component.scss']
})
export class MonthlyReportComponent implements OnInit {

	@ViewChild('exportContainer') exportContainer: ElementRef;
	public isExporting = false;

	public overviews: DayOverviewViewModel[];
	public overviews$: Subject<DayOverviewViewModel[]>;
	public previousOverviews: DayOverviewViewModel[];
	public previousOverviews$: Subject<DayOverviewViewModel[]>;
	public symptoms: ISymptom[];
	public symptoms$: BehaviorSubject<ISymptom[]>;
	public month: number;
	public year: number;
	public symptomMap: Map<string, string>;
	public monthMap: Map<number, string>;
	public today: IDetailedDate;
	public pieCharts: Map<string, CalendarPieChartViewModel>;
	public bedTimeChart: BedTimeChartViewModel;
	public wakeUpChart: WakeUpChartViewModel;
	public sleepChart: SleepChartViewModel;

	public debug = 'no error';

	public topMeds: { name: string, count: number }[];
	public topLogs: { name: string, count: number }[];
	public topSports: { name: string, count: number }[];
	// For each event type created by the user, its most frequent entries and the total of their quantities
	public topCustoms: { customType: ICustomType, items: { name: string, count: number, total: number }[] }[];

	constructor(
		public globalService: GlobalService,
		private daysService: DaysService,
		public translocoService: TranslocoService,
		public importerExporterService: ImporterExporterService,
		private dialog: MatDialog,
		private route: ActivatedRoute,
		private elementRef: ElementRef
	) {
		this.pieCharts = new Map<string, CalendarPieChartViewModel>();
		this.bedTimeChart = new BedTimeChartViewModel('line');
		this.wakeUpChart = new WakeUpChartViewModel('line');
		this.sleepChart = new SleepChartViewModel('line');
		this.symptoms = new Array<ISymptom>();
		this.symptoms$ = new BehaviorSubject<ISymptom[]>(new Array<ISymptom>());
		this.overviews = new Array<DayOverviewViewModel>();
		this.overviews$ = new Subject<DayOverviewViewModel[]>();
		this.previousOverviews = new Array<DayOverviewViewModel>();
		this.previousOverviews$ = new Subject<DayOverviewViewModel[]>();
		this.topMeds = [];
		this.topLogs = [];
		this.topSports = [];
		this.topCustoms = [];
	}

	public ngOnInit(): void {
		const monthYear = this.route.snapshot.paramMap.get('monthyear').split('-');
		this.month = parseInt(monthYear[1]);
		this.year = parseInt(monthYear[0]);
		this.today = getDetailedDate(moment().format('YYYY-MM-DD'));
		this.updateCalendar(this.month, this.year);
		this.symptomMap = this.globalService.symptomMap;
	}

	public async exportPdf(action: 'save' | 'share' = 'save'): Promise<void> {
		this.isExporting = true;
		setTimeout(async () => {
			try {
				if (this.exportContainer) {
					await this.importerExporterService.htmltoPDF(this.exportContainer.nativeElement, `LifeNotes_Report_${this.year}-${this.month}.pdf`, action);
				} else {
					console.error("Export Container not found");
				}
			} catch (error) {
				console.error("Export Error", error);
			} finally {
				this.isExporting = false;
			}
		}, 100);
	}

	public organizeSymptoms(symptoms: ISymptom[]): ISymptom[] {
		// Filter out existing dummies to avoid re-sorting them
		// Only keep symptoms having data this month, to avoid empty blocks in the report
		const cleanSymptoms = symptoms.filter(s => s.key !== 'dummy' && this.hasDataInMonth(s.key));
		let result: ISymptom[] = [];

		if (this.globalService.targetSymptomKey && this.globalService.targetSymptomKey !== '') {
			const target = cleanSymptoms.find(symptom => symptom.key === this.globalService.targetSymptomKey);
			const others = cleanSymptoms.filter(symptom => symptom.key !== this.globalService.targetSymptomKey);
			others.sort((a, b) => {
				if (a.label < b.label) { return -1; }
				if (a.label > b.label) { return 1; }
				return 0;
			});
			if (target) {
				result = [target, ...others];
			} else {
				result = others;
			}
		} else {
			result = [...cleanSymptoms].sort((a, b) => {
				if (a.label < b.label) { return -1; }
				if (a.label > b.label) { return 1; }
				return 0;
			});
		}

		return this.padSymptoms(result);
	}

	private hasDataInMonth(symptomKey: string): boolean {
		// 0 is a value like the others on an inverted scale (the worst one)
		const invertedScale = this.globalService.isScaleInverted(symptomKey);
		return this.overviews.some(day => (invertedScale ? day.findSymptomPain(symptomKey) != null
			: day.getSymptomPain(symptomKey) > 0) || day.loggedSymptomKeys.includes(symptomKey));
	}

	private padSymptoms(symptoms: ISymptom[]): ISymptom[] {
		const list = [...symptoms];
		const count = list.length;
		const remainder = count % 4;
		if (remainder !== 0) {
			const padCount = 4 - remainder;
			for (let i = 0; i < padCount; i++) {
				list.push({
					key: 'dummy',
					label: '', // Empty label for dummy
					type: 'symptom',
					logs: []
				} as ISymptom);
			}
		}
		return list;
	}

	public calculateStats(): void {
		// Top Meds
		const medMap = new Map<string, number>();
		this.overviews.forEach(day => {
			day.meds.forEach(med => {
				const count = medMap.get(med.key) || 0;
				medMap.set(med.key, count + 1);
			});
		});
		this.topMeds = Array.from(medMap.entries())
			.map(([name, count]) => ({ name, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 10);

		// Top Logs
		const logMap = new Map<string, number>();
		this.overviews.forEach(day => {
			day.logs.forEach(log => {
				// key is usually the category or title
				const count = logMap.get(log.key) || 0;
				logMap.set(log.key, count + 1);
			});
		});
		this.topLogs = Array.from(logMap.entries())
			.map(([name, count]) => ({ name, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 10);

		// Top Sports
		const sportMap = new Map<string, number>();
		this.overviews.forEach(day => {
			day.sports.forEach(sport => {
				const count = sportMap.get(sport.key) || 0;
				sportMap.set(sport.key, count + 1);
			});
		});
		this.topSports = Array.from(sportMap.entries())
			.map(([name, count]) => ({ name, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 10);

		// Top entries of the custom types
		this.topCustoms = this.globalService.customTypes.map(customType => {
			const entryMap = new Map<string, { name: string, count: number, total: number }>();
			this.overviews.forEach(day => {
				day.customs.filter(entry => entry.customType === customType.key).forEach(entry => {
					const name = entry.key || customType.label;
					const item = entryMap.get(name) || { name, count: 0, total: null };
					item.count++;
					if (entry.quantity != null) {
						item.total = (item.total || 0) + entry.quantity;
					}
					entryMap.set(name, item);
				});
			});
			const items = Array.from(entryMap.values()).sort((a, b) => b.count - a.count).slice(0, 10);
			return { customType, items };
		}).filter(group => group.items.length > 0);
	}

	public loadSymptoms(): void {
		this.globalService.symptoms$.subscribe(symptoms => {
			this.symptoms = [...symptoms];
			this.symptoms = this.organizeSymptoms(this.symptoms);
			this.symptoms$.next(this.symptoms);
		});
	}

	public updateCharts(): void {
		this.symptoms$.subscribe(symptoms => {
			symptoms.forEach(symptom => {
				this.pieCharts.set(symptom.key, new CalendarPieChartViewModel('doughnut', symptom.key,
					this.globalService.getPainColors(), !!symptom.invertedScale));
				this.pieCharts.get(symptom.key).update(this.overviews, this.globalService.painScale);
			});
		})
		this.bedTimeChart.update(this.overviews);
		this.wakeUpChart.update(this.overviews);
		this.sleepChart.update(this.overviews, this.previousOverviews);
	}

	public updateCalendar(month: number, year: number): void {
		this.daysService.getMonthDaysOverviews(month, year).subscribe(
			days => {
				const previousMonth = month - 1 === 0 ? 12 : month - 1;
				const previousYear = previousMonth === 12 ? year - 1 : year;
				this.daysService.getMonthDaysOverviews(previousMonth, previousYear).subscribe(
					previousDays => {
						this.overviews = new Array<DayOverviewViewModel>();
						days.forEach(day => {
							this.overviews.push(new DayOverviewViewModel(day));
						});
						this.previousOverviews = new Array<DayOverviewViewModel>();
						previousDays.forEach(day => {
							this.previousOverviews.push(new DayOverviewViewModel(day));
						});

						// Symptoms are filtered on this month's data, so load them once the overviews are known
						this.loadSymptoms();
						this.overviews$.next(this.overviews);
						this.previousOverviews$.next(this.previousOverviews);
						this.updateCharts();
						this.calculateStats();
					});
			});
	}

	public previous(): void {
		this.month--;
		if (this.month === 0) {
			this.month = 12;
			this.year--;
		}
		this.updateCalendar(this.month, this.year);
	}

	public next(): void {
		this.month++;
		if (this.month === 13) {
			this.month = 1;
			this.year++;
		}
		this.updateCalendar(this.month, this.year);
	}

	public openHelpDialog(): void {
		this.dialog.open(DialogInfoComponent, {
			autoFocus: false,
			width: '20rem',
			panelClass: 'custom-modalbox',
			data: {
				title: 'CALENDAR_HELP_DIALOG_TITLE',
				content: ['CALENDAR_HELP_DIALOG_CONTENT_1', 'CALENDAR_HELP_DIALOG_CONTENT_2']
			}
		}).afterClosed().subscribe(response => {
			if (response == null || response.answer !== 'close') {
				return;
			}
		});
	}

	public getPainColor(day: DayOverviewViewModel, symptomKey: string): string {
		return this.globalService.getPainColorClass(symptomKey, day.findSymptomPain(symptomKey));
	}
}
