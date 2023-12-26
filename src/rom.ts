class Rom {
    romBuf: Uint8Array;
    title: String;

    constructor(romBuf: Uint8Array) {
        this.romBuf = romBuf;
        let titleBuf = this.get_buffer(0x134, 9);
        const textDecoder = new TextDecoder('ascii');
        this.title = textDecoder.decode(titleBuf);
        console.log(this.title);
    }

    //Given a 16-bit address and size, return a slice of the memory region
    private get_buffer(addr: number, size: number) {
        return this.romBuf.slice(addr, addr + size + 1);
    }
}

export default Rom;