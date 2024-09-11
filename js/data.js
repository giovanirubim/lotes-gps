import { compareText } from './sort.js';

const fixVersion = (data) => {
	if (data.version == null) {
		data.labels.forEach((label, i) => {
			label.id = i;
		});
		data.version = 1;
	}
	data.labels.sort((a, b) => compareText(a.name, b.name));
	return data;
};

export const loadMapData = async () => {
	// let json = localStorage.getItem('map-data');
	// if (json) {
	// 	return JSON.parse(json);
	// }
	const req = await fetch('./map-data.json');
	json = await req.text();
	return fixVersion(JSON.parse(json));
};

export const storeMapData = (mapData) => {
	localStorage.setItem('map-data', JSON.stringify(mapData));
};

export const wipeStorage = () => {
	localStorage.removeItem('map-data');
};
