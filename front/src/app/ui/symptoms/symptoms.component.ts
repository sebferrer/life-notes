import { Component, OnInit } from '@angular/core';
import { SymptomsService } from '../../infra';
import { Observable } from 'rxjs';
import { ISymptom } from 'src/app/models/symptom.model';

@Component({
	selector: 'app-symptoms',
	templateUrl: './symptoms.component.html',
	styleUrls: ['./symptoms.component.scss']
})
export class SymptomsComponent implements OnInit {

	public symptoms$: Observable<ISymptom[]>;
	public typesOfShoes: string[] = ['Boots', 'Clogs', 'Loafers', 'Moccasins', 'Sneakers'];

	constructor(
		private symptomsService: SymptomsService
	) { }

	public ngOnInit(): void {
		this.symptoms$ = this.symptomsService.getSymptoms();
	}
}
