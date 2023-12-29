class Rom {
    romBuf: Uint8Array;
    title: String;
    wramBank: Uint8Array;

    constructor(romBuf: Uint8Array) {
        this.romBuf = romBuf;
        let titleBuf = this.get_buffer(0x134, 9);
        const textDecoder = new TextDecoder('ascii');
        this.title = textDecoder.decode(titleBuf);
        this.wramBank = new Uint8Array(0xFFF);
        console.log(this.title);
    }

    wram_write(addr: number, val: number) {
        this.wramBank[addr - 0xC000] = val;
    }

    wram_read(addr: number): number {
        return this.wramBank[addr - 0xC000]
    }

    //Given a 16-bit address and size, return a slice of the memory region
    private get_buffer(addr: number, size: number) {
        return this.romBuf.slice(addr, addr + size + 1);
    }
}

export default Rom;