const removeAccents = (text = '') => {
	return text.normalize('NFD').replace(/[^\x20-\x7e]/g, '');
};

export const compareText = (a, b) => {
	a = removeAccents(a).toLowerCase();
	b = removeAccents(b).toLowerCase();
	return a > b ? 1 : a < b ? - 1 : 0;
};
