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
    IE: boolean;
    if: number;

    constructor(romData: Uint8Array) {
        this.rom = new Rom(romData);
        this.ppu = new PPU();
        this.io = new IO();
        this.hram = new HRAM();
        this.IE = false;
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
            return 0;
        } else if (addr < 0xE000) {
            //wram
            return this.rom.wram_read(addr);
        } else if (addr < 0xFE00) {
            //reserved echo ram
            //console.log("Echo ram reserved, read denied...");
            return 0;
        } else if (addr < 0xFEA0) {
            //oam read todo: dma transfer stuff
            //console.log("OAM read (unimplemented");
            return 0;
        } else if (addr < 0xFF00) {
            //console.log("Reserved unusable read denied...");
            return 0;
        } else if (addr < 0xFF80) {
            if(addr === 0xFF04) {
                console.log("Divider reg read");
            }
            if(addr == 0xFF44 || addr == 0xFF41 || addr === 0xFF42 || addr === 0xFF43) {
                return this.ppu.io_read(addr);
            }
            //console.log("IO read for unimplemented addr @" + addr.toString(16));
            return 0xff;
        } else if(addr === 0xFFFF) {
            //console.log("Read ie (unimplemented)");
            return 0;
        } else {
            //hram
            const val = this.hram.read(addr);
            console.log("read " + val + " from hram");
            return val;
        }
    }

    write_byte(addr: number, val: number) {
        if (addr < 0x8000) {
            //rom data
            console.log("not going to write to rom");
        } else if (addr < 0xA000) {
            //vram
            //console.log("vram write @" + addr.toString(16) + " val = " + val.toString(16));
            this.ppu.vram_write(addr, val);
        } else if (addr < 0xC000) {
            //cart ram
            console.log("cart ram write (unimplemented) @" + addr.toString(16) + " val = " + val.toString(16));
        } else if (addr < 0xE000) {
            //wram
            this.rom.wram_write(addr, val);
        } else if (addr < 0xFE00) {
            //reserved echo ram
            console.log("Echo ram reserved, write denied...");
        } else if (addr < 0xFEA0) {
            //oam read todo: dma transfer stuff
            console.log("OAM write (unimplemented");
        } else if (addr < 0xFF00) {
            console.log("Reserved unusable write denied...");
        } else if (addr < 0xFF80) {
            console.log("Io write @" + addr.toString(16));
            if(addr === 0xFF04) {
                console.log("Divider reg write");
            }
            if(addr == 0xFF0F) {
                console.log("Set interrupts");
            }
            if(addr == 0xFF44 || addr == 0xFF41 || addr == 0xFF42 || addr == 0xFF43) {
                this.ppu.io_write(addr, val);
                return;
            }
            console.log("IO write for unimplemented addr @" + addr.toString(16) + " val = " + val.toString(16));
        } else if(addr === 0xFFFF) {
            console.log("write ie (unimplemented)");
        } else {
            //hram
            this.hram.write(addr, val);
        }
    }

}

export default MMU;