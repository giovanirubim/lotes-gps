const canvas = document.querySelector('canvas');
const textarea = document.querySelector('textarea');
const ctx = canvas.getContext('2d');
const mapRange = [
	[ -25.5, -54.6 ],
	[ -25.4, -54.5 ],
];
const log = (...args) => {
	textarea.value += args.join(' ') + '\n';
};
const handlePos = (pos) => {
	log('new pos:', JSON.stringify(pos));
};
const handleErr = (err) => {
	log('error:', err.message);
};
navigator.geolocation.watchPosition(handlePos, handleErr);
