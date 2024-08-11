import { animate, smooth } from './animate.js';
import { addClass, hasClass, removeClass, toggleClass } from './style.js';
import './math.js';
import * as M from './math.js';

const canvas = document.querySelector('canvas');
const textarea = document.querySelector('textarea');
const ctx = canvas.getContext('2d');
const compassImg = document.querySelector('#compass img');
const locationImg = document.querySelector('#location img');
const deg = Math.PI / 180;

// Bottom-left: -25.49659, -54.55207
// Top-right:   -25.49093, -54.54451

const minLat = -25.49659 * deg;
const maxLat = -25.49093 * deg;
const minLon = -54.55207 * deg;
const maxLon = -54.54451 * deg;
const minDist = 15;

let lat = NaN;
let lon = NaN;
let selectedLabel = 0;
let preventTap = false;
let mapType = 1;

let satelliteImg;
let whiteMap;
let blackMap;
let transform = [ 1, 0, 0, 1, 0, 0 ];
let gpsOn = !hasClass(locationImg.parentElement, 'disabled');

const mapData = {
	points: [],
	labels: [{
		name: 'test',
		color: '#f00',
	}],
};

const coordToXY = ([ lat, lon ]) => {
	const ny = (lat - minLat) / (maxLat - minLat);
	const nx = (lon - minLon) / (maxLon - minLon);
	const vec = [ nx * satelliteImg.width, (1 - ny) * satelliteImg.height ];
	return M.applyTransform(vec, transform);
};

const xyToCoord = (vec) => {
	const [ x, y ] = M.undoTransform(vec, transform);
	const lon = (x / satelliteImg.width) * (maxLon - minLon) + minLon;
	const lat = (1 - y / satelliteImg.height) * (maxLat - minLat) + minLat;
	return [ lat, lon ];
};

const moveToCoord = () => {
	const a = [ canvas.width * 0.5, canvas.height * 0.5 ];
	const b = coordToXY([ lat, lon ]);
	const d = M.vecSub(a, b);
	const t = [ ...transform ];
	animate(val => {
		M.translateTransform(t, M.scaleVec(d, smooth(val)), transform);
		render();
	}, 500);
};

const resetTransform = () => {
	let { width, height } = satelliteImg;
	const sx = canvas.width / width;
	const sy = canvas.height / height;
	const s = Math.max(sx, sy);
	transform[0] = s;
	transform[1] = 0;
	transform[2] = 0;
	transform[3] = s;
	transform[4] = (canvas.width  - width*s)  * 0.5;
	transform[5] = (canvas.height - height*s) * 0.5;
};

const drawImage = (img) => {
	ctx.setTransform(...transform);
	ctx.drawImage(img, 0, 0);
};

const overlayMap = () => {
	ctx.setTransform(...transform);
	ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
	ctx.fillRect(0, 0, satelliteImg.width, satelliteImg.height);
	drawImage(whiteMap);
};

const calcAzm = () => {
	const [ ix, iy ] = transform;
	return M.calcAngle(ix, iy);
};

const restoreNorth = () => {
	const m = [ ...transform ];
	const azm = calcAzm();
	const rot = M.clearTransform();
	const cx = canvas.width  * 0.5;
	const cy = canvas.height * 0.5;
	const time = Math.sqrt(Math.abs(azm) / Math.PI) * 500;
	animate(t => {
		M.rotationTransform(-smooth(t)*azm, rot);
		M.combineTransformsAt(m, rot, [ cx, cy ], transform);
		render();
	}, time);
};

const updateCompass = () => {
	const azm = calcAzm();
	compassImg.setAttribute('style', `transform:rotate(${azm}rad)`);
};

const loadImage = (src) => {
	const img = document.createElement('img');
	return new Promise((done, fail) => {
		img.onload = () => done(img);
		img.onerror = fail;
		img.src = src;
	});
};

const clearCanvas = () => {
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.clearRect(0, 0, canvas.width, canvas.height);
};

const drawPoints = () => {
	const { labels, points } = mapData;
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	for (const point of points) {
		const [ x, y ] = coordToXY(point.coord);
		if (x < 0 || x > canvas.width) {
			continue;
		}
		if (y < 0 || y > canvas.height) {
			continue;
		}
		const label = labels[point.label];
		
		ctx.fillStyle = label.color;
		ctx.beginPath();
		ctx.arc(x, y, 5, 0, Math.PI*2);
		ctx.fill();

		ctx.lineWidth = 3;
		ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
		ctx.stroke();
		
		ctx.lineWidth = 1.5;
		ctx.strokeStyle = '#fff';
		ctx.stroke();
	}
};

const render = () => {
	if (!satelliteImg) {
		return;
	}
	if (mapType === 0) {
		clearCanvas();
		drawImage(satelliteImg);
		overlayMap();
	} else {
		ctx.fillStyle = '#ccc';
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		drawImage(blackMap);
	}
	updateCompass();
	drawPoints();
};

const log = (...args) => {
	textarea.parentElement.style.display = 'block';
	if (textarea.value !== '' && !textarea.value.endsWith('\n')) {
		textarea.value += '\n';
	}
	textarea.value += args.join(' ');
	textarea.scrollTop = textarea.scrollHeight;
};

const clearLog = () => {
	textarea.value = '';
};

const resizeCanvas = () => {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	resetTransform();
	render();
};

window.addEventListener('resize', resizeCanvas);

let touchStart = null;
const handleTouch1Start = (x, y) => {
	preventTap = false;
	const mouse = [ x, y ];
	const t = [ ...transform ];
	touchStart = { mouse, t, second: null };
};

const disableGPS = () => {
	addClass(locationImg.parentElement, 'disabled');
	gpsOn = false;
};

const enableGPS = () => {
	removeClass(locationImg.parentElement, 'disabled');
	gpsOn = true;
	if (!isNaN(lat)) {
		moveToCoord();
	}
};

const handleTouch1Move = (x, y) => {
	disableGPS();
	preventTap = true;
	const { mouse } = touchStart;
	const dx = x - mouse[0];
	const dy = y - mouse[1];
	M.translateTransform(touchStart.t, [ dx, dy ], transform);
	render();
};

const handleTouchEnd = () => {
	if (touchStart) {
		touchStart = null;
		render();
	}
};

const handleTouch2Start = (x1, y1, x2, y2) => {
	touchStart.t = [ ...transform ];
	touchStart.mouse = [ x1, y1 ];
	const mouse = [ x2, y2 ];
	touchStart.second = { mouse };
};

const handleTouch2Move = (x1, y1, x2, y2) => {
	const { mouse, second } = touchStart;
	
	const a0 = mouse;
	const b0 = second.mouse;
	const c0 = M.scaleVec(M.vecSum(a0, b0), 0.5);
	const d0 = M.vecSub(b0, a0);

	const a1 = [ x1, y1 ];
	const b1 = [ x2, y2 ];
	const c1 = M.scaleVec(M.vecSum(a1, b1), 0.5);
	const d1 = M.vecSub(b1, a1);
	
	const t = transform;
	const s = M.vecLen(d1) / M.vecLen(d0);
	
	M.translateTransform(touchStart.t, M.vecSub(c1, c0), t);
	const m = M.clearTransform();
	M.scaleTransform(m, [ s, s ], m);
	M.combineTransforms(m, M.copyRotation(d0, d1), m);
	M.combineTransformsAt(t, m, c1, t);
	render();
};

const removePoint = (point) => {
	const { points } = mapData;
	let index = null;
	let dist = Infinity;
	for (let i=0; i<points.length; ++i) {
		const d = M.vecDist(point, coordToXY(points[i].coord));
		if (d < minDist && d < dist) {
			dist = d;
			index = i;
		}
	}
	if (index !== null) {
		points.splice(index, 1);
	}
};

const handleTap = (x, y) => {
	if (toolId === 0) {
		const coord = xyToCoord([ x, y ]);
		const time = Math.round(Date.now() / 1000);
		mapData.points.push({ coord, label: selectedLabel, time });
	}
	if (toolId === 1) {
		removePoint([ x, y ]);
	}
	render();
};

canvas.addEventListener('click', e => {
	if (preventTap) {
		return;
	}
	handleTap(e.offsetX, e.offsetY);
});

canvas.addEventListener('mousedown', e => {
	if (e.button === 0) {
		handleTouch1Start(e.offsetX, e.offsetY);
	}
});

canvas.addEventListener('mousemove', e => {
	if (e.buttons & 1) {
		handleTouch1Move(e.offsetX, e.offsetY);
	} else if (touchStart) {
		handleTouchEnd(e.offsetX, e.offsetY);
	}
});

canvas.addEventListener('mouseout', e => {
	if (e.button === 0) {
		handleTouchEnd(e.offsetX, e.offsetY);
	}
});

canvas.addEventListener('touchstart', e => {
	const { touches } = e;
	if (touches.length === 1) {
		const [ touch ] = touches;
		handleTouch1Start(touch.pageX, touch.pageY);
	}
	if (touches.length === 2) {
		const [ a, b ] = touches;
		handleTouch2Start(a.pageX, a.pageY, b.pageX, b.pageY);
	}
});

canvas.addEventListener('touchmove', e => {
	const { touches } = e;
	if (!touchStart) {
		return;
	}
	if (touches.length === 1) {
		const t = touches[0];
		handleTouch1Move(t.pageX, t.pageY);
	}
	if (touches.length === 2) {
		const [ a, b ] = touches;
		try {
			handleTouch2Move(a.pageX, a.pageY, b.pageX, b.pageY);
		} catch(e) {
			clearLog();
			log(`error: ${e.message}`);
			log(e.stack);
		}
	}
	e.preventDefault();
});

canvas.addEventListener('touchend', () => {
	if (touchStart) {
		handleTouchEnd();
	}
});

canvas.addEventListener('wheel', e => {
	e.preventDefault();
	const m = M.clearTransform();
	const c = [ e.offsetX, e.offsetY ];
	if (e.shiftKey) {
		const angle = e.deltaY * 0.002;
		M.rotateTransform(m, angle, m);
	} else {
		const s = (1 - e.deltaY * 0.002);
		M.scaleTransform(m, [ s, s ], m);
	}
	M.combineTransformsAt(transform, m, c, transform);
	render();
});

compassImg.parentElement.addEventListener('click', restoreNorth);

locationImg.parentElement.addEventListener('click', () => {
	if (hasClass(locationImg.parentElement, 'disabled')) {
		enableGPS();
	} else {
		disableGPS();
	}
});

const handleLocation = (data) => {
	const { latitude, longitude } = data.coords;
	lat = latitude * deg;
	lon = longitude * deg;
	if (gpsOn) {
		moveToCoord();
	}
};

const handleLocationError = (err) => {
	log(`error: ${err.message || `GeolocationPositionError ${err.code}`}`);
	log(err.stack);
};

const main = async () => {
	satelliteImg = await loadImage('./img/satellite.png');
	whiteMap     = await loadImage('./img/white-map.png');
	blackMap     = await loadImage('./img/black-map.png');
	resetTransform();
	resizeCanvas();

	// navigator.geolocation.watchPosition(
	// 	handleLocation,
	// 	handleLocationError,
	// 	{ enableHighAccuracy: true },
	// );
};

const tool = document.querySelector('#tool');
let toolId = 0;

tool.addEventListener('click', () => {
	const images = [ ...tool.children ];
	toolId = (toolId + 1) % images.length;
	images.forEach((img, i) => {
		if (i === toolId) {
			img.removeAttribute('hidden');
		} else {
			img.setAttribute('hidden', '');
		}
	});
});

main().catch((err) => {
	log('error:', err.message);
});
