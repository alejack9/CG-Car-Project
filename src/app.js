import { getWebGLContext } from "./js/libs/webgl-utils.js";
import { Scene } from "./js/scene.js";
import { TextManager } from "./js/text-manager.js";

(async function boot() {
    const canvas = document.getElementById("gl-surface");
    const textCanvas = document.getElementById("text");

    var ctx = textCanvas.getContext("2d");
    const gl = getWebGLContext(canvas);

    console.log(
        `vendor: ${gl.getParameter(
            gl.getExtension("WEBGL_debug_renderer_info").UNMASKED_VENDOR_WEBGL
        )}\n`,
        `renderer: ${gl.getParameter(
            gl.getExtension("WEBGL_debug_renderer_info").UNMASKED_RENDERER_WEBGL
        )}`
    );

    const mobile = "ontouchstart" in window;

    TextManager.load(
        ctx,
        await (
            await fetch(mobile ? "instructions.mobile.txt" : "instructions.txt")
        ).text(),
        1,
        mobile
    );

    await Scene.load(gl, mobile);
    Scene.begin();
})();
