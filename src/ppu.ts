const PPU_OAM_ACCESS_TIME = 80;
const PPU_VRAM_ACCESS_TIME = 172;
const PPU_HBLANK_TIME = 204;
const PPU_VBLANK_TIME = PPU_OAM_ACCESS_TIME + PPU_VRAM_ACCESS_TIME + PPU_HBLANK_TIME;

const PPU_MODE_OAM = 2;
const PPU_MODE_VRAM = 3;
const PPU_MODE_HBLANK = 0;
const PPU_MODE_VBLANK = 1;

const DISPLAY_LINES = 143;

class PPU {
    private _mode: number;
    private _modeTime: number;
    private _currentLine: number;
    private _scy: number;
    private _scx: number;
    private _vram: Uint8Array;
    
    constructor() {
        //0x2000 bytes of VRAM
        this._vram = new Uint8Array(0x2000);
        this._mode = 0;
        this._modeTime = 0;
        this._currentLine = 0;
        this._scy = 0;
        this._scx = 0;
    }

    vram_read(addr: number) {
        const relAddr = addr - 0x8000;
        return this._vram[relAddr];
    }

    vram_write(addr: number, val: number) {
        const relAddr = addr - 0x8000;
        this._vram[relAddr] = val;
    }

    io_read(addr: number): number {
        if(addr === 0xFF44) {
            //console.log("ly = " + this._currentLine);
            return this._currentLine;
        } else if (addr === 0xFF41) {
            return this._mode;
        } else if (addr === 0xFF42) {
            return this._scy;
        } else if (addr === 0xFF43) {
            return this._scx;
        }
        return 0;
    }

    io_write(addr: number, val: number) {
        if(addr === 0xFF44) {
            //console.log("ly = " + this._currentLine);
            this._currentLine = val;
        } else if(addr === 0xFF41) {
            //console.log("Lcd stat write val = " + val.toString(16));
            this._mode = val;
        } else if(addr === 0xFF42) {
            this._scy = val;
        } else if(addr === 0xFF43) {
            this._scx = val;
        }
    }


    //Render to the canvas from our vram buffer
    put_vram_image(ctx: CanvasRenderingContext2D) {
        //Each tile
        for(let tile = 0; tile < 384; tile++) {
            //Render the tile, iterating
            //thru each word
            for(let tileWord = 0; tileWord < 8; tileWord++) {
                const lowByte = this._vram[(16 * tile) + (tileWord * 2)];
                const highByte = this._vram[(16 * tile) + (tileWord * 2 + 1)];
                for(let bit = 0; bit < 8; bit++) {
                    const lowBit = (lowByte & ( 1 << bit )) >> bit;
                    const highBit = (highByte & ( 1 << bit )) >> bit;
                    const pixelVal = (highBit << 1) | lowBit;
                    //Silly
                    const xPos = tile % 16 * 8 - bit + 7;
                    const yPos = Math.floor(tile / 16) * 8 + tileWord;
                    //console.log("X = " + xPos + " Y = " + yPos);
                    switch(pixelVal) {
                        case 0b00:
                            //Transparent
                            ctx.fillStyle = 'rgb(225,225,225)';
                            break;
                        case 0b01:
                            //Darkest green
                            ctx.fillStyle = 'rgb(48, 98, 48)';
                            break;
                        case 0b10:
                            //Light green
                            ctx.fillStyle = 'rgb(139, 172, 15)';
                            break;
                        case 0b11:
                            //Lightest green
                            ctx.fillStyle = `rgb(155, 188, 15)`;
                            break;
                        default:
                            console.error("Invalid pixel value found");
                    }
                    ctx.fillRect(xPos, yPos, 1, 1);
                }
            }
        }
    }

    //Called in the main loop
    //cycles are the number of cycles from the last cpu execution
    ppu_step(cycles: number) {
        this._modeTime += cycles;

        //What mode are we currently in?
        switch(this._mode) {
            //OAM
            case PPU_MODE_OAM:
                if(this._modeTime >= PPU_OAM_ACCESS_TIME) {
                    this._modeTime = 0;
                    this._mode = PPU_MODE_VRAM;
                }
                break;
            //VRAM
            case PPU_MODE_VRAM:
                if(this._modeTime >= PPU_VRAM_ACCESS_TIME) {
                    this._modeTime = 0;
                    this._mode = PPU_MODE_HBLANK;
                }
                break;
            //HBLANK
            case PPU_MODE_HBLANK:
                if(this._modeTime >= PPU_HBLANK_TIME) {
                    this._modeTime = 0;
                    this._currentLine++;

                    if(this._currentLine === DISPLAY_LINES) {
                        //Vblank time!
                        this._mode = PPU_MODE_VBLANK;
                    } else {
                        this._mode = PPU_MODE_OAM;
                    }
                }
                break;
            //VBLANK
            case PPU_MODE_VBLANK:
                if(this._modeTime >= PPU_VBLANK_TIME) {
                    this._modeTime = 0;
                    this._currentLine++;

                    if(this._currentLine > DISPLAY_LINES + 10) {
                        this._mode = PPU_MODE_OAM;
                        this._currentLine = 0;
                    }
                }
                break;
        }
    }
};

export default PPU;