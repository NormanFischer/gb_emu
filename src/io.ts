
//Class for io read and writes
class IO {
    private _io: Uint8Array;

    constructor() {
        this._io = new Uint8Array(0x70);
    }

    read(addr: number) {
        const val = this._io[addr - 0XFF00];
        //console.log("Read " + val + " io @" + addr.toString(16));
        return this._io[addr - 0xFF00];
    }

    write(addr: number, val: number) {
        //console.log("wrote " + val + " to " + addr.toString(16) + " in io");
        this._io[addr - 0xFF00] = val;
    }

}

export default IO;