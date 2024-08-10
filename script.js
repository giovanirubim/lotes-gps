const canvas = document.querySelector('canvas');
const textarea = document.querySelector('textarea');
const ctx = canvas.getContext('2d');

const coordDist = (a, b) => {
	const vals = [ ...a, ...b ];
	const [ aLat, aLon, bLat, bLon ] = vals.map(x => x/180*Math.PI);
	const dLon = bLon - aLon;
	return 6371008.8 * Math.acos(
		Math.sin(aLat)*Math.sin(bLat) +
		Math.cos(aLat)*Math.cos(bLat)*Math.cos(dLon)
	);
};

const mapRange = [
	[ -25.49659, -54.55207 ],
	[ -25.49093, -54.54451 ],
];

const diagonalMeters = coordDist(...mapRange);
const diagonalPixels = Math.sqrt(canvas.width**2 + canvas.height**2);
const meterPixelRatio = diagonalMeters / diagonalPixels;

let coord  = null;
let radius = null;
let images = {
	satellite: null,
	blackMap:  null,
	whiteMap:  null,
};
let mode = 0;

const loadImage = (src) => {
	const img = document.createElement('img');
	return new Promise((done, fail) => {
		img.onload = () => done(img);
		img.onerror = fail;
		img.src = src;
	});
};

const coordToXY = ([ lat, lon ]) => {
	const [ minCoord, maxCoord ] = mapRange;
	const [ minLat, minLon ] = minCoord;
	const [ maxLat, maxLon ] = maxCoord;
	const x = (lon - minLon) / (maxLon - minLon) * canvas.width;
	const y = (lat - maxLat) / (minLat - maxLat) * canvas.height;
	return [ x, y ];
};

const drawLocation = () => {
	const [ x, y ] = coordToXY(coord);

	ctx.strokeStyle = '#07f';
	ctx.fillStyle = 'rgba(0, 127, 255, 0.2)';
	ctx.beginPath();
	ctx.arc(x, y, radius/meterPixelRatio, 0, Math.PI*2);
	ctx.fill();
	ctx.stroke();

	ctx.strokeStyle = '#fff';
	ctx.fillStyle = '#07f';
	ctx.beginPath();
	ctx.arc(x, y, 5, 0, Math.PI*2);
	ctx.fill();
	ctx.stroke();
};

const clearCanvas = () => {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
};

const drawSatellite = () => {
	ctx.drawImage(images.satellite, 0, 0);
};

const overlayMap = () => {
	ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
	ctx.fillRect(0, 0, images.satellite.width, images.satellite.height);
	ctx.drawImage(images.whiteMap, 0, 0);
};

const render = () => {
	clearCanvas();
	drawSatellite();
	overlayMap();
	if (coord) {
		console.log(coord);
		drawLocation();
	}
};

const log = (...args) => {
	textarea.value = args.join(' ') + '\n';
};

const handlePos = (pos) => {
	coord = [
		pos?.coords?.latitude ?? NaN,
		pos?.coords?.longitude ?? NaN,
	];
	radius = pos?.coords?.accuracy ?? NaN;
	log('new pos:', JSON.stringify({ coord, radius }));
	render();
};

const showLog = () => {
	const div = document.querySelector('textarea').parentElement;
	div.style.display = 'block';
};

const handleErr = (err) => {
	log('error:', err.message);
	showLog();
};

const main = async () => {
	images.satellite = await loadImage('./satellite.png');
	images.whiteMap  = await loadImage('./white-map.png');
	canvas.width  = images.satellite.width;
	canvas.height = images.satellite.height;
	render();
	const options = { enableHighAccuracy: true };
	navigator.geolocation.watchPosition(handlePos, handleErr, options);
};

showLog();
main().catch(err => {
	log('error:', err.message);
	showLog();
});
