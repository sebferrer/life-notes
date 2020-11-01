export function getSortOrder(prop: any, desc?: boolean): any {
	desc = desc == null ? false : true;
	return (a: any, b: any) => {
		if (desc) {
			if (a[prop] < b[prop]) {
				return 1;
			} else if (a[prop] > b[prop]) {
				return -1;
			}
		}
		if (a[prop] > b[prop]) {
			return 1;
		} else if (a[prop] < b[prop]) {
			return -1;
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