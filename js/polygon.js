import * as webglUtils from './libs/webgl-utils.js';
import * as m4 from './libs/m4.js';
import { degToRad } from './utils/spherical-coordinates.js';

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
		texture,
		cw
	) {
		this.gl = gl;
		this.texture = texture;
		this.translation = transforms.translation || [0, 0, 0];
		this.rotation = transforms.rotation || [
			degToRad(0),
			degToRad(0),
			degToRad(0),
		];
		this.scale = transforms.scale || [1, 1, 1];
		this.mirror = transforms.mirror || [1, 1, 1];

		this.twisting = cw ? gl.CW : gl.CCW;

		this.arrays = arrays;
		this.attribSetters = attribSetters;
		this.uniformSetters = uniformSetters;
		this.bufferInfo = webglUtils.createBufferInfoFromArrays(gl, arrays);
	}

	get transformationsMatrix() {
		let matrix = m4.translation(...this.translation);
		matrix = m4.yRotate(matrix, this.rotation[1]);
		matrix = m4.zRotate(matrix, this.rotation[2]);
		matrix = m4.xRotate(matrix, this.rotation[0]);
		matrix = m4.scale(matrix, ...this.scale);
		matrix = m4.multiply(matrix, m4.mirror(this.mirror));

		return matrix;
	}

	draw(perspMatrix) {
		this.gl.frontFace(this.twisting);
		webglUtils.setBuffersAndAttributes(
			this.gl,
			this.attribSetters,
			this.bufferInfo
		);

		const matrixUniform = {
			u_matrix: m4.multiply(perspMatrix, this.transformationsMatrix),
		};

		webglUtils.setUniforms(this.uniformSetters, matrixUniform);

		this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
		webglUtils.drawBufferInfo(this.gl, this.bufferInfo);
		this.gl.bindTexture(this.gl.TEXTURE_2D, null);
	}

	drawOnly(matrix) {
		const matrixUniform = {
			u_matrix: matrix,
		};
		webglUtils.setBuffersAndAttributes(
			this.gl,
			this.attribSetters,
			this.bufferInfo
		);

		webglUtils.setUniforms(this.uniformSetters, matrixUniform);

		this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
		webglUtils.drawBufferInfo(this.gl, this.bufferInfo);
		this.gl.bindTexture(this.gl.TEXTURE_2D, null);
	}
}
