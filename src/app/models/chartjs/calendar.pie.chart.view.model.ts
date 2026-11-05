import { APieChartViewModel } from './pie.chart.view.model';
import { DayOverviewViewModel } from '../day.overview.view.model';
import { getPainColorLevel } from '../symptom.model';

export class CalendarPieChartViewModel extends APieChartViewModel {

	private readonly NB_PAIN_LEVELS = 5;
	private symptomKey: string;
	private symptomPainMap: Map<number, number>;
	private colorsArray: string[];
	private invertedScale: boolean;

	constructor(
		type: string,
		symptomKey: string,
		colors: string[],
		invertedScale: boolean = false
	) {
		super(type);
		this.type = type;
		this.symptomPainMap = new Map<number, number>();
		this.symptomKey = symptomKey;
		this.invertedScale = invertedScale;
		// One color per level, in the order of the labels (0 first)
		this.colorsArray = colors.map((_, level) => colors[getPainColorLevel(level, invertedScale)]);
		this.colors = [
			{
				backgroundColor: this.colorsArray
			}
		];
		this.options = {
			legend: {
				position: 'right'
			}
		}
	}

	public update(dayOverviews: DayOverviewViewModel[], painScale: number = 5): void {
		dayOverviews.forEach(overview => {
			const symptom = overview.symptomOverviews.find(s => s.key === this.symptomKey);
			// A day without intensity counts as a day without pain, not as the worst value of an inverted scale
			if (symptom == null && this.invertedScale) {
				return;
			}
			const symptomPain = symptom == null ? 0 : symptom.pain;
			let key = Math.ceil(symptomPain);

			// Safety clamp to ensure it falls within color/label range
			if (key > this.NB_PAIN_LEVELS) {
				key = this.NB_PAIN_LEVELS;
			}

			if (!this.symptomPainMap.has(key)) {
				this.symptomPainMap.set(key, 1);
			}
			else {
				this.symptomPainMap.set(key, this.symptomPainMap.get(key) + 1);
			}
		});

		this.labels = new Array<string>();
		this.data = new Array<number>();
		for (let i = 0; i < this.NB_PAIN_LEVELS + 1; i++) {
			let labelValue = i.toString();
			if (painScale === 10) {
				if (i === 0) {
					labelValue = '0';
				} else {
					labelValue = ((i * 2) - 1) + '-' + (i * 2);
				}
			}
			this.labels.push(labelValue);
			this.data.push(this.symptomPainMap.get(i) || 0);
		}
	}
}