import { getUrl, getUrlHref } from "./url.js";
import { create1PixelTexture, makeTexture } from "./texture-maker.js";
import { subtractVectors, normalize, scaleVector } from "../libs/m4.js";
export class ObjLoader {
    static set keepTextures(v) {
        this._keepTextures = v;
        if (!v) this.textures = undefined;
    }

    static async parse(
        gl,
        objUrl,
        mtlUrl,
        loadTextures,
        loadNormals,
        loadedObjCb = () => {},
        loadedMtlCb = () => {},
        singleTextureLoadCb = () => {}
    ) {
        // https://gamedev.stackexchange.com/questions/68612/how-to-compute-tangent-and-bitangent-vectors
        function generateTangents(position, texcoord, indices) {
            const subtractVector2 = (a, b) => a.map((v, index) => v - b[index]);
            // FIXME useless
            function makeIndexIterator(indices) {
                let ndx = 0;
                const fn = () => indices[ndx++];
                fn.reset = () => {
                    ndx = 0;
                };
                fn.numElements = indices.length;
                return fn;
            }

            function makeUnindexedIterator(positions) {
                let ndx = 0;
                const fn = () => ndx++;
                fn.reset = () => {
                    ndx = 0;
                };
                fn.numElements = positions.length / 3;
                return fn;
            }
            const getNextIndex = indices
                ? makeIndexIterator(indices)
                : makeUnindexedIterator(position);
            const numFaceVerts = getNextIndex.numElements;
            const numFaces = numFaceVerts / 3;

            const tangents = [];
            for (let i = 0; i < numFaces; ++i) {
                const n1 = getNextIndex(); // 0, 3, 6, ...
                const n2 = getNextIndex(); // 1, 4, 7, ...
                const n3 = getNextIndex(); // 2, 5, 8, ...

                // get next 3 vertexes (composing the face)
                const p1 = position.slice(n1 * 3, n1 * 3 + 3);
                const p2 = position.slice(n2 * 3, n2 * 3 + 3);
                const p3 = position.slice(n3 * 3, n3 * 3 + 3);

                // get corresponding uvs
                const uv1 = texcoord.slice(n1 * 2, n1 * 2 + 2);
                const uv2 = texcoord.slice(n2 * 2, n2 * 2 + 2);
                const uv3 = texcoord.slice(n3 * 2, n3 * 2 + 2);

                // get p1-p2 segment (vector)
                const dp12 = subtractVectors(p2, p1);
                // get p1-p3 segment (vector)
                const dp13 = subtractVectors(p3, p1);

                // get corresponding uv vectors
                const duv12 = subtractVector2(uv2, uv1);
                const duv13 = subtractVector2(uv3, uv1);

                // http://www.opengl-tutorial.org/intermediate-tutorials/tutorial-13-normal-mapping/
                // float f = 1.0f / (deltaUV1.x * deltaUV2.y - deltaUV1.y * deltaUV2.x);
                // glm::vec3 tangent = (deltaPos1 * deltaUV2.y - deltaPos2 * deltaUV1.y) * f;
                // glm::vec3 bitangent = (deltaPos2 * deltaUV1.x - deltaPos1 * deltaUV2.x) * f;
                const f = 1.0 / (duv12[0] * duv13[1] - duv13[0] * duv12[1]);

                // prettier-ignore
                const tangent = Number.isFinite(f) ?
                    scaleVector(subtractVectors(scaleVector(dp12, duv13[1]), scaleVector(dp13, duv12[1])), f)
                    : [1, 0, 0];

                tangents.push(...tangent, ...tangent, ...tangent);
            }

            return tangents;
        }

        let obj, materials;

        return new Promise((res) => {
            let completedParsing = () => {
                if (!obj || !materials) return;
                if (!this.textures)
                    this.textures = {
                        defaultWhite: create1PixelTexture(gl, [
                            255,
                            255,
                            255,
                            255,
                        ]),
                        defaultNormal: create1PixelTexture(gl, [
                            127,
                            127,
                            255,
                            0,
                        ]),
                    };

                const defaultMaterial = {
                    Kd: [1, 1, 1],
                    diffuseMap: this.textures.defaultWhite,
                    normalMap: this.textures.defaultNormal,
                    Ka: [0, 0, 0],
                    specularMap: this.textures.defaultWhite,
                    Ks: [1, 1, 1],
                    n: 400,
                };

                const baseHref = getUrl(mtlUrl);

                let totalTextures = 0;
                let done = 0;
                const textureCB = () => {
                    singleTextureLoadCb(++done, totalTextures);
                };

                // load texture for materials
                for (const material of Object.values(materials)) {
                    const mapEntries = Object.entries(
                        material
                    ).filter(([key]) => key.endsWith("Map"));
                    for (const [key, filename] of mapEntries) {
                        let texture = this.textures[filename];
                        if (!texture) {
                            texture = makeTexture(
                                gl,
                                getUrlHref(filename, baseHref),
                                [0, 155, 255, 255],
                                textureCB
                            );
                            this.textures[filename] = texture;
                            totalTextures++;
                        }
                        material[key] = texture;
                    }
                }

                if (!totalTextures) textureCB();
                if (!this._keepTextures) this.textures = undefined;

                res(
                    obj.geometries.map(({ object, material, data }) => {
                        /* Because data is just named arrays like this
                         * {
                         *   position: [...],
                         *   texcoord: [...],
                         *   normal: [...],
                         * }
                         * I can just return it as 'arrays' object and add the material object
                         */
                        // create a buffer for each array by calling
                        // gl.createBuffer, gl.bindBuffer, gl.bufferData
                        if (data.color) {
                            if (data.position.length === data.color.length)
                                // it's 3. The our helper library assumes 4 so we need
                                // to tell it there are only 3.
                                data.color = {
                                    numComponents: 3,
                                    data: data.color,
                                };
                        }
                        // there are no vertex colors so just use constant white
                        else data.color = { value: [1, 1, 1, 1] };

                        // generate tangents if we have the data to do so.
                        if (data.texcoord && data.normal)
                            data.tangent = generateTangents(
                                data.position,
                                data.texcoord
                            );
                        // There are no tangents
                        else data.tangent = { value: [1, 0, 0] };

                        return {
                            object,
                            material: {
                                ...defaultMaterial,
                                ...materials[material],
                            },
                            arrays: {
                                ...data,
                            },
                        };
                    })
                );
            };

            ObjLoader.parseOBJ(objUrl).then((res) => {
                obj = res;
                loadedObjCb();
                completedParsing();
            });

            ObjLoader.parseMTL(mtlUrl, loadTextures, loadNormals).then(
                (res) => {
                    materials = res;
                    loadedMtlCb();
                    completedParsing();
                }
            );
        });
    }

    static async parseOBJ(objUrl) {
        const text = await (await fetch(objUrl)).text();

        const objPositions = [[0, 0, 0]];
        const objTexcoords = [[0, 0, 0]];
        const objNormals = [[0, 0, 0]];

        const objVertexData = [objPositions, objTexcoords, objNormals];

        let webglVertexData = [
            [], // positions
            [], // texcoords
            [], // normals
        ];

        const materialLibs = [];
        const geometries = [];
        let geometry;
        let material = "default";
        let object = "default";
        let groups = ["default"];

        function addVertex(vert) {
            const ptn = vert.split("/");
            ptn.forEach((objIndexStr, i) => {
                if (!objIndexStr) return;
                const objIndex = parseInt(objIndexStr);
                // if objIndex is negative it means that the count starts from the last element of the array
                const index =
                    objIndex + (objIndex >= 0 ? 0 : objVertexData[i].length);
                webglVertexData[i].push(...objVertexData[i][index]);
            });
        }

        function newGeometry() {
            // If there is an existing geometry and it's
            // not empty then start a new one.
            if (geometry && geometry.data.position.length) geometry = undefined;
        }

        function setGeometry() {
            if (geometry) return;
            const position = [];
            const texcoord = [];
            const normal = [];
            webglVertexData = [position, texcoord, normal];
            geometry = {
                object,
                material,
                groups,
                data: {
                    position,
                    texcoord,
                    normal,
                },
            };
            geometries.push(geometry);
        }

        const keywords = {
            v(parts) {
                objPositions.push(parts.map(parseFloat));
            },
            vn(parts) {
                objNormals.push(parts.map(parseFloat));
            },
            vt(parts) {
                objTexcoords.push(parts.map(parseFloat));
            },
            f(parts) {
                setGeometry();
                const numTriangles = parts.length - 2;
                for (let tri = 0; tri < numTriangles; ++tri) {
                    addVertex(parts[0]);
                    addVertex(parts[tri + 1]);
                    addVertex(parts[tri + 2]);
                }
            },
            usemtl(_, unparsedArgs) {
                material = unparsedArgs;
                newGeometry();
            },
            mtllib(_, unparsedArgs) {
                materialLibs.push(unparsedArgs);
            },
            o(_, unparsedArgs) {
                object = unparsedArgs;
                newGeometry();
            },
            g(parts) {
                groups = parts;
                newGeometry();
            },
            s() {
                //ignore s
            },
        };

        this._manageLines(text, keywords);

        // remove any arrays that have no entries.
        for (const geometry of geometries)
            geometry.data = Object.fromEntries(
                Object.entries(geometry.data).filter(
                    ([, array]) => array.length > 0
                )
            );

        return {
            materialLibs,
            geometries,
        };
    }

    static async parseMTL(mtlUrl, loadTextures, loadNormals) {
        function parseMapArgs(unparsedArgs) {
            // ignore options
            return unparsedArgs;
        }

        const text = await (await fetch(mtlUrl)).text();
        const materials = {};
        let material;

        const keywords = {
            newmtl(_, unparsedArgs) {
                material = {};
                materials[unparsedArgs] = material;
            },
            Ns(parts) {
                // specular shininess
                material.n = parseFloat(parts[0]);
            },
            Ka(parts) {
                // ambient color
                material.Ka = parts.map(parseFloat);
            },
            Kd(parts) {
                // diffuse color
                material.Kd = parts.map(parseFloat);
            },
            Ks(parts) {
                // specular color
                material.Ks = parts.map(parseFloat);
            },
            Ke(parts) {
                // emissive color
            },
            Ni(parts) {
                // optical density
            },
            d(parts) {
                // opacity
            },
            illum(parts) {
                // kind of illumination. The document lists 11 kinds. We'll ignore this for now.
            },
            map_Kd(parts, unparsedArgs) {
                if (loadTextures)
                    material.diffuseMap = parseMapArgs(unparsedArgs);
            },
            map_Ns(parts, unparsedArgs) {
                if (loadTextures)
                    material.specularMap = parseMapArgs(unparsedArgs);
            },
            map_Ks(parts, unparsedArgs) {
                if (loadTextures)
                    material.specularMap = parseMapArgs(unparsedArgs);
            },
            refl() {
                //ignore refl
            },
            map_Bump(parts, unparsedArgs) {
                if (loadNormals)
                    material.normalMap = parseMapArgs(unparsedArgs);
            },
        };

        this._manageLines(text, keywords);

        return materials;
    }

    static _manageLines(text, keywords) {
        const keywordRE = /(\w*)(?: )*(.*)/;
        text.split("\n")
            .map((l) => l.trim())
            .forEach((line, lineNo) => {
                const m = keywordRE.exec(line);
                if (line === "" || line.startsWith("#") || !m) return;
                const [, keyword, unparsedArgs] = m;
                const parts = line.split(/\s+/).slice(1);
                if (!keywords[keyword])
                    return console.info(
                        `unhandled keyword: ${keyword} at line ${lineNo + 1}`
                    );
                keywords[keyword](parts, unparsedArgs);
            });
    }
}
