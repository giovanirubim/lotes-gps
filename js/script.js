import { animate, smooth } from './animate.js';
import { addClass, hasClass, removeClass, toggleClass } from './style.js';
import './math.js';
import * as M from './math.js';
import { loadMapData, storeMapData } from './data.js';
import { download } from './download.js';

const getDOM = (querySelector) => {
	return document.querySelector(querySelector);
};

const DOM = {
	canvas: getDOM('canvas'),
	add_button: getDOM('#add'),
	remove: getDOM('#remove'),
	text: getDOM('#text'),
	download: getDOM('#download'),
	number: getDOM('#number'),
	edit_button: getDOM('#edit'),
	cancel_label_selection: getDOM('.select-label .cancel'),
	log_textarea: getDOM('textarea'),
};

const tools = [ DOM.add_button, DOM.remove ];
const ctx = DOM.canvas.getContext('2d');
const compassImg = getDOM('#compass img');
const locationImg = getDOM('#location img');
const mapImg = getDOM('#map img');
const deg = Math.PI / 180;

const minLat = -25.49389 * deg;
const maxLat = -25.48889 * deg;
const minLon = -54.56778 * deg;
const maxLon = -54.56528 * deg;
const minDist = 15;

let lat = NaN;
let lon = NaN;
let preventTap = false;
let mapType = 0;

let adding = false;
let satelliteImg;
let whiteMap;
let blackMap;
let transform = [ 1, 0, 0, 1, 0, 0 ];
let withText = false;
let removing = false;
let showNumbers = false;
let gpsOn = !hasClass(locationImg.parentElement, 'disabled');
let touchStart = null;
let handleLabelSelection = null;

const mapData = await loadMapData();

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
	const { width, height } = DOM.canvas;
	const a = [ width * 0.5, height * 0.5 ];
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
	const sx = DOM.canvas.width / width;
	const sy = DOM.canvas.height / height;
	const s = Math.max(sx, sy);
	transform[0] = s;
	transform[1] = 0;
	transform[2] = 0;
	transform[3] = s;
	transform[4] = (DOM.canvas.width  - width*s)  * 0.5;
	transform[5] = (DOM.canvas.height - height*s) * 0.5;
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

const alignWithCompass = () => {
	const m = [ ...transform ];
	const azm = calcAzm();
	const rot = M.clearTransform();
	const { width, height } = DOM.canvas;
	const cx = width  * 0.5;
	const cy = height * 0.5;
	const time = Math.sqrt(Math.abs(azm) / Math.PI) * 500;
	if (azm === 0) {
		return;
	}
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
	const { width, height } = DOM.canvas;
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.clearRect(0, 0, width, height);
};

const colorToBG = (color) => {
	const hex = [ ...color.replace('#', '').match(/../g) ];
	const sum = hex.map(x => parseInt(x, 16)).reduce((a, b) => a + b);
	return (sum / 3 / 255) > 0.35 ? '#000' : '#fff';
};

const drawPoints = () => {
	const { labels, points } = mapData;
	const { width, height } = DOM.canvas;

	ctx.setTransform(1, 0, 0, 1, 0, 0);

	ctx.font = '14px Arial';
	ctx.textAlign = 'right';
	ctx.textBaseline = 'middle';
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';

	const labelMap = {};
	for (const label of labels) {
		labelMap[label.id] = label;
	}

	for (const point of points) {
		const [ x, y ] = coordToXY(point.coord);
		if (x < 0 || x > width) {
			continue;
		}
		if (y < 0 || y > height) {
			continue;
		}
		const label = labelMap[point.label];
		
		ctx.fillStyle = label.color;
		ctx.beginPath();
		ctx.arc(x, y, 5, 0, Math.PI*2);
		ctx.fill();

		if (withText) {
			const tx = x - 10;
			ctx.fillStyle = label.color;
			ctx.strokeStyle = colorToBG(label.color);
			ctx.lineWidth = 3;
			ctx.strokeText(label.name, tx, y);
			ctx.fillText(label.name, tx, y);
		}

		ctx.lineWidth = 2;
		ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
		ctx.stroke();
		
		ctx.lineWidth = 1;
		ctx.strokeStyle = '#fff';
		ctx.stroke();
	}
};

const drawNumbers = () => {
	const { numbers } = mapData;
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.font = '14px Arial';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.strokeStyle = '#222';
	ctx.fillStyle = '#ccc';
	for (const { coord, number } of numbers) {
		const [ x, y ] = coordToXY(coord);
		ctx.strokeText(number, x, y);
		ctx.fillText(number, x, y);
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
		const { width, height } = DOM.canvas;
		ctx.fillStyle = '#ccc';
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.fillRect(0, 0, width, height);
		drawImage(blackMap);
	}
	updateCompass();
	drawPoints();
	if (showNumbers) {
		drawNumbers();
	}
};

const log = (...args) => {
	const textarea = DOM.log_textarea;
	textarea.parentElement.style.display = 'block';
	if (textarea.value !== '' && !textarea.value.endsWith('\n')) {
		textarea.value += '\n';
	}
	textarea.value += args.join(' ');
	textarea.scrollTop = textarea.scrollHeight;
};

const logErr = (err) => {
	log(`Error: ${err.message}`);
	log(err.stack);
	console.error(err);
};

const clearLog = () => {
	DOM.log_textarea.value = '';
};

const resizeCanvas = () => {
	const { canvas } = DOM;
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	resetTransform();
	render();
};

const bind = (dom, event, handler) => {
	dom.addEventListener(event, (e) => {
		try {
			const res = handler(e);
			if (res instanceof Promise) {
				res.catch(logErr);
			}
		} catch(err) {
			logErr(err);
		}
	});
};

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

const findByPoint = (arr, point) => {
	let index = -1;
	let dist = Infinity;
	for (let i=0; i<arr.length; ++i) {
		const d = M.vecDist(point, coordToXY(arr[i].coord));
		if (d < minDist && d < dist) {
			dist = d;
			index = i;
		}
	}
	return index >= 0 ? arr[index] : null;
};

const arrayRemove = (arr, target) => {
	const index = arr.indexOf(target);
	if (index !== -1) {
		arr.splice(index, 1);
		return true;
	}
	return false;
};

const removePoint = (point) => {
	const target = findByPoint([ ...mapData.points, ...mapData.numbers ], point);
	if (arrayRemove(mapData.points, target) || arrayRemove(mapData.numbers, target)) {
		storeMapData(mapData);
		render();
	}
};

const handleTap = async (x, y) => {
	if (adding) {
		const labelId = await selectLabel();
		if (labelId == null) {
			return;
		}
		const coord = xyToCoord([ x, y ]);
		const time = Math.round(Date.now() / 1000);
		mapData.points.push({ coord, label: labelId, time });
		disable(DOM.add_button);
		adding = false;
		render();
		storeMapData(mapData);
		return;
	}
	if (removing) {
		if (removePoint([ x, y ])) {
			render();
			storeMapData(mapData);
		}
	}
};

bind(DOM.canvas, 'click', e => {
	if (preventTap) {
		return;
	}
	handleTap(e.offsetX, e.offsetY);
});

bind(DOM.canvas, 'mousedown', e => {
	if (e.button === 0) {
		handleTouch1Start(e.offsetX, e.offsetY);
	}
});

bind(DOM.canvas, 'mousemove', e => {
	if (e.buttons & 1) {
		if (touchStart) {
			handleTouch1Move(e.offsetX, e.offsetY);
		} else {
			handleTouchEnd(e.offsetX, e.offsetY);
		}
	} else if (touchStart) {
		handleTouchEnd(e.offsetX, e.offsetY);
	}
});

bind(DOM.canvas, 'mouseout', e => {
	if (e.button === 0) {
		handleTouchEnd(e.offsetX, e.offsetY);
	}
});

bind(DOM.canvas, 'touchstart', e => {
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

bind(DOM.canvas, 'touchmove', e => {
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
			logErr(e);
		}
	}
	e.preventDefault();
});

bind(DOM.canvas, 'touchend', () => {
	if (touchStart) {
		handleTouchEnd();
	}
});

bind(DOM.canvas, 'wheel', e => {
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

bind(DOM.canvas, 'dblclick', (e) => {
	const number = prompt('Número');
	if (!number) {
		return;
	}
	const coord = xyToCoord([ e.offsetX, e.offsetY ]);
	mapData.numbers.push({ coord, number });
	storeMapData(mapData);
	render();
});

bind(compassImg.parentElement, 'click', alignWithCompass);

bind(locationImg.parentElement, 'click', () => {
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
	logErr(new Error(`${err.message || `GeolocationPositionError ${err.code}`}`))
};

bind(mapImg.parentElement, 'click', () => {
	mapType = (mapType + 1) % 2;
	render();
});

const addLabelButton = ({ name, color, id }) => {
	const list = getDOM('#label-list');
	const item = document.createElement('div');
	item.setAttribute('class', 'label-item');
	item.innerHTML = `<input type="color"><span class="name"><span>`;
	item.querySelector('.name').innerText = name; 
	const input = item.querySelector('input');
	input.value = color;
	list.appendChild(item);
	bind(item, 'click', (e) => {
		if (e.target === input) {
			return;
		}
		handleLabelSelection?.(id);
	});
	bind(input, 'change', () => {
		mapData.labels[id].color = input.value;
		storeMapData(mapData);
		render();
	});
};

const hidePopups = () => {
	const dom = getDOM('#popups');
	dom.setAttribute('hidden', '');
};

const showPopups = () => {
	const dom = getDOM('#popups');
	dom.removeAttribute('hidden');
};

const hidePopupsIfNoneIsVisible = () => {
	const dom = getDOM('#popups');
	const popups = [ ...dom.children ];
	const visible = popups.find(popup => !popup.hasAttribute('hidden'));
	if (!visible) {
		hidePopups();
	}
};

const hideLabelSelection = () => {
	const dom = getDOM('.select-label');
	dom.setAttribute('hidden', '');
	hidePopupsIfNoneIsVisible();
};

const showLabelSelection = () => {
	showPopups();
	const dom = getDOM('.select-label');
	dom.removeAttribute('hidden');
};

bind(window, 'resize', resizeCanvas);

bind(getDOM('#add-label'), 'click', () => {
	let name = prompt(`Nome da legenda`);
	if (!name) {
		return;
	}
	const color = `#xxx`.replace(/x/g, _ => {
		return (Math.random()*256|0).toString(16).padStart(2, 0);
	});
	const label = { name, color };
	mapData.labels.push(label);
	const labelId = mapData.labels.length - 1;
	addLabelButton(label, labelId);
	hideLabelSelection();
	handleLabelSelection?.(labelId);
	storeMapData(mapData);
});

const selectLabel = () => new Promise((done) => {
	showLabelSelection();
	handleLabelSelection = (value) => {
		handleLabelSelection = null;
		hideLabelSelection();
		done(value);
	};
});

bind(DOM.cancel_label_selection, 'click', () => {
	handleLabelSelection?.(null);
	hideLabelSelection();
});

const enableOnly = (target) => {
	tools.forEach(dom => {
		if (dom === target) {
			removeClass(dom, 'disabled');
		} else {
			addClass(dom, 'disabled');
		}
	});
};

const disable = (tool) => {
	addClass(tool, 'disabled');
};

bind(DOM.edit_button, 'click', () => {
	showLabelSelection();
});

bind(DOM.add_button, 'click', async () => {
	adding = !toggleClass(DOM.add_button, 'disabled');
});

bind(DOM.text, 'click', () => {
	withText = !toggleClass(DOM.text, 'disabled');
	render();
});

bind(DOM.remove, 'click', () => {
	removing = !removing;
	if (removing) {
		enableOnly(DOM.remove);
	} else {
		enableOnly(null);
	}
	render();
});

bind(DOM.number, 'click', () => {
	showNumbers = !toggleClass(DOM.number, 'disabled');
	render();
});

bind(DOM.download, 'click', () => {
	download('map-data.json', JSON.stringify(mapData, null, '\t'));
});

const main = async () => {

	mapData.labels.forEach(addLabelButton);
	
	satelliteImg = await loadImage('./img/satellite.png');
	whiteMap     = await loadImage('./img/white-map.png');
	blackMap     = await loadImage('./img/black-map.png');
	resetTransform();
	resizeCanvas();

	navigator.geolocation.watchPosition(
		handleLocation,
		handleLocationError,
		{ enableHighAccuracy: true },
	);
};

main().catch(logErr);
