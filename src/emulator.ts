import  { CPUContext, CPUState } from "./cpu";

const CYCLES_PER_FRAME = 69905;


class Emulator {
    private _cpu: CPUContext;
    private vramCanvasContext: CanvasRenderingContext2D;

    changeStateCallback: Function | null = null;

    constructor(romData: Uint8Array, vramCanvasContext: CanvasRenderingContext2D) {
        this._cpu = new CPUContext(romData);
        this.vramCanvasContext = vramCanvasContext;
    };

    start_emu() {
        this._cpu.start_cpu();
        this.emu_step();
    }

    private emu_step() {
        let currentCycles = 0;
        while(currentCycles < CYCLES_PER_FRAME && this._cpu.isRunning) {
            const stepCycles = this.cpu_step();
            this._cpu.pc &= 65535;
            if(stepCycles === -1) {
                console.log("Stopping");
                return;
            }
            currentCycles += stepCycles;
        }
        //This is where we will render the frame
        //Send cpu state to react component
        this.updateState(this._cpu.state.a, this.cpu.pc);

        //Update vram map
        this._cpu.mmu.ppu.put_vram_image(this.vramCanvasContext);
        if(this._cpu.isRunning) {
            requestAnimationFrame(() => this.emu_step());
        }
    }

    private cpu_step(): number {
        const opcode = this.fetch_opcode();
        if(!this.cpu.instructions[opcode]) {
            console.error("Invalid opcode found: " + opcode.toString(16));
            this._cpu.isRunning = false;
            return -1;
        }
        //console.log("instr: " + (this._cpu.pc - 1).toString(16) + " -- opcode: 0x" + opcode.toString(16));
        const args = this.fetch_args(opcode);
        const cycles = this._cpu.execute_instruction(opcode, args);

        //Frame rendering
        this._cpu.mmu.ppu.ppu_step(cycles);
        return cycles;
    }

    updateState(a: number, pc: number) {
        if(this.changeStateCallback) {
            this.changeStateCallback(a.toString(16), pc.toString(16));
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