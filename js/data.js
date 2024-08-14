const removeAccents = (text = '') => {
	return text.normalize('NFD').replace(/[^\x20-\x7e]/g, '');
};

const compareText = (a, b) => {
	a = removeAccents(a).toLowerCase();
	b = removeAccents(b).toLowerCase();
	return a > b ? 1 : a < b ? - 1 : 0;
};

const fixVersion = (data) => {
	if (data.version == null) {
		data.labels.forEach((label, i) => {
			label.id = i;
		});
		data.labels.sort((a, b) => compareText(a.name, b.name));
		data.version = 1;
	}
	return data;
};

export const loadMapData = async () => {
	try {
		const json = localStorage.getItem('map-data');
		if (json) {
			return JSON.parse(json);
		}
	} catch (err) {
		console.error(err);
	}
	try {
		const req = await fetch('./map-data.json');
		const json = await req.text();
		return fixVersion(JSON.parse(json));
	} catch (err) {
		console.error(err);
	}
	return {
		version: 1,
		points: [],
		labels: [],
		numbers: [],
	};
};

export const storeMapData = (mapData) => {
	localStorage.setItem('map-data', JSON.stringify(mapData));
};
