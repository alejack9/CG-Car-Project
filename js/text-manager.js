import { Textbox } from "./textbox.js";

export class TextManager {
    static load(ctx, instructions = "", fontSize = 25, mobile = false) {
        const fixed = () => 8;

        if (mobile) {
            TextManager.infoX = fixed;
            TextManager.infoY = fixed;
            TextManager.winMessage = "YOU WIN!\nTap to Continue\nYour Time: ";
        } else {
            TextManager.infoX = fixed;
            TextManager.infoY = (height) => window.innerHeight - height - 8;
            TextManager.winMessage =
                "YOU WIN!\nPress F to Continue\nYour Time: ";
        }

        TextManager.ctx = ctx;
        TextManager.instructionsText = new Textbox(
            ctx,
            instructions,
            fixed,
            fixed,
            fontSize
        );
        TextManager.infoText = new Textbox(
            ctx,
            "",
            TextManager.infoX,
            TextManager.infoY,
            fontSize
        );
        TextManager.winText = new Textbox(
            ctx,
            "",
            () => window.innerWidth / 2,
            (height) => (window.innerHeight - height) / 2,
            Math.min(window.innerHeight, window.innerWidth) / 12,
            "center"
        );

        TextManager.coins = { current: 0, target: 0 };

        TextManager.vehicleNum = 0;
        TextManager.vehicles = 0;

        TextManager.record = parseInt(window.localStorage.getItem("record"));
        TextManager.reset();
    }

    static set fontSize(v) {
        v *= window.devicePixelRatio;
        TextManager.instructionsText.fontSize = v;
        TextManager.infoText.fontSize = v;
        TextManager.winText.fontSize =
            Math.min(window.innerHeight, window.innerWidth) / 12;
    }

    static render() {
        TextManager.ctx.clearRect(
            0,
            0,
            TextManager.ctx.canvas.width,
            TextManager.ctx.canvas.height
        );
        TextManager.instructionsText.draw();
        TextManager.infoText.message =
            "Vehicle: " +
            TextManager.vehicleNum +
            " / " +
            TextManager.vehicles +
            "\nLoading: " +
            TextManager.percentage.toFixed(1) +
            "% " +
            TextManager._action +
            "\nCoins: " +
            TextManager.coins.current +
            " / " +
            TextManager.coins.target +
            (TextManager.showTime
                ? "\nTime: " +
                  Math.floor(TextManager.time / 60)
                      .toString()
                      .padStart(2, "0") +
                  ":" +
                  (Math.floor(TextManager.time) % 60)
                      .toString()
                      .padStart(2, "0")
                : "") +
            TextManager.recordString;
        TextManager.infoText.draw();
        TextManager.winText.draw();
    }

    static win() {
        TextManager.winText.message =
            TextManager.winMessage +
            Math.floor(TextManager.time / 60)
                .toString()
                .padStart(2, "0") +
            ":" +
            (Math.floor(TextManager.time) % 60).toString().padStart(2, "0");
        TextManager.winText.show = true;
        TextManager.instructionsText.show = false;
        TextManager.infoText.show = false;
        TextManager.record = Math.min(TextManager._record, TextManager.time);
        window.localStorage.setItem("record", TextManager._record);
    }

    static set record(value) {
        if (!value) {
            TextManager._record = Infinity;
            TextManager.recordString = "";
        } else {
            TextManager._record = value;
            TextManager.recordString =
                "\nRecord: " +
                Math.floor(TextManager._record / 60)
                    .toString()
                    .padStart(2, "0") +
                ":" +
                (Math.floor(TextManager._record) % 60)
                    .toString()
                    .padStart(2, "0");
        }
    }

    static reset() {
        TextManager.percentage = 0;
        TextManager.action = "";
        TextManager.time = 0;
        TextManager.winText.show = false;
        TextManager.infoText.show = true;
    }

    static set action(a) {
        TextManager._action = a ? `\n(${a})` : "";
    }

    static set show(v) {
        TextManager.instructionsText.show = v;
        TextManager.infoText.xGetter = v
            ? TextManager.infoX
            : TextManager.instructionsText.xGetter;
        TextManager.infoText.yGetter = v
            ? TextManager.infoY
            : TextManager.instructionsText.yGetter;
    }

    static get show() {
        return TextManager.instructionsText.show;
    }
}
