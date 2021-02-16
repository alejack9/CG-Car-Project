export function create1PixelTexture(gl, color) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array(color)
    );
    return texture;
}

export function textureFromCubeMap(gl, posx, posy, posz, negx, negy, negz) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
    [
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
            imgUrl: posx,
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
            imgUrl: negx,
        },
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
            imgUrl: posy,
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
            imgUrl: negy,
        },
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
            imgUrl: posz,
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
            imgUrl: negz,
        },
    ].forEach(({ target, imgUrl }) => {
        const img = new Image();
        img.src = imgUrl;
        img.onload = () => {
            const level = 0;
            const internalFormat = gl.RGBA;
            const format = gl.RGBA;
            const type = gl.UNSIGNED_BYTE;
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

            gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
            gl.texImage2D(target, level, internalFormat, format, type, img);

            gl.texParameteri(
                gl.TEXTURE_CUBE_MAP,
                gl.TEXTURE_MIN_FILTER,
                gl.LINEAR
            );
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.REPEAT);
        };
    });
    return texture;
}

/**
 *
 * @param {WebGLRenderingContext} gl
 */
export function makeTexture(gl, imgUrl, defaultColor, cb) {
    const isPowerOf2 = (v) => (v & (v - 1)) == 0;

    // Create a texture.
    const texture = create1PixelTexture(gl, defaultColor);

    const image = new Image();
    image.addEventListener("load", () => {
        // Now that the image has loaded make copy it to the texture.
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            image
        );

        // Check if the image is a power of 2 in both dimensions.
        if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
            // Yes, it's a power of 2. Generate mips.
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(
                gl.TEXTURE_2D,
                gl.TEXTURE_MIN_FILTER,
                gl.NEAREST_MIPMAP_LINEAR
            );
        } else {
            // No, it's not a power of 2. Turn of mips and set wrapping to clamp to edge
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
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
        cb && cb();
    });
    image.src = imgUrl;
    return texture;
}
