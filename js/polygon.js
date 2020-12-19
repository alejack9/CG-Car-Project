import * as webglUtils from "./libs/webgl-utils.js";
import * as m4 from "./libs/m4.js";
import { degToRad } from "./utils/spherical-coordinates.js";

export class Polygon {
    /**
     *
     * @param {WebGLRenderingContext} gl
     */
    constructor(
        gl,
        arrays,
        attribSetters,
        uniformSetters,
        transforms = {},
        material = {
            Kd: [1.0, 1.0, 1.0],
            Ka: [0.0, 0.0, 0.0],
            Ks: [1.0, 1.0, 1.0],
            n: 400,
        },
        cw,
        extraUniforms = {}
    ) {
        this.gl = gl;
        this.extraUniforms = extraUniforms;
        this.translation = transforms.translation || [0, 0, 0];
        this.rotation = transforms.rotation || [
            degToRad(0),
            degToRad(0),
            degToRad(0),
        ];
        this.scale = transforms.scale || [1, 1, 1];
        this.mirror = transforms.mirror || [1, 1, 1];

        let transformationMatrixFun;
        if (transforms.rotationCenter) {
            transformationMatrixFun = this
                ._transformationsMatrixWithRotationCenter;
            this.rotationCenter = transforms.rotationCenter;
            this.translation = m4.addVectors(
                this.translation,
                this.rotationCenter
            );
        } else transformationMatrixFun = this._transformationsMatrix;

        Object.defineProperty(this, "transformationsMatrix", {
            get: () => transformationMatrixFun.apply(this),
            set: () => {},
        });

        this.transformationsMatrix = this.twisting = cw ? gl.CW : gl.CCW;

        this.attribSetters = attribSetters;
        this.uniformSetters = uniformSetters;
        this.material = material;
        this.color = arrays.color.value.slice(0, 3);
        this.bufferInfo = webglUtils.createBufferInfoFromArrays(gl, arrays);
    }

    _transformationsMatrix() {
        let matrix = m4.translation(...this.translation);
        matrix = m4.yRotate(matrix, this.rotation[1]);
        matrix = m4.zRotate(matrix, this.rotation[2]);
        matrix = m4.xRotate(matrix, this.rotation[0]);
        return this._scaleAndMirror(matrix);
    }

    _transformationsMatrixWithRotationCenter() {
        let matrix = m4.translation(...this.translation);
        // added first rotationCenter translation to starter translation
        // matrix = m4.translate(matrix, ...this.rotationCenter);
        matrix = m4.yRotate(matrix, this.rotation[1]);
        matrix = m4.translate(matrix, ...this.rotationCenter.map((s) => -s));
        matrix = m4.zRotate(matrix, this.rotation[2]);
        matrix = m4.translate(matrix, ...this.rotationCenter);
        matrix = m4.xRotate(matrix, this.rotation[0]);
        matrix = m4.translate(matrix, ...this.rotationCenter.map((s) => -s));
        return this._scaleAndMirror(matrix);
    }

    _scaleAndMirror(matrix) {
        matrix = m4.scale(matrix, ...this.scale);
        return m4.multiply(matrix, m4.mirror(this.mirror));
    }

    draw() {
        this.gl.frontFace(this.twisting);
        const matrixUniform = {
            u_world: this.transformationsMatrix,
        };

        webglUtils.setBuffersAndAttributes(
            this.gl,
            this.attribSetters,
            this.bufferInfo
        );

        webglUtils.setUniforms(
            this.uniformSetters,
            matrixUniform,
            this.material,
            this.extraUniforms
        );

        webglUtils.drawBufferInfo(this.gl, this.bufferInfo);
    }

    /**
     * Applyes the passed transformation to the polygon matrix before draw the polygon.
     *
     * @param {float[]} matrix
     */
    drawBasedOnMatrix(matrix) {
        this.drawUsingMatrix(m4.multiply(matrix, this.transformationsMatrix));
    }

    /**
     * Ignores polygon transformations and draw it using the passwd matrix only.
     *
     * @param {float[]} matrix
     */
    drawUsingMatrix(matrix) {
        this.gl.frontFace(this.twisting);
        const matrixUniform = {
            u_world: matrix,
        };
        webglUtils.setBuffersAndAttributes(
            this.gl,
            this.attribSetters,
            this.bufferInfo
        );

        webglUtils.setUniforms(
            this.uniformSetters,
            matrixUniform,
            this.material,
            this.extraUniforms
        );

        webglUtils.drawBufferInfo(this.gl, this.bufferInfo);
    }
}
