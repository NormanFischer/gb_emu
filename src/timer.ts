import { request_interrupt } from "./interruptHandler";
import MMU from "./mmu";


class Timer {
    private _timeCount: number;
    private _divReg: number;
    private _divCount: number;
    private _tima: number;
    private _tma: number;
    private _tac: number;

    constructor() {
        this._timeCount = 0;
        this._divReg = 0;
        this._divCount = 0;
        this._tima = 0;
        this._tma = 0;
        this._tac = 0;
    }

    public get timeCount() {
        return this._timeCount;
    }

    public set timeCount(timeCount: number) {
        this._timeCount = timeCount;
    }

    public get divReg(): number {
        return this._divReg;
    }

    public timer_read(addr: number): number {
        console.log("Timer read");
        switch(addr) {
            case 0xFF04:
                return this._divReg;
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

    public timer_write(addr: number, val: number) {
        console.log("Timer write");
        switch(addr) {
            case 0xFF04:
                this._divReg = 0x00;
                break;
            case 0xFF05:
                this._tima = val;
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

    public update(mmu: MMU, cycles: number) {
        //Update our divider
        this._divCount += cycles;
        if(this._divCount >= 255) {
            this._divCount &= 255;
            if(++this._divReg >= 255) {
                this._divReg &= 255;
            }
        }

        //Is timer enabled
        if(this._tac & (1 << 2)) {
            this.timeCount += cycles;
            let timeLimit: number;
            switch (this._tac & 0b11) {
                case 0b00:
                    timeLimit = 1024;
                    break;
                case 0b01:
                    timeLimit = 16;
                    break;
                case 0b10:
                    timeLimit = 64;
                    break;
                case 0b11:
                    timeLimit = 256;
                    break;
                default:
                    throw new Error("Error: Invalid timing mode");
            }
            if(this.timeCount > timeLimit) {
                this._tima++;
                if(this._tima >= 255) {
                    request_interrupt(mmu, 2);
                    this._tima = this._tma;
                }
                this._timeCount = 0;
            }
        }
    }
}

export default Timer;