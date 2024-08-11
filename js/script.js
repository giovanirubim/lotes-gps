import './math.js';
import * as M from './math.js';

const canvas = document.querySelector('canvas');
const textarea = document.querySelector('textarea');
const ctx = canvas.getContext('2d');

let satelliteImg;
let whiteMap;
let transform = [ 1, 0, 0, 1, 0, 0 ];

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

const main = async () => {
	satelliteImg = await loadImage('./img/satellite.png');
	whiteMap     = await loadImage('./img/white-map.png');
	resetTransform();
	resizeCanvas();
};

window.addEventListener('resize', resizeCanvas);

main().catch((err) => {
	log('error:', err.message);
});

let touchStart = null;
const handleTouch1Start = (x, y) => {
	const mouse = [ x, y ];
	const t = [ ...transform ];
	touchStart = { mouse, t, second: null };
};

const handleTouch1Move = (x, y) => {
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
const validateTouchIds = (touches) => {
	for (let i=0; i<touches.length; ++i) {
		if (touches[i].identifier !== i) {
			return false;
		}
	}
	return true;
};
canvas.addEventListener('touchstart', e => {
	const { touches } = e;
	if (touches.length === 1) {
		const [ touch ] = touches;
		handleTouch1Start(touch.pageX, touch.pageY);
	}
	if (!validateTouchIds(touches)) {
		return;
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
			log(`Error: ${e.message}`);
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
