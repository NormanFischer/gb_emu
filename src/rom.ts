import Cartridge from "./cartridge";

class Rom extends Cartridge {
    constructor(romBuf: Uint8Array) {
        super("ROM", romBuf);
        super.addExternBank();
        super.bankB = 0x4000;
    }

    public writeBankA(addr: number, val: number): void {
        console.log("Bank A: Not writing to rom");
    }

    public writeBankB(addr: number, val: number): void {
        console.log("Bank B: Not writing to rom");
    }
}

export default Rom;