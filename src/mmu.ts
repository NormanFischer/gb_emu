import HRAM from "./hram";
import IO from "./io";
import PPU from "./ppu";
import Rom from "./rom";


//Has access to all devices' memory
class MMU {
    rom: Rom;
    ppu: PPU;
    io: IO;
    hram: HRAM;
    ie: number;
    if: number;

    constructor(romData: Uint8Array) {
        this.rom = new Rom(romData);
        this.ppu = new PPU();
        this.io = new IO();
        this.hram = new HRAM();
        this.ie = 0;
        this.if = 0;
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
            //console.log("vram read @" + addr.toString(16) + " val = " + val.toString(16));
            return val;
        } else if (addr < 0xC000) {
            //cart ram
            //console.log("cart ram read (unimplemented) @" + addr.toString(16));
            return 0xff;
        } else if (addr < 0xE000) {
            //wram
            return this.rom.wram_read(addr);
        } else if (addr < 0xFE00) {
            //reserved echo ram
            //console.log("Echo ram reserved, read denied...");
            return 0xff;
        } else if (addr < 0xFEA0) {
            //oam read todo: dma transfer stuff
            return this.ppu.oam_read(addr);
        } else if (addr < 0xFF00) {
            //console.log("Reserved unusable read denied...");
            return 0xff;
        } else if (addr < 0xFF80) {
            if(addr === 0xFF04) {
                console.log("Divider reg read");
            }
            if(addr == 0xFF44 || addr == 0xFF41 || addr === 0xFF42 || addr === 0xFF43 || addr === 0xFF40) {
                return this.ppu.io_read(addr);
            }
            if(addr === 0xFF0F) {
                return this.if;
            }
            console.log("IO read for unimplemented addr @" + addr.toString(16));
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
            //console.log("not going to write to rom");
        } else if (addr < 0xA000) {
            //vram
            //console.log("vram write @" + addr.toString(16) + " val = " + val.toString(16));
            this.ppu.vram_write(addr, val);
        } else if (addr < 0xC000) {
            //cart ram
            //console.log("cart ram write (unimplemented) @" + addr.toString(16) + " val = " + val.toString(16));
        } else if (addr < 0xE000) {
            //wram
            this.rom.wram_write(addr, val);
        } else if (addr < 0xFE00) {
            //reserved echo ram
            console.log("Echo ram reserved, write denied...");
        } else if (addr < 0xFEA0) {
            //oam read todo: dma transfer stuff
            if(val != 0) {
                console.log("Writing " + val.toString(16) + " to oam");
            }
            this.ppu.oam_write(addr, val);
        } else if (addr < 0xFF00) {
            console.log("Reserved unusable write denied...");
        } else if (addr < 0xFF80) {
            if(addr === 0xFF04) {
                console.log("Divider reg write");
            }
            if(addr == 0xFF0F) {
                this.if = val;
                return;
            }
            if(addr == 0xFF44 || addr == 0xFF41 || addr == 0xFF42 || addr == 0xFF43 || addr === 0xFF40) {
                this.ppu.io_write(addr, val);
                return;
            }
            if(addr === 0xFF46) {
                //DMA Transfer subroutine
                this.dma_transfer(val);
                return;
            }
            //console.log("IO write for unimplemented addr @" + addr.toString(16) + " val = " + val.toString(16));
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

}

export default MMU;