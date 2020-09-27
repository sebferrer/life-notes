import { Schema } from 'mongoose';
import * as mongoose from 'mongoose';

export const DaySchemaName = 'calendar';

export const DaySchema = mongoose.model(
	DaySchemaName,
	new Schema(
		{
			date: {
				type: String,
				unique: true
			},
			symptomOverviews: [{
				key: {
					type: String,
					default: ''
				},
				pain: {
					type: Number,
					default: 0
				}
			}],
			symptoms: [{
				type: {
					type: String,
					default: ''
				},
				key: {
					type: String,
					default: ''
				},
				logs: [{
					key: {
						type: String,
						default: ''
					},
					type: {
						type: String,
						default: ''
					},
					pain: {
						type: Number,
						default: ''
					},
					time: {
						type: String,
						default: ''
					},
					detail: {
						type: String,
						default: ''
					}
				}]
			}],
			logs: [{
				type: {
					type: String,
					default: ''
				},
				time: {
					type: String,
					default: ''
				},
				detail: {
					type: String,
					default: ''
				}
			}],
			meds: [{
				type: {
					type: String,
					default: ''
				},
				key: {
					type: String,
					default: ''
				},
				quantity: {
					type: String,
					default: ''
				},
				time: {
					type: String,
					default: ''
				}
			}],
			meals: [{
				type: {
					type: String,
					default: ''
				},
				time: {
					type: String,
					default: ''
				},
				detail: {
					type: String,
					default: ''
				}
			}],
			wakeUp: {
				type: String,
				default: ''
			},
			goToBed: {
				type: String,
				default: ''
			}
		},
		{
			collection: DaySchemaName
		}
	)
);
