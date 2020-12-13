import { ISymptomOverview, ISymptomLog, ISymptom } from './symptom.model';
import { Observable } from 'rxjs';
import { DayViewModel } from './day.view.model';
import { AChartViewModel } from './chart.view.model';

export class DayPieChartViewModel extends AChartViewModel {
	private symptomKey: string;
	private readonly NB_MINUTES_DAY = 1440;
	private symptomPainMap: Map<number, number>;

	constructor(
		type: string,
		symptomKey: string
	) {
		super(type, symptomKey);
		this.type = type;
		this.data = new Array<Array<string | number>>();
		this.columns = new Array<string>();
		this.options = { pieHole: 0.4 };
		this.symptomPainMap = new Map<number, number>();
		this.symptomKey = symptomKey;
	}

	public update(symptoms$: Observable<ISymptom[]>, symptomMap: Map<string, string>, dayContent: DayViewModel): void {
		symptoms$.subscribe(() => {
			const symptomLogs = dayContent.symptoms.find(s => s.key === this.symptomKey).logs;
			console.log(symptomLogs);
			/*for (let i = 0; i < symptomLogs.length; i++) {
				if (!this.symptomPainMap.has(symptomLogs[i].pain)) {
					this.symptomPainMap.set(symptomLogs[i].pain, symptomLogs[i].time);
				}
			}*/

			this.columns = ['Browser', 'Percentage'];
			this.data = [
				['Firefox', 45.0],
				['IE', 26.8],
				['Chrome', 12.8],
				['Safari', 8.5],
				['Opera', 6.2],
				['Others', 0.7]
			]
		});
	}
}