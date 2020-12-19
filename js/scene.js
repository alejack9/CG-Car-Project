import { Camera } from "./camera.js";
import * as webglUtils from "./libs/webgl-utils.js";
import { degToRad, toCartesian } from "./utils/spherical-coordinates.js";
import * as m4 from "./libs/m4.js";
import { AddEvent } from "./utils/input.js";
import { getObjs, getVehicle } from "./objs-factory.js";

const FRAMES_PER_SECOND = 60;
const FRAME_MIN_TIME =
    ((1000 / 60) * (60 / FRAMES_PER_SECOND) - (1000 / 60) * 0.5) * 0.001;

export class Scene {
    /** @param {WebGLRenderingContext} gl */
    constructor(gl, textManager) {
        this.gl = gl;
        webglUtils.resizeCanvasToDisplaySize(textManager.ctx.canvas);
        this.textManager = textManager;
    }

    async load() {
        console.log("Loading scene");

        this.cars = JSON.parse(
            await (await fetch("/data/vehicles/vehicles.json")).text()
        ).paths;
        this.currentCar = 0;

        this.program = await webglUtils.createProgramFromFiles(this.gl, [
            "./shaders/phong.vs.glsl",
            "./shaders/phong.fs.glsl",
        ]);

        this.backgroundColor = [0.28, 0.28, 0.28];

        this.setters = [
            webglUtils.createAttributeSetters(this.gl, this.program),
            webglUtils.createUniformSetters(this.gl, this.program),
        ];

        this.L = [-1.0, 3.0, 5.0];

        this.car = await getVehicle(
            this.gl,
            this.setters,
            this.cars[this.currentCar]
        );

        this.polygons = await getObjs(this.gl, this.setters);

        const cameraTarget = [0, 0, 0];
        const cameraSherical = [15, degToRad(40), degToRad(90)];
        this.camera = new Camera(toCartesian(...cameraSherical), cameraTarget);
        this.fieldOfViewRadians = degToRad(45);
        this.cameraInc = [0, 0];
    }

    async _load() {
        console.log(this.currentCar);

        this.car = await getVehicle(
            this.gl,
            this.setters,
            this.cars[this.currentCar]
        );

        const cameraTarget = [0, 0, 0];
        const cameraSherical = [15, degToRad(25), degToRad(90)];
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
            this.delta = now - then;
            if (this.delta < FRAME_MIN_TIME) {
                this.update();
                this.nextFrameHandle = requestAnimationFrame(loop);
                return;
            }
            then = now;
            document.title = (1 / this.delta).toFixed(2);

            this.update();

            this.render();

            this.nextFrameHandle = requestAnimationFrame(loop);
        };

        this._onWindowResize();

        this.nextFrameHandle = requestAnimationFrame(loop);
    }

    update() {
        if (this.car.moving) this.camera.updateCamera(this.delta);
        if (this.cameraInc[0])
            this.camera.increaseTarget(0, this.cameraInc[0] * 4 * this.delta);
        if (this.cameraInc[1])
            this.camera.increaseTarget(2, this.cameraInc[1] * 4 * this.delta);
        this.camera.translation = this.car.chassis[0].translation;
        this.camera.rotation = this.car.chassis[0].rotation[1];
        this.car.doStep(this.delta);
    }

    render() {
        this.gl.clearColor(...this.backgroundColor, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        this.textManager.render();

        this.gl.useProgram(this.program);

        const sharedUniform = {
            L: m4.normalize(this.L),
            u_viewWorldPosition: this.camera.cartesianPosition,
            u_perspection: this.perspectiveMatrix,
            u_view: this.camera.viewMatrix,
        };
        webglUtils.setUniforms(this.setters[1], sharedUniform);
        this.polygons.forEach((p) => p.draw());
        this.car.draw();
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

        document.getElementById("x").onchange = (_) => {
            this.L[0] = parseFloat(document.getElementById("x").value);
        };
        document.getElementById("y").onchange = (_) => {
            this.L[1] = parseFloat(document.getElementById("y").value);
        };
        document.getElementById("z").onchange = (_) => {
            this.L[2] = parseFloat(document.getElementById("z").value);
        };
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
        const deltas = [actual[0] - this.start[0], actual[1] - this.start[1]];
        this.camera.theta -= degToRad(
            (180 * deltas[0]) / (this.gl.canvas.width * this.pixelRatio)
        );
        this.camera.phi -= degToRad(
            (90 * deltas[1]) / (this.gl.canvas.height * this.pixelRatio)
        );
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
        if (event.key.toLowerCase() === "arrowup") this.cameraInc[0] = -1;
        if (event.key.toLowerCase() === "arrowdown") this.cameraInc[0] = 1;
        if (event.key.toLowerCase() === "arrowleft") this.cameraInc[1] = 1;
        if (event.key.toLowerCase() === "arrowright") this.cameraInc[1] = -1;
    };
    _keyup = (event) => {
        if (event.key.toLowerCase() === "w") this.car.key[0] = false;
        if (event.key.toLowerCase() === "a") this.car.key[1] = false;
        if (event.key.toLowerCase() === "s") this.car.key[2] = false;
        if (event.key.toLowerCase() === "d") this.car.key[3] = false;
        if (event.key.toLowerCase() === " ") this.car.key[5] = false;
        if (event.key.toLowerCase() === "arrowup") this.cameraInc[0] = 0;
        if (event.key.toLowerCase() === "arrowdown") this.cameraInc[0] = 0;
        if (event.key.toLowerCase() === "arrowleft") this.cameraInc[1] = 0;
        if (event.key.toLowerCase() === "arrowright") this.cameraInc[1] = 0;
        if (event.key.toLowerCase() === "1") this.camera.lockD();
        if (event.key.toLowerCase() === "0") this.camera.lockCamera();
        if (event.key.toLowerCase() === "o") {
            this.currentCar =
                (this.currentCar === 0 ? this.cars.length : this.currentCar) -
                1;
            this._load();
        }
        if (event.key.toLowerCase() === "p") {
            this.currentCar = (this.currentCar + 1) % this.cars.length;
            this._load();
        }
        if (event.key.toLowerCase() === "r") {
            this.camera.target = [0, 0, 0];
        }
    };
    _onWindowResize = () => {
        // even if the official web fundamentals guide discourage this implementation (moving this code to the render funciton),
        // in our case this is a major performance improvement without any bad side effects.
        webglUtils.resizeCanvasToDisplaySize(
            this.gl.canvas,
            this.pixelRatio !== 1
        );
        webglUtils.resizeCanvasToDisplaySize(this.textManager.ctx.canvas);

        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

        this.perspectiveMatrix = m4.perspective(
            this.fieldOfViewRadians,
            this.gl.canvas.clientWidth / this.gl.canvas.clientHeight,
            0.1,
            500
        );
    };
}
