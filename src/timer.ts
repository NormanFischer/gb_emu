const ADDR_DIV = 0xFF04;
const ADDR_TIMA = 0xFF05;
const ADDR_TMA = 0xFF06;
const ADDR_TAC = 0xFF07;

class Timer {
    private _time: number;
    private _divReg: number;
    private _divCount: number;
    private _tima: number;
    private _tma: number;
    private _tac: number;

    constructor() {
        this._time = 0;
        this._divReg = 0;
        this._divCount = 0;
        this._tima = 0;
        this._tma = 0;
        this._tac = 0;
    }

    public get time() {
        return this._time;
    }

    public set time(time: number) {
        this._time = time;
    }

    public get divReg(): number {
        return this._divReg;
    }

    public update(cycles: number) {
        //Update our divider
        this._divCount += cycles;
        if(this._divCount >= 255) {
            this._divCount = 0;
            if(++this._divReg >= 255) {
                this._divReg = 0;
            }
        }

        //Is timer enabled
        if(this._tac & (1 << 2)) {

        }
    }
}

export default Timer;