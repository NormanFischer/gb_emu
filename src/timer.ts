
class Timer {
    private _time: number;

    constructor() {
        this._time = 0;
    }

    public get time() {
        return this._time;
    }

    public set time(time: number) {
        this._time = time;
    }
}