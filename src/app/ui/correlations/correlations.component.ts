import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { ActivatedRoute } from '@angular/router';
import { TranslocoService } from '@ngneat/transloco';
import { forkJoin, Subscription } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { DaysService } from 'src/app/infra';
import { GlobalService } from 'src/app/infra/global.service';
import {
	analyzeCorrelations, CORRELATION_HOURS, CORRELATION_MIN_DAYS, ICorrelation, ICorrelationAnalysis, ICorrelationFactor,
	ICorrelationGroup
} from 'src/app/models/correlation.model';
import { ISymptom } from 'src/app/models/symptom.model';
import { fromNightMinutes } from 'src/app/models/sleep-stats.model';
import { formatAMPM } from 'src/app/util/time.util';
import { BottomSheetCorrelationsHelpComponent } from '../bottom-sheet/bottom-sheet-correlations-help';

// A part of a sentence, the name of the factor and the values in bold
export interface ITextPart {
	text: string;
	strong: boolean;
}

// One of the two groups compared: a bar and its figures
export interface ICorrelationRow {
	label: string;
	// e.g. "75 %", or an average intensity
	value: string;
	// e.g. "6 of 8 days"
	detail: string;
	// Length of the bar, from 0 to 1
	ratio: number;
}

export interface ICorrelationCard {
	id: string;
	correlation: ICorrelation;
	symptomLabel: string;
	sentence: ITextPart[];
	rows: ICorrelationRow[];
	// Material icon of the factor, or svg (meal, pill)
	icon: string;
	svgIcon: string;
	// Colors of the type of the factor
	colorClass: string;
	dates: { date: string, label: string }[];
}

// Marks of the factor and of a value in a translated sentence, replaced by bold parts
const FACTOR_MARK = '\u0001';
const VALUE_MARK = '\u0002';
const LEVELS = [1, 2, 3];
// Icon of each measure of the sleep: duration, bedtime, wake-up time, night too short or too long, irregular schedule
const SLEEP_ICONS: { [measure: string]: string } = {
	duration: 'bedtime', bedTime: 'nights_stay', wakeUp: 'wb_sunny', durationGap: 'hotel', irregularity: 'update'
};

// Correlations between what the user logs and their symptoms (V2: from the list of symptoms). Beta, with a help
// sheet saying they are raw statistics, neither causes nor a diagnosis. The engine is correlation.model.ts.
@Component({
	selector: 'app-correlations',
	templateUrl: './correlations.component.html',
	styleUrls: ['./correlations.component.scss']
})
export class CorrelationsComponent implements OnInit, OnDestroy {

	public readonly minDays = CORRELATION_MIN_DAYS;
	public readonly levels = LEVELS;
	// null until analyzed
	public analysis: ICorrelationAnalysis = null;
	public symptoms: ISymptom[] = [];
	public cards: ICorrelationCard[] = [];
	// Symptom of the filter, null for all of them
	public selectedSymptom: string = null;
	public showWeak = false;
	private expandedCards = new Set<string>();
	private subscription: Subscription;
	private analysisTimeout: any;

	constructor(
		public globalService: GlobalService,
		private daysService: DaysService,
		private translocoService: TranslocoService,
		private bottomSheet: MatBottomSheet,
		private route: ActivatedRoute
	) { }

	public ngOnInit(): void {
		// Opened from the statistics of a symptom: filtered on it
		this.selectedSymptom = this.route.snapshot.queryParamMap.get('symptom');
		this.subscription = forkJoin({
			days: this.daysService.getDays(),
			symptoms: this.globalService.symptoms$.pipe(take(1)),
			// Loaded when the app starts
			customTypes: this.globalService.customTypes$.pipe(filter(types => types != null), take(1))
		}).subscribe(({ days, symptoms }) => {
			this.symptoms = symptoms || [];
			if (!this.symptoms.some(symptom => symptom.key === this.selectedSymptom)) {
				this.selectedSymptom = null;
			}
			// Once the spinner is drawn: the analysis takes up to a second on a phone with years of data
			this.analysisTimeout = setTimeout(() => {
				const analysis = analyzeCorrelations(days, this.symptoms.map(s => ({ key: s.key, invertedScale: !!s.invertedScale })));
				this.cards = analysis.correlations.map(correlation => this.buildCard(correlation, analysis.lastDate));
				this.analysis = analysis;
			}, 50);
		});
	}

	public ngOnDestroy(): void {
		this.subscription.unsubscribe();
		clearTimeout(this.analysisTimeout);
	}

	public openHelp(): void {
		this.bottomSheet.open(BottomSheetCorrelationsHelpComponent, {
			panelClass: ['event-bottom-sheet', 'correlations-help-panel']
		});
	}

	public get enoughDays(): boolean {
		return this.analysis != null && this.analysis.trackedDays >= CORRELATION_MIN_DAYS;
	}

	// The cards of the symptom chosen: the weak leads on demand
	private get symptomCards(): ICorrelationCard[] {
		return this.cards.filter(card => this.selectedSymptom == null || card.correlation.symptomKey === this.selectedSymptom);
	}

	public get visibleCards(): ICorrelationCard[] {
		return this.symptomCards.filter(card => this.showWeak || card.correlation.confidence > 1);
	}

	public get worseCards(): ICorrelationCard[] {
		return this.visibleCards.filter(card => card.correlation.direction === 'worse');
	}

	public get betterCards(): ICorrelationCard[] {
		return this.visibleCards.filter(card => card.correlation.direction === 'better');
	}

	public get weakCount(): number {
		return this.symptomCards.filter(card => card.correlation.confidence === 1).length;
	}

	// One chip per symptom having correlations, and the one chosen (to go back to all of them), when there are several
	public get symptomChips(): { key: string, label: string, count: number }[] {
		const chips = this.symptoms
			.map(symptom => ({
				key: symptom.key,
				label: symptom.label,
				count: this.cards.filter(card => card.correlation.symptomKey === symptom.key
					&& (this.showWeak || card.correlation.confidence > 1)).length
			}))
			.filter(chip => chip.count > 0 || chip.key === this.selectedSymptom);
		return chips.length > 1 || (chips.length === 1 && this.selectedSymptom != null) ? chips : [];
	}

	public selectSymptom(key: string): void {
		this.selectedSymptom = key;
	}

	public isExpanded(card: ICorrelationCard): boolean {
		return this.expandedCards.has(card.id);
	}

	public toggleDays(card: ICorrelationCard): void {
		if (this.expandedCards.has(card.id)) {
			this.expandedCards.delete(card.id);
		} else {
			this.expandedCards.add(card.id);
		}
	}

	public trackCard(index: number, card: ICorrelationCard): string {
		return card.id;
	}

	// The chips are built again at each change detection: kept by symptom, a tap on one isn't lost
	public trackChip(index: number, chip: { key: string }): string {
		return chip.key;
	}

	public formatDate(date: string): string {
		// The parts as they are written (YYYY-MM-DD): a Date would move to the day before in the time zones behind UTC
		const [year, month, day] = date.split('-');
		return this.translocoService.translate('NUMERIC_DATE', { day, month, year });
	}

	private translate(key: string, params?: object): string {
		return this.translocoService.translate(key, params);
	}

	// The days of the year of the last entries without their year
	private formatShortDate(date: string, lastDate: string): string {
		if (date.slice(0, 4) !== (lastDate || '').slice(0, 4)) {
			return this.formatDate(date);
		}
		const [, month, day] = date.split('-').map(Number);
		return this.translate('DAY_MONTH_DATE', { day, month: this.translate('MONTH-SHORT-' + month) });
	}

	private buildCard(correlation: ICorrelation, lastDate: string): ICorrelationCard {
		const factor = correlation.factor;
		const icon = this.factorIcon(factor);
		return {
			id: `${factor.id}|${correlation.symptomKey}`,
			correlation,
			symptomLabel: this.globalService.symptomMap.get(correlation.symptomKey) || '',
			sentence: this.sentence(correlation),
			rows: this.rows(correlation),
			icon: icon.icon,
			svgIcon: icon.svg,
			colorClass: factor.kind === 'custom'
				? 'custom ' + this.globalService.customTypeClass(factor.customType) : factor.kind,
			dates: correlation.dates.map(date => ({ date, label: this.formatShortDate(date, lastDate) }))
		};
	}

	private factorIcon(factor: ICorrelationFactor): { icon: string, svg: string } {
		switch (factor.kind) {
			case 'meal':
				return { icon: null, svg: 'meal' };
			case 'med':
				return { icon: null, svg: 'pill' };
			case 'sport':
				return { icon: 'fitness_center', svg: null };
			case 'log':
				return { icon: 'event_note', svg: null };
			case 'custom':
				return { icon: this.globalService.getCustomType(factor.customType).icon, svg: null };
			case 'sleep':
				return { icon: SLEEP_ICONS[factor.measure] || 'bedtime', svg: null };
		}
		return { icon: 'label', svg: null };
	}

	// Name of the factor in the sentences: the name of its entries, its type for the whole types and the quantities
	private factorLabel(factor: ICorrelationFactor): string {
		if (factor.kind === 'custom') {
			const typeLabel = this.globalService.getCustomType(factor.customType).label;
			if (factor.wholeType) {
				return this.translate('CORRELATIONS_ALL_ENTRIES', { type: typeLabel });
			}
			return factor.measure || !factor.label ? typeLabel : factor.label;
		}
		if (factor.wholeType) {
			return this.translate('CORRELATIONS_ALL_ENTRIES', { type: this.translate('MANAGE_SPORTS') });
		}
		return factor.label;
	}

	private effectKey(correlation: ICorrelation): string {
		const worse = correlation.direction === 'worse';
		if (correlation.mode === 'frequency') {
			return worse ? 'CORRELATIONS_MORE_OFTEN' : 'CORRELATIONS_LESS_OFTEN';
		}
		if (this.globalService.isScaleInverted(correlation.symptomKey)) {
			return worse ? 'CORRELATIONS_LOWER' : 'CORRELATIONS_HIGHER';
		}
		return worse ? 'CORRELATIONS_MORE_INTENSE' : 'CORRELATIONS_LESS_INTENSE';
	}

	// Measured factor, the side of the threshold: e.g. SLEEP_SHORT, BEDTIME_LATE, QUANTITY_HIGH. Only the high side of a
	// bad night (too short or too long, irregular) is linked to a symptom.
	private measureKey(correlation: ICorrelation, side: 'low' | 'high'): string {
		const low = side === 'low';
		switch (correlation.factor.measure) {
			case 'duration':
				return low ? 'SLEEP_SHORT' : 'SLEEP_LONG';
			case 'bedTime':
				return low ? 'BEDTIME_EARLY' : 'BEDTIME_LATE';
			case 'wakeUp':
				return low ? 'WAKE_UP_EARLY' : 'WAKE_UP_LATE';
			case 'durationGap':
				return low ? 'SLEEP_GAP_LOW' : 'SLEEP_GAP_HIGH';
			case 'irregularity':
				return low ? 'SLEEP_SHIFT_LOW' : 'SLEEP_SHIFT_HIGH';
			default:
				return low ? 'QUANTITY_LOW' : 'QUANTITY_HIGH';
		}
	}

	// e.g. 6 h 40, 7 h, 45 min
	private formatDuration(minutes: number): string {
		const hours = Math.floor(minutes / 60);
		const rest = minutes % 60;
		if (hours === 0) {
			return this.translate('CORRELATIONS_MINUTES', { minutes: rest });
		}
		return rest === 0 ? this.translate('SLEEP_HOURS_FORMAT', { hours })
			: this.translate('SLEEP_DURATION_FORMAT', { hours, minutes: String(rest).padStart(2, '0') });
	}

	private thresholdLabel(correlation: ICorrelation): string {
		const factor = correlation.factor;
		const threshold = correlation.threshold;
		switch (factor.measure) {
			case 'duration':
			case 'durationGap':
			case 'irregularity':
				return this.formatDuration(threshold);
			case 'bedTime':
			case 'wakeUp': {
				const time = fromNightMinutes(threshold);
				return this.globalService.timeFormat === 'us' ? formatAMPM(time) : time;
			}
			default: {
				const unit = this.globalService.getCustomType(factor.customType).unit;
				const quantity = this.globalService.formatQuantity(threshold);
				return unit ? quantity + ' ' + unit : quantity;
			}
		}
	}

	// Translated text with the factor and the value in bold
	private parts(key: string, params: { [name: string]: any }, factor: string, value: string): ITextPart[] {
		const text = this.translate(key, { ...params, factor: FACTOR_MARK, value: VALUE_MARK });
		return text.split(new RegExp(`(${FACTOR_MARK}|${VALUE_MARK})`))
			.filter(part => part !== '')
			.map(part => part === FACTOR_MARK ? { text: factor, strong: true }
				: part === VALUE_MARK ? { text: value, strong: true } : { text: part, strong: false });
	}

	private sentence(correlation: ICorrelation): ITextPart[] {
		const factor = this.factorLabel(correlation.factor);
		const effect = this.translate(this.effectKey(correlation));
		let key: string;
		switch (correlation.relation) {
			case 'hours':
				key = 'HOURS';
				break;
			case 'nextDay':
				key = 'NEXT_DAY';
				break;
			default:
				key = correlation.factor.measure ? this.measureKey(correlation, correlation.side) : 'SAME_DAY';
		}
		const value = correlation.factor.measure ? this.thresholdLabel(correlation) : '';
		// The usual duration of the nights, next to the gap of a night too short or too long
		const usual = correlation.usual != null ? this.formatDuration(correlation.usual) : '';
		const parts = this.parts('CORRELATIONS_' + key, { effect, hours: CORRELATION_HOURS, usual }, factor, value);
		// A capital letter at the start of the sentence (none in Japanese, where it starts with the factor)
		const first = parts[0];
		if (first && !first.strong) {
			first.text = first.text.charAt(0).toLocaleUpperCase(this.globalService.locale) + first.text.slice(1);
		}
		return parts;
	}

	private rows(correlation: ICorrelation): ICorrelationRow[] {
		const factor = correlation.factor;
		const name = this.factorLabel(factor);
		let labels: string[];
		if (factor.measure) {
			const value = this.thresholdLabel(correlation);
			const other = correlation.side === 'low' ? 'high' : 'low';
			labels = [correlation.side, other].map(side => this.translate('CORRELATIONS_ROW_' + this.measureKey(correlation, side as 'low' | 'high'), { value }));
		} else {
			const keys = correlation.relation === 'hours' ? ['ROW_AFTER', 'ROW_SAME_HOURS']
				: correlation.relation === 'nextDay' ? ['ROW_DAY_AFTER', 'ROW_OTHER_DAYS'] : ['ROW_WITH', 'ROW_WITHOUT'];
			labels = keys.map(key => this.translate('CORRELATIONS_' + key, { factor: name }));
		}
		return [correlation.withFactor, correlation.withoutFactor].map((group, i) => this.row(correlation, group, labels[i]));
	}

	private row(correlation: ICorrelation, group: ICorrelationGroup, label: string): ICorrelationRow {
		if (correlation.mode === 'frequency') {
			const rate = group.total > 0 ? group.count / group.total : 0;
			return {
				label,
				value: Math.round(rate * 100) + ' %',
				detail: this.translate(correlation.relation === 'hours' ? 'CORRELATIONS_COUNT_TIMES' : 'CORRELATIONS_COUNT_DAYS',
					{ count: group.count, total: group.total }),
				ratio: rate
			};
		}
		// Average intensity on the scale of the settings (the 0-10 scale is stored in halves)
		const factor = this.globalService.painScale === 10 ? 2 : 1;
		const average = (group.average || 0) * factor;
		return {
			label,
			value: average.toLocaleString(this.globalService.locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 })
				+ ' / ' + this.globalService.painScale,
			detail: this.translate('CORRELATIONS_AVERAGE', { total: group.total }),
			ratio: average / this.globalService.painScale
		};
	}
}
