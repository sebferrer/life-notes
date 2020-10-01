import { Component } from '@angular/core';
import { DbContext } from './infra';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})
export class AppComponent {
	public title = 'Healthy Day';
}
