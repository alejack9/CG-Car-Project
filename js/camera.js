import * as m4 from './libs/m4.js';
import {
	toSpherical,
	toCartesian,
	normalizeTheta,
	normalizePhi,
	degToRad,
} from './utils/spherical-coordinates.js';

export class Camera {
	/**
	 *
	 * @param {number[]} cartesianCoordinates
	 * @param {number[]} target
	 * @param {number[]} up
	 */
	constructor(cartesianCoordinates, target = [0, 0, 0], up = [0, 1, 0]) {
		this.translation = [0, 0, 0];
		this.rotation = degToRad(0);
		this.cartesianPosition = cartesianCoordinates;
		this.startPosition = toSpherical(...cartesianCoordinates);
		[this.d, this.theta, this.phi] = this.startPosition;
		this._up = up;
		this._target = target;
		this.cameraMatrixChanged = true;
		this.inverseMatrixChanged = true;
		this.locked = true;
		// don't wanna calculate a division between doubles multiple times
		// (used in 'phi' setter)
		this.ninetyDegsInRads = Math.PI / 2;
	}

	updateCamera(delta) {
		this.d += (this.startPosition[0] - this.d) * delta * 5;
		this.theta += (this.startPosition[1] - this.theta) * delta * 5;
		this.phi += (this.startPosition[2] - this.phi) * delta * 5;
	}

	get cameraMatrix() {
		if (this.cameraMatrixChanged) {
			this.lookAtMatrix = m4.translation(...this.translation);
			this.lookAtMatrix = m4.yRotate(this.lookAtMatrix, this.rotation);
			this.lookAtMatrix = m4.multiply(
				this.lookAtMatrix,
				m4.lookAt(this.cartesianPosition, this.target, this._up)
			);
		}
		this.cameraMatrixChanged = false;
		return this.lookAtMatrix;
	}

	get viewMatrix() {
		if (this.cameraMatrixChanged)
			this.inverseMatrix = m4.inverse(this.cameraMatrix);
		this.cameraMatrixChanged = false;
		return this.inverseMatrix;
	}

	/**
	 * @param {number[]} t
	 */
	set target(t) {
		this._target = t;
		this.cameraMatrixChanged = true;
	}
	get target() {
		return this._target;
	}

	/**
	 * @param {number} value
	 */
	set d(value) {
		if (value <= 0) return;
		this._d = value;
		this.cartesianPosition = toCartesian(this.d, this.theta, this.phi);
		this.cameraMatrixChanged = true;
	}
	get d() {
		return this._d;
	}

	/**
	 * @param {number} value
	 */
	set theta(value) {
		this._theta = normalizeTheta(value);
		this.cartesianPosition = toCartesian(this.d, this.theta, this.phi);
		this.cameraMatrixChanged = true;
	}
	get theta() {
		return this._theta;
	}

	/**
	 * @param {number} value
	 */
	set phi(value) {
		if (value > this.ninetyDegsInRads) return;
		this._phi = normalizePhi(value);
		this.cartesianPosition = toCartesian(this.d, this.theta, this.phi);
		this.cameraMatrixChanged = true;
	}
	get phi() {
		return this._phi;
	}

	lockD() {
		this.startPosition[0] = this.d;
	}
	lockCamera() {
		this.lockD();
		this.startPosition[1] = this.theta;
		this.startPosition[2] = this.phi;
	}
}
