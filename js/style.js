export const hasClass = (dom, name) => {
	const attr = (dom.getAttribute('class') ?? '').trim();
	if (attr === '') {
		return false;
	}
	const set = new Set(attr.split(/\s+/));
	return set.has(name);
};

export const addClass = (dom, name) => {
	const attr = (dom.getAttribute('class') ?? '').trim();
	if (attr === '') {
		dom.setAttribute('class', name);
		return dom;
	}
	const set = new Set(attr.split(/\s+/));
	set.add(name);
	dom.setAttribute('class', [ ...set ].join(' '));
	return dom;
};

export const removeClass = (dom, name) => {
	const attr = (dom.getAttribute('class') ?? '').trim();
	if (attr === '') {
		return dom;
	}
	const set = new Set(attr.split(/\s+/));
	set.delete(name);
	const arr = [ ...set ];
	if (arr.length > 0) {
		dom.setAttribute('class', [ ...set ].join(' '));
	} else {
		dom.removeAttribute('class');
	}
	return dom;
};

export const toggleClass = (dom, name) => {
	if (hasClass(dom, name)) {
		removeClass(dom, name);
		return false;
	}
	addClass(dom, name);
	return true;
};
