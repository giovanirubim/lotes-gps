import './transform.js';
import { getScale, translateTransform, undoTransform } from './transform.js';

const canvas = document.querySelector('canvas');
const textarea = document.querySelector('textarea');
const ctx = canvas.getContext('2d');

let satelliteImg;
let whiteMap;
let mode = 0;
let transform = [ 1, 0, 0, 1, 0, 0 ];

const resetTransform = () => {
	let { width, height } = satelliteImg;
	const sx = canvas.width / width;
	const sy = canvas.height / height;
	const s = Math.min(sx, sy);
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

const render = () => {
	clearCanvas();
	if (!satelliteImg) {
		return;
	}
	drawImage(satelliteImg);
	overlayMap();
};

const log = (...args) => {
	if (textarea.value !== '' && !textarea.value.endsWith('\n')) {
		textarea.value += '\n';
	}
	textarea.value += args.join(' ');
	textarea.scrollTop = textarea.scrollHeight;
};

const clearLog = () => {
	textarea.value = '';
};

const showLog = () => {
	textarea.parentElement.style.display = 'block';
};

const resizeCanvas = () => {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	resetTransform();
	render();
};

const main = async () => {
	satelliteImg = await loadImage('./satellite.png');
	whiteMap     = await loadImage('./white-map.png');
	resetTransform();
	resizeCanvas();
};

window.addEventListener('resize', resizeCanvas);

main().catch((err) => {
	log('error:', err.message);
	showLog();
});

let touch1Start = null;
const handleTouch1Start = (x, y) => {
	const mouse = [ x, y ];
	const vec = undoTransform(mouse, transform);
	const t = [ ...transform ];
	touch1Start = { mouse, vec, t };
};

const handleTouch1Move = (x, y) => {
	const { mouse } = touch1Start;
	const dx = x - mouse[0];
	const dy = y - mouse[1];
	translateTransform(touch1Start.t, dx, dy, transform);
	render();
};

const handleTouch1End = (x, y) => {
	touch1Start = null;
};

canvas.addEventListener('mousedown', e => {
	if (e.button === 0) {
		handleTouch1Start(e.offsetX, e.offsetY);
	}
});
canvas.addEventListener('mousemove', e => {
	if (e.buttons & 1) {
		handleTouch1Move(e.offsetX, e.offsetY);
	} else if (touch1Start) {
		handleTouch1End(e.offsetX, e.offsetY);
	}
});
canvas.addEventListener('mouseout', e => {
	if (e.button === 0) {
		handleTouch1End(e.offsetX, e.offsetY);
	}
});
canvas.addEventListener('touchstart', e => {
	const { touches } = e;
	if (touches.length === 1) {
		const [ touch ] = touches;
		handleTouch1Start(touch.pageX, touch.pageY);
	}
});
canvas.addEventListener('touchmove', e => {
	const { touches } = e;
	if (touches.length === 1 && touches[0].identifier === 0) {
		const t = touches[0];
		handleTouch1Move(t.pageX, t.pageY);
	}
});
showLog();
