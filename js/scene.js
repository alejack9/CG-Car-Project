import { Camera } from "./camera.js";
import * as webglUtils from "./libs/webgl-utils.js";
import { degToRad, toCartesian } from "./utils/spherical-coordinates.js";
import * as m4 from "./libs/m4.js";
import { AddEvent } from "./utils/input.js";
import { getPolygons as getObjects } from "./objs-factory.js";

const FRAMES_PER_SECOND = 60;
const FRAME_MIN_TIME =
    ((1000 / 60) * (60 / FRAMES_PER_SECOND) - (1000 / 60) * 0.5) * 0.001;

export class Scene {
    /** @param {WebGLRenderingContext} gl */
    constructor(gl) {
        this.gl = gl;
    }

    async load() {
        console.log("Loading scene");
        this.program = await webglUtils.createProgramFromFiles(this.gl, [
            "./shaders/shader.vs.glsl",
            "./shaders/shader.fs.glsl",
        ]);

        this.backgroundColor = [0.08, 0.08, 0.08];
        const objs = getObjects(this.gl, this.program);
        this.polygons = objs.polygons;
        this.car = objs.car;

        const cameraSherical = [10, degToRad(20), degToRad(90)];
        const cameraTarget = [0, 0, 0];

        this.camera = new Camera(toCartesian(...cameraSherical), cameraTarget);
        this.fieldOfViewRadians = degToRad(45);
    }

    begin(maxPixelRatio = false) {
        console.log("Beginning scene");

        this.pixelRatio = maxPixelRatio ? window.devicePixelRatio : 1;

        this._addEvents();

        let then = 0;
        const loop = (now) => {
            now *= 0.001;
            if (now - then < FRAME_MIN_TIME) {
                this.update();
                this.nextFrameHandle = requestAnimationFrame(loop);
                return;
            }
            this.delta = now - then;
            then = now;
            const fps = 1 / this.delta;
            document.title = fps.toFixed(2);

            this.update();

            this.render();

            this.nextFrameHandle = requestAnimationFrame(loop);
        };

        this._onWindowResize();

        this.nextFrameHandle = requestAnimationFrame(loop);
    }

    update() {
        if (this.car.moving) this.camera.updateCamera(this.delta);
        this.camera.translation = this.car.chassis.translation;
        this.camera.rotation = this.car.chassis.rotation[1];
        this.car.doStep(this.delta);
    }

    render() {
        this.gl.clearColor(...this.backgroundColor, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        this.gl.useProgram(this.program);

        const perspMatrix = m4.multiply(
            this.perspectiveMatrix,
            this.camera.viewMatrix
        );
        for (let polygon of this.polygons) polygon.draw(perspMatrix);
    }

    _addEvents() {
        AddEvent(window, "mousedown", this._setupPosition);
        AddEvent(window, "mousemove", this._updatePosition);
        AddEvent(window, "mouseup", this._stopDrag);
        AddEvent(window, "wheel", this._pinch);
        AddEvent(window, "touchstart", this._fingersStart);
        AddEvent(window, "touchmove", this._fingersMove);
        AddEvent(window, "touchend", this._stopDrag);
        AddEvent(window, "resize", this._onWindowResize);
        AddEvent(window, "keydown", this._keydown);
        AddEvent(window, "keyup", this._keyup);
    }

    _fingersStart = (event) => {
        if (event.touches.length === 1) {
            [event.clientX, event.clientY] = [
                event.touches[0].clientX,
                event.touches[0].clientY,
            ];
            return this._setupPosition(event);
        }
        this.dist = Math.hypot(
            event.touches[1].pageX - event.touches[0].pageX,
            event.touches[1].pageY - event.touches[0].pageY
        );
    };
    _setupPosition = (event) => {
        this.clicked = true;
        this.start = [event.clientX, event.clientY];
        this.updateCamera = false;
    };
    _fingersMove = (event) => {
        if (event.touches.length === 1) {
            [event.clientX, event.clientY] = [
                event.touches[0].clientX,
                event.touches[0].clientY,
            ];
            return this._updatePosition(event);
        }
        const actual = Math.hypot(
            event.touches[1].pageX - event.touches[0].pageX,
            event.touches[1].pageY - event.touches[0].pageY
        );
        if (this.dist > actual) event.deltaY = 1;
        else event.deltaY = -1;
        this._pinch(event, 0.1);
        this.dist = actual;
    };
    _updatePosition = (event) => {
        if (!this.clicked) return;
        const actual = [event.clientX, event.clientY];
        const deltas = actual.map((e, i) => e - this.start[i]);
        let deltaStep = degToRad(
            (180 * deltas[0]) / (this.gl.canvas.width * this.pixelRatio)
        );
        this.camera.theta -= deltaStep;
        deltaStep = degToRad(
            (90 * deltas[1]) / (this.gl.canvas.height * this.pixelRatio)
        );
        this.camera.phi -= deltaStep;
        this.start = actual;
    };
    _stopDrag = () => {
        this.clicked = false;
    };
    _pinch = (event, step = 0.5) => {
        this.camera.d += (event.deltaY > 0 ? step : -step) * this.pixelRatio;
        this.updateCamera = false;
    };
    _keydown = (event) => {
        if (event.key.toLowerCase() === "w") this.car.key[0] = true;
        if (event.key.toLowerCase() === "a") this.car.key[1] = true;
        if (event.key.toLowerCase() === "s") this.car.key[2] = true;
        if (event.key.toLowerCase() === "d") this.car.key[3] = true;
        if (event.key.toLowerCase() === " ") this.car.key[5] = true;
    };
    _keyup = (event) => {
        if (event.key.toLowerCase() === "w") this.car.key[0] = false;
        if (event.key.toLowerCase() === "a") this.car.key[1] = false;
        if (event.key.toLowerCase() === "s") this.car.key[2] = false;
        if (event.key.toLowerCase() === "d") this.car.key[3] = false;
        if (event.key.toLowerCase() === " ") this.car.key[5] = false;
        if (event.key.toLowerCase() === "1") this.camera.lockD();
        if (event.key.toLowerCase() === "0") this.camera.lockCamera();
    };
    _onWindowResize = () => {
        // even if the official web fundamentals guide discourage this implementation (moving this code to the render funciton),
        // in our case this is a major performance improvement without any bad side effects.
        webglUtils.resizeCanvasToDisplaySize(
            this.gl.canvas,
            this.pixelRatio !== 1
        );

        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

        this.perspectiveMatrix = m4.perspective(
            this.fieldOfViewRadians,
            this.gl.canvas.clientWidth / this.gl.canvas.clientHeight,
            0.1,
            500
        );
    };
}
