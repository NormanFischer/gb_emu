// import CPUContext from "./cpu";
// import Rom from "./rom";

// class Bus {
//     cpu: CPUContext;

//     constructor(romData: Uint8Array) {
//         this.rom = new Rom(romData);
//         this.cpu = new CPUContext();
//     }

//     //Read size bytes from the given addr
//     bus_read(addr: number, size: number): Uint8Array {
//         return this.rom.romBuf.slice(addr, addr + size);
//     }

//     bus_read_byte(addr: number) {
//         return this.rom.romBuf[addr];
//     }

//     bus_write(addr: number) {
//         //Unimplemented
//     }
// }

// export default Bus;