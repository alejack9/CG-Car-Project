import {
    createProgramInfo,
    createBufferInfoFromArrays,
    setBuffersAndAttributes,
    setUniforms,
    drawBufferInfo,
} from "./libs/webgl-utils.js";
import { textureFromCubeMap } from "./utils/texture-maker.js";
import { copy, inverse, multiply } from "./libs/m4.js";
import { Camera } from "./camera.js";
import { getUrl, getUrlHref } from "./utils/url.js";
import { Scene } from "./scene.js";

export class Skybox {
    static async load() {
        this.programInfo = await createProgramInfo(Scene.gl, [
            "shaders/skybox.vs.glsl",
            "shaders/skybox.fs.glsl",
        ]);

        this.bufferInfo = createBufferInfoFromArrays(Scene.gl, {
            position: {
                // prettier-ignore
                data: new Float32Array([
                    -1, -1, // bottom-left triangle
                     1, -1,
                    -1,  1,
                    -1,  1, // top-right triangle
                     1, -1,
                     1,  1,
                ]),
                numComponents: 2,
            },
        });

        const skyboxUrl = "data/sample/skybox/skybox.json";
        const skyboxImgs = JSON.parse(await (await fetch(skyboxUrl)).text());
        const baseHref = getUrl(skyboxUrl);

        this.texture = textureFromCubeMap(
            Scene.gl,
            getUrlHref(skyboxImgs.back, baseHref),
            getUrlHref(skyboxImgs.top, baseHref),
            getUrlHref(skyboxImgs.right, baseHref),
            getUrlHref(skyboxImgs.front, baseHref),
            getUrlHref(skyboxImgs.bottom, baseHref),
            getUrlHref(skyboxImgs.left, baseHref)
        );

        Skybox.ambient = skyboxImgs.ambient ?? [0, 0, 0];
    }

    static render() {
        Scene.gl.useProgram(this.programInfo.program);

        // get view matrix facing and translation
        const viewMatrix = copy(Camera.viewMatrix);

        // remove translations
        viewMatrix[12] = 0;
        viewMatrix[13] = 0;
        viewMatrix[14] = 0;

        // apply to canvas and invert
        const u_viewDirectionProjectionInverse = inverse(
            multiply(Camera.perspectiveMatrix, viewMatrix)
        );

        const uniforms = {
            u_viewDirectionProjectionInverse,
            u_skybox: this.texture,
        };

        setBuffersAndAttributes(Scene.gl, this.programInfo, this.bufferInfo);

        setUniforms(this.programInfo, uniforms);

        // force depth test to return the lowest value
        Scene.gl.depthFunc(Scene.gl.LEQUAL);

        drawBufferInfo(Scene.gl, this.bufferInfo);
    }
}
