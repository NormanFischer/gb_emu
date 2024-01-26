import Cartridge from "./cartridge";

class MBC1 extends Cartridge {
    ramEnabled: boolean
    bankingMode: boolean;

    ramsize :{ [key: number]: number } = {0x00: 0, 0x02: 1, 0x03: 4, 0x04: 16, 0x05: 8};

    constructor(romBuf: Uint8Array) {
        super("MBC1", romBuf);
        console.log("MBC1: Number of rom banks: " + Math.pow(2, romBuf[0x148] + 1));
        console.log("MBC1: Number of extern banks: " + this.ramsize[romBuf[0x149]]);
        console.log("Ram bank val: " + this.romBuf[0x149]);
        for(let i = 0; i < this.ramsize[romBuf[0x149]]; i++) {
            super.addExternBank();
        }
        this.ramEnabled = false;
        this.bankingMode = true;
        super.sizeKB = Math.pow(2, 5 + super.sizeKB);
        console.log("SIZE KB = " + super.sizeKB);
    }

    public writeBankA(addr: number, val: number) {
        if(addr < 0x2000 && ((val & 0xF) === 0xA || (val & 0xF0 >> 1) === 0xA)) {
            console.log("Ram enabled");
            this.ramEnabled = true;
            val = 1;
        } else if(addr < 0x2000) {
            console.log("Ram disabled");
            this.ramEnabled = false;
            val = 0;
        } else if(addr < 0x4000) {
            //Change our bank B
            let bankNum = val &0b11111;
            if( bankNum === 0x00 || bankNum === 0x20 || bankNum === 0x40 || bankNum === 0x60) {
                bankNum = (val + 1) & 0b11111; 
            }

            //Advanced banking mode will use ram bank as upper bits
            if(this.bankingMode) {
                bankNum = (super.bankExtern << 5) + bankNum;
                super.bankExtern = super.bankExtern << 5;
            }
            let bankMask = Math.pow(2, this.romBuf[0x148] + 1) - 1;
            bankNum &= bankMask;
            super.bankB = 0x4000 * bankNum;
            val = bankNum;
        }
        //super.writeBankA(addr, val);
    }

    public writeBankB(addr: number, val: number) {
        if(addr < 0x6000) {
            val = super.bankExtern = val & 0b11;
            console.log("New extern bank: " + super.bankExtern);
        } else if(addr < 0x8000) {
            this.bankingMode = ((val & 0b1) === 1);
            if(this.bankingMode) {
                val = 1
            } else {
                val = 0;
            }
        }
        //super.writeBankB(addr, val);
    }

    public externRead(addr: number): number {
        if(this.ramEnabled) {
            return super.externRead(addr);
        }
        return 0xFF;
    }

    public externWrite(addr: number, val: number) {
        if(this.ramEnabled) {
            super.externWrite(addr, val);
        }
    }

}

export default MBC1;