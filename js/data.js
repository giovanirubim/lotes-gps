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
		return JSON.parse(json);
	} catch (err) {
		console.error(err);
	}
	return {
		points: [],
		labels: [],
		numbers: [],
	};
};

export const storeMapData = (mapData) => {
	localStorage.setItem('map-data', JSON.stringify(mapData));
};
