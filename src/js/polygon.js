import {
    createBufferInfoFromArrays,
    setBuffersAndAttributes,
    setUniforms,
    drawBufferInfo,
} from "./libs/webgl-utils.js";
import {
    addVectors,
    translation,
    yRotate,
    zRotate,
    xRotate,
    scale,
    translate,
    multiply,
} from "./libs/m4.js";
import { degToRad } from "./utils/spherical-coordinates.js";

export class Polygon {
    constructor(
        gl,
        arrays,
        programInfo,
        transforms = {},
        material = {
            Kd: [1.0, 1.0, 1.0],
            Ka: [0.0, 0.0, 0.0],
            Ks: [1.0, 1.0, 1.0],
            n: 400,
        }
    ) {
        this.gl = gl;
        this.translation = transforms.translation || [0, 0, 0];
        this.rotation = transforms.rotation || [
            degToRad(0),
            degToRad(0),
            degToRad(0),
        ];
        this.scale = transforms.scale || [1, 1, 1];
        this.mirror = transforms.mirror || [1, 1, 1];

        let transformationMatrixFun = this._transformationsMatrix;
        // if the rotation center is different from the translation of the object,
        // save the rotation center and use a different matrix as transformationMatrix
        if (transforms.rotationCenter) {
            transformationMatrixFun = this
                ._transformationsMatrixWithRotationCenter;
            this.rotationCenter = transforms.rotationCenter;
            this.translation = addVectors(
                this.translation,
                this.rotationCenter
            );
        }

        Object.defineProperty(this, "transformationsMatrix", {
            get: () => transformationMatrixFun.apply(this),
        });

        this.programInfo = programInfo;
        this.material = material;

        this.bufferInfo = createBufferInfoFromArrays(gl, arrays);
    }

    _transformationsMatrix() {
        let matrix = translation(...this.translation);
        matrix = yRotate(matrix, this.rotation[1]);
        matrix = zRotate(matrix, this.rotation[2]);
        matrix = xRotate(matrix, this.rotation[0]);
        return scale(matrix, ...this.scale);
    }

    _transformationsMatrixWithRotationCenter() {
        let matrix = translation(...this.translation);
        // added first rotationCenter translation to starter translation
        // matrix = translate(matrix, ...this.rotationCenter);
        matrix = yRotate(matrix, this.rotation[1]);
        matrix = translate(matrix, ...this.rotationCenter.map((s) => -s));
        matrix = zRotate(matrix, this.rotation[2]);
        matrix = translate(matrix, ...this.rotationCenter);
        matrix = xRotate(matrix, this.rotation[0]);
        matrix = translate(matrix, ...this.rotationCenter.map((s) => -s));
        return scale(matrix, ...this.scale);
    }

    draw() {
        const matrixUniform = {
            u_world: this.transformationsMatrix,
        };

        setBuffersAndAttributes(this.gl, this.programInfo, this.bufferInfo);

        setUniforms(this.programInfo, matrixUniform, this.material);

        drawBufferInfo(this.gl, this.bufferInfo);
    }

    // Applies the passed transformation to the polygon matrix before draw the polygon
    drawBasedOnMatrix(matrix) {
        this.drawUsingMatrix(multiply(matrix, this.transformationsMatrix));
    }

    // Ignores polygon transformations and draw it using the passed matrix only
    drawUsingMatrix(matrix) {
        const matrixUniform = {
            u_world: matrix,
        };
        setBuffersAndAttributes(this.gl, this.programInfo, this.bufferInfo);

        setUniforms(this.programInfo, matrixUniform, this.material);

        drawBufferInfo(this.gl, this.bufferInfo);
    }
}
