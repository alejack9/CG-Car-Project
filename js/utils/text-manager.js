export class TextManager {
    /**
     *
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} fontSize
     * @param {number} padding
     * @param {number} maxWidth
     */
    constructor(
        ctx,
        instructions = "",
        fontSize = 25,
        padding = 8,
        maxWidth = 340
    ) {
        this.ctx = ctx;
        this.fontSize = fontSize;
        this.padding = padding;
        this.instructions = instructions + "\n";
        this.maxWidth = maxWidth;
        this.reset();
    }

    render() {
        const msg =
            this.instructions +
            this._loading +
            this.texturesLoadedMessage +
            this._done;
        this.ctx.globalAlpha = 0.8;
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        this.ctx.font = `${this.fontSize}px serif`;
        this.ctx.fillStyle = "#292826";
        this.ctx.fillRect(
            this.ctx.canvas.width - this.maxWidth - this.padding,
            0,
            this.ctx.canvas.width,
            this.ctx.canvas.height
        );
        this.ctx.globalAlpha = 1;
        msg.split("\n").forEach((row, i) => {
            this.ctx.fillStyle = "#FCD253";
            this.ctx.fillText(
                row,
                this.ctx.canvas.width - this.maxWidth + this.padding,
                (i + 1) * this.fontSize,
                this.maxWidth
            );
        });
    }

    reset() {
        this.texturesLoadedMessage = "";
        this.loading = false;
        this.done = false;
    }

    set loading(v) {
        this._loading = v ? "Loading...\n" : "";
    }

    set done(v) {
        this._done = v ? "\nDone" : "";
    }
}
