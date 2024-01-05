class HRAM {
    private _hram: Uint8Array;

    constructor() {
        this._hram = new Uint8Array(0x7E + 1);
    }

    read(addr: number): number {
        return this._hram[addr - 0xFF80];
    }

    write(addr: number, val: number) {
        this._hram[addr - 0xFF80] = val;
    }
}

export default HRAM;