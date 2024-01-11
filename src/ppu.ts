import { u8Toi8 } from "./cpu";
import { request_interrupt } from "./interruptHandler";

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
    private _oam: Uint8Array;
    private _lcdc: number;
    private _lyc: number;
    private _frameBuffer: number[];
    
    constructor() {
        //0x2000 bytes of VRAM
        this._vram = new Uint8Array(0x2000);
        this._oam = new Uint8Array(0xA0);
        this._mode = 0;
        this._modeTime = 0;
        this._currentLine = 0;
        this._scy = 0;
        this._scx = 0;
        this._lcdc = 0;
        this._lyc = 0;
        this._frameBuffer = new Array(92160);
    }

    vram_read(addr: number) {
        const relAddr = addr - 0x8000;
        return this._vram[relAddr];
    }

    vram_write(addr: number, val: number) {
        const relAddr = addr - 0x8000;
        this._vram[relAddr] = val;
    }

    oam_read(addr: number) {
        const relAddr = addr - 0xFE00;
        return this._oam[relAddr];
    }

    oam_write(addr: number, val: number) {
        const relAddr = addr - 0xFE00;
        this._oam[relAddr] = val;
    }

    io_read(addr: number): number {
        if(addr === 0xFF44) {
            return this._currentLine;
        } else if (addr === 0xFF41) {
            return this._mode;
        } else if (addr === 0xFF42) {
            return this._scy;
        } else if (addr === 0xFF43) {
            return this._scx;
        } else if (addr === 0xFF40) {
            return this._lcdc;
        } else if (addr == 0xFF45) {
            return this._lyc;
        }
        return 0;
    }

    io_write(addr: number, val: number) {
        if(addr === 0xFF44) {
            this._currentLine = val;
        } else if(addr === 0xFF41) {
            this._mode = val & 0b11;
        } else if(addr === 0xFF42) {
            this._scy = val;
        } else if(addr === 0xFF43) {
            this._scx = val;
        } else if(addr === 0xFF40) {
            this._lcdc = val;
        } else if(addr === 0xFF45) {
            this._lyc = val;
        }
    }

    public get mode() {
        return this._mode;
    }

    public get frameBuffer() {
        return this._frameBuffer;
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
                    //ctx.fillRect(xPos, yPos, 1, 1);
                }
            }
        }
    }

    //Address into the tilemap and return the tile number for a given tile
    //pixelX and pixelY are relative to scx and scy
    get_tile_num_from_pixel(tileMapBase: number, pixelX: number, pixelY: number): number {
        //TODO: Incorporate scrolling
        const tileX = Math.floor(pixelX/8);
        const tileY = Math.floor(pixelY/8);
        const tileNum = this.vram_read(tileMapBase + (32 * tileY) + tileX);
        return tileNum;
    }

    //Given relative coordinates and a base tile address in vram, return the pixel value
    get_pixel_val_from_tile(x: number, y: number, tileAddr: number): number {
        //Get our current line (y)
        if(tileAddr % 16 !== 0) {
            console.error("Invalid tile base: " + tileAddr.toString(16));
        }
        //console.log("Rendering x = " + x + " y = " + y + " from tilenum: " + tileAddr.toString(16));
        const lowByte = this.vram_read(tileAddr + y * 2);
        const highByte = this.vram_read(tileAddr + y * 2 + 1);
        const lowBit = (lowByte & ( 1 << 7 - x )) >> 7 - x;
        const highBit = (highByte & ( 1 << 7 - x )) >> 7 - x;
        const pixelVal = (highBit << 1) | lowBit;
        return pixelVal;
    }

    //Render a background scanline to the game screen (160 x 144)
    render_background_scanline(imgData: ImageData) {
        //Just going to render background for now
        let tileStart = 0x9000;
        let tileMapOffset = 0x9800;

        //BG tile map offset
        if(this._lcdc & (1 << 3)) {
            tileMapOffset = 0x9C00;
        }

        //Addressing mode
        if(this._lcdc & (1 << 4)) {
            console.log("Using 8000 addressing");
            tileStart = 0x8000;
        }

        //Draw the pixels horizontally
        for(let i = 0; i < 160; i++) {
            //Get tile base from vram
            let tileNum = this.get_tile_num_from_pixel(tileMapOffset, i, this._currentLine);
            if(tileStart === 0x9000) {
                tileNum = u8Toi8(tileNum);
            }
            //TODO: Change this
            const pixelVal = this.get_pixel_val_from_tile(i % 8, this._currentLine % 8, tileStart + (tileNum * 0x10));
            switch(pixelVal) {
                case 0b00:
                    //Transparent
                    imgData.data[(this._currentLine * 160 + i) * 4] = 255;
                    imgData.data[(this._currentLine * 160 + i) * 4 + 1] = 255;
                    imgData.data[(this._currentLine * 160 + i) * 4 + 2] = 255;
                    imgData.data[(this._currentLine * 160 + i) * 4 + 3] = 255;
                    break;
                case 0b01:
                    //Darkest green
                    imgData.data[(this._currentLine * 160 + i) * 4] = 48;
                    imgData.data[(this._currentLine * 160 + i) * 4 + 1] = 98;
                    imgData.data[(this._currentLine * 160 + i) * 4 + 2] = 48;
                    imgData.data[(this._currentLine * 160 + i) * 4 + 3] = 255;
                    break;
                case 0b10:
                    //Light green
                    imgData.data[(this._currentLine * 160 + i) * 4] = 139;
                    imgData.data[(this._currentLine * 160 + i) * 4 + 1] = 172;
                    imgData.data[(this._currentLine * 160 + i) * 4 + 2] = 15;
                    imgData.data[(this._currentLine * 160 + i) * 4 + 3] = 255;
                    break;
                case 0b11:
                    //Lightest green
                    imgData.data[(this._currentLine * 160 + i) * 4] = 155;
                    imgData.data[(this._currentLine * 160 + i) * 4 + 1] = 188;
                    imgData.data[(this._currentLine * 160 + i) * 4 + 2] = 15;
                    imgData.data[(this._currentLine * 160 + i) * 4 + 3] = 255;
                    break;
                default:
                    console.error("Invalid pixel value found");
            }
        }
    }

    //Called in the main loop
    //cycles are the number of cycles from the last cpu execution
    ppu_step(cycles: number, frameData: ImageData) {
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
                    this.render_background_scanline(frameData);
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
            default:
                console.error("Invalid ppu mode: " + this._mode);
                return;
        }
    }
};

export default PPU;