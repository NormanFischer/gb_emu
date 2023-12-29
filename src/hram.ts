class HRAM {
    private _hram: Uint8Array;

    constructor() {
        this._hram = new Uint8Array(0x7E);
    }

    read(addr: number): number {
        return this._hram[addr - 0xFFFE];
    }

    write(addr: number, val: number) {
        this._hram[addr - 0xFFFE] = val;
    }
}

export default HRAM;