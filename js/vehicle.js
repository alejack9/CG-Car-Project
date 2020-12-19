import * as m4 from "./libs/m4.js";
import { degToRad } from "./utils/spherical-coordinates.js";
import { Polygon } from "./polygon.js";

export class Vehicle {
    /**
     *
     * @param {WebGLRenderingContext} gl
     * @param {Polygon[]} chassis
     * @param {Polygon[]} frontWheels
     * @param {Polygon[]} backWheels
     * @param {Polygon[]} suspensionsEdges
     */
    constructor(
        gl,
        chassis = [],
        frontWheels = [],
        backWheels = [],
        suspensionsEdges = []
    ) {
        this.gl = gl;
        this.px = this.py = this.pz = this.facing = 0; // posizione e orientamento
        this.mozzoA = this.mozzoP = this.sterzo = 0; // stato
        this.vx = this.vy = this.vz = 0; // velocita' attuale
        // inizializzo la struttura di controllo
        this.key = [];
        this.velSterzo = 3.4; // A
        this.velRitornoSterzo = 0.93; // B, sterzo massimo = A*B / (1-B)
        this.accMax = 0.01;
        this.attritoX = 0.975; // piccolo attrito sulla Z (nel senso di rotolamento delle ruote)
        this.attritoZ = 0.8; // grande attrito sulla X (per non fare slittare la macchina)
        this.attritoY = 1.0; // attrito nullo sulla y

        this.raggioRuotaA = 0.25;
        this.raggioRuotaP = 0.35;
        this.grip = 0.45; // quanto il facing macchina si adegua velocemente allo sterzo

        this.chassis = chassis;
        this.wheels = {};
        this.wheels.front = frontWheels;
        this.wheels.back = backWheels;
        this.suspensionsEdges = suspensionsEdges;
        this.toDraw = true;
    }

    draw() {
        this.gl.frontFace(this.gl.CCW);

        this.chassis.forEach((chass) => chass.draw());

        const baseMatrix = this.chassis[0].transformationsMatrix;

        this.wheels.front.forEach((w) => w.drawBasedOnMatrix(baseMatrix));
        this.suspensionsEdges.forEach((w) => w.drawBasedOnMatrix(baseMatrix));
        this.wheels.back.forEach((w) => w.drawBasedOnMatrix(baseMatrix));
    }

    doStep(delta) {
        // computiamo l'evolversi della macchina
        let vxm, vym, vzm; // velocita' in spazio macchina
        // da vel frame mondo a vel frame macchina
        const cosf = Math.cos((this.facing * Math.PI) / 180.0);
        const sinf = Math.sin((this.facing * Math.PI) / 180.0);
        vxm = cosf * this.vx - sinf * this.vz;
        vym = this.vy;
        vzm = sinf * this.vx + cosf * this.vz;
        // gestione dello sterzo
        if (this.key[1]) this.sterzo += this.velSterzo;
        if (this.key[3]) this.sterzo -= this.velSterzo;
        this.sterzo *= this.velRitornoSterzo; // ritorno a volante fermo
        if (this.key[5]) {
            if (vxm < 0) vxm += this.accMax;
            else if (vxm > 0) vxm -= this.accMax;
        } else {
            if (this.key[0]) vxm -= this.accMax; // accelerazione in avanti
            if (this.key[2]) vxm += this.accMax; // accelerazione indietro
        }
        // attriti (semplificando)
        vxm *= this.attritoX;
        vym *= this.attritoY;
        vzm *= this.attritoZ;

        // l'orientamento della macchina segue quello dello sterzo
        //(a seconda della velocita' sulla z)
        this.facing = this.facing - vxm * this.grip * this.sterzo;
        // rotazione mozzo ruote (a seconda della velocita' sulla x)
        const num = (180.0 * vxm) / Math.PI;
        this.mozzoA += num / this.raggioRuotaA;
        this.mozzoP += num / this.raggioRuotaP;
        // ritorno a vel coord. mondo
        this.vx = +cosf * vxm + sinf * vzm;
        this.vy = vym;
        this.vz = -sinf * vxm + cosf * vzm;

        if (!this.key[0] && !this.key[2]) {
            if (Math.abs(this.vx) <= 10 ** -3) this.vx = 0;
            if (Math.abs(this.vz) <= 10 ** -3) this.vz = 0;
        }
        if (Math.abs((this.sterzo - 10 ** -2) / 10 ** -2) <= 0) this.sterzo = 0;

        this.px += this.vx;
        this.py += this.vy;
        this.pz += this.vz;

        this.toDraw = this.vx !== 0 || this.vy !== 0 || this.sterzo !== 0;
        if (this.toDraw) {
            this.chassis.forEach((chas) => {
                chas.translation[0] += this.vx;
                chas.translation[2] += this.vz;
                chas.rotation[1] = degToRad(this.facing);
            }, this);
            this.wheels.front.forEach((wheel) => {
                wheel.rotation[2] = -degToRad(this.mozzoA);
                wheel.rotation[1] = degToRad(this.sterzo);
            });
            this.suspensionsEdges.forEach(
                (susEdge) => (susEdge.rotation[1] = degToRad(this.sterzo))
            );
            this.wheels.back.forEach(
                (wheel) => (wheel.rotation[2] = -degToRad(this.mozzoA))
            );
        }
    }

    get translation() {
        return [this.vx, this.vy, this.vz];
    }

    get moving() {
        return this.vx !== 0 || this.vz !== 0;
    }
}
