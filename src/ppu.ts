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
    private _vram: Uint8Array;
    
    constructor() {
        //0x2000 bytes of VRAM
        this._vram = new Uint8Array(0x2000);
        this._mode = 0;
        this._modeTime = 0;
        this._currentLine = 0;
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
            return this._currentLine;
        }
        return 0;
    }

    io_write(addr: number, val: number) {
        if(addr === 0xFF44) {
            this._currentLine = val;
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
                        //Display the frame now!
                        //TODO
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