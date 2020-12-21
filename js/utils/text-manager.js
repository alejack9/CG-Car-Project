export class TextManager {
    /**
     *
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} fontSize
     * @param {number} padding
     */
    constructor(ctx, fontSize = 25, padding = 20) {
        this.ctx = ctx;
        this.fontSize = fontSize;
        this.padding = padding;
        this._message = "Hello world\nthis is a test\ndoes it work?";
    }

    render() {
        this.ctx.globalAlpha = 1;
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        this.ctx.font = `${this.fontSize}px serif`;
        this._message
            .split("\n")
            .forEach((row, i) =>
                this.ctx.fillText(
                    row,
                    this.ctx.canvas.width -
                        this.ctx.measureText(row).width -
                        this.padding,
                    this.fontSize + i * this.fontSize,
                    this.ctx.measureText(row).width + this.padding
                )
            );
    }

    get message() {
        return this._message;
    }

    set message(val) {
        this._message = val;
    }
}
