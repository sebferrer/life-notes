export interface ICustomEvent {
	type: string;
	time: string;
	key: string;
	detail: string;
	pain: number;
	quantity: number;
	// Type definition of the 'custom' events (see custom-type.model.ts)
	customType?: string;
}
