function createAugmentedTypedArray(numComponents, numElements, opt_type) {
	const Type = opt_type || Float32Array;
	return augmentTypedArray(
		new Type(numComponents * numElements),
		numComponents
	);
}
function augmentTypedArray(typedArray, numComponents) {
	let cursor = 0;
	typedArray.push = function () {
		for (let ii = 0; ii < arguments.length; ++ii) {
			const value = arguments[ii];
			if (
				value instanceof Array ||
				(value.buffer && value.buffer instanceof ArrayBuffer)
			) {
				for (let jj = 0; jj < value.length; ++jj) {
					typedArray[cursor++] = value[jj];
				}
			} else {
				typedArray[cursor++] = value;
			}
		}
	};
	typedArray.reset = function (opt_index) {
		cursor = opt_index || 0;
	};
	typedArray.numComponents = numComponents;
	Object.defineProperty(typedArray, 'numElements', {
		get: function () {
			return (this.length / this.numComponents) | 0;
		},
	});
	return typedArray;
}

/**
 * Array of the indices of corners of each face of a cube.
 * @type {Array.<number[]>}
 */
const CUBE_FACE_INDICES = [
	[3, 7, 5, 1], // right
	[6, 2, 0, 4], // left
	[6, 7, 3, 2], // ??
	[0, 1, 5, 4], // ??
	[7, 6, 4, 5], // front
	[2, 3, 1, 0], // back
];

/**
 * Creates the vertices and indices for a cube. The
 * cube will be created around the origin. (-size / 2, size / 2)
 *
 * @param {number} size Width, height and depth of the cube.
 * @return {Object.<string, TypedArray>} The
 *         created plane vertices.
 * @memberOf module:primitives
 */
export function createCubeVertices(size) {
	const k = size / 2;

	const cornerVertices = [
		[-k, -k, -k],
		[+k, -k, -k],
		[-k, +k, -k],
		[+k, +k, -k],
		[-k, -k, +k],
		[+k, -k, +k],
		[-k, +k, +k],
		[+k, +k, +k],
	];

	const faceNormals = [
		[+1, +0, +0],
		[-1, +0, +0],
		[+0, +1, +0],
		[+0, -1, +0],
		[+0, +0, +1],
		[+0, +0, -1],
	];

	const uvCoords = [
		[1, 0],
		[0, 0],
		[0, 1],
		[1, 1],
	];

	const numVertices = 6 * 4;
	const positions = createAugmentedTypedArray(3, numVertices);
	const normals = createAugmentedTypedArray(3, numVertices);
	const texCoords = createAugmentedTypedArray(2, numVertices);
	const indices = createAugmentedTypedArray(3, 6 * 2, Uint16Array);

	for (let f = 0; f < 6; ++f) {
		const faceIndices = CUBE_FACE_INDICES[f];
		for (let v = 0; v < 4; ++v) {
			const position = cornerVertices[faceIndices[v]];
			const normal = faceNormals[f];
			const uv = uvCoords[v];

			// Each face needs all four vertices because the normals and texture
			// coordinates are not all the same.
			positions.push(position);
			normals.push(normal);
			texCoords.push(uv);
		}
		// Two triangles make a square face.
		const offset = 4 * f;
		indices.push(offset + 0, offset + 1, offset + 2);
		indices.push(offset + 0, offset + 2, offset + 3);
	}

	return {
		position: positions,
		normal: normals,
		texcoord: texCoords,
		indices: indices,
	};
}
