export function getSortOrder(prop: any, desc?: boolean): any {
	const isDesc = desc == null ? false : true;
	return (a: any, b: any) => {
		const valA = a[prop];
		const valB = b[prop];

		// Handle missing values (undefined or null)
		const hasA = valA !== undefined && valA !== null;
		const hasB = valB !== undefined && valB !== null;

		if (!hasA && !hasB) return 0;
		if (!hasA) return 1; // Always push missing values to the bottom
		if (!hasB) return -1;

		if (valA < valB) {
			return isDesc ? 1 : -1;
		} else if (valA > valB) {
			return isDesc ? -1 : 1;
		}
		return 0;
	};
}

export function getSortOrderLevel2(prop1, prop2: any, desc?: boolean): any {
	desc = desc == null ? false : true;
	return (a: any, b: any) => {
		if (desc) {
			if (a[prop1][prop2] < b[prop1][prop2]) {
				return 1;
			} else if (a[prop1][prop2] > b[prop1][prop2]) {
				return -1;
			}
		}
		if (a[prop1][prop2] > b[prop1][prop2]) {
			return 1;
		} else if (a[prop1][prop2] < b[prop1][prop2]) {
			return -1;
		}
		return 0;
	};
}