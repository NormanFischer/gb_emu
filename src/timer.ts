import { request_interrupt } from "./interruptHandler";
import MMU from "./mmu";


class Timer {
    private _divReg: number;
    private _tima: number;
    private _tma: number;
    private _tac: number;
    private _delay: number;
    private _updateTima: boolean;

    constructor() {
        this._divReg = 0xABCC;
        this._tima = 0;
        this._tma = 0;
        this._tac = 0xF8;
        this._delay = 0; 
        this._updateTima = false;
    }

    public get divReg(): number {
        return this._divReg;
    }

    public timer_read(addr: number): number {
        switch(addr) {
            case 0xFF04:
                return this._divReg >> 8;
            case 0xFF05:
                return this._tima;
            case 0xFF06:
                return this._tma;
            case 0xFF07:
                return this._tac;
            default:
                throw new Error("Invalid address for timer read");
        }
    }

    public timer_write(mmu: MMU, addr: number, val: number) {
        switch(addr) {
            case 0xFF04:
                const prev = this._divReg;
                this._divReg = 0x00;
                this.check_timer(mmu, prev);
                break;
            case 0xFF05:
                if(!this._updateTima) {
                    this._tima = val;
                }
                break;
            case 0xFF06:
                this._tma = val;
                break;
            case 0xFF07:
                this._tac = val;
                return;
            default:
                throw new Error("Invalid address for timer read");
        }
    }
    
    //Prev is div register before switch
    private check_timer(mmu: MMU, prev: number) {
        let update = false;

        //Triggered by hi to low bit transition
        switch(this._tac & (0b11)) {
            case 0b00:
                //1024
                update = ((prev & (1 << 9)) !== 0)  && ((this._divReg & (1 << 9)) === 0);
                break;
            case 0b01:
                //16
                update = ((prev & (1 << 3)) !== 0)  && ((this._divReg & (1 << 3)) === 0);
                break;
            case 0b10:
                //64
                update = ((prev & (1 << 5)) !== 0)  && ((this._divReg & (1 << 5)) === 0);
                break;
            case 0b11:
                //256
                update = ((prev & (1 << 7)) !== 0)  && ((this._divReg & (1 << 7)) === 0);
                break;
        }

        //Is timer enabled
        if(update && this._tac & (1 << 2)) {
            this._tima++;
            if(this._tima === 0xFF + 1) {
                //Tima will have 0 for 4 cycles
                this._updateTima = true;
                this._delay = 3;
                this._tima = 0;
                request_interrupt(mmu, 2);
            }
        }
    }

    public update(mmu: MMU) {
        //Update our divider
        if(this._updateTima) {
            if(this._delay === 0) {
                this._tima = this._tma;
                this._updateTima = false;
            } else {
                this._delay--;
            }
        }
        const prev = this._divReg;
        this._divReg++;
        this._divReg &= 0xFFFF;
        this.check_timer(mmu, prev);
    }
}

export default Timer;