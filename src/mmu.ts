import Rom from "./rom";

//Has access to all devices' memory
class MMU {
    rom: Rom;

    constructor(romData: Uint8Array) {
        this.rom = new Rom(romData);
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
        } else {
            console.error("mmu read byte device unimplemented");
            return -1;
        }
    }

    write(addr: number, size: number) {
        //Unimplemented
    }

    write_byte(addr: number, val: number) {
        console.log("mmu write byte unimplemented");
    }
}

export default MMU;