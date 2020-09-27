import { Request, Response } from 'express';
import { Document } from 'mongoose';
import { DaySchema } from '../models';
import { AController } from './abstract.controller';

export class CalendarController extends AController {

	public getAll(request: Request, response: Response): void {
		DaySchema.find(
			this.getFilters(request),
			this.getFields(request),
			this.getPaging(request),
			(error: Error, calendar: Document[]) => {
				if (error != null) {
					response.send(error);
				}
				response.json(calendar);
			});
	}

	public getById(request: Request, response: Response): void {
		DaySchema.find(
			{ id: request.params.date },
			this.getFields(request),
			(error: Error, calendar: Document[]) => {
				if (error != null) {
					response.send(error);
				}
				response.json(calendar[0]);
			});
	}

	public create(request: Request, response: Response): void {
		let newArticle = new DaySchema(request.body);
		newArticle.save(
			(error: Error, day: Document) => {
				if (error) {
					response.send(error);
				}
				response.json(day);
			});
	}

	public delete(request: Request, response: Response): void {
		DaySchema.remove(
			{ id: request.params.date },
			(error: Error) => {
				if (error) {
					response.send(error);
				}
				response.json({ message: 'Day successfully deleted' });
			});
	}

}
