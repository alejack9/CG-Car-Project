import { Polygon } from "./polygon.js";
import { getUrl, getUrlHref } from "./utils/url.js";
import { ObjLoader } from "./utils/object-loader.js";
import { Vehicle } from "./vehicle.js";

const groupArray = (xs, key, transform) =>
    xs.reduce((rv, x) => {
        (rv[x[key]] = rv[x[key]] || []).push(transform(x));
        return rv;
    }, {});

export async function getVehicle(
    gl,
    setters,
    baseJsonPath = "/data/vehicles/cars/formula1/formula1.json",
    cb
) {
    const jsonUrl = getUrl(baseJsonPath);

    const carFields = JSON.parse(await (await fetch(jsonUrl)).text());

    const objUrlHref = getUrlHref(carFields.objName, jsonUrl);
    const mtlUrlHref = getUrlHref(carFields.mtlName, jsonUrl);

    const cb1 = () => cb(carFields.texturesCount);
    const groups = groupArray(
        await ObjLoader.parse(gl, objUrlHref, mtlUrlHref, cb1),
        "object",
        (part) => {
            return {
                arrays: part.arrays,
                material: part.material,
            };
        }
    );

    const car = new Vehicle(
        gl,
        groups[carFields.chassis.name].map(
            (part) =>
                new Polygon(
                    gl,
                    part.arrays,
                    setters[0],
                    setters[1],
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
                        setters[0],
                        setters[1],
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
                            setters[0],
                            setters[1],
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
                        setters[0],
                        setters[1],
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
                            setters[0],
                            setters[1],
                            carFields.back_wheel_sx.transforms,
                            part.material
                        )
                )
            )
            .filter((s) => !!s),
        groups[carFields.sus_edge_sx?.name]
            ?.map(
                (part) =>
                    new Polygon(
                        gl,
                        part.arrays,
                        setters[0],
                        setters[1],
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
                            setters[0],
                            setters[1],
                            carFields.sus_edge_dx.transforms,
                            part.material
                        )
                )
            )
            .filter(Boolean)
    );
    if (!carFields.texturesCount) cb();
    return car;
}

export async function getObjs(gl, setters) {
    const objUrlHref = getUrlHref("/data/objs/road1.obj");
    const mtlUrlHref = getUrlHref("/data/objs/road1.mtl");

    const groups = await ObjLoader.parse(gl, objUrlHref, mtlUrlHref);

    return [
        new Polygon(
            gl,
            groups[0].arrays,
            setters[0],
            setters[1],
            { scale: [100.0, 1.0, 100.0] },
            groups[0].material
        ),
    ];
}
