export abstract class APieChartViewModel {
	public type: string;
	public labels: string[];
	public data: number[];
	public colors: any;
	public options: any;

	constructor(type: string) {
		this.type = type;
		this.labels = new Array<string>();
		this.data = new Array<number>();
	}
}