import * as webglUtils from "./js/libs/webgl-utils.js";
import { Scene } from "./js/scene.js";
import { TextManager } from "./js/utils/text-manager.js";

function getVideoCardInfo() {
    const gl = document.createElement("canvas").getContext("webgl");
    if (!gl) {
        return {
            error: "no webgl",
        };
    }
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    return debugInfo
        ? {
              vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
              renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
          }
        : {
              error: "no WEBGL_debug_renderer_info",
          };
}

console.log(getVideoCardInfo());

(async function boot() {
    const canvas = document.getElementById("gl-surface");
    const textCanvas = document.getElementById("text");
    var ctx = textCanvas.getContext("2d");

    const gl = webglUtils.getWebGLContext(canvas);

    const scene = new Scene(gl, new TextManager(ctx));
    await scene.load();
    scene.begin();
})();
