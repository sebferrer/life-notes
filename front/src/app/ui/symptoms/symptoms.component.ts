import { Component, OnInit } from '@angular/core';
import { SymptomsService } from '../../infra';
import { Observable } from 'rxjs';
import { SymptomViewModel } from 'src/app/models/symptom.view.model';
import { map } from 'rxjs/operators';

@Component({
	selector: 'app-symptoms',
	templateUrl: './symptoms.component.html',
	styleUrls: ['./symptoms.component.scss']
})
export class SymptomsComponent implements OnInit {

	public symptoms$: Observable<SymptomViewModel[]>;

	constructor(
		private symptomsService: SymptomsService
	) { }

	public ngOnInit(): void {
		this.symptoms$ = this.symptomsService.getSymptoms().pipe(
			map(symptoms => symptoms.map(symptom => new SymptomViewModel(symptom)))
		);
	}

	public toggleEditable(symptoms: SymptomViewModel[], symptom: SymptomViewModel): void {
		for (const s of symptoms) {
			if (s.key !== symptom.key) {
				s.editable = false;
			}
		}
		symptom.editable = symptom.editable ? false : true;
	}

	public editSymptom(): void {

	}

	public deleteSymptom(): void {

	}

}
