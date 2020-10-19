import { ISymptom } from './symptom.model';

export class SymptomViewModel {

	public readonly type: string;
	public readonly key: string;
	public readonly label: string;
	public editable: boolean;

	constructor(symptom: ISymptom) {
		this.type = symptom.type;
		this.key = symptom.key;
		this.label = symptom.label;
		this.editable = false;
	}

}
