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

    constructor(romData: Uint8Array) {
        this.rom = new Rom(romData);
        this.ppu = new PPU();
        this.io = new IO();
        this.hram = new HRAM();
        this.IE = false;
    }

    //Read size bytes from the given addr
    read(addr: number, size: number): Uint8Array {
        if(addr < 0x4000) {
            //Read from rom
            return this.rom.romBuf.slice(addr, addr + size);
        } else {
            console.error("mmu read device unimplemented");
            return new Uint8Array;
        }
    }

    read_byte(addr: number): number {
        if(addr < 0x8000) {
            //Read from rom
            return this.rom.romBuf[addr];
        } else if (addr > 0x7FFF && addr < 0xA000) {
            console.log("vram read");
            return this.ppu.vram_read(addr);
        } else if (addr > 0xFEFF && addr < 0xFF80) {

            //TODO : Hack
            if(addr === 0xFF44) {
                //console.log("line read"); 
                return this.ppu.io_read(addr);
            } else {
                return this.io.read(addr);
            }


        } else if (addr > 0xFFF80 && addr < 0xFFFF) {
            console.log("hram read");
            return this.hram.read(addr);
        }
        console.error("invalid read addr @" + addr.toString(16));
        return 0;
    }

    write_byte(addr: number, val: number) {
        if(addr < 0x8000) {
            console.log("Not going to write to rom @" + addr.toString(16));
            return;
        } else if (addr > 0x7FFF && addr < 0xA000) {
            console.log("Writing " + val + " to vram");
            return this.ppu.vram_write(addr, val);
        } else if (addr > 0xFEFF && addr < 0xFF80) {

                //TODO : Hack
                if(addr === 0xFF44) {
                    console.log("line write");
                    return this.ppu.io_write(addr, val);
                } else {
                    return this.io.write(addr, val);
                }

        } else if (addr > 0xFF80 && addr < 0xFFFF) {
            //console.log("hram write");
            return this.hram.write(addr, val);
        }
    }
}

export default MMU;