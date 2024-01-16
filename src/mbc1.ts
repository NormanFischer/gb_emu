import Cartridge from "./cartridge";

class MBC1 extends Cartridge {
    ramEnabled: boolean
    bankingMode: boolean;

    constructor(romBuf: Uint8Array) {
        super("MBC1", romBuf);
        super.addExternBank();
        this.ramEnabled = false;
        this.bankingMode = false;
    }

    public writeBankA(addr: number, val: number) {
        super.writeBankA(addr, val);
        if(addr < 0x2000 && (val & 0xF) === 0xA) {
            this.ramEnabled = true;
        } else if(addr < 0x2000 && (val & 0xF) !== 0xA) {
            this.ramEnabled = false;
        } else if(addr < 0x4000) {
            //Change our bank B
            let bankNum;
            if(val === 0 || val === 0x20 || val === 0x40 || val === 0x60) {
                bankNum = val + 1; 
            } else {
                bankNum = val & 0b11111;
            }

            //Advanced banking mode will use ram bank as upper bits
            if(this.bankingMode) {
                bankNum = (this.bankExtern << 5) + bankNum;
            }
            this.bankB = 0x4000 * bankNum;
        }
    }

    public writeBankB(addr: number, val: number) {
        super.writeBankB(addr, val);
        if(addr < 0x6000) {
            super.bankExtern = val & 0b11;
        } else if(addr < 0x8000) {
            this.bankingMode = (val === 1);
        }
    }

    externRead(addr: number): number {
        if(this.ramEnabled) {
            return super.externRead(addr);
        }
        return 0xFF;
    }

    externWrite(addr: number, val: number) {
        if(this.ramEnabled) {
            super.externWrite(addr, val);
        }
    }

}

export default MBC1;