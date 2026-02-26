import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild, AfterViewInit } from '@angular/core';

// See: https://netbasal.com/build-an-infinite-scroll-component-in-angular-a9c16907a94d
@Component({
	selector: 'app-infinite-scroll',
	template: `
		<ng-content></ng-content>
		<div #anchor></div>
		<div *ngIf="isLoading" class="infinite-scroll-spinner">
			<ion-spinner name="crescent"></ion-spinner>
		</div>
	`,
	styles: [`
		.infinite-scroll-spinner {
			display: flex;
			justify-content: center;
			align-items: center;
			padding: 16px 0;
		}
		.infinite-scroll-spinner ion-spinner {
			--color: var(--ion-color-primary, #3880ff);
			width: 32px;
			height: 32px;
		}
	`]
})
export class InfiniteScrollComponent implements AfterViewInit, OnDestroy {

	@Input()
	public isLoading = false;

	@Output()
	public scrolled = new EventEmitter();

	@ViewChild('anchor', { static: true })
	public anchor: ElementRef<HTMLDivElement>;

	public get element(): Element {
		return this.host.nativeElement;
	}

	private _observer: IntersectionObserver;

	private get isHostScrollable(): boolean {
		const style = window.getComputedStyle(this.element);
		return style.getPropertyValue('overflow') === 'auto' ||
			style.getPropertyValue('overflow-y') === 'scroll';
	}

	constructor(
		private host: ElementRef
	) { }

	public ngAfterViewInit(): void {
		this._observer = new IntersectionObserver(([entry]) => {
			if (entry.isIntersecting) {
				this.scrolled.emit();
			}
		}, {
			root: this.isHostScrollable ? this.element : null,
		});
		this._observer.observe(this.anchor.nativeElement);
	}

	public ngOnDestroy(): void {
		this._observer.disconnect();
	}
}
