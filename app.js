import * as webglUtils from "./js/libs/webgl-utils.js";
import { Scene } from "./js/scene.js";
import { TextManager } from "./js/utils/text-manager.js";

(async function boot() {
    const canvas = document.getElementById("gl-surface");
    const textCanvas = document.getElementById("text");
    var ctx = textCanvas.getContext("2d");

    const gl = webglUtils.getWebGLContext(canvas);

    const scene = new Scene(gl, new TextManager(ctx));
    await scene.load();
    scene.begin();
})();
