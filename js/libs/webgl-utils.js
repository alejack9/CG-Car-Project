/** @typedef {Object} ProgramInfo
 * @property {WebGLProgram} program A shader program
 * @property {Object<string, function>} uniformSetters: object of setters as returned from createUniformSetters,
 * @property {Object<string, function>} attribSetters: object of setters as returned from createAttribSetters,
 * @memberOf module:webgl-utils
 */

/** @typedef {Object} AttribInfo
 * @property {number} [numComponents] the number of components for this attribute.
 * @property {number} [size] the number of components for this attribute.
 * @property {number} [type] the type of the attribute (eg. `gl.FLOAT`, `gl.UNSIGNED_BYTE`, etc...) Default = `gl.FLOAT`
 * @property {boolean} [normalized] whether or not to normalize the data. Default = false
 * @property {number} [offset] offset into buffer in bytes. Default = 0
 * @property {number} [stride] the stride in bytes per element. Default = 0
 * @property {WebGLBuffer} buffer the buffer that contains the data for this attribute
 * @memberOf module:webgl-utils
 */

/** @typedef {Object} BufferInfo
 * @property {number} numElements The number of elements to pass to `gl.drawArrays` or `gl.drawElements`.
 * @property {WebGLBuffer} [indices] The indices `ELEMENT_ARRAY_BUFFER` if any indices exist.
 * @property {Object.<string, AttribInfo>} attribs The attribs approriate to call `setAttributes`
 * @memberOf module:webgl-utils
 */

/**
 *
 * @param {HTMLElement} canvas
 * @param {[number]} rgbPercentageArray
 *
 * @returns {WebGLRenderingContext}
 */
export function getWebGLContext(
	canvas,
	cullface = true,
	depth_test = true,
	cullfaceMode = 'CCW'
) {
	/** @type{WebGLRenderingContext} */
	const gl = canvas.getContext('webgl');

	if (!gl) {
		console.warn(
			'Pure WebGL not supported. Falling back on experimental WebGL'
		);
		gl = canvas.getContext('experimental-webgl');
	}

	if (!gl) return alert('This Browser does not support WebGL');

	if (cullface) {
		gl.enable(gl.CULL_FACE);
		gl.frontFace(cullfaceMode === 'CCW' ? gl.CCW : gl.CW);
	}
	if (depth_test) gl.enable(gl.DEPTH_TEST);

	return gl;
}

/**
 * Creates a shader object from the passed url.
 *
 * @param {!WebGLRenderingContext} gl The WebGL Context.
 * @param {string} url
 * @param {number} opt_shaderType
 * @returns {!Promise<WebGLShader>} a shader
 */
async function createShaderFromFile(gl, url, opt_shaderType) {
	const shaderSource = await (await fetch(url)).text();

	if (!opt_shaderType) {
		const shaderType = url.match(/(?: *\.)(\w*)(?:\.)/)[1];
		if (shaderType === 'vs') opt_shaderType = gl.VERTEX_SHADER;
		else if (shaderType === 'fs') opt_shaderType = gl.FRAGMENT_SHADER;
		else throw '*** Error: shader type not set';
	}

	// Create the shader object
	const shader = gl.createShader(opt_shaderType);

	// Set the shader source code.
	gl.shaderSource(shader, shaderSource);

	// Compile the shader
	gl.compileShader(shader);

	// Check if it compiled
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
		// Something went wrong during compilation; get the error
		throw 'could not compile shader:' + gl.getShaderInfoLog(shader);

	return shader;
}

/**
 * Creates a program from passed shaders urls.
 *
 * @param {!WebGLRenderingContext} gl The WebGL Context.
 * @param {string[]} urls Array of urls of the file for the shaders. The first is assumed to be the
 *        vertex shader, the second the fragment shader.
 * @return {!Promise<WebGLShader>} The shader.
 * @memberOf module:webgl-utils
 */
export async function createProgramFromFiles(gl, urls) {
	// create shader
	const vs = await createShaderFromFile(gl, urls[0], gl.VERTEX_SHADER);
	const fs = await createShaderFromFile(gl, urls[1], gl.FRAGMENT_SHADER);

	// create program
	const program = gl.createProgram();

	// attach the shaders.
	gl.attachShader(program, vs);
	gl.attachShader(program, fs);

	// link the program.
	gl.linkProgram(program);

	// check if it linked.
	if (!gl.getProgramParameter(program, gl.LINK_STATUS))
		// something went wrong with the link
		throw 'program failed to link:' + gl.getProgramInfoLog(program);

	// return program
	return program;
}

/**
 * Resizes the canvas setting 'width' and 'height' fields and using 'clientWidth' and 'clientHeight' to get the actual canvas size.
 *
 * @param {boolean} maxResolution makes shader work more expensive.
 * @memberOf module:webgl-utils
 */
export function resizeCanvasToDisplaySize(canvas, maxResolution) {
	// handels HD-DPI and RETINA displays
	// https://webglfundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html (blue part)
	const realToCSSPixels = maxResolution ? window.devicePixelRatio : 1;

	const displayWidth = Math.floor(canvas.clientWidth * realToCSSPixels);
	const displayHeight = Math.floor(canvas.clientHeight * realToCSSPixels);

	if (canvas.width != displayWidth || canvas.height != displayHeight) {
		canvas.width = displayWidth;
		canvas.height = displayHeight;
	}
}

/**
 *
 * @param {!WebGLRenderingContext} gl The WebGL Context.
 * @param {BufferSource} array the buffer containing data.
 * @param {number} opt_type gl.ARRAY_BUFFER as default value.
 * @param {number} opt_drawType gl.STATIC_DRAW as default value.
 * @returns {WebGLBuffer}
 */
export function createBufferFromTypedArray(gl, array, opt_type, opt_drawType) {
	// sets default type value
	opt_type = opt_type || gl.ARRAY_BUFFER;
	// creates the buffer
	const buffer = gl.createBuffer();
	// binds the buffer
	gl.bindBuffer(opt_type, buffer);
	// puts data into the buffer
	gl.bufferData(opt_type, array, opt_drawType || gl.STATIC_DRAW);
	return buffer;
}

/**
 * Tries to guess if the vector should be normalized or not: return true if the array type is Int8 or Uint8, false otherwise
 *
 * @param {TypedArray} typedArray
 */
const getNormalizationForTypedArray = (typedArray) =>
	typedArray instanceof Int8Array || typedArray instanceof Uint8Array;

/**
 * Creates a set of attribute data and WebGLBuffers from set of arrays
 *
 * Given
 *
 *      let arrays = {
 *        position: { numComponents: 3, data: [0, 0, 0, 10, 0, 0, 0, 10, 0, 10, 10, 0], },
 *        texcoord: { numComponents: 2, data: [0, 0, 0, 1, 1, 0, 1, 1],                 },
 *        normal:   { numComponents: 3, data: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],     },
 *        color:    { numComponents: 4, data: [255, 255, 255, 255, 255, 0, 0, 255, 0, 0, 255, 255], type: Uint8Array, },
 *        indices:  { numComponents: 3, data: [0, 1, 2, 1, 2, 3],                       },
 *      };
 *
 * returns something like
 *
 *      let attribs = {
 *        a_position: { numComponents: 3, type: gl.FLOAT,         normalize: false, buffer: WebGLBuffer, },
 *        a_texcoord: { numComponents: 2, type: gl.FLOAT,         normalize: false, buffer: WebGLBuffer, },
 *        a_normal:   { numComponents: 3, type: gl.FLOAT,         normalize: false, buffer: WebGLBuffer, },
 *        a_color:    { numComponents: 4, type: gl.UNSIGNED_BYTE, normalize: true,  buffer: WebGLBuffer, },
 *      };
 *
 * @param {WebGLRenderingContext} gl The webgl rendering context.
 * @param {Object.<string, [number]|TypedArray>} arrays The arrays
 * @param {Object.<string, string>} [opt_mapping] mapping from attribute name to array name.
 *     if not specified defaults to "a_name" -> "name".
 * @return {Object.<string, AttribInfo>} the attribs
 * @memberOf module:webgl-utils
 */
export function createAttribsFromArrays(gl, arrays, opt_mapping) {
	// if no mapping has been specified, creates a mapping from the array set
	const mapping = opt_mapping || createMapping(arrays);
	const attribs = {};
	// for each attribute in the mapping
	Object.keys(mapping).forEach((attribName) => {
		// get the buffer name
		const bufferName = mapping[attribName];
		// get the array corresponding to the buffer
		const origArray = arrays[bufferName];
		// if the array has a value, then the array is type, so saves it to the relative attribute field
		if (origArray.value)
			attribs[attribName] = {
				value: origArray.value,
			};
		else {
			// otherwise, makes a TypedArray from the original array
			const array = makeTypedArray(origArray, bufferName);
			// adds an attrib with the buffer created from the array, putting the number of components, type and a flag to say
			// if the buffer should be normalized.
			attribs[attribName] = {
				buffer: createBufferFromTypedArray(gl, array),
				numComponents:
					origArray.numComponents ||
					array.numComponents ||
					guessNumComponentsFromName(bufferName),
				type: getGLTypeForTypedArray(gl, array),
				normalize: getNormalizationForTypedArray(array),
			};
		}
	});
	return attribs;
}

const positionKeys = ['position', 'positions', 'a_position'];
/**
 * Tries to get the number of elements described in an array set.
 *
 * @param {Object.<string, array|TypedArray|object>} arrays Your data
 */
function getNumElementsFromNonIndexedArrays(arrays) {
	// get the field that describes the position ('position', 'positions' or 'a_position')
	let key;
	for (const k of positionKeys)
		if (k in arrays) {
			key = k;
			break;
		}
	// if the 'position' field is not found, takes the first key
	key = key || Object.keys(arrays)[0];
	// gets the array length
	const length = getArray(arrays[key]).length;
	// gets the number of components
	// NOTE: component = number of values that describes a single element (for example, the color is described by 4 components: r, g, b, a)
	const numComponents = getNumComponents(arrays[key], key);
	// gets the number of elements (length / number of components)
	const numElements = length / numComponents;
	// if the number of components is not compatible with the length of the array, returns an error
	// (example: length = 10, numComponents = 3 => "getNumComponents" failed)
	if (length % numComponents > 0)
		throw new Error(
			`numComponents ${numComponents} not correct for length ${length}`
		);

	return numElements;
}

/**
 * Creates a BufferInfo from an object of arrays.
 *
 * This can be passed to {@link setBuffersAndAttributes} and to
 * {@link drawBufferInfo}.
 *
 * Given an object like
 *
 *     let arrays = {
 *       position: { numComponents: 3, data: [0, 0, 0, 10, 0, 0, 0, 10, 0, 10, 10, 0], },
 *       texcoord: { numComponents: 2, data: [0, 0, 0, 1, 1, 0, 1, 1],                 },
 *       normal:   { numComponents: 3, data: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],     },
 *       indices:  { numComponents: 3, data: [0, 1, 2, 1, 2, 3],                       },
 *     };
 *
 *  Creates an BufferInfo like this
 *
 *     bufferInfo = {
 *       numElements: 4,        // or whatever the number of elements is
 *       indices: WebGLBuffer,  // this property will not exist if there are no indices
 *       attribs: {
 *         a_position: { buffer: WebGLBuffer, numComponents: 3, },
 *         a_normal:   { buffer: WebGLBuffer, numComponents: 3, },
 *         a_texcoord: { buffer: WebGLBuffer, numComponents: 2, },
 *       },
 *     };
 *
 *  The properties of arrays can be JavaScript arrays in which case the number of components
 *  will be guessed.
 *
 *     let arrays = {
 *        position: [0, 0, 0, 10, 0, 0, 0, 10, 0, 10, 10, 0],
 *        texcoord: [0, 0, 0, 1, 1, 0, 1, 1],
 *        normal:   [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
 *        indices:  [0, 1, 2, 1, 2, 3],
 *     };
 *
 *  They can also by TypedArrays
 *
 *     let arrays = {
 *        position: new Float32Array([0, 0, 0, 10, 0, 0, 0, 10, 0, 10, 10, 0]),
 *        texcoord: new Float32Array([0, 0, 0, 1, 1, 0, 1, 1]),
 *        normal:   new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]),
 *        indices:  new Uint16Array([0, 1, 2, 1, 2, 3]),
 *     };
 *
 *  Or augmentedTypedArrays
 *
 *     let positions = createAugmentedTypedArray(3, 4);
 *     let texcoords = createAugmentedTypedArray(2, 4);
 *     let normals   = createAugmentedTypedArray(3, 4);
 *     let indices   = createAugmentedTypedArray(3, 2, Uint16Array);
 *
 *     positions.push([0, 0, 0, 10, 0, 0, 0, 10, 0, 10, 10, 0]);
 *     texcoords.push([0, 0, 0, 1, 1, 0, 1, 1]);
 *     normals.push([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]);
 *     indices.push([0, 1, 2, 1, 2, 3]);
 *
 *     let arrays = {
 *        position: positions,
 *        texcoord: texcoords,
 *        normal:   normals,
 *        indices:  indices,
 *     };
 *
 * For the last example it is equivalent to
 *
 *     let bufferInfo = {
 *       attribs: {
 *         a_position: { numComponents: 3, buffer: gl.createBuffer(), },
 *         a_texcoods: { numComponents: 2, buffer: gl.createBuffer(), },
 *         a_normals: { numComponents: 3, buffer: gl.createBuffer(), },
 *       },
 *       indices: gl.createBuffer(),
 *       numElements: 6,
 *     };
 *
 *     gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.attribs.a_position.buffer);
 *     gl.bufferData(gl.ARRAY_BUFFER, arrays.position, gl.STATIC_DRAW);
 *     gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.attribs.a_texcoord.buffer);
 *     gl.bufferData(gl.ARRAY_BUFFER, arrays.texcoord, gl.STATIC_DRAW);
 *     gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.attribs.a_normal.buffer);
 *     gl.bufferData(gl.ARRAY_BUFFER, arrays.normal, gl.STATIC_DRAW);
 *     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferInfo.indices);
 *     gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, arrays.indices, gl.STATIC_DRAW);
 *
 * @param {WebGLRenderingContext} gl A WebGLRenderingContext
 * @param {Object.<string, array|TypedArray|object>} arrays Your data
 * @param {Object.<string, string>} [opt_mapping] an optional mapping of attribute to array name.
 *    If not passed in it's assumed the array names will be mapped to an attribute
 *    of the same name with "a_" prefixed to it. An other words.
 *
 *        let arrays = {
 *           position: ...,
 *           texcoord: ...,
 *           normal:   ...,
 *           indices:  ...,
 *        };
 *
 *        bufferInfo = createBufferInfoFromArrays(gl, arrays);
 *
 *    Is the same as
 *
 *        let arrays = {
 *           position: ...,
 *           texcoord: ...,
 *           normal:   ...,
 *           indices:  ...,
 *        };
 *
 *        let mapping = {
 *          a_position: "position",
 *          a_texcoord: "texcoord",
 *          a_normal:   "normal",
 *        };
 *
 *        bufferInfo = createBufferInfoFromArrays(gl, arrays, mapping);
 *
 * @return {BufferInfo} A BufferInfo
 * @memberOf module:webgl-utils
 */
export function createBufferInfoFromArrays(gl, arrays, opt_mapping) {
	// creates the buffer info with attribs information
	const bufferInfo = {
		attribs: createAttribsFromArrays(gl, arrays, opt_mapping),
	};
	// if 'arrays' contains an 'indices' array
	let indices = arrays.indices;
	if (arrays.indices) {
		// make 'indices' a typed array
		indices = makeTypedArray(arrays.indices, 'indices');
		// make 'indices' a buffer and add it to the object
		bufferInfo.indices = createBufferFromTypedArray(
			gl,
			arrays.indices,
			gl.ELEMENT_ARRAY_BUFFER
		);
		bufferInfo.numElements = arrays.indices.length;
	} // else get the number of objects and only set that value
	else bufferInfo.numElements = getNumElementsFromNonIndexedArrays(arrays);

	return bufferInfo;
}

/**
 * Set uniforms and binds related textures.
 *
 * Example:
 *
 *     let programInfo = createProgramInfo(
 *         gl, ["some-vs", "some-fs"]);
 *
 *     let tex1 = gl.createTexture();
 *     let tex2 = gl.createTexture();
 *
 *     ... assume we setup the textures with data ...
 *
 *     let uniforms = {
 *       u_someSampler: tex1,
 *       u_someOtherSampler: tex2,
 *       u_someColor: [1,0,0,1],
 *       u_somePosition: [0,1,1],
 *       u_someMatrix: [
 *         1,0,0,0,
 *         0,1,0,0,
 *         0,0,1,0,
 *         0,0,0,0,
 *       ],
 *     };
 *
 *     gl.useProgram(program);
 *
 * This will automatically bind the textures AND set the
 * uniforms.
 *
 *     setUniforms(programInfo.uniformSetters, uniforms);
 *
 * For the example above it is equivalent to
 *
 *     let texUnit = 0;
 *     gl.activeTexture(gl.TEXTURE0 + texUnit);
 *     gl.bindTexture(gl.TEXTURE_2D, tex1);
 *     gl.uniform1i(u_someSamplerLocation, texUnit++);
 *     gl.activeTexture(gl.TEXTURE0 + texUnit);
 *     gl.bindTexture(gl.TEXTURE_2D, tex2);
 *     gl.uniform1i(u_someSamplerLocation, texUnit++);
 *     gl.uniform4fv(u_someColorLocation, [1, 0, 0, 1]);
 *     gl.uniform3fv(u_somePositionLocation, [0, 1, 1]);
 *     gl.uniformMatrix4fv(u_someMatrix, false, [
 *         1,0,0,0,
 *         0,1,0,0,
 *         0,0,1,0,
 *         0,0,0,0,
 *       ]);
 *
 * Note it is perfectly reasonable to call `setUniforms` multiple times. For example
 *
 *     let uniforms = {
 *       u_someSampler: tex1,
 *       u_someOtherSampler: tex2,
 *     };
 *
 *     let moreUniforms {
 *       u_someColor: [1,0,0,1],
 *       u_somePosition: [0,1,1],
 *       u_someMatrix: [
 *         1,0,0,0,
 *         0,1,0,0,
 *         0,0,1,0,
 *         0,0,0,0,
 *       ],
 *     };
 *
 *     setUniforms(programInfo.uniformSetters, uniforms);
 *     setUniforms(programInfo.uniformSetters, moreUniforms);
 *
 * @param {Object.<string, function>|ProgramInfo} setters the setters returned from
 *        `createUniformSetters` or a ProgramInfo from {@link createProgramInfo}.
 * @param {Object.<string, value>} values an array of object with values for the uniforms.
 * @memberOf module:webgl-utils
 */
export function setUniforms(setters, ...values) {
	// if "setters" is a ProgramInfo, takes the "uniformSetters" of the type, otherwise setters is a mapper (string->function)
	setters = setters.uniformSetters || setters;
	// because of we can pass multiple uniforms objects to the function, it takes all value of 'values'. Each value is a named set
	// of uniforms: <name,value>, so, if the uniform name is in the setter, it calls the relative setter passing the required uniform.
	for (const uniforms of values)
		Object.keys(uniforms).forEach((name) => {
			if (setters[name]) setters[name](uniforms[name]);
			else console.warn(`no setter for ${name}`);
		});
}

/**
 * Returns the corresponding bind point for a given sampler type
 *
 * Used to set the bind point of the texture dinamically in "createUniformSetters"
 *
 * @param {!WebGLRenderingContext} gl The WebGL Context.
 * @param {number} type The type of the sampler: gl.SAMPLER_2D or gl.SAMPLER_CUBE
 */
function getBindPointForSamplerType(gl, type) {
	if (type === gl.SAMPLER_2D) return gl.TEXTURE_2D;
	if (type === gl.SAMPLER_CUBE) return gl.TEXTURE_CUBE_MAP;
	return undefined;
}

/**
 * Creates setter functions for each uniform of a shader program.
 *
 * @see {@link setUniforms}
 *
 * @param {!WebGLRenderingContext} gl The WebGL Context.
 * @param {WebGLProgram} program the program to create setters for.
 * @returns {Object.<string, function>} an object with a setter by name for each uniform
 * @memberOf module:webgl-utils
 */
export function createUniformSetters(gl, program) {
	// textureUnit is shared between all the setters to make, so, even if it's used in "createUniformSetter" only,
	// it's declared in the outer scope.
	let textureUnit = 0;

	/**
	 * Creates a setter for a uniform of the given program with it's
	 * location embedded in the setter.
	 *
	 * @param {WebGLProgram} program
	 * @param {WebGLActiveInfo} uniformInfo the uniform info: name, size, type.
	 * @returns {function} the created setter.
	 */
	function createUniformSetter(program, uniformInfo) {
		// get the location of the uniform to set
		const location = gl.getUniformLocation(program, uniformInfo.name);

		// because gl.X is an enum, setup an array of funcitons (one type) that contains the setter
		const setters = [];
		setters[gl.FLOAT] = (v) => gl.uniform1f(location, v);
		setters[gl.FLOAT_VEC2] = (v) => gl.uniform2fv(location, v);
		setters[gl.FLOAT_VEC3] = (v) => gl.uniform3fv(location, v);
		setters[gl.FLOAT_VEC4] = (v) => gl.uniform4fv(location, v);
		setters[gl.INT] = (v) => gl.uniform1i(location, v);
		setters[gl.INT_VEC2] = (v) => gl.uniform2iv(location, v);
		setters[gl.INT_VEC3] = (v) => gl.uniform3iv(location, v);
		setters[gl.INT_VEC4] = (v) => gl.uniform4iv(location, v);
		setters[gl.BOOL] = (v) => gl.uniform1iv(location, v);
		setters[gl.BOOL_VEC2] = (v) => gl.uniform2iv(location, v);
		setters[gl.BOOL_VEC3] = (v) => gl.uniform3iv(location, v);
		setters[gl.BOOL_VEC4] = (v) => gl.uniform4iv(location, v);
		setters[gl.FLOAT_MAT2] = (v) => gl.uniformMatrix2fv(location, false, v);
		setters[gl.FLOAT_MAT3] = (v) => gl.uniformMatrix3fv(location, false, v);
		setters[gl.FLOAT_MAT4] = (v) => gl.uniformMatrix4fv(location, false, v);

		// Check if this uniform is an array
		if (uniformInfo.size > 1 && uniformInfo.name.substr(-3) === '[0]') {
			if (uniformInfo.type === gl.FLOAT)
				return (v) => gl.uniform1fv(location, v);
			if (uniformInfo.type === gl.INT)
				return (v) => gl.uniform1iv(location, v);
			if (
				uniformInfo.type === gl.SAMPLER_2D ||
				uniformInfo.type === gl.SAMPLER_CUBE
			) {
				const units = [];
				for (let i = 0; i < uniformInfo.size; ++i)
					units.push(textureUnit++);
				return ((bindPoint, units) => {
					return (textures) => {
						gl.uniform1iv(location, units);
						textures.forEach((texture, index) => {
							gl.activeTexture(gl.TEXTURE0 + units[index]);
							gl.bindTexture(bindPoint, texture);
						});
					};
				})(getBindPointForSamplerType(gl, uniformInfo.type), units);
			}
		}
		if (
			uniformInfo.type === gl.SAMPLER_2D ||
			uniformInfo.type === gl.SAMPLER_CUBE
		) {
			return ((bindPoint, unit) => {
				return (texture) => {
					gl.uniform1i(location, unit);
					gl.activeTexture(gl.TEXTURE0 + unit);
					gl.bindTexture(bindPoint, texture);
				};
			})(getBindPointForSamplerType(gl, uniformInfo.type), textureUnit++);
		}

		// if the uniform is a 'simple type', returns the corresponding setter in the default array
		if (setters[uniformInfo.type]) return setters[uniformInfo.type];

		throw 'unknown type: 0x' + type.toString(16); // we should never get here.
	}

	// the object to return
	const uniformSetters = {};
	// get the number of uniforms
	const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

	// for each uniform
	for (let i = 0; i < numUniforms; ++i) {
		// take the uniformInfo (WebGLActiveInfo { name, size, type })
		const uniformInfo = gl.getActiveUniform(program, i);
		if (!uniformInfo) break;
		// get the name
		let name = uniformInfo.name;
		// remove the array suffix
		name = name.substr(
			0,
			name.length + (name.substr(-3) === '[0]' ? -3 : 0)
		);
		// create a new field in the object to return with the specific setter function
		uniformSetters[name] = createUniformSetter(program, uniformInfo);
	}
	return uniformSetters;
}

/**
 * Sets attributes and binds buffers (deprecated... use {@link setBuffersAndAttributes})
 *
 * Example:
 *
 *     let program = createProgramFromScripts(
 *         gl, ["some-vs", "some-fs"]);
 *
 *     let attribSetters = createAttributeSetters(program);
 *
 *     let positionBuffer = gl.createBuffer();
 *     let texcoordBuffer = gl.createBuffer();
 *
 *     let attribs = {
 *       a_position: {buffer: positionBuffer, numComponents: 3},
 *       a_texcoord: {buffer: texcoordBuffer, numComponents: 2},
 *     };
 *
 *     gl.useProgram(program);
 *
 * This will automatically bind the buffers AND set the
 * attributes.
 *
 *     setAttributes(attribSetters, attribs);
 *
 * Properties of attribs. For each attrib you can add
 * properties:
 *
 * *   type: the type of data in the buffer. Default = gl.FLOAT
 * *   normalize: whether or not to normalize the data. Default = false
 * *   stride: the stride. Default = 0
 * *   offset: offset into the buffer. Default = 0
 *
 * For example if you had 3 value float positions, 2 value
 * float texcoord and 4 value uint8 colors you'd setup your
 * attribs like this
 *
 *     let attribs = {
 *       a_position: {buffer: positionBuffer, numComponents: 3},
 *       a_texcoord: {buffer: texcoordBuffer, numComponents: 2},
 *       a_color: {
 *         buffer: colorBuffer,
 *         numComponents: 4,
 *         type: gl.UNSIGNED_BYTE,
 *         normalize: true,
 *       },
 *     };
 *
 * Similar to setUniforms
 *
 * @param {Object.<string, function>|model:webgl-utils.ProgramInfo} setters Attribute setters as returned from createAttributeSetters or a ProgramInfo as returned {@link createProgramInfo}
 * @param {Object.<string, AttribInfo>} attribs AttribInfos mapped by attribute name.
 * @memberOf module:webgl-utils
 */
function setAttributes(setters, attribs) {
	// if "setters" is a ProgramInfo, takes the "attribSetters" of the type, otherwise 'setters' is a mapper (string->function)
	setters = setters.attribSetters || setters;
	// user cannot pass more attribs objects, so the program takes all fields of the passed attribute and, if there's a setter relative to the field,
	// calls it.
	Object.keys(attribs).forEach((name) => {
		if (setters[name]) setters[name](attribs[name]);
		// else console.warn(`no setter for ${name}`);
	});
}

/**
 * Sets attributes and buffers including the `ELEMENT_ARRAY_BUFFER` if appropriate
 *
 * Example:
 *
 *     let programInfo = createProgramInfo(
 *         gl, ["some-vs", "some-fs"]);
 *
 *     let arrays = {
 *       position: { numComponents: 3, data: [0, 0, 0, 10, 0, 0, 0, 10, 0, 10, 10, 0], },
 *       texcoord: { numComponents: 2, data: [0, 0, 0, 1, 1, 0, 1, 1],                 },
 *     };
 *
 *     let bufferInfo = createBufferInfoFromArrays(gl, arrays);
 *
 *     gl.useProgram(programInfo.program);
 *
 * This will automatically bind the buffers AND set the
 * attributes.
 *
 *     setBuffersAndAttributes(programInfo.attribSetters, bufferInfo);
 *
 * For the example above it is equivilent to
 *
 *     gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
 *     gl.enableVertexAttribArray(a_positionLocation);
 *     gl.vertexAttribPointer(a_positionLocation, 3, gl.FLOAT, false, 0, 0);
 *     gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
 *     gl.enableVertexAttribArray(a_texcoordLocation);
 *     gl.vertexAttribPointer(a_texcoordLocation, 4, gl.FLOAT, false, 0, 0);
 *
 * @param {WebGLRenderingContext} gl A WebGLRenderingContext.
 * @param {Object.<string, function>} setters Attribute setters as returned from `createAttributeSetters`
 * @param {BufferInfo} buffers a BufferInfo as returned from `createBufferInfoFromArrays`.
 * @memberOf module:webgl-utils
 */
export function setBuffersAndAttributes(gl, setters, buffers) {
	// sets attributes
	setAttributes(setters, buffers.attribs);

	// binds indices if they are specified
	if (buffers.indices)
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
}

/**
 * Creates setter functions for all attributes of a shader program.
 * You can pass this to {@link setBuffersAndAttributes} to set all your buffers and attributes.
 *
 * @see {@link setAttributes} for example
 *
 * @param {WebGLRenderingContext} gl A WebGLRenderingContext.
 * @param {WebGLProgram} program the program to create setters for.
 * @return {Object.<string, function>} an object with a setter for each attribute by name.
 * @memberOf module:webgl-utils
 */
export function createAttributeSetters(gl, program) {
	const attribSetters = {};

	/**
	 * Returns a function that sets the attribute basing on the passed array
	 *
	 * @param {number} index
	 */
	const createAttribSetter = (index) => (b) => {
		// if the array object has a value (and 'value' is 'Float32Array')
		if (b.value) {
			// disables the array (for safety)
			gl.disableVertexAttribArray(index);
			// adds the array as a buffer
			switch (b.value.length) {
				case 4:
					gl.vertexAttrib4fv(index, b.value);
					break;
				case 3:
					gl.vertexAttrib3fv(index, b.value);
					break;
				case 2:
					gl.vertexAttrib2fv(index, b.value);
					break;
				case 1:
					gl.vertexAttrib1fv(index, b.value);
					break;
				default:
					throw new Error(
						'the length of a float constant value must be between 1 and 4!'
					);
			}
		}
		// else 'b' contains a 'buffer' object
		else {
			gl.bindBuffer(gl.ARRAY_BUFFER, b.buffer);
			gl.enableVertexAttribArray(index);
			gl.vertexAttribPointer(
				index,
				b.numComponents || b.size,
				b.type || gl.FLOAT,
				b.normalize || false,
				b.stride || 0,
				b.offset || 0
			);
		}
	};

	const numAttribs = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
	// for each attribute
	for (let i = 0; i < numAttribs; ++i) {
		// gets the attribInfo
		const attribInfo = gl.getActiveAttrib(program, i);
		if (!attribInfo) break;
		// sets the attribute setter into the setters set
		attribSetters[attribInfo.name] = createAttribSetter(
			gl.getAttribLocation(program, attribInfo.name)
		);
	}

	return attribSetters;
}

/**
 * Creates a mapping for the arrays object: for each key of the object except for 'indicies', stores that key has "a_" + key in the mapping associated with the key itself.
 *
 * @param {any} obj
 */
function createMapping(obj) {
	// empty mapper
	const mapping = {};
	// for each key except 'indices', store 'a_'+key in the 'mapping' variable,
	// associated with the actual key
	Object.keys(obj)
		.filter((name) => name !== 'indices')
		.forEach((key) => {
			mapping['a_' + key] = key;
		});
	return mapping;
}

const texcoordRE = /coord|texture/i;
const colorRE = /color|colour/i;
/**
 * Tries to guess the number of component of an array by the name: 'coord' and 'texture' have 2 components, 'color' has 4 component and everything else has 3 components.
 * If the number of components does not match widht the length of the array, throws an error.
 *
 * NOTE: component = number of values that describes a single element (for example, the color is described by 4 components: r, g, b, a)
 *
 * @param {string} name
 * @param {number} length
 * @returns {number}
 * @throws {Error} if the array length does not match with the number of components
 */
function guessNumComponentsFromName(name, length) {
	let numComponents;
	if (texcoordRE.test(name)) numComponents = 2;
	else if (colorRE.test(name)) numComponents = 4;
	else numComponents = 3; // position, normals, indices ...

	if (length % numComponents > 0)
		throw new Error(
			`Can not guess numComponents for attribute '${name}'. Tried ${numComponents} but ${length} values is not evenly divisible by ${numComponents}. You should specify it.`
		);

	return numComponents;
}

/**
 *
 * @param {any} obj the object to test
 */
const isArrayBuffer = (obj) => obj.buffer && obj.buffer instanceof ArrayBuffer;

/**
 * Makes a typed array from the passed object.
 *
 * @param {any} array
 * @param {string} name
 * @returns {TypedArray}
 */
export function makeTypedArray(array, name) {
	// if the array is a buffer, returns the array
	if (isArrayBuffer(array)) return array;

	// if the array contains a 'data' field that is a buffer, returns the 'data' field
	if (array.data && isArrayBuffer(array.data)) return array.data;

	// if 'array' is an array, setup an object that contains the array as 'data' field
	if (Array.isArray(array))
		array = {
			data: array,
		};

	// if the array does not have a 'numComponents' field, makes it.
	// NOTE: component = number of values that describes a single element (for example, the color is described by 4 components: r, g, b, a)
	if (!array.numComponents)
		array.numComponents = guessNumComponentsFromName(name, array.length);

	let type = array.type;
	// if the array does not have a type and his name it's the indices array, sets the type to 'Uint16Array'
	if (!type && name === 'indices') type = Uint16Array;

	// creates a new object basing on the 'array' object and attaching 'push' funciton and 'numComponents' and 'numElements' fields
	const typedArray = createAugmentedTypedArray(
		array.numComponents,
		// if 'array.data.length / array.numComponents' is NaN, make the 'createAugmentedTypedArray' function count the number of elements
		(array.data.length / array.numComponents) | 0,
		type
	);
	// pushes the array data and returns it
	typedArray.push(array.data);
	return typedArray;
}

/**
 * Creates a typed array with a `push` function attached
 * so that you can easily *push* values.
 *
 * `push` can take multiple arguments. If an argument is an array each element
 * of the array will be added to the typed array.
 *
 * Example:
 *
 *     let array = createAugmentedTypedArray(3, 2);  // creates a Float32Array with 6 values
 *     array.push(1, 2, 3);
 *     array.push([4, 5, 6]);
 *     // array now contains [1, 2, 3, 4, 5, 6]
 *
 * Also has `numComponents` and `numElements` properties.
 *
 * @param {number} numComponents number of components
 * @param {number} numElements number of elements. The total size of the array will be `numComponents * numElements`.
 * @param {constructor} opt_type A constructor for the type. Default = `Float32Array`.
 * @return {ArrayBuffer} A typed array.
 * @memberOf module:webgl-utils
 */
function createAugmentedTypedArray(numComponents, numElements, opt_type) {
	// default type is Float32Array
	const Type = opt_type || Float32Array;
	// creates a 'superpower mode' of the typed array
	return augmentTypedArray(
		new Type(numComponents * numElements),
		numComponents
	);
}

/**
 * Adds `push` and `reset` methods to the passed typed array.
 * It also adds `numComponents` field to the passed array and defines a getter to it.
 *
 * @param {TypedArray} typedArray
 * @param {number} numComponents
 */
export function augmentTypedArray(typedArray, numComponents) {
	// It just keeps a 'cursor' and allows use to `push` values into the array so
	// we don't have to manually compute offsets
	let cursor = 0;
	typedArray.push = function () {
		for (let i = 0; i < arguments.length; ++i)
			if (
				arguments[i] instanceof Array ||
				(arguments[i].buffer &&
					arguments[i].buffer instanceof ArrayBuffer)
			)
				for (let j = 0; j < arguments[i].length; ++j)
					typedArray[cursor++] = arguments[i][j];
			else typedArray[cursor++] = arguments[i];
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
 * Returns the gl type of the passed typed array.
 *
 * @param {!WebGLRenderingContext} gl The web context.
 * @param {TypedArray} typedArray The typed array.
 * @returns {number} The gl type.
 */
function getGLTypeForTypedArray(gl, typedArray) {
	if (typedArray instanceof Int8Array) return gl.BYTE;
	if (typedArray instanceof Uint8Array) return gl.UNSIGNED_BYTE;
	if (typedArray instanceof Int16Array) return gl.SHORT;
	if (typedArray instanceof Uint16Array) return gl.UNSIGNED_SHORT;
	if (typedArray instanceof Int32Array) return gl.INT;
	if (typedArray instanceof Uint32Array) return gl.UNSIGNED_INT;
	if (typedArray instanceof Float32Array) return gl.FLOAT;
	throw 'unsupported typed array type';
}

/**
 * Returns the passed array (if the parameter is an array) or the 'data' field instead.
 *
 * @param {[number] | any} array an array or an object containing a 'data' field.
 * @returns {[number]}
 */
const getArray = (array) => (array.length ? array : array.data);

/**
 * Gets the number of components of the array.
 * If the arrays has no 'numComponents' field nor 'size', tries to guess the number of components from the name of the array.
 *
 * NOTE: component = number of values that describes a single element (for example, the color is described by 4 components: r, g, b, a)
 *
 * @param {any} array
 * @param {string} arrayName
 */
function getNumComponents(array, arrayName) {
	return (
		array.numComponents ||
		array.size ||
		guessNumComponentsFromName(arrayName, getArray(array).length)
	);
}

/**
 * Calls `gl.drawElements` or `gl.drawArrays`, whichever is appropriate
 *
 * normally you'd call `gl.drawElements` or `gl.drawArrays` yourself
 * but calling this means if you switch from indexed data to non-indexed
 * data you don't have to remember to update your draw call.
 *
 * @param {WebGLRenderingContext} gl A WebGLRenderingContext
 * @param {module:webgl-utils.BufferInfo} bufferInfo as returned from createBufferInfoFromArrays
 * @param {enum} [primitiveType] eg (gl.TRIANGLES, gl.LINES, gl.POINTS, gl.TRIANGLE_STRIP, ...)
 * @param {number} [count] An optional count. Defaults to bufferInfo.numElements
 * @param {number} [offset] An optional offset. Defaults to 0.
 * @memberOf module:webgl-utils
 */
export function drawBufferInfo(gl, bufferInfo, primitiveType, count, offset) {
	const indices = bufferInfo.indices;
	primitiveType = primitiveType === undefined ? gl.TRIANGLES : primitiveType;
	const numElements = count === undefined ? bufferInfo.numElements : count;
	offset = offset === undefined ? 0 : offset;
	if (indices)
		gl.drawElements(primitiveType, numElements, gl.UNSIGNED_SHORT, offset);
	else gl.drawArrays(primitiveType, offset, numElements);
}
