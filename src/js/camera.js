import {
    translation,
    yRotate,
    multiply,
    lookAt,
    addVectors,
    inverse,
    perspective,
} from "./libs/m4.js";
import {
    toCartesian,
    normalizeTheta,
    normalizePhi,
    degToRad,
} from "./utils/spherical-coordinates.js";

export class Camera {
    static load(sphericalCoordinates, fieldOfViewRadians) {
        this.translation = [0, 0, 0];
        this.rotation = degToRad(0);
        this.cartesianPosition = toCartesian(...sphericalCoordinates);
        [this.d, this.theta, this.phi] = sphericalCoordinates;
        this.cartesianTarget = toCartesian(0, 0, 0);
        this.targetD = this.targetTheta = 0;
        this.targetPhi = degToRad(90);
        this.startPosition = [];
        this.startTarget = [];
        this.lockCamera();
        this.cameraMatrixChanged = true;
        this.locked = true;
        this.fieldOfViewRadians = fieldOfViewRadians;
        this.firstPerson = false;

        // used to avoid to calculate a division every time phi changes
        this.ninetyDegsInRads = Math.PI / 2;
    }

    static updateCameraPosition(delta) {
        this.d += (this.startPosition[0] - this._d) * delta * 5;
        this.theta += (this.startPosition[1] - this._theta) * delta * 5;
        this.phi += (this.startPosition[2] - this._phi) * delta * 5;
    }
    static updateTargetPosition(delta) {
        //     if (!this.firstPerson) return; // checked by input manager
        // this.targetD += (this.startTarget[0] - this._targetD) * delta * 2.5; // target's d never changes
        this.targetTheta +=
            (this.startTarget[1] - this._targetTheta) * delta * 2.5;
        this.targetPhi += (this.startTarget[2] - this._targetPhi) * delta * 2.5;
    }

    static getCameraMatrix() {
        this.lookAtMatrix = translation(...this.translation);
        this.lookAtMatrix = yRotate(this.lookAtMatrix, this.rotation);
        if (!this.firstPerson)
            this.lookAtMatrix = multiply(
                this.lookAtMatrix,
                lookAt(
                    this.cartesianPosition,
                    this.cartesianTarget,
                    [0, 1, 0] // up
                )
            );
        else
            this.lookAtMatrix = multiply(
                this.lookAtMatrix,
                lookAt(
                    this.cartesianPosition,
                    addVectors(this.cartesianTarget, this.cartesianPosition),
                    [0, 1, 0] // up
                )
            );
        this.cameraMatrixChanged = false;
        return this.lookAtMatrix;
    }

    static get viewMatrix() {
        if (this.cameraMatrixChanged)
            this.inverseMatrix = inverse(this.getCameraMatrix());
        this.cameraMatrixChanged = false;
        return this.inverseMatrix;
    }

    static updatePerspectiveMatrix(width, height) {
        this.perspectiveMatrix = perspective(
            this.fieldOfViewRadians,
            width / height,
            0.1,
            500
        );
    }

    static set targetD(value) {
        if (value < 0) return;
        this._targetD = value;
        this.updateCartesianTarget();
    }

    static set targetTheta(value) {
        this._targetTheta = normalizeTheta(value);
        this.updateCartesianTarget();
    }

    static set targetPhi(value) {
        if (value > Math.PI) return;
        this._targetPhi = normalizePhi(value);
        this.updateCartesianTarget();
    }

    static updateCartesianTarget() {
        this.cartesianTarget = toCartesian(
            this._targetD,
            this._targetTheta,
            this._targetPhi
        );
        this.cameraMatrixChanged = true;
    }

    static get targetD() {
        return this._targetD;
    }
    static get targetTheta() {
        return this._targetTheta;
    }
    static get targetPhi() {
        return this._targetPhi;
    }

    static set d(value) {
        if (value <= 0) return;
        this._d = value;
        this.updateCartesianPosition();
    }

    static set theta(value) {
        this._theta = normalizeTheta(value);
        this.updateCartesianPosition();
    }

    static set phi(value) {
        if (value >= this.ninetyDegsInRads) return;
        this._phi = normalizePhi(value);
        this.updateCartesianPosition();
    }

    static updateCartesianPosition() {
        this.cartesianPosition = toCartesian(this._d, this._theta, this._phi);
        this.cameraMatrixChanged = true;
    }

    static get d() {
        return this._d;
    }

    static get theta() {
        return this._theta;
    }

    static get phi() {
        return this._phi;
    }

    static lockCamera() {
        this.startPosition[0] = this._d;
        this.startPosition[1] = this._theta;
        this.startPosition[2] = this._phi;
        this.startTarget[0] = this._targetD;
        this.startTarget[1] = this._targetTheta;
        this.startTarget[2] = this._targetPhi;
    }
}
