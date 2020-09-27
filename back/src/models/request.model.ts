import { Request } from "express";

export interface IQuery {
	fields?: string;
	paging?: string;
}

export class Paging {
	constructor(
		public skip: number,
		public limit: number
	) { }

	public static parse(rawPaging: string): Paging {
		const splitted = (rawPaging || '').split(',').map(value => parseInt(value));
		if (splitted == null || splitted.length == null) {
			return null;
		}
		return new Paging(splitted[0], splitted[1]);
	}
}

export interface IRequest extends Request {
	query: IQuery;
}
