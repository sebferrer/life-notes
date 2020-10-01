import { Component } from '@angular/core';
import { DbContext } from './infra';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})
export class AppComponent {
	public title = 'Healthy Day';

	constructor(
		private readonly context: DbContext
	) {
		// context.database.

		const day = {
			_id: '2020-09-24',
			"date": "2020-09-24",
			"symptomOverviews": [],
			"symptoms": [],
			"logs": [],
			"meds": [],
			"meals": [],
			"wakeUp": "10:00",
			"goToBed": "00:00"
		};

		context.database.put(day, (error, result) => {
			if (!error) {
				console.log('Successfully posted a todo!');
			} else {
				console.log(error);
			}
		});

		context.database.allDocs({ include_docs: true, descending: true }, (err, doc) => {
			console.log(doc.rows);
		});
	}

	public lolNope(): void {
		window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '_blank');
	}
}
