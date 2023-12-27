class PPU {
    private _vram: Uint8Array;
    
    constructor() {
        //0x2000 bytes of VRAM
        this._vram = new Uint8Array(0x2000);
    }

    vram_read(addr: number) {
        const relAddr = addr - 0x8000;
        return this._vram[relAddr];
    }

    vram_write(addr: number, val: number) {
        const relAddr = addr - 0x8000;
        this._vram[relAddr] = val;
    }
};

export default PPU;