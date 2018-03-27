function binaryInsertByProperty(value, array, propertyToSort, start = 0, end = array.length - 1) {
    const length = array.length;
    const m = start + Math.floor((end - start) / 2);
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
function binarySearchByProperty(value, array, propertyToSort, start = 0, end = array.length - 1) {
    const length = array.length;
    const m = start + Math.floor((end - start) / 2);
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
