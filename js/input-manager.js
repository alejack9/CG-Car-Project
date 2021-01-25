import { Scene } from "./scene.js";
import { resizeCanvasToDisplaySize } from "./libs/webgl-utils.js";
import { TextManager } from "./text-manager.js";
import { Camera } from "./camera.js";
import { degToRad } from "./utils/spherical-coordinates.js";
import { ObjLoader } from "./utils/object-loader.js";

export class InputManager {
    static setWindowFunctions(fun) {
        [
            "mousedown",
            "mousemove",
            "mouseup",
            "wheel",
            "touchstart",
            "touchmove",
            "touchend",
            "keydown",
            "keyup",
        ].forEach(fun);
    }

    static disableinput(bool) {
        if (!bool) return this.addEvents();

        this.setWindowFunctions((ev) => (window["on" + ev] = undefined));

        for (const el of document.getElementsByClassName("control"))
            this.disableControlElement(el);
    }

    static enableControlElement(el) {
        // specifically enables ranges
        el.disabled = false;
        el.ontouchstart = () => (this.systemControl = true);
        el.ontouchend = () => (this.systemControl = false);
        // specific for ranges
        el.onmousedown = () => (this.systemControl = true);
        el.onmouseup = () => (this.systemControl = false);
    }

    static disableControlElement(el) {
        el.style.color = "white";
        el.ontouchstart = undefined;
        el.ontouchend = undefined;
        // specifically disables ranges
        el.disabled = true;
    }

    static addEvents() {
        // a little timeout at screen rotation makes us sure that the new window's dimensions are correct
        screen.orientation.onchange = () => setTimeout(this.resize, 500);

        this.setWindowFunctions((ev) => (window["on" + ev] = this[`${ev}`]));

        // touchend is the same as mouseup
        window["ontouchend"] = this.mouseup;
        window["onresize"] = this.resize;

        for (const el of document.getElementsByClassName("control"))
            this.enableControlElement(el);

        ["x", "y", "z"].forEach((axis, index) => {
            const el = document.getElementById(axis);
            // sync axis' control value with label
            el.oninput = () => {
                document.getElementById(axis + "l").innerHTML = el.value;
                Scene.lightPosition[index] = parseFloat(el.value);
            };
        });

        document.getElementById("load_bump").onchange = () => {
            Scene.loadNormals = document.getElementById("load_bump").checked;
            Scene._load();
        };
        document.getElementById("load_texture").onchange = () => {
            Scene.loadTextures = document.getElementById(
                "load_texture"
            ).checked;
            Scene._load();
        };

        document.getElementById("keep_textures").onchange = () => {
            ObjLoader.keepTextures = document.getElementById(
                "keep_textures"
            ).checked;
        };

        ["up", "left", "down", "right"].forEach((dir, index) => {
            const el = document.getElementById(dir);
            el.ontouchstart = () => {
                this.systemControl = true;
                Scene.vehicle.setKey(index, 1);
                el.style.color = "rgb(40, 40, 40)";
            };
            el.ontouchend = () => {
                this.systemControl = false;
                Scene.vehicle.setKey(index, 0);
                el.style.color = "white";
            };
        });

        document.getElementById("prev").ontouchend = () => {
            Scene.currentVehicle =
                (Scene.currentVehicle === 0
                    ? Scene.vehiclesRefs.length
                    : Scene.currentVehicle) - 1;
            Scene._load();
        };

        document.getElementById("next").ontouchend = () => {
            Scene.currentVehicle =
                (Scene.currentVehicle + 1) % Scene.vehiclesRefs.length;
            Scene._load();
        };

        document.getElementById("camera").ontouchend = () => {
            this.systemControl = false;
            let folder = "first/";
            if (!Scene.isFirstPerson) Scene.setFirstPerson();
            else {
                folder = "third/";
                Scene.setThirdPerson();
            }
            // changes all images referred to camera
            for (const el of document.getElementsByClassName("camera-buttons"))
                el.src = "data/images/" + folder + el.id + ".png";
            Camera.lockCamera();
        };

        document.getElementById("lock").ontouchend = () => {
            this.systemControl = false;
            Camera.lockCamera();
        };

        document.getElementById("restart").ontouchend = () => {
            this.systemControl = false;
            if (Scene.isFirstPerson) return Scene.resetFirstPerson();
            Scene.resetCamera();
        };

        const hide = document.getElementById("hide");
        hide.onmouseup = () => {
            this.systemControl = false;
            const hidden = hide.innerHTML === "[+]";
            for (const el of document.getElementsByClassName("hideable")) {
                if (hidden) el.style.visibility = "visible";
                else el.style.visibility = "hidden";
            }
            hide.innerHTML = hidden ? "[-]" : "[+]";
        };
    }

    static touchstart = (event) => {
        // if there is only one finger on screen, trait it as a "mouse down" event
        if (event.touches.length === 1) {
            // map "touches[0].client" to "client" (compatible to "mousedown" event) and call the appropriate function
            [event.clientX, event.clientY] = [
                event.touches[0].clientX,
                event.touches[0].clientY,
            ];
            return this.mousedown(event);
        }
        // else trait it as a "wheel" event: record the distance between touching points
        this.dist = Math.hypot(
            event.touches[1].pageX - event.touches[0].pageX,
            event.touches[1].pageY - event.touches[0].pageY
        );
    };

    static mousedown = (event) => {
        // ignore mousedown if there's a system-control function (e.g. button's click)
        if (this.systemControl) return;
        this.clicked = true;
        // save the start
        this.start = [event.clientX, event.clientY];
        // tell the scene to stop update the camera when updating (vehicle's movement as higher priority)
        Scene.updateCamera = false;
    };

    static touchmove = (event) => {
        // if there is only one finger on screen, trait it as a "mouse move" event
        if (event.touches.length === 1) {
            [event.clientX, event.clientY] = [
                event.touches[0].clientX,
                event.touches[0].clientY,
            ];
            return this.mousemove(event);
        }
        // else trait it as a "wheel" event: calculate the distance, set deltaY to -1 or 1 end pass the event to "wheel" function
        const dist = Math.hypot(
            event.touches[1].pageX - event.touches[0].pageX,
            event.touches[1].pageY - event.touches[0].pageY
        );
        event.deltaY = Math.sign(this.dist - dist);
        this.wheel(event, 0.1);
        this.dist = dist;
    };

    // we don't need delta because this is calculated on the size on screen
    static mousemove = (event) => {
        if (this.systemControl || !this.clicked) return;
        const deltas = [
            window.devicePixelRatio * (event.clientX - this.start[0]),
            window.devicePixelRatio * (event.clientY - this.start[1]),
        ];
        // if first person, change target, else change position
        if (Scene.isFirstPerson) {
            Camera.targetTheta -= degToRad(
                (180 * deltas[0]) / Scene.gl.canvas.width
            );
            Camera.targetPhi -= degToRad(
                (45 * deltas[1]) / Scene.gl.canvas.height
            );
        } else {
            // 180 = "speed" of drag: side to side move the camera of 180 degs
            Camera.theta += degToRad((180 * deltas[0]) / Scene.gl.canvas.width);
            Camera.phi -= degToRad((90 * deltas[1]) / Scene.gl.canvas.height);
        }
        this.start = [event.clientX, event.clientY];
    };

    static mouseup = () => {
        this.clicked = false;
    };

    static wheel = (event, step = 0.5) => {
        if (this.systemControl || Scene.isFirstPerson) return;
        // window.devicePixelRatio provides the pixel density so that we have the change of d for any device
        Camera.d += Math.sign(event.deltaY) * step * window.devicePixelRatio;
        Scene.updateCamera = false;
    };

    static keys = ["w", "a", "s", "d", " "];
    static keydown = (event) => {
        this.keys.forEach((key, index) => {
            if (event.key.toLowerCase() === key)
                Scene.vehicle.setKey(index, true);
        });
    };

    static keyup = (event) => {
        this.keys.forEach((key, index) => {
            if (event.key.toLowerCase() === key)
                Scene.vehicle.setKey(index, false);
        });

        if (event.key.toLowerCase() === "0") Camera.lockCamera();
        if (event.key.toLowerCase() === "c") {
            if (!Scene.isFirstPerson) Scene.setFirstPerson();
            else Scene.setThirdPerson();
            Camera.lockCamera();
        }
        if (event.key.toLowerCase() === "q") {
            Scene.currentVehicle =
                (Scene.currentVehicle + Scene.vehiclesRefs.length - 1) %
                Scene.vehiclesRefs.length;
            Scene._load();
        }
        if (event.key.toLowerCase() === "e") {
            Scene.currentVehicle =
                (Scene.currentVehicle + 1) % Scene.vehiclesRefs.length;
            Scene._load();
        }
        if (event.key.toLowerCase() === "r") {
            if (Scene.isFirstPerson) return Scene.resetFirstPerson();
            Scene.resetCamera();
        }

        if (event.key.toLowerCase() === "h")
            TextManager.show = !TextManager.show;

        const n = parseInt(event.key);
        if (n >= 1 && n <= 8 && n - 1 !== Scene.currentVehicle) {
            Scene.currentVehicle = n - 1;
            Scene._load();
        }
    };

    static resize = () => {
        // even if the official web fundamentals guide discourage this implementation (moving this code to the render function),
        // in our case this is a major performance improvement without any bad side effects.
        resizeCanvasToDisplaySize(Scene.gl.canvas);
        resizeCanvasToDisplaySize(TextManager.ctx.canvas);

        Scene.gl.viewport(0, 0, Scene.gl.canvas.width, Scene.gl.canvas.height);

        Camera.updatePerspectiveMatrix(
            Scene.gl.canvas.clientWidth,
            Scene.gl.canvas.clientHeight
        );

        TextManager.fontSize = Math.max(
            Math.round(
                (Math.min(window.innerHeight, window.innerWidth) *
                    window.devicePixelRatio) /
                    60
            ),
            10
        );
    };
}
