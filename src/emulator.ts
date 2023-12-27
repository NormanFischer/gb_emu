import  { CPUContext, CPUState } from "./cpu";

class Emulator {
    private _cpu: CPUContext;

    changeStateCallback: Function | null = null;

    constructor(romData: Uint8Array) {
        this._cpu = new CPUContext(romData);
    };

    start_emu() {
        this._cpu.start_cpu();
        this.cpu_step();
    }

    private cpu_step() {
        const opcode = this.fetch_opcode();
        console.log("instr: " + this._cpu.pc.toString(16) + " -- opcode: 0x" + opcode.toString(16));
        const args = this.fetch_args(opcode);
        this._cpu.execute_instruction(opcode, args);

        //Send cpu state to react component
        this.updateState(this.cpu.pc);

        if (this.cpu.isRunning) {
            requestAnimationFrame(() => this.cpu_step());
        }
    }

    updateState(arg: number) {
        if(this.changeStateCallback) {
            this.changeStateCallback(arg.toString());
        }
    }

    private fetch_opcode(): number {
        const opcode = this._cpu.mmu.read_byte(this._cpu.pc++);
        return opcode;
    }

    private fetch_args(opcode: number): Uint8Array {
        // Subtract one because we already read opcode
        const argLen = this._cpu.get_instruction_len(opcode) - 1;
        if(argLen < 0) {
            throw new Error(`Invalid opcode ${opcode.toString(16)} found while fetching args`);
        }
        if(argLen === 0) {
            return new Uint8Array([]);
        }
        const args = this._cpu.mmu.read(this._cpu.pc, argLen);
        this._cpu.pc += argLen;
        return args;
    }

    public get cpu(): CPUContext {
        return this._cpu;
    }

};

export default Emulator;