export class Textbox {
    constructor(ctx, message, xGetter, yGetter, fontSize, align = "left") {
        this.ctx = ctx;
        this.align = align;
        this.message = message;
        this.padding = 8;
        this.xGetter = xGetter;
        this.yGetter = yGetter;
        this.fontSize = fontSize;
        this.show = true;
    }

    draw() {
        if (!this.show || this.message.length === 0) return;
        this.ctx.globalAlpha = 0.8;
        this.ctx.font = `${this.fontSize}pt serif`;
        this.ctx.textAlign = this.align;
        this.ctx.textBaseline = "bottom";
        this.ctx.fillStyle = "#292826";
        this.ctx.fillRect(
            this.xGetter(this.width) -
                (this.align === "center" ? this.width / 2 - this.padding : 0),
            this.yGetter(this.height),
            this.width,
            this.height
        );
        this.ctx.globalAlpha = 1;
        this.ctx.fillStyle = "#FCD253";
        this.message.split("\n").forEach((row, i) => {
            this.ctx.fillText(
                row,
                this.xGetter(this.width) + this.padding,
                this.yGetter(this.height) +
                    (i + 1) *
                        Math.abs(
                            this.rowsMeasureText[i].fontBoundingBoxAscent
                        ) +
                    this.padding,
                this.maxWidth
            );
        });
    }

    _updateMeasures() {
        this.ctx.font = `${this.fontSize}pt serif`;
        this.ctx.textAlign = this.align;
        this.ctx.textBaseline = "bottom";
        this.rowsMeasureText = this.message
            .split("\n")
            .map((a) => this.ctx.measureText(a));
        this.width =
            Math.max(
                ...this.rowsMeasureText.map(
                    (r) =>
                        Math.abs(r.actualBoundingBoxLeft) +
                        Math.abs(r.actualBoundingBoxRight)
                )
            ) +
            this.padding * 2;
        this.height =
            this.rowsMeasureText
                .map((r) => Math.abs(r.fontBoundingBoxAscent))
                .reduce((a, b) => a + b) +
            this.padding * 2;
    }

    set fontSize(v) {
        this._fontSize = v;
        this._updateMeasures();
    }

    set message(v) {
        this._message = v;
        this._updateMeasures();
    }

    get message() {
        return this._message;
    }

    get fontSize() {
        return this._fontSize;
    }
}
