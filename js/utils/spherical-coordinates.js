export function toCartesian(d, theta, phi) {
    const sinPhi = Math.sin(phi);
    return [
        d * sinPhi * Math.cos(theta),
        d * Math.cos(phi),
        d * sinPhi * Math.sin(theta),
    ];
}

export function toSpherical(x, z, y) {
    const d = Math.hypot(x, y, z);
    // prettier-ignore
    return [
	    d,
		Math.atan(y / x),
		Math.acos(z / d)
	]
}

const PIx2 = Math.PI * 2;

export function normalizeTheta(theta) {
    return theta % PIx2;
}

export function normalizePhi(phi) {
    return Math.max(phi, 10 ** -3);
}

export function degToRad(d) {
    return (d * Math.PI) / 180;
}

export function radToDeg(r) {
    return (r * 180) / Math.PI;
}
