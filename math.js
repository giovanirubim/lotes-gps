export const applyTransform = ([ x, y ], t, res = []) => {
	const [ ix, iy, jx, jy, kx, ky ] = t;
	res[0] = x*ix + y*jx + kx;
	res[1] = x*iy + y*jy + ky;
	return res;
};

export const combineTransforms = (a, b, res = []) => {
	const [ aix, aiy, ajx, ajy, akx, aky ] = a;
	const [ bix, biy, bjx, bjy, bkx, bky ] = b;

	res[0] = aix*bix + aiy*bjx;
	res[1] = aix*biy + aiy*bjy;

	res[2] = ajx*bix + ajy*bjx;
	res[3] = ajx*biy + ajy*bjy;

	res[4] = akx*bix + aky*bjx + bkx;
	res[5] = akx*biy + aky*bjy + bky;

	return res;
};

export const scaleTransform = (t, [ sx, sy ], res = []) => {
	const [ ix, iy, jx, jy, kx, ky ] = t;
	res[0] = ix*sx;
	res[1] = iy*sy;
	res[2] = jx*sx;
	res[3] = jy*sy;
	res[4] = kx*sx;
	res[5] = ky*sy;
	return res;
};

export const clearTransform = (res = []) => {
	res[0] = 1;
	res[1] = 0;
	res[2] = 0;
	res[3] = 1;
	res[4] = 0;
	res[5] = 0;
	return res;
};

export const invertTransform = (t, res = []) => {
	clearTransform(res);
	const a = t[1] / t[0];
	const b = t[3] - t[2]*a;
	const c = t[4]*a - t[5];
	const d = t[2] / b;
	res[1] -= res[0]*a;
	res[3] -= res[2]*a;
	res[0] = (res[0] - res[1]*d) / t[0];
	res[1] /= b;
	res[2] = (res[2] - res[3]*d) / t[0];
	res[3] /= b;
	res[4] = - (t[4] + c*d) / t[0];
	res[5] = c / b;
	return res;
};

const aux = clearTransform();
export const undoTransform = (vec, t, res = []) => {
	invertTransform(t, aux);
	applyTransform(vec, aux, res);
	return res;
};

export const translateTransform = (t, [ dx, dy ], res = []) => {
	const [ ix, iy, jx, jy, kx, ky ] = t;
	res[0] = ix;
	res[1] = iy;
	res[2] = jx;
	res[3] = jy;
	res[4] = kx + dx;
	res[5] = ky + dy;
	return res;
};

export const getScale = (t) => {
	const [ ix, iy, jx, jy, _kx, _ky ] = t;
	const si = Math.sqrt(ix**2 + iy**2);
	const sj = Math.sqrt(jx**2 + jy**2);
	return (si + sj)/2;
};

export const vecSum = ([ ax, ay ], [ bx, by ], res = []) => {
	res[0] = ax + bx;
	res[1] = ay + by;
	return res;
};

export const vecSub = ([ ax, ay ], [ bx, by ], res = []) => {
	res[0] = ax - bx;
	res[1] = ay - by;
	return res;
};

export const scaleVec = ([ x, y ], scalar, res = []) => {
	res[0] = x * scalar;
	res[1] = y * scalar;
	return res;
};

export const divVec = ([ x, y ], scalar, res = []) => {
	res[0] = x / scalar;
	res[1] = y / scalar;
	return res;
};

export const vecLen = ([ x, y ]) => {
	return Math.sqrt(x**2 + y**2);
};

export const normalize = (v, res = []) => {
	return divVec(v, vecLen(v), res);
};

export const dotProd = ([ ax, ay ], [ bx, by ]) => {
	return ax*bx + ay*by;
};

export const combineTransformsAt = (a, b, origin, res = []) => {
	const [ x, y ] = origin;
	translateTransform(a, [ -x, -y ], res);
	combineTransforms(res, b, res);
	translateTransform(res, origin, res);
	return res;
};

export const copyRotation = (a, b, res = []) => {
	const [ ax, ay ] = normalize(a);
	const [ bx, by ] = normalize(b);

	const cos = ax*bx + ay*by;
	const sinMag = Math.sqrt(1 - cos**2);
	const sin = sinMag * Math.sign(ax*by - ay*bx);

	res[0] = cos;
	res[1] = sin;
	res[2] = -sin;
	res[3] = cos;
	res[4] = 0;
	res[5] = 0;

	return res;
};
