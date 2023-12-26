abstract class Device {
    abstract deviceRead(addr: number, size: number): Uint8Array;
    abstract deviceWrite(addr: number, size: number): number;
}