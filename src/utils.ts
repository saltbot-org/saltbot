// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function binaryInsertByProperty<T extends Record<string, any>>(value: T, array: T[], propertyToSort: string, start = 0, end: number = array.length - 1): void {

	const length: number = array.length;
	const m: number = start + Math.floor((end - start) / 2);

	if (length === 0) {
		array.push(value);
		return;
	}

	if (value[propertyToSort] > array[end][propertyToSort]) {
		array.splice(end + 1, 0, value);
		return;
	}

	if (value[propertyToSort] < array[start][propertyToSort]) {
		array.splice(start, 0, value);
		return;
	}

	if (start >= end) {
		return;
	}

	if (value[propertyToSort] < array[m][propertyToSort]) {
		binaryInsertByProperty(value, array, propertyToSort, start, m - 1);
		return;
	}

	if (value[propertyToSort] > array[m][propertyToSort]) {
		binaryInsertByProperty(value, array, propertyToSort, m + 1, end);
		return;
	}

	//we don't insert duplicates
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function binarySearchByProperty<T extends Record<string, any>>(value: T, array: T[], propertyToSort: string, start = 0, end: number = array.length - 1): number {

	const length: number = array.length;
	const m: number = start + Math.floor((end - start) / 2);

	if (length === 0) {
		return -1;
	}

	if (value[propertyToSort] > array[end][propertyToSort]) {
		return -1;
	}

	if (value[propertyToSort] < array[start][propertyToSort]) {
		return -1;
	}

	if (start > end) {
		return -1;
	}

	if (value[propertyToSort] === array[m][propertyToSort]) {
		return m;
	}
	else if (value[propertyToSort] < array[m][propertyToSort]) {
		return binarySearchByProperty(value, array, propertyToSort, start, m - 1);
	}
	else {
		//value must be greater
		return binarySearchByProperty(value, array, propertyToSort, m + 1, end);
	}
}
