import { ISymptomOverview, ISymptomLog, ISymptom } from './symptom.model';
import { Observable } from 'rxjs';
import { DayViewModel } from './day.view.model';
import { AChart } from './chart.model';

export class DayChartViewModel extends AChart {
	private timeSymptoms: Map<string, ISymptomOverview[]>;
	private timeSymptomsOrder: string[];
	private lastSymptomMap: Map<string, ISymptomLog>;

	constructor(
		type: string,
		title: string
	) {
		super(type, title);
		this.options = {
			legend: { position: 'bottom', alignment: 'start' },
			vAxis: {
				title: 'Pain',
				viewWindow: {
					max: 5,
					min: 0,
				},
				ticks: [0, 1, 2, 3, 4, 5]
			}
		};
		this.timeSymptoms = new Map<string, ISymptomOverview[]>();
		this.timeSymptomsOrder = new Array<string>();
		this.lastSymptomMap = new Map<string, ISymptomLog>();
	}

	public update(symptoms$: Observable<ISymptom[]>, symptomMap: Map<string, string>, dayContent: DayViewModel): void {
		symptoms$.subscribe(() => {
			this.timeSymptoms = new Map<string, ISymptomOverview[]>();
			this.timeSymptomsOrder = new Array<string>();
			this.lastSymptomMap = new Map<string, ISymptomLog>();
			this.columns.push('Time');
			dayContent.symptoms.forEach(symptom => {
				symptom.logs.forEach(
					symptomLog => {
						const symptomLabel = symptomMap.get(symptom.key);
						if (!this.columns.includes(symptomLabel)) {
							this.columns.push(symptomLabel);
						}
						if (!this.timeSymptoms.has(symptomLog.time)) {
							this.timeSymptoms.set(symptomLog.time, new Array<ISymptomOverview>())
							this.timeSymptomsOrder.push(symptomLog.time)
						}
						this.timeSymptoms.get(symptomLog.time).push(symptomLog);
						this.lastSymptomMap.set(symptomLog.key, symptomLog);
					}
				);
			});
			this.data = new Array<Array<string | number>>();
			for (const [time, symptomsEntries] of this.timeSymptoms.entries()) {
				const entry = new Array<string | number>();
				entry.push(time);
				dayContent.symptoms.forEach(symptom => {
					const registeredSymptom = symptomsEntries.find(s => s.key === symptom.key);
					const registeredSymptomPain = registeredSymptom == null ?
						-1 : registeredSymptom.pain;
					entry.push(Number(registeredSymptomPain));
				});
				this.data.push(entry);
			}
			if (this.timeSymptoms.get(dayContent.wakeUp) == null) {
				const wakeUpEntry = new Array<string | number>();
				wakeUpEntry.push(dayContent.wakeUp);
				dayContent.symptoms.forEach(() => {
					wakeUpEntry.push(0);
				});
				this.data.push(wakeUpEntry);
			}
			this.data.sort();
			if (this.timeSymptoms.get(dayContent.goToBed) == null) {
				const bedTime = dayContent.goToBed > '00:00' && dayContent.goToBed < '07:00' ?
					'23:59' : dayContent.goToBed;
				const bedTimeEntry = new Array<string | number>();
				bedTimeEntry.push(bedTime);
				dayContent.symptoms.forEach(symptom => {
					bedTimeEntry.push(this.lastSymptomMap.get(symptom.key).pain);
				});
				this.data.push(bedTimeEntry);
			}
			this.data.sort();
			for (let i = 0; i < this.data.length; i++) {
				for (let j = 1; j < this.data[i].length; j++) {
					if (this.data[i][j] === -1) {
						this.data[i][j] = i === 0 ? 0 : this.data[i - 1][j];
					}
				}
			}
		});
	}
}