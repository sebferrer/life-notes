import { ISymptom } from './symptom.model';

export class SymptomViewModel {

	public readonly type: string;
	public readonly key: string;
	public readonly label: string;
	public readonly invertedScale: boolean;
	public editable: boolean;

	constructor(symptom: ISymptom) {
		this.type = symptom.type;
		this.key = symptom.key;
		this.label = symptom.label;
		this.invertedScale = !!symptom.invertedScale;
		this.editable = false;
	}

}
