import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, Input, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { GlobalService } from 'src/app/infra/global.service';
import * as moment from 'moment';
import { IDetailedDate } from 'src/app/models/detailed.date';
import { getDetailedDate } from 'src/app/util/date.utils';

type Side = 'top' | 'right' | 'bottom' | 'left';

interface IArrowSpec {
	from: string;
	fromSide: Side;
	to: string;
	toSide: Side;
	// How far the curve goes out of the sides, in scene units (by default, from the distance)
	bend?: number;
}

interface IArrow {
	line: string;
	head: string;
}

// Scenes are drawn on a 300 units wide grid (see --u in the stylesheet), 380 units high at most
const SCENE_WIDTH = 300;
const SCENE_HEIGHTS: { [scene: string]: number } = {
	'create-symptom': 380,
	'target-symptom': 256,
	'day-overview': 300,
	'auto-overview': 243,
	'calendar': 380,
	'add-event': 366,
	'edit-event': 344,
	'manage': 364,
	'settings': 364,
	'backup-why': 362,
	'backup-save': 330,
	'backup-restore': 372,
	'pdf-report': 380,
	'new-ui': 214
};
// The classic day takes more room
const CLASSIC_SCENE_HEIGHTS: { [scene: string]: number } = {
	'day-overview': 362,
	'auto-overview': 320,
	'calendar': 404,
	// Room for the floating refresh button under the list
	'manage': 392,
	'edit-event': 356
};
// Room left between an arrow and the elements it links, so it doesn't overlap their highlight ring
const START_GAP = 6;
const END_GAP = 5;
const HEAD_LENGTH = 7;
const HEAD_HALF_WIDTH = 3.5;

// Arrows link elements marked with data-anchor, from the side of the first one to the side of the second one
const SCENE_ARROWS: { [scene: string]: IArrowSpec[] } = {
	'create-symptom': [
		{ from: 'tile', fromSide: 'right', to: 'list', toSide: 'top' },
		{ from: 'add-card', fromSide: 'bottom', to: 'sheet', toSide: 'right' }
	],
	'target-symptom': [
		{ from: 'a-chip', fromSide: 'bottom', to: 'menu', toSide: 'top' },
		{ from: 'item', fromSide: 'left', to: 'c-chip', toSide: 'top' }
	],
	'day-overview': [
		{ from: 'a-dot', fromSide: 'bottom', to: 'sheet', toSide: 'top' },
		{ from: 'set', fromSide: 'bottom', to: 'c-dot', toSide: 'top' }
	],
	// Help of the setting calculating the overview: the entries of the day, their average, the dot colored
	'auto-overview': [
		{ from: 'logs', fromSide: 'bottom', to: 'calc', toSide: 'top' },
		{ from: 'calc', fromSide: 'bottom', to: 'c-dot', toSide: 'top' }
	],
	'calendar': [
		{ from: 'today', fromSide: 'bottom', to: 'day', toSide: 'top' }
	],
	// The medication at the end of the first row of the grid: down through the empty end of the second row
	'add-event': [
		{ from: 'a-add', fromSide: 'bottom', to: 'menu', toSide: 'top' },
		{ from: 'menu-med', fromSide: 'bottom', to: 'form', toSide: 'top' }
	],
	'edit-event': [
		{ from: 'event', fromSide: 'bottom', to: 'show', toSide: 'top' },
		{ from: 'delete', fromSide: 'bottom', to: 'confirm', toSide: 'top' }
	],
	// The medications in the left column: down, then into the side of the list, away from the tile "New type"
	'manage': [
		{ from: 'tile', fromSide: 'bottom', to: 'list', toSide: 'left' }
	],
	'settings': [
		{ from: 'a-settings', fromSide: 'bottom', to: 'page', toSide: 'top' }
	],
	'backup-save': [
		{ from: 'save', fromSide: 'right', to: 'save-dialog', toSide: 'top' },
		{ from: 'share', fromSide: 'bottom', to: 'share-sheet', toSide: 'top' }
	],
	'backup-restore': [
		{ from: 'import', fromSide: 'right', to: 'picker', toSide: 'top' },
		{ from: 'file', fromSide: 'left', to: 'confirm', toSide: 'top' },
		{ from: 'yes', fromSide: 'bottom', to: 'snack', toSide: 'top' }
	],
	'pdf-report': [
		{ from: 'pdf', fromSide: 'right', to: 'month-sheet', toSide: 'top' },
		{ from: 'month-set', fromSide: 'bottom', to: 'report', toSide: 'right' }
	]
};
// The V1 has other arrows where its tiles are in another order
const CLASSIC_SCENE_ARROWS: { [scene: string]: IArrowSpec[] } = {
	// The medication in the middle of the list
	'add-event': [
		{ from: 'a-add', fromSide: 'bottom', to: 'menu', toSide: 'top' },
		{ from: 'menu-med', fromSide: 'left', to: 'form', toSide: 'top' }
	],
	// The medications in the right column: by the right margin, away from the other tiles, close to the screen
	'manage': [
		{ from: 'tile', fromSide: 'right', to: 'list', toSide: 'right', bend: 18 }
	]
};

const SIDE_NORMALS: { [side: string]: number[] } = {
	top: [0, -1],
	right: [1, 0],
	bottom: [0, 1],
	left: [-1, 0]
};

// Illustration of a tutorial slide: a simplified copy of the real screens, in the app colors and texts,
// with the elements to tap highlighted and arrows to what they open
@Component({
	selector: 'app-tutorial-scene',
	templateUrl: './tutorial-scene.component.html',
	styleUrls: ['./tutorial-scene.component.scss']
})
export class TutorialSceneComponent implements AfterViewInit, OnDestroy {

	@Input() public scene: string;
	// Version of the interface of the scenes showing a day, the one of the settings when not given
	@Input() public uiVersion: string;
	@ViewChild('root') private root: ElementRef<HTMLElement>;

	public arrows: IArrow[] = [];

	// Scenes showing a day in the V1 design
	public get classic(): boolean {
		return (this.uiVersion || this.globalService.uiVersion) === 'v1';
	}

	public get height(): number {
		return (this.classic && CLASSIC_SCENE_HEIGHTS[this.scene]) || SCENE_HEIGHTS[this.scene] || 380;
	}

	// The scenes show the current day, like the real screens
	public readonly today: IDetailedDate = getDetailedDate(moment().format('YYYY-MM-DD'));
	public readonly backupFileName = 'life-notes-save-' + moment().format('YYYYMMDDHHmm') + '.json';
	public readonly olderBackupFileName = 'life-notes-save-' + moment().subtract(7, 'days').format('YYYYMMDD') + '2100.json';
	public readonly weekDays: number[];
	public readonly calendarCells: { day: number, level: string, today: boolean, future: boolean }[];
	public readonly calendarOffset: number[];
	// Last entry of the second medication of the manage list
	public readonly olderEntry: IDetailedDate = getDetailedDate(moment().subtract(9, 'days').format('YYYY-MM-DD'));
	// The PDF report is usually exported for the last (complete) month
	public readonly reportMonth: IDetailedDate = getDetailedDate(moment().subtract(1, 'month').format('YYYY-MM-DD'));
	public readonly reportCells: string[];
	public readonly reportSymptoms: { label: string, cells: string[], ring: string }[];
	public readonly settingsRows = [
		{ key: 'symptoms', icon: 'spa', title: 'SETTINGS_SYMPTOMS_TITLE', subtitle: 'SETTINGS_SYMPTOMS_SUBTITLE' },
		{ key: 'language', icon: 'language', title: 'SETTINGS_LANGUAGE_TITLE', subtitle: 'SETTINGS_LANGUAGE_SUBTITLE' },
		{ key: 'time', icon: 'access_time', title: 'SETTINGS_TIME_TITLE', subtitle: 'SETTINGS_TIME_SUBTITLE' },
		{ key: 'backup', icon: 'import_export', title: 'SETTINGS_IMPORT_EXPORT_TITLE', subtitle: 'SETTINGS_IMPORT_EXPORT_SUBTITLE' },
		{ key: 'tutorial', icon: 'help', title: 'SETTINGS_TUTORIAL_TITLE', subtitle: 'SETTINGS_TUTORIAL_SUBTITLE' },
		{ key: 'appearance', icon: 'palette', title: 'SETTINGS_APPEARANCE_TITLE', subtitle: 'SETTINGS_APPEARANCE_SUBTITLE' },
		{ key: 'customization', icon: 'build', title: 'SETTINGS_CUSTOMIZATION_TITLE', subtitle: 'SETTINGS_CUSTOMIZATION_SUBTITLE' },
		{ key: 'about', icon: 'info', title: 'SETTINGS_ABOUT_TITLE', subtitle: 'SETTINGS_ABOUT_SUBTITLE' }
	];

	// ResizeObserver isn't typed by this TypeScript version
	private resizeObserver: any;
	private mutationObserver: MutationObserver;
	private frame: number;
	private readonly onWindowResize = () => this.scheduleArrows();

	constructor(
		private globalService: GlobalService,
		private changeDetector: ChangeDetectorRef,
		private ngZone: NgZone
	) {
		// Intensity of each day of the mock calendars, until today (the next days have no data yet)
		const levels = ['default', 'default', '1', 'default', '2', '3', '1', 'default', 'default', '4',
			'2', '1', 'default', 'default', '1', '5', '3', '2', 'default', 'default', '1'];
		const daysInMonth = moment(this.today.formattedDate).daysInMonth();
		this.calendarCells = Array.from({ length: daysInMonth }, (_, i) => ({
			day: i + 1,
			level: i + 1 > this.today.day ? 'default' : levels[i % levels.length],
			today: i + 1 === this.today.day,
			future: i + 1 > this.today.day
		}));
		this.reportCells = Array.from({ length: moment(this.reportMonth.formattedDate).daysInMonth() },
			(_, i) => levels[(i + 5) % levels.length]);
		// V2 report: the month of two symptoms, side by side
		this.reportSymptoms = [
			{ label: 'TUTORIAL_MOCK_SYMPTOM_1', cells: this.reportCells, ring: 'ring-1' },
			{ label: 'TUTORIAL_MOCK_SYMPTOM_2', cells: this.reportCells.map((_, i) => levels[(i + 11) % levels.length]),
				ring: 'ring-2' }
		];
		// Same first day of the week as the real calendar
		const startOnSunday = this.globalService.calendarStartOnSunday;
		this.weekDays = startOnSunday ? [7, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 7];
		const firstDay = moment(this.today.formattedDate).startOf('month').day(); // 0 = sunday
		this.calendarOffset = new Array(startOnSunday ? firstDay : (firstDay + 6) % 7);
	}

	public ngAfterViewInit(): void {
		// Arrows follow the real position of their anchors: texts are loaded asynchronously,
		// icon fonts change the layout once loaded and the scene scales with the screen
		this.ngZone.runOutsideAngular(() => {
			const element = this.root.nativeElement;
			const ResizeObserverClass = (window as any).ResizeObserver;
			if (ResizeObserverClass) {
				this.resizeObserver = new ResizeObserverClass(() => this.scheduleArrows());
				this.resizeObserver.observe(element);
			}
			this.mutationObserver = new MutationObserver(() => this.scheduleArrows());
			this.mutationObserver.observe(element, { childList: true, characterData: true, subtree: true });
			window.addEventListener('resize', this.onWindowResize);
			const fonts = (document as any).fonts;
			if (fonts && fonts.ready) {
				fonts.ready.then(() => this.scheduleArrows());
			}
			this.scheduleArrows();
		});
	}

	public ngOnDestroy(): void {
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
		}
		if (this.mutationObserver) {
			this.mutationObserver.disconnect();
		}
		window.removeEventListener('resize', this.onWindowResize);
		cancelAnimationFrame(this.frame);
	}

	public trackByIndex(index: number): number {
		return index;
	}

	private scheduleArrows(): void {
		cancelAnimationFrame(this.frame);
		this.frame = requestAnimationFrame(() => this.updateArrows());
	}

	private updateArrows(): void {
		const element = this.root.nativeElement;
		const box = element.getBoundingClientRect();
		if (box.width === 0) {
			return;
		}
		const unit = box.width / SCENE_WIDTH;
		const arrows: IArrow[] = [];
		((this.classic && CLASSIC_SCENE_ARROWS[this.scene]) || SCENE_ARROWS[this.scene] || []).forEach(spec => {
			const from = element.querySelector(`[data-anchor="${spec.from}"]`);
			const to = element.querySelector(`[data-anchor="${spec.to}"]`);
			if (from == null || to == null) {
				return;
			}
			arrows.push(this.buildArrow(
				this.getSidePoint(from.getBoundingClientRect(), box, unit, spec.fromSide, START_GAP),
				this.getSidePoint(to.getBoundingClientRect(), box, unit, spec.toSide, END_GAP),
				SIDE_NORMALS[spec.fromSide],
				SIDE_NORMALS[spec.toSide],
				spec.bend
			));
		});
		// Only render when something moved, the rendering itself must not trigger a new computation
		if (JSON.stringify(arrows) !== JSON.stringify(this.arrows)) {
			this.arrows = arrows;
			this.changeDetector.detectChanges();
		}
	}

	// Middle of a side of an element, in scene units, moved away from it by the given gap
	private getSidePoint(rect: DOMRect, box: DOMRect, unit: number, side: Side, gap: number): number[] {
		const left = (rect.left - box.left) / unit;
		const top = (rect.top - box.top) / unit;
		const width = rect.width / unit;
		const height = rect.height / unit;
		const normal = SIDE_NORMALS[side];
		const x = side === 'left' ? left : side === 'right' ? left + width : left + width / 2;
		const y = side === 'top' ? top : side === 'bottom' ? top + height : top + height / 2;
		return [x + normal[0] * gap, y + normal[1] * gap];
	}

	// Curve leaving the first element and entering the second one perpendicularly to their sides
	private buildArrow(start: number[], end: number[], startNormal: number[], endNormal: number[],
		fixedBend?: number): IArrow {
		const distance = Math.hypot(end[0] - start[0], end[1] - start[1]);
		const bend = fixedBend ?? Math.max(18, distance * 0.45);
		const c1 = [start[0] + startNormal[0] * bend, start[1] + startNormal[1] * bend];
		const c2 = [end[0] + endNormal[0] * bend, end[1] + endNormal[1] * bend];
		// The head points into the second element; the line stops at its base
		const direction = [-endNormal[0], -endNormal[1]];
		const base = [end[0] - direction[0] * HEAD_LENGTH, end[1] - direction[1] * HEAD_LENGTH];
		const side = [-direction[1] * HEAD_HALF_WIDTH, direction[0] * HEAD_HALF_WIDTH];
		const round = (value: number) => Math.round(value * 10) / 10;
		const point = (p: number[]) => round(p[0]) + ',' + round(p[1]);
		return {
			line: `M${point(start)} C${point(c1)} ${point(c2)} ${point(base)}`,
			head: `M${point(end)} L${point([base[0] + side[0], base[1] + side[1]])} `
				+ `L${point([base[0] - side[0], base[1] - side[1]])} Z`
		};
	}
}
