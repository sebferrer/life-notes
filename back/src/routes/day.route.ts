import { Express } from 'express';
import { CalendarController } from '../controllers';

export function calendarRoute(app: Express): void {
	const controller = new CalendarController();

	app.route('/api/calendar')
		.get((request, result) => {
			controller.getAll(request, result);
		})
		.post((request, result) => {
			controller.create(request, result);
		});

	app.route('/api/calendar-from/:date')
		.get((request, result) => {
			controller.getFrom(request, result);
		});

	app.route('/api/calendar/:date')
		.get((request, result) => {
			controller.getByDate(request, result);
		})
		.put((request, result) => {
			controller.update(request, result);
		})
		.delete((request, result) => {
			controller.delete(request, result);
		});
}
