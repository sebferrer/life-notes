import { Component, Input } from '@angular/core';
import { GlobalService } from 'src/app/infra/global.service';

export type PageSkeletonKind = 'timeline' | 'calendar' | 'year' | 'list' | 'report' | 'correlations';

// What a page shows while its data loads, at the place of its content.
// V2: a mock-up of the page in grey shapes, as its cards, rows and grids are laid out, swept by a light. It appears
// only after 150 ms: a quick load shows the page at once, without a flash, and the page then fades in (see
// page-content-in in styles.scss). Its animations only change transform and opacity, which the browser runs apart
// from the page: they don't freeze while the page being loaded takes the main thread.
// V1: the spinner (see GlobalService.uiVersion). The correlations exist in the V2 only.
@Component({
	selector: 'app-page-skeleton',
	templateUrl: 'page-skeleton.component.html',
	styleUrls: ['page-skeleton.component.scss']
})
export class PageSkeletonComponent {

	@Input() public kind: PageSkeletonKind = 'list';

	// Events of each day of the timeline, entries of a list
	public readonly dayEvents = [[0, 1, 2], [0], [0, 1]];
	public readonly listItems = [0, 1, 2, 3, 4];
	// Varied widths, so the mock-up doesn't look like a pattern
	public readonly titleWidths = ['52%', '38%', '61%', '45%', '56%'];
	public readonly lineWidths = ['70%', '58%', '76%', '64%', '50%'];
	// A month: its days of the week, then 5 weeks
	public readonly weekDays = this.range(7);
	public readonly monthCells = this.range(35);
	// A year: 12 months of 31 days
	public readonly months = this.range(12);
	public readonly monthDays = this.range(31);
	public readonly legend = this.range(6);
	public readonly correlations = this.range(3);

	constructor(
		private globalService: GlobalService
	) { }

	public get classic(): boolean {
		return this.globalService.isUiV1 && this.kind !== 'correlations';
	}

	private range(count: number): number[] {
		return Array.from({ length: count }, (_, i) => i);
	}
}
