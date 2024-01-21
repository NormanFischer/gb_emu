import Cartridge from "./cartridge";

class MBC1 extends Cartridge {
    ramEnabled: boolean
    bankingMode: boolean;

    ramsize :{ [key: number]: number } = {0x00: 0, 0x02: 1, 0x03: 4, 0x04: 16, 0x05: 8};

    constructor(romBuf: Uint8Array) {
        super("MBC1", romBuf);
        console.log("MBC1: Number of rom banks: " + Math.pow(2, romBuf[0x148] + 1));
        console.log("MBC1: Number of extern banks: " + this.ramsize[romBuf[0x0149]]);
        super.addExternBank();
        this.ramEnabled = false;
        this.bankingMode = false;
    }

    public writeBankA(addr: number, val: number) {
        super.writeBankA(addr, val);
        if(addr < 0x2000 && (val & 0xF) === 0xA) {
            console.log("Ram enabled");
            this.ramEnabled = true;
        } else if(addr < 0x2000 && (val & 0xF) !== 0xA) {
            console.log("Ram disabled");
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
            console.log("Changing to bank: " + bankNum + " (wrote " + val.toString(16) + " to @" + addr.toString(16) + ")");
            super.bankB = 0x4000 * (bankNum & 0b11111);
        }
    }

    public writeBankB(addr: number, val: number) {
        super.writeBankB(addr, val);
        console.log("Write bank b");
        if(addr < 0x6000) {
            super.bankExtern = val & 0b11;
            console.log("New extern bank: " + super.bankExtern);
        } else if(addr < 0x8000) {
            console.log("Setting banking mode to: " + val);
            this.bankingMode = ((val & 0b1) === 1);
        }
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