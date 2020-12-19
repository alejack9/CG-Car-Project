export function toCartesian(d, theta, phi) {
	const sinPhi = Math.sin(phi);
	return [
		d * sinPhi * Math.sin(theta),
		d * Math.cos(phi),
		d * sinPhi * Math.cos(theta),
	];
}

export function toSpherical(x, y, z) {
	const d = Math.hypot(x, y, z);
	// prettier-ignore
	return [
	    d,
		Math.atan(z / y),
	    Math.acos(x / d),
	]
}

const PIx2 = Math.PI * 2;

export function normalizeTheta(theta) {
	return theta % PIx2;
}

export function normalizePhi(phi) {
	if (phi <= 10 ** -3) phi = 10 ** -3;
	phi = Math.abs(phi % PIx2);
	return phi > Math.PI ? PIx2 - phi : phi;
}

export function degToRad(d) {
	return (d * Math.PI) / 180;
}
