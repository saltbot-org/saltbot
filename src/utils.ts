function binaryInsertByProperty(value, array: any[], propertyToSort: string, start: number = 0, end: number = array.length - 1): void {

	let length: number = array.length;
	let m: number = start + Math.floor((end - start) / 2);

	if (length == 0) {
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

function binarySearchByProperty(value, array: any[], propertyToSort: string, start: number = 0, end: number = array.length - 1): number {

	let length : number = array.length;
	let m : number = start + Math.floor((end - start) / 2);

	if (length == 0) {
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

	if (value[propertyToSort] < array[m][propertyToSort]) {
		return binarySearchByProperty(value, array, propertyToSort, start, m - 1);
	}

	if (value[propertyToSort] > array[m][propertyToSort]) {
		return binarySearchByProperty(value, array, propertyToSort, m + 1, end);
	}

	//we don't insert duplicates
}

async function getMatchRecords() {
	const db = await idb.open("saltbot", 1);
	const tx = await db.transaction("matches", "readonly");
	const store = tx.objectStore("matches");

	return await store.getAll();
}

async function setMatchRecords(matches: MatchRecord[]) {
	const db = await idb.open("saltbot", 1);
	const tx = await db.transaction("matches", "readwrite");
	const store = tx.objectStore("matches");

	if (matches) {
		for (const match of matches) {
			await store.put(match);
		}
	}
}

function addMatchRecord(match: MatchRecord): void {
	const open = indexedDB.open("saltbot", 1);

	open.onsuccess = function() {
		const db = open.result;
		const tx = db.transaction("matches", "readwrite");
		const store = tx.objectStore("matches");

		store.put(match);
	};
}