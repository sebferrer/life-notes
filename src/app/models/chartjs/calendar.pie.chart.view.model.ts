import { APieChartViewModel } from './pie.chart.view.model';
import { DayOverviewViewModel } from '../day.overview.view.model';

export class CalendarPieChartViewModel extends APieChartViewModel {

	private readonly NB_PAIN_LEVELS = 5;
	private symptomKey: string;
	private symptomPainMap: Map<number, number>;
	private colorsArray: string[];

	constructor(
		type: string,
		symptomKey: string
	) {
		super(type);
		this.type = type;
		this.symptomPainMap = new Map<number, number>();
		this.symptomKey = symptomKey;
		this.colorsArray = ['#93EA84', '#BFBC00', '#FDEC05', '#FFC000', '#E40026', '#980019'];
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

	public update(dayOverviews: DayOverviewViewModel[]): void {
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

		this.labels = new Array<string>();
		this.data = new Array<number>();
		for (let i = 0; i < this.NB_PAIN_LEVELS + 1; i++) {
			this.labels.push(i.toString());
			this.data.push(this.symptomPainMap.get(i) || 0);
		}
	}
}