import { degToRad } from "./utils/spherical-coordinates.js";

export class Vehicle {
    constructor(
        firstPersonCameraPosition,
        firstPersonCameraTarget,
        chassis = [],
        frontWheels = [],
        backWheels = [],
        suspensionsEdges = []
    ) {
        this.firstPersonCameraPosition = firstPersonCameraPosition;
        this.firstPersonCameraTarget = firstPersonCameraTarget;
        this.chassis = chassis;
        this.wheels = {};
        this.wheels.front = frontWheels;
        this.wheels.back = backWheels;
        this.suspensionsEdges = suspensionsEdges;

        this.reload();
    }

    reload() {
        this.px = this.py = this.pz = this.facing = 0; // posizione e orientamento
        this.mozzoA = this.mozzoP = this.sterzo = 0; // stato
        this.vx = this.vy = this.vz = 0; // velocita' attuale
        //            w, a, s, d,' '
        this._keys = [0, 0, 0, 0, 0];
        this.velSterzo = 2.0; // A
        this.velRitornoSterzo = 0.93; // B, sterzo massimo = A*B / (1-B)
        this.accMax = 0.033;
        this.attritoX = 0.95; // piccolo attrito sulla Z (nel senso di rotolamento delle ruote)
        this.attritoZ = 0.8; // grande attrito sulla X (per non fare slittare la macchina)
        this.attritoY = 1.0; // attrito nullo sulla y

        this.raggioRuotaA = degToRad(0.25);
        this.raggioRuotaP = degToRad(0.35);
        this.grip = 0.45; // quanto il facing macchina si adegua velocemente allo sterzo

        this.toDraw = true;
        this.doStep(1);
    }

    draw() {
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
        const cosf = Math.cos(degToRad(this.facing));
        const sinf = Math.sin(degToRad(this.facing));
        vxm = cosf * this.vx - sinf * this.vz;
        vym = this.vy;
        vzm = sinf * this.vx + cosf * this.vz;

        // gestione dello sterzo
        this.sterzo += this._keys[1] * this.velSterzo;
        this.sterzo -= this._keys[3] * this.velSterzo;
        this.sterzo *= this.velRitornoSterzo; // ritorno a volante fermo

        if (this._keys[4]) {
             vxm = 0;
             this.sterzo = 0;
        } else {
            vxm -= this._keys[0] * this.accMax; // accelerazione in avanti
            vxm += this._keys[2] * this.accMax; // accelerazione indietro
        }

        // attriti (semplificando)
        vxm *= this.attritoX;
        vym *= this.attritoY;
        vzm *= this.attritoZ;

        // l'orientamento della macchina segue quello dello sterzo
        //(a seconda della velocita' sulla z)
        this.facing -= 60 * delta * (vxm * this.grip * this.sterzo); // solves the problem of facing

        // rotazione mozzo ruote (a seconda della velocita' sulla x)
        this.mozzoA += vxm / this.raggioRuotaA;
        this.mozzoP += vxm / this.raggioRuotaP;

        // ritorno a vel coord. mondo
        this.vx = +cosf * vxm + sinf * vzm;
        this.vy = vym;
        this.vz = -sinf * vxm + cosf * vzm;

        // posizione = posizione + velocita * delta t (ma e' delta t costante=1)
        this.px += this.vx * 60 * delta; // solves the problem when it goes straight but not when it turns
        this.py += this.vy * 60 * delta; // solves the problem when it goes straight but not when it turns
        this.pz += this.vz * 60 * delta; // solves the problem when it goes straight but not when it turns

        if (!this._keys[0] && !this._keys[2]) {
            if (Math.abs(this.vx) <= 10 ** -3) this.vx = 0;
            if (Math.abs(this.vz) <= 10 ** -3) this.vz = 0;
        }
        if (Math.abs(this.sterzo) <= 10 ** -2) this.sterzo = 0;

        if (this.toDraw) {
            this.chassis.forEach((chas) => {
                chas.translation[0] = this.px;
                chas.translation[2] = this.pz;
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
        this.toDraw = this.moving || this.sterzo !== 0;
    }

    get moving() {
        return this.vx !== 0 || this.vz !== 0;
    }

    setKey(index, value) {
        this._keys[index] = value;
        this.keyPressed =
            this._keys[0] ||
            this._keys[1] ||
            this._keys[2] ||
            this._keys[3] ||
            this._keys[4];
    }
}
