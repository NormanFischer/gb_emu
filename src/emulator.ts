import CPUContext from "./cpu";

class Emulator {
    private cpu: CPUContext;

    constructor(romData: Uint8Array) {
        this.cpu = new CPUContext(romData);
    };

    start_emu() {
        this.cpu.start_cpu();

        while(this.cpu.isRunning) {
            //Fetch opcode
            const opcode = this.fetch_opcode();
            const args = this.fetch_args(opcode);
            if(!this.cpu.execute_instruction(opcode, args)) {
                console.log("Execute instruction failed");
                break;
            }
        }
        console.log("Cpu stopped");
    }

    private fetch_opcode(): number {
        console.log("pc = " + this.cpu.pc.toString(16));
        const opcode = this.cpu.mmu.read_byte(this.cpu.pc++);
        return opcode;
    }

    private fetch_args(opcode: number): Uint8Array {
        // Subtract one because we already read opcode
        const argLen = this.cpu.get_instruction_len(opcode) - 1;
        if(argLen < 0) {
            throw new Error(`Invalid opcode ${opcode.toString(16)} found while fetching args`);
        }
        if(argLen === 0) {
            return new Uint8Array([]);
        }
        const args = this.cpu.mmu.read(this.cpu.pc, argLen);
        console.log(args);
        this.cpu.pc += argLen;
        return args;
    }

};

export default Emulator;