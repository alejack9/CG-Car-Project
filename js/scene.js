import { Camera } from "./camera.js";
import {
    createProgramInfo,
    resizeCanvasToDisplaySize,
    setUniforms,
} from "./libs/webgl-utils.js";
import { degToRad } from "./utils/spherical-coordinates.js";
import { InputManager } from "./input-manager.js";
import { getObjs, getVehicle } from "./objs-factory.js";
import { Skybox } from "./skybox.js";
import { TextManager } from "./text-manager.js";

const FRAMES_PER_SECOND = 60;
const FRAME_MIN_TIME =
    ((1000 / 60) * (60 / FRAMES_PER_SECOND) - (1000 / 60) * 0.5) * 0.001;

export class Scene {
    static async load(gl, mobile) {
        this.gl = gl;
        resizeCanvasToDisplaySize(TextManager.ctx.canvas);

        InputManager.resize();
        TextManager.loading = true;
        TextManager.render();

        this.vehiclesRefs = JSON.parse(
            await (
                await fetch(
                    mobile
                        ? "data/vehicles/vehicles.mobile.json"
                        : "data/vehicles/vehicles.json"
                )
            ).text()
        ).paths;
        this.currentVehicle = 0;
        this.vehicles = [];

        this.programInfo = await createProgramInfo(this.gl, [
            "shaders/phong.vs.glsl",
            "shaders/phong.fs.glsl",
        ]);

        await Skybox.load();

        this.lightPosition = [
            parseFloat(document.getElementById("x")?.value ?? 0),
            parseFloat(document.getElementById("y")?.value ?? 6),
            parseFloat(document.getElementById("z")?.value ?? 0),
        ];

        this.polygons = await getObjs(this.gl, this.programInfo);
        this.coin = this.polygons.coin;
        this.polygons = this.polygons.polygons;

        const cameraSpherical = [25, degToRad(0), degToRad(65)];
        Camera.load(cameraSpherical, degToRad(45));
        Camera.updatePerspectiveMatrix(
            this.gl.canvas.clientWidth,
            this.gl.canvas.clientHeight
        );

        await this._load();
    }

    static async _load() {
        InputManager.disableinput(true);

        this.coins = { current: 0, target: 8 };

        TextManager.vehicleNum = this.currentVehicle + 1;
        TextManager.vehicles = this.vehiclesRefs.length;

        TextManager.coins = this.coins;

        if (this.hasWon) TextManager.show = true;
        this.hasWon = false;
        // weighted average of loading steps
        const percentagePerStep = 25; // %
        const textureLoadingPercentage = 50; // %
        const textureCb = (processedTextures, texturesCount) => {
            if (texturesCount) {
                TextManager.percentage +=
                    Math.round(
                        (1 / texturesCount) * textureLoadingPercentage * 100
                    ) / 100;
                TextManager.action = `Loading Texture: ${processedTextures} / ${texturesCount}`;
            }
            if (!texturesCount || processedTextures === texturesCount) {
                TextManager.reset();
                TextManager.percentage = 100;
                TextManager.showTime = true;
                InputManager.disableinput(false);
            }
        };

        const objCb = () => {
            TextManager.percentage += percentagePerStep;
            TextManager.action = "Loaded OBJ";
        };
        const mtlCb = () => {
            TextManager.percentage += percentagePerStep;
            TextManager.action = "Loaded MTL";
        };
        if (!this.vehicles[this.currentVehicle]) {
            TextManager.reset();
            TextManager.showTime = false;
            TextManager.action = "Loading...";
            this.vehicle = await getVehicle(
                this.gl,
                this.programInfo,
                this.vehiclesRefs[this.currentVehicle],
                this.loadTextures,
                this.loadNormals,
                objCb,
                mtlCb,
                textureCb
            );
            this.vehicles[this.currentVehicle] = this.vehicle;
        } else {
            if (
                this.vehicles[this.currentVehicle].loadedNormals !==
                    this.loadNormals ||
                this.vehicles[this.currentVehicle].loadedTextures !==
                    this.loadTextures
            ) {
                this.vehicles[this.currentVehicle] = undefined;
                return this._load();
            }
            this.vehicle = this.vehicles[this.currentVehicle];
            this.vehicle.reload();
            textureCb();
        }

        if (!this.loadTextures && !this.loadNormals) textureCb();

        if (this.isFirstPerson) this.resetFirstPerson();
        else this.resetCamera();

        this.coin.setPosition(-20, 0);

        // force camera refresh to focus on vehicle
        Camera.translation = this.vehicle.chassis[0].translation;
        Camera.rotation = this.vehicle.chassis[0].rotation[1];
        Camera.cameraMatrixChanged = true;
    }

    static begin() {
        console.log("Beginning scene");

        const loop = (now) => {
            now *= 0.001;

            const delta = now - then;

            if (delta < FRAME_MIN_TIME) return requestAnimationFrame(loop);

            then = now;
            document.title = Math.round(1 / delta);
            this.update(delta);

            this.render();

            requestAnimationFrame(loop);
        };

        let then = 0;
        requestAnimationFrame(loop);
    }

    static update(delta) {
        if (this.vehicle.moving || this.updateCamera)
            Camera.updateCameraPosition(delta);
        if (this.vehicle.keyPressed) Camera.updateTargetPosition(delta);

        // vehicle moves
        this.vehicle.doStep(delta, FRAMES_PER_SECOND);

        // 100 = floor dimension
        if (Math.abs(this.vehicle.px) >= 95 || Math.abs(this.vehicle.pz) >= 95)
            if (this.hasWon)
                this.vehicle.px = this.vehicle.py = this.vehicle.pz = this.vehicle.facing = 0;
            else {
                this.coins.current = 0;
                this.vehicle.reload();
            }

        // camera follows vehicle
        Camera.translation = this.vehicle.chassis[0].translation;
        Camera.rotation = this.vehicle.chassis[0].rotation[1];

        // 4.5 = coin's dimension
        if (
            Math.abs(this.vehicle.px - this.coin.position[0]) <= 4.5 &&
            Math.abs(this.vehicle.pz - this.coin.position[1]) <= 4.5
        ) {
            this.coins.current++;
            if (this.coins.current === this.coins.target) {
                this.hasWon = true;
                this.win();
                TextManager.win();
            }
            this.coin.randomPosition();
        }
        this.coin.rotate(delta);
        TextManager.time += delta;
    }

    static render() {
        this.gl.clearColor(0, 0, 0, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        TextManager.render();

        this.gl.useProgram(this.programInfo.program);

        setUniforms(this.programInfo, {
            lightPosition: this.lightPosition,
            Ia: Skybox.ambient,
            u_viewWorldPosition: Camera.cartesianPosition,
            u_perspective: Camera.perspectiveMatrix,
            u_view: Camera.viewMatrix,
        });
        this.polygons.forEach((p) => p.draw());
        this.vehicle.draw();
        Skybox.render();
    }

    static resetCamera() {
        const cameraSpherical = [25, degToRad(0), degToRad(65)];
        Camera.startPosition = cameraSpherical;
        this.updateCamera = true;
    }

    static setFirstPerson() {
        this.previousCameraPosition = [...Camera.startPosition];
        this.resetFirstPerson();
    }

    static resetFirstPerson() {
        Camera.firstPerson = true;
        [
            Camera.targetD,
            Camera.targetTheta,
            Camera.targetPhi,
        ] = this.vehicle.firstPersonCameraTarget;

        [
            Camera.d,
            Camera.theta,
            Camera.phi,
        ] = this.vehicle.firstPersonCameraPosition;
        Camera.lockCamera();
    }

    static setThirdPerson() {
        Camera.firstPerson = false;
        Camera.targetD = Camera.targetTheta = 0;
        Camera.targetPhi = degToRad(90);

        [Camera.d, Camera.theta, Camera.phi] = this.previousCameraPosition;
        this.previousCameraPosition = undefined;
    }

    static get isFirstPerson() {
        return Boolean(this.previousCameraPosition);
    }

    static win() {
        InputManager.disableinput(true);
        this.vehicle.setKey(0, false);
        this.vehicle.setKey(1, false);
        this.vehicle.setKey(2, false);
        this.vehicle.setKey(3, false);
        this.vehicle.setKey(4, false);
        window.onkeyup = (event) =>
            event.key.toLowerCase() === "f" && this._load();
        window.ontouchstart = () => (InputManager.clicked = true);
        window.ontouchend = () => InputManager.clicked && this._load();
    }
}
