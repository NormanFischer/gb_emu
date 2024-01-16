import  { CPUContext, CPUState } from "./cpu";
import { interrupt_handler, request_interrupt } from "./interruptHandler";

const CYCLES_PER_FRAME = 69905;


class Emulator {
    private _cpu: CPUContext;
    private vramCanvasContext: CanvasRenderingContext2D;
    private gameScreenCanvasContext: CanvasRenderingContext2D;
    private _debug: boolean;
    private _frameData: ImageData; 

    changeStateCallback: Function | null = null;

    constructor(romData: Uint8Array, vramCanvasContext: CanvasRenderingContext2D, 
        gameScreenCanvasContext: CanvasRenderingContext2D, debug: boolean) {
        this._cpu = new CPUContext(romData);
        this.vramCanvasContext = vramCanvasContext;
        this.gameScreenCanvasContext = gameScreenCanvasContext;
        this._debug = debug;
        this._frameData = this.gameScreenCanvasContext.createImageData(160, 144);
    };

    start_emu() {
        this._cpu.start_cpu();
        this.emu_step();
    }

    emu_step() {
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
        if(this._cpu.isRunning && !this.debug) {
            requestAnimationFrame(() => this.emu_step());
        }
    }

    private cpu_step(): number {
        let cycles;

        if(!this._cpu.isHalted) {
            const opcode = this.fetch_opcode();
            if(!this.cpu.instructions[opcode]) {
                console.error("Invalid opcode found: " + opcode.toString(16));
                this._cpu.isRunning = false;
                return -1;
            }
            //console.log("instr: " + (this._cpu.pc - 1).toString(16) + " -- opcode: 0x" + opcode.toString(16));
            const args = this.fetch_args(opcode);
            cycles = this._cpu.execute_instruction(opcode, args);
        } else {
            cycles = 1;
            //Wait for IF register to be marked
            if(this._cpu.mmu.read_byte(0xFF0F) & this._cpu.mmu.read_byte(0xFFFF)) {
                this._cpu.isHalted = false;
            }
        }

        this._cpu.mmu.timer.update(this._cpu.mmu, cycles);

        if(this._cpu.IME) {
            //Hanlde interrupts
            interrupt_handler(this);
        }

        if(this._cpu.interrupt_enable_pending) {
            //Accounting for one op delay
            this._cpu.IME = true;
            this._cpu.interrupt_enable_pending = false;
        }

        //Frame rendering
        this._cpu.mmu.ppu.ppu_step(this._cpu.mmu, cycles, this._frameData);
        if(this._cpu.mmu.ppu.mode === 1) {
            this.gameScreenCanvasContext.putImageData(this._frameData, 0, 0);
            request_interrupt(this._cpu.mmu, 0);
        }
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
        if(argLen === 0) {
            return new Uint8Array([]);
        } else if (argLen === 1) {
            return new Uint8Array([this._cpu.mmu.read_byte(this._cpu.pc++)]);
        } else if (argLen === 2) {
            return new Uint8Array([this._cpu.mmu.read_byte(this._cpu.pc++), this._cpu.mmu.read_byte(this._cpu.pc++)]);
        } else {
            console.error("Invalid argLength found");
            return new Uint8Array;
        }
    }

    public get cpu(): CPUContext {
        return this._cpu;
    }

    public get debug(): boolean {
        return this._debug;
    }

    public set debug(debug: boolean) {
        this._debug = debug;
    }

};

export default Emulator;