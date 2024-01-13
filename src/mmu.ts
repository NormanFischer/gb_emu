import HRAM from "./hram";
import { request_interrupt } from "./interruptHandler";
import IO from "./io";
import PPU from "./ppu";
import Rom from "./rom";
import Timer from "./timer";


//Has access to all devices' memory
class MMU {
    rom: Rom;
    ppu: PPU;
    io: IO;
    hram: HRAM;
    ie: number;
    if: number;
    serial_data: number;
    serial_buf: string;
    timer: Timer;

    //Joypad controls
    buttonNibble: number;
    dpadNibble: number;
    buttonSelect: boolean;

    constructor(romData: Uint8Array) {
        this.rom = new Rom(romData);
        this.ppu = new PPU();
        this.io = new IO();
        this.hram = new HRAM();
        this.ie = 0;
        this.if = 0;
        this.serial_data = 0;
        this.serial_buf = "";
        this.timer = new Timer();
        this.buttonNibble = 0b1111;
        this.dpadNibble = 0b1111;
        this.buttonSelect = false;
    }

    //Read size bytes from the given addr
    read(addr: number, size: number): Uint8Array {
        if(addr < 0x8000) {
            //Read from rom
            return this.rom.romBuf.slice(addr, addr + size);
        } else {
            console.error("mmu read device unimplemented");
            return new Uint8Array;
        }
    }

    read_byte(addr: number): number {
        if (addr < 0x8000) {
            //rom data
            return this.rom.romBuf[addr];
        } else if (addr < 0xA000) {
            //vram
            const val = this.ppu.vram_read(addr);
            return val;
        } else if (addr < 0xC000) {
            //cart ram
            return this.rom.extern_read(addr);
        } else if (addr < 0xE000) {
            //wram
            return this.rom.wram_read(addr);
        } else if (addr < 0xFE00) {
            //reserved echo ram
            return 0x0;
        } else if (addr < 0xFEA0) {
            //oam read todo: dma transfer stuff
            return this.ppu.oam_read(addr);
        } else if (addr < 0xFF00) {
            //console.log("Reserved unusable read denied...");
            return 0xff;
        } else if (addr < 0xFF80) {
            if(addr === 0xFF00) {
                if(this.buttonSelect) {
                    return 0b100000 | this.buttonNibble;
                } else {
                    return 0b010000 | this.dpadNibble;
                }
            }
            if(addr === 0xFF04) {
                return this.timer.divReg;
            }
            if(addr == 0xFF44 || addr == 0xFF41 || addr === 0xFF42 || addr === 0xFF43 || addr === 0xFF40) {
                return this.ppu.io_read(addr);
            }
            if(addr === 0xFF0F) {
                return this.if;
            }
            if(addr === 0xFF01) {
                return this.serial_data;
            }
            if(addr === 0xFF02) {
                console.error("hmm");
            }
            //console.log("IO read for unimplemented addr @" + addr.toString(16));
            return 0xff;
        } else if(addr === 0xFFFF) {
            //console.log("Ie read");
            return this.ie;
        } else {
            //hram
            const val = this.hram.read(addr);
            return val;
        }
    }

    write_byte(addr: number, val: number) {
        if (addr < 0x8000) {
            //rom data
            console.log("not going to write to rom");
        } else if (addr < 0xA000) {
            //vram
            this.ppu.vram_write(addr, val);
        } else if (addr < 0xC000) {
            //cart ram
            this.rom.extern_write(addr, val);
            return;
        } else if (addr < 0xE000) {
            //wram
            this.rom.wram_write(addr, val);
            return;
        } else if (addr < 0xFE00) {
            //reserved echo ram
            console.log("Echo ram reserved, write denied...");
            return;
        } else if (addr < 0xFEA0) {
            this.ppu.oam_write(addr, val);
        } else if (addr < 0xFF00) {
            console.log("Reserved unusable write denied...");
        } else if (addr < 0xFF80) {
            if(addr === 0xFF00) {
                //Can only write to upper nibble for joypad
                if((val & 0b100000) >> 5 === 1) {
                    this.buttonSelect = false;
                } else if((val & 0b010000) >> 4 === 1) {
                    this.buttonSelect = true;
                } else {
                    console.error("Bad case");
                }
            }
            if(addr === 0xFF04) {
                console.log("Divider reg write");
            }
            if(addr == 0xFF0F) {
                this.if = val;
                return;
            }
            if(addr == 0xFF45 || addr == 0xFF44 || addr == 0xFF41 || addr == 0xFF42 || addr == 0xFF43 || addr === 0xFF40) {
                this.ppu.io_write(addr, val);
                return;
            }
            if(addr === 0xFF46) {
                //DMA Transfer subroutine
                this.dma_transfer(val);
                return;
            }
            if(addr === 0xFF01) {
                if(val === 10) {
                    console.log("Serial: " + this.serial_buf);
                    this.serial_buf = "";
                } else {
                    this.serial_buf += String.fromCharCode(val);
                }
                return;
            }
            if(addr === 0xFF02 && val === 0x81) {
                request_interrupt(this, 3);
                return;
            }
            return;
        } else if(addr === 0xFFFF) {
            this.ie = val;
            return;
        } else {
            //hram
            this.hram.write(addr, val);
        }
    }

    dma_transfer(val: number) {
        const addr = val << 8;
        for(let i = 0; i < 0xA0; i++) {
            this.write_byte(0xFE00 + i, this.read_byte(addr + i));
        }
    }
    
    //User pressed a button
    joypad_set(bit: number, button: boolean) {
        //Buttons
        if(button) {
            this.buttonNibble &= ~(1 << bit);
            //console.log("Set button");
            if(this.buttonSelect) {
                request_interrupt(this, 4);
            }
        } else {
            //D-pad
            //console.log("Setting dpad");
            this.dpadNibble &= ~(1 << bit);
            if(!this.buttonSelect) {
                request_interrupt(this, 4);
            }
        }
    }

    //User released a button
    joypad_unset(bit: number, button: boolean) {
        if(button) {
            this.buttonNibble |= (1 << bit);
        } else {
            this.dpadNibble |= (1 << bit);
        }
    }

}

export default MMU;