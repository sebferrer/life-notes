import { Component, HostBinding, Input } from '@angular/core';

// Spinner shown while a page loads. Its ring only turns (a CSS transform), which the browser animates apart from the
// page: it keeps turning while the page being loaded takes the main thread. The spinner of Angular Material drew its
// arc again at every frame instead (stroke-dashoffset): frozen by the loading, it showed only the start of its arc.
@Component({
	selector: 'app-spinner',
	templateUrl: 'spinner.component.html',
	styleUrls: ['spinner.component.scss']
})
export class SpinnerComponent {

	// In pixels, as the diameter of mat-spinner (100 by default)
	@Input() public diameter = 100;

	@HostBinding('style.width.px')
	public get width(): number {
		return this.diameter;
	}

	@HostBinding('style.height.px')
	public get height(): number {
		return this.diameter;
	}

	@HostBinding('attr.role') public readonly role = 'progressbar';
}
