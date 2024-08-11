export const animate = (fn, duration) => {
	const start = Date.now();
	return new Promise((done) => {
		const loop = () => {
			const time = Date.now() - start;
			const t = Math.max(0, Math.min(1, time / duration));
			fn(t);
			if (t < 1) {
				requestAnimationFrame(loop);
			} else {
				done();
			}
		};
		requestAnimationFrame(loop);
	});
};

export const smooth = (x) => {
	return (1 - Math.cos(x * Math.PI)) * 0.5;
};
