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
        0x0A: {op : this.LD_A_MBC.bind(this), len: 1},
        0x0B: {op : this.DEC_BC.bind(this),   len: 1},
        0x0C: {op : this.INC_C.bind(this),    len: 1},
        0x0D: {op : this.DEC_C.bind(this),    len: 1},
        0x0E: {op : this.LD_C_D8.bind(this),  len: 2},
    
        0x11: {op : this.LD_DE_D16.bind(this),len: 3},
        0x12: {op : this.LD_MDE_A.bind(this), len: 1},
        0x15: {op : this.DEC_D.bind(this),    len: 1},
        0x16: {op : this.LD_D_D8.bind(this),  len: 2},
        0x1A: {op : this.LD_A_MDE.bind(this), len: 1},
        0x1B: {op : this.DEC_DE.bind(this),   len: 1},
        0x1C: {op : this.INC_E.bind(this),    len: 1},
        0x1D: {op : this.DEC_E.bind(this),    len: 1},
        0x1E: {op : this.LD_E_D8.bind(this),  len: 2},
        
        0x20: {op : this.JR_NZ_R8.bind(this), len: 2},
        0x21: {op : this.LD_HL_D16.bind(this),len: 3},
        0x22: {op : this.LD_MHLI_A.bind(this),len: 1},
        0x25: {op : this.DEC_H.bind(this),    len: 1},
        0x26: {op : this.LD_H_D8.bind(this),  len: 2},
        0x2A: {op : this.LD_A_MHLI.bind(this),len: 1},
        0x2B: {op : this.DEC_HL.bind(this),   len: 1},
        0x2C: {op : this.INC_L.bind(this),    len: 1},
        0x2D: {op : this.DEC_L.bind(this),    len: 1},
        0x2E: {op : this.LD_L_D8.bind(this),  len: 2},
    
        0x31: {op : this.LD_SP_D16.bind(this),len: 3},
        0x32: {op : this.LD_MHLD_A.bind(this),len: 1},
        0x35: {op : this.DEC_MHL.bind(this),  len: 1},
        0x36: {op : this.LD_MHL_D8.bind(this),len: 2},
        0x3A: {op : this.LD_A_MHLD.bind(this),len: 1},
        0x3B: {op : this.DEC_SP.bind(this),   len: 1},
        0x3C: {op : this.INC_A.bind(this),    len: 1},
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

        0x70: {op: this.LD_MHL_B.bind(this),  len: 1},
        0x71: {op: this.LD_MHL_C.bind(this),  len: 1},
        0x72: {op: this.LD_MHL_D.bind(this),  len: 1},
        0x73: {op: this.LD_MHL_E.bind(this),  len: 1},
        0x74: {op: this.LD_MHL_H.bind(this),  len: 1},
        0x75: {op: this.LD_MHL_L.bind(this),  len: 1},
        0x76: {op: this.HALT.bind(this),      len: 1},
        0x77: {op: this.LD_MHL_A.bind(this),  len: 1},
        0x78: {op: this.LD_A_B.bind(this),    len: 1},
        0x79: {op: this.LD_A_C.bind(this),    len: 1},
        0x7A: {op: this.LD_A_D.bind(this),    len: 1},
        0x7B: {op: this.LD_A_E.bind(this),    len: 1},
        0x7C: {op: this.LD_A_H.bind(this),    len: 1},
        0x7D: {op: this.LD_A_L.bind(this),    len: 1},
        0x7E: {op: this.LD_A_MHL.bind(this),  len: 1},
        0x7F: {op: this.LD_A_A.bind(this),    len: 1},

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

        0xB0: {op : this.OR_B.bind(this),     len: 1},
        0xB1: {op : this.OR_C.bind(this),     len: 1},
        0xB2: {op : this.OR_D.bind(this),     len: 1},
        0xB3: {op : this.OR_E.bind(this),     len: 1},
        0xB4: {op : this.OR_H.bind(this),     len: 1},
        0xB5: {op : this.OR_L.bind(this),     len: 1},
        0xB6: {op : this.OR_MHL.bind(this),   len: 1},
        0xB7: {op : this.OR_A.bind(this),     len: 1},
        0xB8: {op : this.CP_B.bind(this),     len: 1},
        0xB9: {op : this.CP_C.bind(this),     len: 1},
        0xBA: {op : this.CP_D.bind(this),     len: 1},
        0xBB: {op : this.CP_E.bind(this),     len: 1},
        0xBC: {op : this.CP_H.bind(this),     len: 1},
        0xBD: {op : this.CP_L.bind(this),     len: 1},
        0xBE: {op : this.CP_MHL.bind(this),   len: 1},
        0xBF: {op : this.CP_A.bind(this),     len: 1},

        0xC3: {op : this.JP_A16.bind(this),   len: 3},
        0xCD: {op : this.CALL_A16.bind(this), len: 3},
        0xCE: {op : this.ADC_A_D8.bind(this), len: 2},

        0xE0: {op : this.LDH_MA8_A.bind(this),len: 2},
        0xE2: {op : this.LD_MC_A.bind(this),  len: 1},
        0xEA: {op : this.LD_MA16_A.bind(this),len: 3},

        0xF0: {op : this.LDH_A_MA8.bind(this),len: 2},
        0xF2: {op : this.LD_A_MC.bind(this),  len: 1},
        0xF3: {op : this.DI.bind(this),       len: 1},
        0xFA: {op : this.LD_A_MA16.bind(this),len: 3},
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

    //Returns the number of cycles an operation takes to complete
    execute_instruction(opcode: number, args: Uint8Array): number {
        const op_to_exec = this.instructions[opcode].op;
        return op_to_exec(args);
    }

    //operation logic here

    private nz(): boolean {
        const nz = (this.get_zero() === 0);
        return nz;
    }

    private ld_b(val: number){
        this._state.b = val;
    }

    private ld_c(val: number) {
        this._state.c = val;
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

    private inc_bc() {
        const bc = get_bc(this._state);
        const res = add16Bit(bc, 1).res;
        this._state.b = res >> 8;
        this._state.c = res & 0xFF;
    }

    private dec_bc() {
        const bc = get_bc(this._state);
        const res = subtract16bit(bc, 1).res;
        this._state.b = res >> 8;
        this._state.c = res & 0xFF;
    }

    private inc_de() {
        const de = get_de(this._state);
        const res = add16Bit(de, 1).res;
        this._state.d = res >> 8;
        this._state.e = res & 0xFF;
    }

    private dec_de() {
        const de = get_de(this._state);
        const res = subtract16bit(de, 1).res;
        this._state.d = res >> 8;
        this._state.e = res & 0xFF;
    }

    private inc_sp() {
        const res = add16Bit(this._sp, 1).res;
        this._sp = res;
    }

    private dec_sp() {
        const res = subtract16bit(this._sp, 1).res;
        this._sp = res;
    }

    private and_val(val: number) {
        this._state.a &= val;
        const zero = this._state.a === 0 ? 1 : 0;
        this.set_flags(zero, 0, 1, 0);
    }

    private or_val(val: number) {
        this._state.a |= val;
        const zero = this._state.a === 0 ? 1 : 0;
        this.set_flags(zero, 0, 0, 0);
    }

    private xor_val(val: number) {
        this._state.a ^= val;
        const zero = this._state.a === 0 ? 1 : 0;
        this.set_flags(zero, 0, 0, 0);
    }

    private cp_val(val: number) {
        const res = subtract8Bit(this._state.a, val);
        this.set_flags(res.zero, 1, res.halfCarry, res.carry);
    }

    //0x00 : NOP
    private NOP() {
        //console.log("nop");
        return 4;
    }

    //0x01 : LD_BC_D16
    private LD_BC_D16(args: Uint8Array) {
        this._state.b = args[1];
        this._state.c = args[0];
        return 12;
    }

    //0x02 : LD_MBC_A
    private LD_MBC_A() {
        const addr = get_bc(this._state);
        this._mmu.write_byte(addr, this._state.a);
        return 8;
    }

    //0x05 : DEC_B
    private DEC_B() {
        const res = subtract8Bit(this._state.b, 1);
        this._state.b = res.res;
        this.set_flags(res.zero, 1, res.halfCarry, undefined);
        return 4;
    }

    //0x06 : LD_B_D8
    private LD_B_D8(args: Uint8Array) {
        this._state.b = args[0];
        return 8;
    }

    //0x0A : LD_A_MBC
    private LD_A_MBC() {
        const addr = get_bc(this._state);
        const newVal = this._mmu.read_byte(addr);
        this._state.a = newVal;
        return 8;
    }

    //0x0B : DEC_BC
    private DEC_BC() {
        this.dec_bc();
        return 8;
    }

    //0x0C : INC_C
    private INC_C() {
        const res = add8Bit(this._state.c, 1);
        this._state.c = res.res;
        this.set_flags(res.zero, 0, res.halfCarry, undefined);
        return 4;
    }

    //0x0D : DEC_C
    private DEC_C() {
        const res = subtract8Bit(this._state.c, 1);
        this._state.c = res.res;
        this.set_flags(res.zero, 1, res.halfCarry, undefined);
        return 4;
    }

    //0x0E : LD_C_D8
    private LD_C_D8(args: Uint8Array) {
        this._state.c = args[0];
        return 8;
    }

    //0x11 : LD_DE_D16
    private LD_DE_D16(args: Uint8Array) {
        this._state.d = args[1];
        this._state.e = args[0];
        return 12;
    }

    //0x12 : LD_MDE_A
    private LD_MDE_A() {
        const addr = get_de(this._state);
        this._mmu.write_byte(addr, this._state.a);
        return 8;
    }

    //0x15 : DEC_D
    private DEC_D() {
        const res = subtract8Bit(this._state.d, 1);
        this._state.d = res.res;
        this.set_flags(res.zero, 1, res.halfCarry, undefined);
        return 4;
    }

    //0x16 : LD_D_D8
    private LD_D_D8(args: Uint8Array) {
        this._state.d = args[0];
        return 8;
    }

    //0x1A : LD_A_MDE
    private LD_A_MDE() {
        const addr = get_de(this._state);
        const newVal = this._mmu.read_byte(addr);
        this._state.a = newVal;
        return 8;
    }

    //0x1B : DEC_DE
    private DEC_DE() {
        this.dec_de();
        return 8;
    }

    //0x1C : INC_E
    private INC_E() {
        const res = add8Bit(this._state.e, 1);
        this._state.e = res.res;
        this.set_flags(res.zero, 0, res.halfCarry, undefined);
        return 4;
    }

    //0x1D: DEC_E
    private DEC_E() {
        const res = subtract8Bit(this._state.e, 1);
        this._state.e = res.res;
        this.set_flags(res.zero, 1, res.halfCarry, undefined);
        return 4;
    }

    //0x1E: LD_E_D8
    private LD_E_D8(args: Uint8Array) {
        this._state.e = args[0];
        return 8;
    }

    //0x20 : JR_NZ_R8
    private JR_NZ_R8(args: Uint8Array) {
        const cond = this.nz();
        if(cond) {
            const e = u8Toi8(args[0]);
            this._pc += e;
            return 12;
        }
        return 8;
    }

    //0x21 : LD_HL_D16
    private LD_HL_D16(args: Uint8Array) {
        this._state.h = args[1];
        this._state.l = args[0];
        return 12;
    }

    //0x22 : LD_MHLI_A
    private LD_MHLI_A() {
        const addr = get_hl(this._state);
        this._mmu.write_byte(addr, this._state.a);
        this.inc_hl();
        return 8;
    }

    //0x25 : DEC_H
    private DEC_H() {
        const res = subtract8Bit(this._state.h, 1);
        this._state.h = res.res;
        this.set_flags(res.zero, 1, res.halfCarry, undefined);
        return 4;
    }

    //0x26 : LD_H_D8
    private LD_H_D8(args: Uint8Array) {
        this._state.h = args[0];
        return 8;
    }

    //0x2A : LD_A_MHLI
    private LD_A_MHLI() {
        const addr = get_hl(this._state);
        const val = this._mmu.read_byte(addr);
        this._state.a = val;
        this.inc_hl();
        return 8;
    }

    //0x2B : DEC_HL
    private DEC_HL() {
        this.dec_hl();
        return 8;
    }

    //0x2C : INC_L
    private INC_L() {
        const res = add8Bit(this._state.l, 1);
        this._state.l = res.res;
        this.set_flags(res.zero, 0, res.halfCarry, undefined);
        return 4;
    }

    //0x2D : DEC_L
    private DEC_L() {
        const res = subtract8Bit(this._state.l, 1);
        this._state.l = res.res;
        this.set_flags(res.zero, 1, res.halfCarry, undefined);
        return 4;
    }

    //0x2E : LD_L_D8
    private LD_L_D8(args: Uint8Array) {
        this._state.l = args[0];
        return 8;
    }

    //0x31 : LD_SP_D16
    private LD_SP_D16(args: Uint8Array) {
        const val = leTo16Bit(args[0], args[1]);
        this._sp = val;
        return 12;
    }

    //0x32 : LD_MHLD_A
    private LD_MHLD_A() {
        const addr = get_hl(this._state);
        this._mmu.write_byte(addr, this._state.a);
        this.dec_hl();
        return 8;
    }

    //0x35 : DEC_MHL
    private DEC_MHL() {
        const hl = get_hl(this._state);
        const res = subtract8Bit(this._mmu.read_byte(hl), 1);
        this._mmu.write_byte(hl, res.res);
        this.set_flags(res.zero, 1, res.halfCarry, undefined);
        return 12;
    }

    //0x36 : LD_MHL_D8
    private LD_MHL_D8(args: Uint8Array) {
        const addr = get_hl(this._state);
        this._mmu.write_byte(addr, args[0]);
        return 12;
    }

    //0x3A : LD_A_MHLD
    private LD_A_MHLD() {
        const addr = get_hl(this._state);
        const val = this._mmu.read_byte(addr);
        this._state.a = val;
        this.dec_hl();
        return 8;
    }

    //0x3B : DEC_SP
    private DEC_SP() {
        this.dec_sp();
        return 8;
    }

    //0x3C : INC_A
    private INC_A() {
        const res = add8Bit(this._state.a, 1);
        this._state.a = res.res;
        this.set_flags(res.zero, 0, res.halfCarry, undefined);
        return 4;
    }

    //0x3D : DEC_A
    private DEC_A() {
        const res = subtract8Bit(this._state.a, 1);
        this._state.a = res.res;
        this.set_flags(res.zero, 1, res.halfCarry, undefined);
        return 4;
    }

    //0x3E : LD_A_D8
    private LD_A_D8(args: Uint8Array) {
        this._state.a = args[0];
        return 8;
    }

    //0x40 : LD_B_B
    private LD_B_B() {
        this.ld_b(this._state.b);
        return 4;
    }

    //0x41 : LD_B_C
    private LD_B_C() {
        this.ld_b(this._state.c);
        return 4;
    }

    //0x42 : LD_B_D
    private LD_B_D() {
        this.ld_b(this._state.d);
        return 4;
    }

    //0x43 : LD_B_E
    private LD_B_E() {
        this.ld_b(this._state.e);
        return 4;
    }

    //0x44 : LD_B_H
    private LD_B_H() {
        this.ld_b(this._state.h);
        return 4;
    }

    //0x45 : LD_B_L
    private LD_B_L() {
        this.ld_b(this._state.l);
        return 4;
    }

    //0x46 : LD_B_MHL
    private LD_B_MHL() {
        const addr = get_hl(this._state);
        const val = this._mmu.read_byte(addr);
        this.ld_b(val);
        return 8;
    }

    //0x47 : LD_B_A
    private LD_B_A() {
        this.ld_b(this._state.a);
        return 4;
    }

    //0x48 : LD_C_B
    private LD_C_B() {
        this.ld_c(this._state.b);
        return 4;
    }

    //0x49 : LD_C_C
    private LD_C_C() {
        this.ld_c(this._state.c);
        return 4;
    }

    //0x4A : LD_C_D
    private LD_C_D() {
        this.ld_c(this._state.d);
        return 4;
    }

    //0x4B : LD_C_E
    private LD_C_E() {
        this.ld_c(this._state.e);
        return 4;
    }

    //0x4C : LD_C_H
    private LD_C_H() {
        this.ld_c(this._state.h);
        return 4;
    }

    //0x4D : LD_C_L
    private LD_C_L() {
        this.ld_c(this._state.l);
        return 4;
    }

    //0x4E : LD_C_MHL
    private LD_C_MHL() {
        const addr = get_hl(this._state);
        const val = this._mmu.read_byte(addr);
        this.ld_c(val);
        return 8;
    }

    //0x4F : LD_C_A
    private LD_C_A() {
        this.ld_c(this._state.a);
        return 4;
    }

    //0x70 : LD_MHL_B
    private LD_MHL_B() {
        const addr = get_hl(this._state);
        this._mmu.write_byte(addr, this._state.b);
        return 8;
    }

    //0x71 : LD_MHL_C
    private LD_MHL_C() {
        const addr = get_hl(this._state);
        this._mmu.write_byte(addr, this._state.c);
        return 8;
    }

    //0x72 : LD_MHL_D
    private LD_MHL_D() {
        const addr = get_hl(this._state);
        this._mmu.write_byte(addr, this._state.d);
        return 8;
    }

    //0x73 : LD_MHL_E
    private LD_MHL_E() {
        const addr = get_hl(this._state);
        this._mmu.write_byte(addr, this._state.e);
        return 8;
    }

    //0x74 : LD_MHL_H
    private LD_MHL_H() {
        const addr = get_hl(this._state);
        this._mmu.write_byte(addr, this._state.h);
        return 8;
    }

    //0x75 : LD_MHL_L
    private LD_MHL_L() {
        const addr = get_hl(this._state);
        this._mmu.write_byte(addr, this._state.l);
        return 8;
    }

    //0x76 : HALT
    private HALT() {
        console.error("HALT, need to implement");
        return 4;
    }

    //0x77 : LD_MHL_A
    private LD_MHL_A() {
        const addr = get_hl(this._state);
        this._mmu.write_byte(addr, this._state.a);
        return 8;
    }

    //0x78 : LD_A_B
    private LD_A_B() {
        this._state.a = this._state.b;
        return 4;
    }

    //0x79 : LD_A_C
    private LD_A_C() {
        this._state.a = this._state.c;
        return 4;
    }

    //0x7A : LD_A_D
    private LD_A_D() {
        this._state.a = this._state.d;
        return 4;
    }

    //0x7B : LD_A_E
    private LD_A_E() {
        this._state.a = this._state.e;
        return 4;
    }

    //0x7C : LD_A_H
    private LD_A_H() {
        this._state.a = this._state.h;
        return 4;
    }

    //0x7D LD_A_L
    private LD_A_L() {
        this._state.a = this._state.l;
        return 4;
    }

    //0x7E : LD_A_MHL
    private LD_A_MHL() {
        const addr = get_hl(this._state);
        const val = this._mmu.read_byte(addr);
        this._state.a = val;
        return 8;
    }

    //0x7F : LD_A_A
    private LD_A_A() {
        this._state.a = this._state.a;
        return 4;
    }

    //0xA0 : AND_B
    private AND_B() {
        this.and_val(this._state.b);
        return 4;
    }

    //0xA1 : AND_C
    private AND_C() {
        this.and_val(this._state.c);
        return 4;
    }

    //0xA2 : AND_D
    private AND_D() {
        this.and_val(this._state.d);
        return 4;
    }

    //0xA3 : AND_E
    private AND_E() {
        this.and_val(this._state.e);
        return 4;
    }

    //0xA4 : AND_H
    private AND_H() {
        this.and_val(this._state.h);
        return 4;
    }

    //0xA5 : AND_L
    private AND_L() {
        this.and_val(this._state.l);
        return 4;
    }

    //0xA6 : AND_MHL
    private AND_MHL() {
        const addr = get_hl(this._state);
        const val = this._mmu.read_byte(addr);
        this.and_val(val);
        return 8;
    }

    //0xA7 : AND_A
    private AND_A() {
        this.and_val(this._state.a);
        return 4;
    }

    //0xA8 : XOR_B
    private XOR_B() {
        this.xor_val(this._state.b);
        return 4;
    }

    //0xA9 : XOR_C
    private XOR_C() {
        this.xor_val(this._state.c);
        return 4;
    }

    //0xAA : XOR_D
    private XOR_D() {
        this.xor_val(this._state.d);
        return 4;
    }

    //0xAB : XOR_E
    private XOR_E() {
        this.xor_val(this._state.e);
        return 4;
    }

    //0xAC : XOR_H
    private XOR_H() {
        this.xor_val(this._state.h);
        return 4;
    }

    //0xAD : XOR_L
    private XOR_L() {
        this.xor_val(this._state.l);
        return 4;
    }

    //0xAE : XOR_MHL
    private XOR_MHL() {
        const addr = get_hl(this._state);
        const val = this._mmu.read_byte(addr);
        this.xor_val(val);
        return 8;
    }

    //0xAF : XOR_A
    private XOR_A() {
        this.xor_val(this._state.a);
        return 4;
    }

    //0xB0 : OR_B
    private OR_B() {
        this.or_val(this._state.b);
        return 4;
    }

    //0xB1 : OR_C
    private OR_C() {
        this.or_val(this._state.c);
        return 4;
    }

    //0xB2 : OR_D
    private OR_D() {
        this.or_val(this._state.d);
        return 4;
    }

    //0xB3 : OR_E
    private OR_E() {
        this.or_val(this._state.e);
        return 4;
    }

    //0xB4 : OR_H
    private OR_H() {
        this.or_val(this._state.h);
        return 4;
    }

    //0xB5 : OR_L
    private OR_L() {
        this.or_val(this._state.l);
        return 4;
    }

    //0xB6 : OR_MHL
    private OR_MHL() {
        const addr = get_hl(this._state);
        const val = this._mmu.read_byte(addr);
        this.or_val(val);
        return 8;
    }

    //0xB7 : OR_A
    private OR_A() {
        this.or_val(this._state.a);
        return 4;
    }

    //0xB8 : CP_B
    private CP_B() {
        this.cp_val(this._state.b);
        return 4;
    }

    //0xB9 : CP_C
    private CP_C() {
        this.cp_val(this._state.c);
        return 4;
    }

    //0xBA : CP_D
    private CP_D() {
        this.cp_val(this._state.d);
        return 4;
    }

    //0xBB : CP_E
    private CP_E() {
        this.cp_val(this._state.e);
        return 4;
    }

    //0xBC : CP_H
    private CP_H() {
        this.cp_val(this._state.h);
        return 4;
    }

    //0xBD : CP_L
    private CP_L() {
        this.cp_val(this._state.l);
        return 4;
    }

    //0xBE : CP_MHL
    private CP_MHL() {
        const addr = get_hl(this._state);
        const val = this._mmu.read_byte(addr);
        this.cp_val(val);
        return 8;
    }

    //0xBF : CP_A
    private CP_A() {
        this.cp_val(this._state.a);
        return 4;
    }

    //0xC3 : JP_A16
    private JP_A16(args: Uint8Array) {
        const addr = leTo16Bit(args[0], args[1]);
        //console.log("Jumping to: " + addr.toString(16));
        this._pc = addr;
        return 16;
    }

    //0xCD : CALL_A16
    private CALL_A16(args: Uint8Array) {
        const addr = leTo16Bit(args[0], args[1]);
        console.log("New pc = " + addr.toString(16));
        this.sp--;
        //Write msb to stack
        this._mmu.write_byte(this.sp, args[1]);
        this.sp--;
        //Write lsb to stack
        this._mmu.write_byte(this.sp, args[0]);
        this.pc = addr;
        return 24;
    }

    //0xCE : ADC_A_D8
    private ADC_A_D8(args: Uint8Array) {
        //console.log("adc a: " + args);
        const res = add8BitC(this._state.a, args[0], this.get_zero());
        this._state.a = res.res;
        this.set_flags(res.zero, 0, res.halfCarry, res.carry);
        return 8;
    }

    //0xE0 : LDH_MA8_A
    private LDH_MA8_A(args: Uint8Array) {
        const addr = (0xFF << 8) | args[0];
        //console.log("Loading value of A into addr " + addr.toString(16));
        this._mmu.write_byte(addr, this._state.a);  
        //console.log("Unimplemented");
        return 12;
    }

    //0xE2 : LD_MC_A
    private LD_MC_A() {
        const addr = (0xFF << 8) | this._state.c;
        this.mmu.write_byte(addr, this._state.a);
        return 8;
    }

    //0xEA : LD_MA16_A
    private LD_MA16_A(args: Uint8Array) {
        const addr = leTo16Bit(args[0], args[1]);
        this._mmu.write_byte(addr, this._state.a);
        return 16;
    }

    //0xF0 : LDH_A_MA8
    private LDH_A_MA8(args: Uint8Array) {
        const addr = (0xFF << 8) | args[0];
        const val = this._mmu.read_byte(addr);
        this._state.a = val;
        return 12;
    }

    //0xF2 : LD_A_MC
    private LD_A_MC() {
        const addr = (0xFF << 8) | this._state.c;
        this._state.a = this._mmu.read_byte(addr);
        return 8;
    }

    //0xF3 : DI
    private DI() {
        //console.log("Disable interrupts");
        this._IME = 0;
        return 4;
    }

    //0xFA : LD_A_MA16
    private LD_A_MA16(args: Uint8Array) {
        const addr = leTo16Bit(args[0], args[1]);
        const val = this._mmu.read_byte(addr);
        this._state.a = val;
        return 8;
    }

    //0xFE : CP_d8
    private CP_D8(args: Uint8Array) {
        this.cp_val(args[0]);
        return 8;
    }

    public get pc() {
        return this._pc;
    }

    public get state() {
        return this._state;
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
        //console.log(`Set flags z=${z} n=${n} h=${h} c=${c}`);
        if(z !== undefined) {
            this.set_flag(z, FLAGS_ZERO);
        }
        if(n !== undefined) {
            this.set_flag(n, FLAGS_SUBTRACT);
        }
        if(h !== undefined) {
            this.set_flag(h, FLAGS_HALF_CARRY);
        }
        if(c !== undefined) {
            this.set_flag(c, FLAGS_CARRY);
        }
        //console.log("After setting: " + this._state.f.toString(2));
    }

    //Set a flag for a given bit position
    private set_flag(val: bit, pos: number) {
        const mask = 1 << pos;
        const is_set = (this._state.f & mask) === mask;

        if(is_set && val !== 1 || !is_set && val !== 0) {
            this._state.f ^= (1 << pos);
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