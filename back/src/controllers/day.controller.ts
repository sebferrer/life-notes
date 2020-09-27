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

	public getByDate(request: Request, response: Response): void {
		DaySchema.find(
			{ date: request.params.date },
			this.getFields(request),
			(error: Error, calendar: Document[]) => {
				if (error != null) {
					response.send(error);
				}
				response.json(calendar[0]);
			});
	}

	public create(request: Request, response: Response): void {
		let newDay = new DaySchema(request.body);
		newDay.save(
			(error: Error, day: Document) => {
				if (error) {
					response.send(error);
				}
				response.json(day);
			});
	}

	public update(request: Request, response: Response): void {
		DaySchema.findOneAndUpdate(
			{ date: request.params.date }, request.body, { new: true }, (error: Error, day: Document) => {
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
