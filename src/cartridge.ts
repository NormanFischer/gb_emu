abstract class Cartridge {
    _cartridgeType: string;
    romBuf: Uint8Array;
    numRomBanks: number;
    
    //IMPORTANT: Banks A and B will be stored as start addresses instead of bank number

    //$0000-$3FFF
    bankA: number;

    //$4000-$7FFF
    _bankB: number;

    //$A000-$BFFF
    //bankExtern is the current index into our list of ram arrays
    _bankExtern: number;
    externRam: Uint8Array[];

    //$C000-$DFFF
    wram: Uint8Array;

    constructor(cartridgeType: string, romBuf: Uint8Array) {
        this._cartridgeType = cartridgeType;
        this.romBuf = romBuf;
        this.bankA = 0;
        this._bankB = 0x4000;
        this._bankExtern = 0;
        this.wram = new Uint8Array(0x1FFF + 1);
        this.externRam = new Array();
        this.numRomBanks = Math.pow(2, this.romBuf[0x148] + 1);
    }

    public get cartridgeType(): string {
        return this.cartridgeType;
    }

    public get bankB(): number {
        return this._bankB;
    }

    public set bankB(bankB: number) {
        this._bankB = bankB;
    }

    public get bankExtern(): number {
        return this._bankExtern;
    }

    public set bankExtern(bankExtern: number) {
        this._bankExtern = bankExtern;
    }

    public addExternBank() {
        this.externRam.push(new Uint8Array(0xBFFF - 0xA000 + 1));
    }

    public readBankA(addr: number): number {
        return this.romBuf[this.bankA + addr];
    }

    public writeBankA(addr: number, val: number) {
        this.romBuf[this.bankA + addr] = val;
    }

    public readBankB(addr: number): number {
        const offset = addr - 0x4000;
        return this.romBuf[this.bankB + offset];
    }

    public writeBankB(addr: number, val: number) {
        const offset = addr - 0x4000;
        this.romBuf[this.bankB + offset] = val;
    }

    public externRead(addr: number): number {
        const offset = addr - 0xA000;
        return this.externRam[this.bankExtern][offset];
    }

    public externWrite(addr: number, val: number) {
        const offset = addr - 0xA000;
        this.externRam[this.bankExtern][offset] = val;
    }

    public wramRead(addr: number): number {
        return this.wram[addr - 0xC000];
    }

    public wramWrite(addr: number, val: number) {
        this.wram[addr - 0xC000] = val;
    }
}

export default Cartridge;