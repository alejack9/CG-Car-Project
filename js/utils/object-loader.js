import { getUrl, getUrlHref } from "./url.js";
import { create1PixelTexture, makeTexture } from "./texture-maker.js";

export class ObjLoader {
    static async parse(gl, objUrl, mtlUrl, singleTextureLoadCb) {
        console.log("Importing Obj");
        const obj = await ObjLoader.parseOBJ(objUrl);
        console.log("Importing Obj... Done");
        console.log("Importing Mtl");
        const materials = await ObjLoader.parseMTL(mtlUrl);
        console.log("Importing Mtl... Done");

        const textures = {
            defaultWhite: create1PixelTexture(gl, [255, 255, 255, 255]),
        };

        const defaultMaterial = {
            Kd: [1, 1, 1],
            diffuseMap: textures.defaultWhite,
            Ka: [0, 0, 0],
            specularMap: textures.defaultWhite,
            Ks: [1, 1, 1],
            n: 400,
        };

        const baseHref = getUrl(mtlUrl);

        // load texture for materials
        for (const material of Object.values(materials)) {
            Object.entries(material)
                .filter(([key]) => key.endsWith("Map"))
                .forEach(([key, filename]) => {
                    let texture = textures[filename];
                    if (!texture) {
                        texture = makeTexture(
                            gl,
                            getUrlHref(filename, baseHref),
                            undefined,
                            singleTextureLoadCb
                        );
                        textures[filename] = texture;
                    }
                    material[key] = texture;
                });
        }

        return obj.geometries.map(({ object, material, data }) => {
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
                    data.color = { numComponents: 3, data: data.color };
            }
            // there are no vertex colors so just use constant white
            else data.color = { value: [1, 1, 1, 1] };
            return {
                object,
                material: { ...defaultMaterial, ...materials[material] },
                arrays: {
                    ...data,
                },
            };
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
            const point = vert.split("/");
            point.forEach((objIndexStr, i) => {
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
            s() {},
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

    static async parseMTL(mtlUrl) {
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
                // material.Ke = parts.map(parseFloat);
            },
            Ni(parts) {
                // optical density (unused)
                // material.Ni = parseFloat(parts[0]);
            },
            d(parts) {
                // opacity
                // material.d = parseFloat(parts[0]);
            },
            illum(parts) {
                // kind of illumination. The document lists 11 kinds. We'll ignore this for now.
                // material.illum = parseInt(parts[0]);
            },
            map_Kd(parts, unparsedArgs) {
                material.diffuseMap = parseMapArgs(unparsedArgs);
            },
            map_Ns(parts, unparsedArgs) {
                material.specularMap = parseMapArgs(unparsedArgs);
            },
            map_Ks(parts, unparsedArgs) {
                material.specularMap = parseMapArgs(unparsedArgs);
            },
            // TODO
            // map_Bump(parts, unparsedArgs) {
            //     // // TODO Uncomment
            //     // material.normalMap = parseMapArgs(unparsedArgs);
            // },
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
