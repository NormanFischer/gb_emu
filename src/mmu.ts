import PPU from "./ppu";
import Rom from "./rom";

//Has access to all devices' memory
class MMU {
    rom: Rom;
    ppu: PPU;

    constructor(romData: Uint8Array) {
        this.rom = new Rom(romData);
        this.ppu = new PPU();
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
        if(addr < 0x4000) {
            //Read from rom
            return this.rom.romBuf[addr];
        } else if (addr < 0xA000) {
            console.log("Reading from vram")
            return this.ppu.vram_read(addr);
        }
        console.log("invalid read addr");
        return -1;
    }

    write(addr: number, size: number) {
        //Unimplemented
    }

    write_byte(addr: number, val: number) {
        console.log("Write @" + addr.toString(16));
        if(addr < 0x4000) {
            console.log("Not going to write to rom");
        } else if (addr < 0xA000) {
            console.log("Writing " + val + " to vram");
            return this.ppu.vram_write(addr, val);
        }
    }
}

export default MMU;