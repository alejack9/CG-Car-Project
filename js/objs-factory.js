import { Polygon } from "./polygon.js";
import { getUrl, getUrlHref } from "./utils/url.js";
import { ObjLoader } from "./utils/object-loader.js";
import { Vehicle } from "./vehicle.js";
import { Coin } from "./coin.js";
import { degToRad } from "./utils/spherical-coordinates.js";

const groupArray = (xs, key, transform) =>
    xs.reduce((rv, x) => {
        (rv[x[key]] = rv[x[key]] || []).push(transform(x));
        return rv;
    }, {});

export async function getVehicle(
    gl,
    programInfo,
    baseJsonPath,
    loadTextures,
    loadNormals,
    objCb,
    mtlCb,
    textureCb
) {
    const jsonUrl = getUrl(baseJsonPath);

    const carFields = JSON.parse(await (await fetch(jsonUrl)).text());

    const objUrlHref = getUrlHref(carFields.objName, jsonUrl);
    const mtlUrlHref = getUrlHref(carFields.mtlName, jsonUrl);

    // group objects by object's name (one object could have multiple entries for different materials)
    const groups = groupArray(
        await ObjLoader.parse(
            gl,
            objUrlHref,
            mtlUrlHref,
            loadTextures,
            loadNormals,
            objCb,
            mtlCb,
            textureCb
        ),
        "object",
        (part) => {
            return {
                arrays: part.arrays,
                material: part.material,
            };
        }
    );

    const car = new Vehicle(
        [
            carFields.firstPersonCameraPosition[0],
            degToRad(carFields.firstPersonCameraPosition[1]),
            degToRad(carFields.firstPersonCameraPosition[2]),
        ],
        [
            carFields.firstPersonCameraTarget[0],
            degToRad(carFields.firstPersonCameraTarget[1]),
            degToRad(carFields.firstPersonCameraTarget[2]),
        ],
        // create a polygon for each subpart of vehicle's part
        groups[carFields.chassis.name].map(
            (part) =>
                new Polygon(
                    gl,
                    part.arrays,
                    programInfo,
                    carFields.chassis.transforms,
                    part.material
                )
        ),
        groups[carFields.front_wheel_dx?.name]
            ?.map(
                (part) =>
                    new Polygon(
                        gl,
                        part.arrays,
                        programInfo,
                        carFields.front_wheel_dx.transforms,
                        part.material
                    )
            )
            .concat(
                groups[carFields.front_wheel_sx?.name]?.map(
                    (part) =>
                        new Polygon(
                            gl,
                            part.arrays,
                            programInfo,
                            carFields.front_wheel_sx.transforms,
                            part.material
                        )
                )
            )
            .filter((s) => !!s),
        groups[carFields.back_wheel_dx?.name]
            ?.map(
                (part) =>
                    new Polygon(
                        gl,
                        part.arrays,
                        programInfo,
                        carFields.back_wheel_dx.transforms,
                        part.material
                    )
            )
            .concat(
                groups[carFields.back_wheel_sx?.name]?.map(
                    (part) =>
                        new Polygon(
                            gl,
                            part.arrays,
                            programInfo,
                            carFields.back_wheel_sx.transforms,
                            part.material
                        )
                )
            )
            .filter(Boolean),
        groups[carFields.sus_edge_sx?.name]
            ?.map(
                (part) =>
                    new Polygon(
                        gl,
                        part.arrays,
                        programInfo,
                        carFields.sus_edge_sx.transforms,
                        part.material
                    )
            )
            .concat(
                groups[carFields.sus_edge_dx?.name]?.map(
                    (part) =>
                        new Polygon(
                            gl,
                            part.arrays,
                            programInfo,
                            carFields.sus_edge_dx.transforms,
                            part.material
                        )
                )
            )
            .filter(Boolean)
    );
    car.loadedNormals = loadNormals;
    car.loadedTextures = loadTextures;
    return car;
}

export async function getObjs(gl, programInfo) {
    const objUrlHref = getUrlHref("data/sample/objs/ground.obj");
    const mtlUrlHref = getUrlHref("data/sample/objs/ground.mtl");
    const objUrlHref1 = getUrlHref("data/sample/objs/coin/coin.new1.obj");
    const mtlUrlHref1 = getUrlHref("data/sample/objs/coin/coin.new1.mtl");

    const groundGroups = await ObjLoader.parse(
        gl,
        objUrlHref,
        mtlUrlHref,
        true,
        true
    );
    const coinGroups = await ObjLoader.parse(
        gl,
        objUrlHref1,
        mtlUrlHref1,
        true,
        true
    );
    const coin = new Coin(gl, programInfo, coinGroups);

    return {
        polygons: [
            new Polygon(
                gl,
                groundGroups[0].arrays,
                programInfo,
                { scale: [100.0, 1.0, 100.0] },
                groundGroups[0].material
            ),
            coin,
        ],
        coin,
    };
}
