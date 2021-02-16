import { Polygon } from "./polygon.js";
import { degToRad } from "./utils/spherical-coordinates.js";

export class Coin {
    constructor(gl, programInfo, groups) {
        this.polygons = [
            new Polygon(
                gl,
                groups[0].arrays,
                programInfo,
                { translation: [0, 3, 0] },
                groups[0].material
            ),
            new Polygon(
                gl,
                groups[1].arrays,
                programInfo,
                { translation: [0, 3, 0] },
                groups[1].material
            ),
            new Polygon(
                gl,
                groups[2].arrays,
                programInfo,
                { translation: [0, 3, 0] },
                groups[2].material
            ),
        ];
        this.position = [];
        this.randomPosition();
    }

    draw() {
        this.polygons.forEach((d) => d.draw());
    }

    rotate(delta) {
        this.polygons[0].rotation[1] += degToRad(130) * delta;
        this.polygons[1].rotation[1] += degToRad(130) * delta;
        this.polygons[2].rotation[1] += degToRad(130) * delta;
    }

    randomPosition() {
        const min = -95,
            max = 95;
        this.setPosition(
            Math.random() * (-min + max) + min,
            Math.random() * (-min + max) + min
        );
    }

    setPosition(x, z) {
        this.position[0] = x;
        this.position[1] = z;
        this.polygons[0].translation[0] = x;
        this.polygons[1].translation[0] = x;
        this.polygons[2].translation[0] = x;
        this.polygons[0].translation[2] = z;
        this.polygons[1].translation[2] = z;
        this.polygons[2].translation[2] = z;
    }
}
