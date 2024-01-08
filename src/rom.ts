class Rom {
    romBuf: Uint8Array;
    title: String;
    wramBank: Uint8Array;
    extern_ram: Uint8Array;

    constructor(romBuf: Uint8Array) {
        this.romBuf = romBuf;
        let titleBuf = this.get_buffer(0x134, 9);
        const textDecoder = new TextDecoder('ascii');
        this.title = textDecoder.decode(titleBuf);
        this.wramBank = new Uint8Array(0x1FFF + 1);
        this.extern_ram = new Uint8Array(0xBFFF - 0xA000 + 1);
        console.log(this.title);
    }

    wram_read(addr: number): number {
        return this.wramBank[addr - 0xC000]
    }

    wram_write(addr: number, val: number) {
        this.wramBank[addr - 0xC000] = val;
    }

    extern_read(addr: number): number {
        return this.extern_ram[addr - 0xA000];
    }

    extern_write(addr: number, val: number) {
        this.extern_ram[addr - 0xA000] = val;
    }

    //Given a 16-bit address and size, return a slice of the memory region
    private get_buffer(addr: number, size: number) {
        return this.romBuf.slice(addr, addr + size + 1);
    }
}

export default Rom;