import { type Instruction } from "./instruction";
import MMU from "./mmu";

const FLAGS_ZERO = 7;
const FLAGS_SUBTRACT = 6;
const FLAGS_HALF_CARRY = 5;
const FLAGS_CARRY = 4;
type bit = 0 | 1;

class CPUContext {
    private _state: CPUState;
    private _mmu: MMU;
    private _sp: number;
    private _pc: number;
    private _isRunning: boolean;
    private _IME: number;

    //Lookup table for all instructions
    instructions: { [key: number]: Instruction } = {
        0x00: {op : this.NOP.bind(this),      len: 1},
        0x01: {op : this.LD_BC_D16.bind(this),len: 3},
        0x02: {op : this.LD_MBC_A.bind(this), len: 1},
        0x05: {op : this.DEC_B.bind(this),    len: 1},
        0x06: {op : this.LD_B_D8.bind(this),  len: 2},
        0x0D: {op : this.DEC_C.bind(this),    len: 1},
        0x0E: {op : this.LD_C_D8.bind(this),  len: 2},
    
        0x11: {op : this.LD_DE_D16.bind(this),len: 3},
        0x12: {op : this.LD_MDE_A.bind(this), len: 1},
        0x15: {op : this.DEC_D.bind(this),    len: 1},
        0x16: {op : this.LD_D_D8.bind(this),  len: 2},
        0x1D: {op : this.DEC_E.bind(this),    len: 1},
        0x1E: {op : this.LD_E_D8.bind(this),  len: 2},
        
        0x20: {op : this.JR_NZ_R8.bind(this), len: 2},
        0x21: {op : this.LD_HL_D16.bind(this),len: 3},
        0x22: {op : this.LD_MHLI_A.bind(this),len: 1},
        0x25: {op : this.DEC_H.bind(this),    len: 1},
        0x26: {op : this.LD_H_D8.bind(this),  len: 2},
        0x2D: {op : this.DEC_L.bind(this),    len: 1},
        0x2E: {op : this.LD_L_D8.bind(this),  len: 2},
    
        0x31: {op : this.LD_SP_D16.bind(this),len: 3},
        0x32: {op : this.LD_MHLD_A.bind(this),len: 1},
        0x35: {op : this.DEC_MHL.bind(this),  len: 1},
        0x36: {op : this.LD_MHL_D8.bind(this),len: 2},
        0x3D: {op : this.DEC_A.bind(this),    len: 1},
        0x3E: {op : this.LD_A_D8.bind(this),  len: 2},

        0x40: {op : this.LD_B_B.bind(this),   len: 1},
        0x41: {op : this.LD_B_C.bind(this),   len: 1},
        0x42: {op : this.LD_B_D.bind(this),   len: 1},
        0x43: {op : this.LD_B_E.bind(this),   len: 1},
        0x44: {op : this.LD_B_H.bind(this),   len: 1},
        0x45: {op : this.LD_B_L.bind(this),   len: 1},
        0x46: {op : this.LD_B_MHL.bind(this), len: 1},
        0x47: {op : this.LD_B_A.bind(this),   len: 1},
        0x48: {op : this.LD_C_B.bind(this),   len: 1},
        0x49: {op : this.LD_C_C.bind(this),   len: 1},
        0x4A: {op : this.LD_C_D.bind(this),   len: 1},
        0x4B: {op : this.LD_C_E.bind(this),   len: 1},
        0x4C: {op : this.LD_C_H.bind(this),   len: 1},
        0x4D: {op : this.LD_C_L.bind(this),   len: 1},
        0x4E: {op : this.LD_C_MHL.bind(this), len: 1},
        0x4F: {op : this.LD_C_A.bind(this),   len: 1},

        0xA0: {op : this.AND_B.bind(this),    len: 1},
        0xA1: {op : this.AND_C.bind(this),    len: 1},
        0xA2: {op : this.AND_D.bind(this),    len: 1},
        0xA3: {op : this.AND_E.bind(this),    len: 1},
        0xA4: {op : this.AND_H.bind(this),    len: 1},
        0xA5: {op : this.AND_L.bind(this),    len: 1},
        0xA6: {op : this.AND_MHL.bind(this),  len: 1},
        0xA7: {op : this.AND_A.bind(this),    len: 1},
        0xA8: {op : this.XOR_B.bind(this),    len: 1},
        0xA9: {op : this.XOR_C.bind(this),    len: 1},
        0xAA: {op : this.XOR_D.bind(this),    len: 1},
        0xAB: {op : this.XOR_E.bind(this),    len: 1},
        0xAC: {op : this.XOR_H.bind(this),    len: 1},
        0xAD: {op : this.XOR_L.bind(this),    len: 1},
        0xAE: {op : this.XOR_MHL.bind(this),  len: 1},
        0xAF: {op : this.XOR_A.bind(this),    len: 1},

        0xC3: {op : this.JP_A16.bind(this),   len: 3},
        0xCE: {op : this.ADC_A_D8.bind(this), len: 2},

        0xE0: {op: this.LDH_MA8_A.bind(this), len: 2},

        0xF0: {op : this.LDH_A_MA8.bind(this),len: 2},
        0xF3: {op : this.DI.bind(this),       len: 1},
        0xFE: {op : this.CP_D8.bind(this),    len: 2},
    };

    constructor(romData: Uint8Array) {
        this._state = {a: 0, b: 0, c: 0, d: 0, e: 0, f: 0, h: 0, l: 0};
        this._sp = 0;
        this._pc = 0;
        this._isRunning = false;
        this._IME = 0;
        this._mmu = new MMU(romData);
    }

    start_cpu() {
        this._pc = 0x0100;
        this._sp = 0xFFFE;
        const hl_init = 0x014d;
        this._state.h = hl_init >> 8;
        this._state.l = hl_init & 0xFF;
        this._state.c = 0x13;
        this._state.e = 0xD8;
        this._state.a = 1;
        this._state.f = 0xb0;
        this._isRunning = true;
    }

    get_instruction_len(opcode: number) {
        if(this.instructions[opcode]) {
            return this.instructions[opcode].len
        }
        return -1;
    }

    execute_instruction(opcode: number, args: Uint8Array){
        const op_to_exec =  this.instructions[opcode].op;
        op_to_exec(args);
    }

    //operation logic here

    private nz(): boolean {
        const nz = (this.get_zero() === 0);
        return nz;
    }

    private ld_b(val: number): boolean {
        this._state.b = val;
        return true;
    }

    private ld_c(val: number): boolean {
        this._state.b = val;
        return true;
    }

    private inc_hl() {
        const hl = get_hl(this._state);
        const res = add16Bit(hl, 1).res;
        this._state.h = res >> 8;
        this._state.l = res & 0xFF;
    }

    private dec_hl() {
        const hl = get_hl(this._state);
        const res = subtract16bit(hl, 1).res;
        this._state.h = res >> 8;
        this._state.l = res & 0xFF;
    }

    private and_val(val: number): boolean {
        this._state.a &= val;
        const zero = this._state.a === 0 ? 1 : 0;
        this.set_flags(zero, 0, 1, 0);
        return true;
    }

    private xor_val(val: number): boolean {
        this._state.a ^= val;
        const zero = this._state.a === 0 ? 1 : 0;
        this.set_flags(zero, 0, 0, 0);
        return true;
    }

    //0x00 : NOP
    private NOP() {
        console.log("nop");
    }

    //0x01 : LD_BC_D16
    private LD_BC_D16(args: Uint8Array) {
        this._state.b = args[1];
        this._state.c = args[0];
    }

    //0x02 : LD_MBC_A
    private LD_MBC_A() {
        const addr = get_bc(this._state);
        this._mmu.write_byte(addr, this._state.a);
    }

    //0x05 : DEC_B
    private DEC_B() {
        const res = subtract8Bit(this._state.b, 1);
        this._state.b = res.res;
        this.set_flags(res.zero, 1, res.halfCarry, undefined);
    }

    //0x06 : LD_B_D8
    private LD_B_D8(args: Uint8Array) {
        this._state.b = args[0];
    }

    //0x0D : DEC_C
    private DEC_C() {
        const res = subtract8Bit(this._state.c, 1);
        this._state.c = res.res;
        this.set_flags(res.zero, 1, res.halfCarry, undefined);
        console.log("C = " + this._state.c + " Is zero = " + this.get_zero());
    }

    //0x0E : LD_C_D8
    private LD_C_D8(args: Uint8Array) {
        this._state.c = args[0];
    }

    //0x11 : LD_DE_D16
    private LD_DE_D16(args: Uint8Array) {
        this._state.d = args[1];
        this._state.e = args[0];
    }

    //0x12 : LD_MDE_A
    private LD_MDE_A() {
        const addr = get_de(this._state);
        this._mmu.write_byte(addr, this._state.a);
    }

    //0x15 : DEC_D
    private DEC_D() {
        const res = subtract8Bit(this._state.d, 1);
        this._state.d = res.res;
        this.set_flags(res.zero, 1, res.halfCarry, undefined);
    }

    //0x16 : LD_D_D8
    private LD_D_D8(args: Uint8Array) {
        this._state.d = args[0];
    }

    //0x1D: DEC_E
    private DEC_E() {
        const res = subtract8Bit(this._state.e, 1);
        this._state.e = res.res;
        this.set_flags(res.zero, 1, res.halfCarry, undefined);
    }

    //0x1E: LD_E_D8
    private LD_E_D8(args: Uint8Array) {
        this._state.e = args[0];
    }

    //0x20 : JR_NZ_R8
    private JR_NZ_R8(args: Uint8Array) {
        const cond = this.nz();
        if(cond) {
            console.log("Zero flag not zero, jumping");
            const e = u8Toi8(args[0]);
            this._pc += e;
        }
    }

    //0x21 : LD_HL_D16
    private LD_HL_D16(args: Uint8Array) {
        this._state.h = args[1];
        this._state.l = args[0];
    }

    //0x22 : LD_MHLI_A
    private LD_MHLI_A() {
        const addr = get_hl(this._state);
        this._mmu.write_byte(addr, this._state.a);
        this.inc_hl();
    }

    //0x25 : DEC_H
    private DEC_H() {
        const res = subtract8Bit(this._state.h, 1);
        this._state.h = res.res;
        this.set_flags(res.zero, 1, res.halfCarry, undefined);
    }

    //0x26 : LD_H_D8
    private LD_H_D8(args: Uint8Array) {
        this._state.h = args[0];
    }

    //0x2D : DEC_L
    private DEC_L() {
        const res = subtract8Bit(this._state.l, 1);
        this._state.l = res.res;
        this.set_flags(res.zero, 1, res.halfCarry, undefined);
    }

    //0x2E : LD_L_D8
    private LD_L_D8(args: Uint8Array) {
        this._state.l = args[0];
        return true;
    }

    //0x31 : LD_SP_D16
    private LD_SP_D16(args: Uint8Array) {
        const val = leTo16Bit(args[0], args[1]);
        this._sp = val;
        return true;
    }

    //0x32 : LD_MHLD_A
    private LD_MHLD_A() {
        const addr = get_hl(this._state);
        this._mmu.write_byte(addr, this._state.a);
        this.dec_hl();
    }

    //0x35 : DEC_MHL
    private DEC_MHL() {
        const hl = get_hl(this._state);
        const res = subtract8Bit(this._mmu.read_byte(hl), 1);
        this._mmu.write_byte(hl, res.res);
        this.set_flags(res.zero, 1, res.halfCarry, undefined);
    }

    //0x36 : LD_MHL_D8
    private LD_MHL_D8(args: Uint8Array) {
        const addr = get_hl(this._state);
        this._mmu.write_byte(addr, args[0]);
    }

    //0x3D : DEC_A
    private DEC_A() {
        const res = subtract8Bit(this._state.a, 1);
        this._state.a = res.res;
        this.set_flags(res.zero, 1, res.halfCarry, undefined);
    }

    //0x3E : LD_A_D8
    private LD_A_D8(args: Uint8Array) {
        this._state.a = args[0];
        return true; 
    }

    //0x40 : LD_B_B
    private LD_B_B() {
        this.ld_b(this._state.b);
    }

    //0x41 : LD_B_C
    private LD_B_C() {
        this.ld_b(this._state.c);
    }

    //0x42 : LD_B_D
    private LD_B_D() {
        this.ld_b(this._state.d);
    }

    //0x43 : LD_B_E
    private LD_B_E() {
        this.ld_b(this._state.e);
    }

    //0x44 : LD_B_H
    private LD_B_H() {
        this.ld_b(this._state.h);
    }

    //0x45 : LD_B_L
    private LD_B_L() {
        this.ld_b(this._state.l);
    }

    //0x46 : LD_B_MHL
    private LD_B_MHL() {
        const addr = get_hl(this._state);
        const val = this._mmu.read_byte(addr);
        this.ld_b(val);
    }

    //0x47 : LD_B_A
    private LD_B_A() {
        this.ld_b(this._state.a);
    }

    //0x48 : LD_C_B
    private LD_C_B() {
        this.ld_c(this._state.b);
    }

    //0x49 : LD_C_C
    private LD_C_C() {
        this.ld_c(this._state.c);
    }

    //0x4A : LD_C_D
    private LD_C_D() {
        this.ld_c(this._state.d);
    }

    //0x4B : LD_C_E
    private LD_C_E() {
        this.ld_c(this._state.e);
    }

    //0x4C : LD_C_H
    private LD_C_H() {
        this.ld_c(this._state.h);
    }

    //0x4D : LD_C_L
    private LD_C_L() {
        this.ld_c(this._state.l);
    }

    //0x4E : LD_C_MHL
    private LD_C_MHL() {
        const addr = get_hl(this._state);
        const val = this._mmu.read_byte(addr);
        this.ld_c(val);
    }

    //0x4F : LD_C_A
    private LD_C_A() {
        this.ld_c(this._state.a);
    }

    //0xA0 : AND_B
    private AND_B(): boolean {
        return this.and_val(this._state.b);
    }

    //0xA1 : AND_C
    private AND_C(): boolean {
        return this.and_val(this._state.c);
    }

    //0xA2 : AND_D
    private AND_D(): boolean {
        return this.and_val(this._state.d);
    }

    //0xA3 : AND_E
    private AND_E(): boolean {
        return this.and_val(this._state.e);
    }

    //0xA4 : AND_H
    private AND_H(): boolean {
        return this.and_val(this._state.h);
    }

    //0xA5 : AND_L
    private AND_L(): boolean {
        return this.and_val(this._state.l);
    }

    //0xA6 : AND_MHL
    private AND_MHL(): boolean {
        const addr = get_hl(this._state);
        const val = this._mmu.read_byte(addr);
        return this.and_val(val);
    }

    //0xA7 : AND_A
    private AND_A(): boolean {
        return this.and_val(this._state.a);
    }

    //0xA8 : XOR_B
    private XOR_B(): boolean {
        return this.xor_val(this._state.b);
    }

    //0xA9 : XOR_C
    private XOR_C(): boolean {
        return this.xor_val(this._state.c);
    }

    //0xAA : XOR_D
    private XOR_D(): boolean {
        return this.xor_val(this._state.d);
    }

    //0xAB : XOR_E
    private XOR_E(): boolean {
        return this.xor_val(this._state.e);
    }

    //0xAC : XOR_H
    private XOR_H(): boolean {
        return this.xor_val(this._state.h);
    }

    //0xAD : XOR_L
    private XOR_L(): boolean {
        return this.xor_val(this._state.l);
    }

    //0xAE : XOR_MHL
    private XOR_MHL(): boolean {
        const addr = get_hl(this._state);
        const val = this._mmu.read_byte(addr);
        return this.xor_val(val);
    }

    //0xAF : XOR_A
    private XOR_A(): boolean {
        return this.xor_val(this._state.a);
    }

    //0xC3 : JP_A16
    private JP_A16(args: Uint8Array): boolean {
        const addr = leTo16Bit(args[0], args[1]);
        console.log("Jumping to: " + addr.toString(16));
        this._pc = addr;
        return true;
    }

    //0xCE : ADC_A_D8
    private ADC_A_D8(args: Uint8Array): boolean {
        console.log("adc a: " + args);
        const res = add8BitC(this._state.a, args[0], this.get_zero());
        this._state.a = res.res;
        this.set_flags(res.zero, 0, res.halfCarry, res.carry);
        return true;
    }

    //0xE0 : LDH_MA8_A
    private LDH_MA8_A(args: Uint8Array): boolean {
        const addr = (0xFF << 8) | args[0];
        console.log("Loading value of A into addr " + addr.toString(16));
        this._mmu.write_byte(addr, this._state.a);
        console.log("Unimplemented");
        return true;
    }

    //0xF0 : LDH_A_MA8
    private LDH_A_MA8(args: Uint8Array): boolean {
        const addr = (0xFF << 8) | args[0];
        const val = this._mmu.read_byte(addr);
        this._state.a = val;
        return true;
    }

    //0xFE : CP_d8
    private CP_D8(args: Uint8Array): boolean {
        const res = subtract8Bit(this._state.a, args[0]);
        this.set_flags(res.zero, 1, res.halfCarry, res.carry);
        return true;
    }

    //0xF3 : DI
    private DI(): boolean {
        console.log("Disable interrupts");
        this._IME = 0;
        return true;
    }

    public get pc() {
        return this._pc;
    }

    public set pc(pc: number) {
        this._pc = pc;
    }

    public get isRunning() {
        return this._isRunning;
    }

    public get mmu() {
        return this._mmu;
    }

    public set isRunning(isRunning: boolean) {
        this._isRunning = isRunning;
    }

    private get_zero(): bit {
        const zeroMask = 1 << FLAGS_ZERO;
        return (this._state.f & zeroMask) !== 0 ? 1 : 0;
    }

    private set_flags(z?: bit, n?: bit, h?: bit, c?: bit) {
        if(z !== undefined) {
            this._state.f ^= (1 << FLAGS_ZERO);
        }
        if(n !== undefined) {
            this._state.f ^= (1 << FLAGS_SUBTRACT);
        }
        if(h !== undefined) {
            this._state.f ^= (1 << FLAGS_HALF_CARRY);
        }
        if(c !== undefined) {
            this._state.f ^= (1 << FLAGS_CARRY);
        }
    }

}

type CPUState = {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
    h: number;
    l: number;
}

interface CPUContext {
    state: CPUState;
    sp: number;
    pc: number;
    isRunning: boolean;
}

function get_af(s: CPUState) : number {
    return s.a << 8 | s.f;
}

function set_af(s: CPUState, val: number) {
    s.a = ((val & 0xFF00) >> 8);
    s.f = ((val & 0xFF));
}

function get_bc(s: CPUState) : number {
    return s.b << 8 | s.c;
}

function set_bc(s: CPUState, val: number) {
    s.b = ((val & 0xFF00) >> 8);
    s.c = ((val & 0xFF));
}

function get_de(s: CPUState) : number {
    return s.d << 8 | s.e;
}

function set_de(s: CPUState, val: number) {
    s.d = ((val & 0xFF00) >> 8);
    s.e = ((val & 0xFF));
}

function get_hl(s: CPUState) : number {
    return s.h << 8 | s.l;
}

function set_hl(s: CPUState, val: number) {
    s.h = ((val & 0xFF00) >> 8);
    s.l = ((val & 0xFF));
}

function leTo16Bit(lsb: number, msb: number): number {
    return (msb << 8) | (lsb);
}

function u8Toi8(val: number): number {
    if(val < 0 || val > 255) {
        console.error("Invalid u8 value");
        return NaN;
    }

    if(val < 128) {
        return val;
    }

    // 128 through 255
    return (val - 256);
}

//Add two 8 bit numbers
function add8Bit(a: number, b: number): {res: number, zero: bit, carry: bit, halfCarry: bit} {
    const res = (a + b) % 0xFF;
    const zero = (res === 0) ? 1 : 0;
    const carry = (((a + b) & 0xFF) !== 0) ? 1 : 0;
    const halfCarry = ((((a & 0xF) + (b & 0xF)) & 0x10) === 0x10) ? 1 : 0;
    return {res, zero, carry, halfCarry};
}

function subtract8Bit(a: number, b: number): {res: number, zero: bit, carry: bit, halfCarry: bit} {
    const res = (a - b) & 0xFF;
    const zero = (res === 0) ? 1 : 0;
    const carry = (((a - b) & 0xFF) !== 0) ? 1 : 0;
    const halfCarry = ((((a & 0xF) - (b & 0xF)) & 0x10) === 0x10) ? 1 : 0;
    return {res, zero, carry, halfCarry};
}

//Add two 8 bit numbers with carry
function add8BitC(a: number, b: number, C: bit): {res: number, zero: bit, carry: bit, halfCarry: bit} {
    const res = (a + b + C) % 0xFF;
    const zero = (res === 0) ? 1 : 0;
    const carry = (((a + b + C) & 0xFF) !== 0) ? 1 : 0;
    const halfCarry = ((((a & 0xF) + (b & 0xF) + (C & 0xF)) & 0x10) === 0x10) ? 1 : 0;
    return {res, zero, carry, halfCarry};
}

function add16Bit(a: number, b: number): {res: number, carry: bit, halfCarry: bit} {
    const res = (a + b) & 0xFFFF;
    const carry = (((a + b) & 0xFFF) !== 0) ? 1 : 0;
    const halfCarry = ((((a & 0xFFF) + (b & 0xFFF)) &0x1000) === 0x1000) ? 1 : 0;
    return {res, carry, halfCarry};
}

function subtract16bit(a: number, b: number): {res: number, carry: bit, halfCarry: bit} {
    const res = (a - b) & 0xFFFF;
    const carry = (((a - b) & 0xFFF) !== 0) ? 1 : 0;
    const halfCarry = ((((a & 0xFFF) - (b & 0xFFF)) &0x1000) === 0x1000) ? 1 : 0;
    return {res, carry, halfCarry};
}

export {CPUContext, type CPUState};