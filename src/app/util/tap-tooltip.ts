import { MatTooltip } from '@angular/material/tooltip';

// Tooltip shown on tap too, as a hover shows it on a computer: for a few seconds, a touch screen having no hover
// to end it. One at a time.
export class TapTooltip {

	private current: MatTooltip;
	private timeout: any;

	public show(tooltip: MatTooltip): void {
		if (this.current != null && this.current !== tooltip) {
			this.current.hide();
		}
		this.current = tooltip;
		tooltip.show();
		clearTimeout(this.timeout);
		this.timeout = setTimeout(() => tooltip.hide(), 3000);
	}

	public destroy(): void {
		clearTimeout(this.timeout);
	}
}
