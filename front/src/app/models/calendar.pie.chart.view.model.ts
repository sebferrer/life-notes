import { DayOverviewViewModel } from 'src/app/models/day.overview.view.model';
import { AChartViewModel } from './chart.view.model';

export class CalendarPieChartViewModel extends AChartViewModel {

	private symptomKey: string;
	private symptomPainMap: Map<number, number>;
	private readonly NB_PAIN_LEVELS = 5;

	constructor(
		type: string,
		symptomKey: string
	) {
		super(type, symptomKey);
		this.type = type;
		this.data = new Array<Array<string | number>>();
		this.columns = new Array<string>();
		this.options = {
			pieHole: 0.4,
			colors: ['#93EA84', '#BFBC00', '#FDEC05', '#FFC000', '#E40026', '#980019']
		};
		this.symptomPainMap = new Map<number, number>();
		this.symptomKey = symptomKey;
	}

	public update(dayOverviews: DayOverviewViewModel[]): void {
		this.columns = ['Pain', 'Frequency'];

		dayOverviews.forEach(overview => {
			const symptom = overview.symptomOverviews.find(s => s.key === this.symptomKey);
			const symptomPain = symptom == null ? 0 : symptom.pain;
			if (!this.symptomPainMap.has(symptomPain)) {
				this.symptomPainMap.set(symptomPain, 1);
			}
			else {
				this.symptomPainMap.set(symptomPain, this.symptomPainMap.get(symptomPain) + 1);
			}
		});

		this.data = new Array<Array<string | number>>();
		for (let i = 0; i < this.NB_PAIN_LEVELS + 1; i++) {
			this.data.push([i.toString(), this.symptomPainMap.get(i) || 0]);
		}
	}
}