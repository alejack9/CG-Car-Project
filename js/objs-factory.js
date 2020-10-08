import { Polygon } from './polygon.js';
import * as webglUtils from './libs/webgl-utils.js';
import { createCubeVertices } from './libs/primitives.js';
import { Car } from './car.js';

export function getPolygons(gl, program) {
	const toRet = { polygons: [] };
	const setters = [
		webglUtils.createAttributeSetters(gl, program),
		webglUtils.createUniformSetters(gl, program),
	];

	toRet.car = carPols(gl, setters);
	toRet.polygons.push(toRet.car);

	let array = createCubeVertices(0.5);
	array.texcoord = {
		numComponents: 2,
		// prettier-ignore
		data: [
			// Front
			0,		0,
			10,		0,
			10,		0.1,
			0,		0.1,
			// Back
			0,		0,
			10,		0,
			10,		0.1,
			0,		0.1,
			// Top
			0,		0,
			0,		10,
			10,		10,
			0,		10,
			// Bottom
			0,		0,
			0,		10,
			10,		10,
			0,		10,
			// Right
			0,		0,
			10,		0,
			10,		0.1,
			0,		0.1,
			// Left
			0,		0,
			10,		0,
			10,		0.1,
			0,		0.1,
		],
	};
	toRet.polygons.push(
		new Polygon(
			gl,
			array,
			setters[0],
			setters[1],
			{
				scale: [100, 0.5, 100],
				translation: [-23.8, -0.35, 0],
			},
			makeTexture(gl, '../data/asphalt.jpg', [100, 100, 100, 255])
		)
	);

	return toRet;
}

function carPols(gl, setters) {
	const texcoord = {
		numComponents: 2,
		// prettier-ignore
		data: [
			// Front
			0,  0,
			1,  0,
			1,  1,
			0,  1,
			// Back
			0,  0,
			1,  0,
			1,  1,
			0,  1,
			// Top
			0,  0,
			1,  0,
			1,  1,
			0,  1,
			// Bottom
			0,  0,
			1,  0,
			1,  1,
			0,  1,
			// Right
			0,  0,
			1,  0,
			1,  1,
			0,  1,
			// Left
			0,  0,
			1,  0,
			1,  1,
			0,  1,
		],
	};
	const chassisTexture = makeTexture(gl, null, [100, 0, 0, 255]);
	const wheelsTexture = makeTexture(gl, null, [50, 50, 50, 255]);

	let array = createCubeVertices(2);
	array.texcoord = texcoord;

	const chassis = new Polygon(
		gl,
		array,
		setters[0],
		setters[1],
		{
			scale: [1, 0.14, 0.25],
		},
		chassisTexture
	);

	array = createCubeVertices(2);
	array.texcoord = texcoord;

	const back = [
		new Polygon(
			gl,
			array,
			setters[0],
			setters[1],
			{
				scale: [0.2, 0.2, 0.1],
				translation: [+0.8, -0.05, 0.35],
			},
			wheelsTexture
		),
	];

	array = createCubeVertices(2);
	array.texcoord = texcoord;
	back.push(
		new Polygon(
			gl,
			array,
			setters[0],
			setters[1],
			{
				scale: [0.2, 0.2, 0.1],
				translation: [+0.8, -0.05, -0.35],
			},
			wheelsTexture
		)
	);

	array = createCubeVertices(2);
	array.texcoord = texcoord;
	const front = [
		new Polygon(
			gl,
			array,
			setters[0],
			setters[1],
			{
				scale: [0.15, 0.15, 0.08],
				translation: [-0.55, -0.05, 0.35],
			},
			wheelsTexture
		),
	];

	array = createCubeVertices(2);
	array.texcoord = texcoord;
	front.push(
		new Polygon(
			gl,
			array,
			setters[0],
			setters[1],
			{
				scale: [0.15, 0.15, 0.08],
				translation: [-0.55, -0.05, -0.35],
			},
			wheelsTexture
		)
	);

	return new Car(gl, chassis, front, back);
}

/**
 *
 * @param {WebGLRenderingContext} gl
 */
const makeTexture = (gl, imgUrl, defaultColor = [0, 155, 255, 255]) => {
	function isPowerOf2(value) {
		return (value & (value - 1)) == 0;
	}

	// Create a texture.
	const texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);

	// Fill the texture with a 1x1 blue pixel.
	gl.texImage2D(
		gl.TEXTURE_2D,
		0,
		gl.RGBA,
		1,
		1,
		0,
		gl.RGBA,
		gl.UNSIGNED_BYTE,
		new Uint8Array(defaultColor)
	);

	gl.texParameteri(
		gl.TEXTURE_2D,
		gl.TEXTURE_MIN_FILTER,
		gl.LINEAR_MIPMAP_LINEAR
	);
	// prettier-ignore
	gl.texParameteri(
		gl.TEXTURE_2D,
		gl.TEXTURE_MAG_FILTER,
		gl.LINEAR
	);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

	if (imgUrl) {
		// Asynchronously load an image
		const image = new Image();
		image.src = imgUrl;
		image.addEventListener('load', () => {
			// Now that the image has loaded make copy it to the texture.
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texImage2D(
				gl.TEXTURE_2D,
				0,
				gl.RGBA,
				gl.RGBA,
				gl.UNSIGNED_BYTE,
				image
			);

			// Check if the image is a power of 2 in both dimensions.
			if (isPowerOf2(image.width) && isPowerOf2(image.height))
				// Yes, it's a power of 2. Generate mips.
				gl.generateMipmap(gl.TEXTURE_2D);
			else {
				// No, it's not a power of 2. Turn off mips and set wrapping to clamp to edge
				gl.texParameteri(
					gl.TEXTURE_2D,
					gl.TEXTURE_WRAP_S,
					gl.CLAMP_TO_EDGE
				);
				gl.texParameteri(
					gl.TEXTURE_2D,
					gl.TEXTURE_WRAP_T,
					gl.CLAMP_TO_EDGE
				);
				gl.texParameteri(
					gl.TEXTURE_2D,
					gl.TEXTURE_MIN_FILTER,
					gl.LINEAR
				);
			}
		});
	}
	return texture;
};
