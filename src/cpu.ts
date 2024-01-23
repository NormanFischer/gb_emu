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
    private _interrupt_enable_pending: boolean;
    private _IME: boolean;
    private _isHalted: boolean;

    private updateDevices: Function;

    //Lookup table for all instructions
    instructions: { [key: number]: Instruction } = {
        0x00: {op: this.NOP.bind(this),      len: 1},
        0x01: {op: this.LD_BC_D16.bind(this),len: 3},
        0x02: {op: this.LD_MBC_A.bind(this), len: 1},
        0x03: {op: this.INC_BC.bind(this),   len: 1},
        0x04: {op: this.INC_B.bind(this),    len: 1},
        0x05: {op: this.DEC_B.bind(this),    len: 1},
        0x06: {op: this.LD_B_D8.bind(this),  len: 2},
        0x07: {op: this.RLCA.bind(this),     len: 1},
        0x08: {op: this.LD_MA16_SP.bind(this), len: 3},
        0x09: {op: this.ADD_HL_BC.bind(this),len: 1},
        0x0A: {op: this.LD_A_MBC.bind(this), len: 1},
        0x0B: {op: this.DEC_BC.bind(this),   len: 1},
        0x0C: {op: this.INC_C.bind(this),    len: 1},
        0x0D: {op: this.DEC_C.bind(this),    len: 1},
        0x0E: {op: this.LD_C_D8.bind(this),  len: 2},
        0x0F: {op: this.RRCA.bind(this),     len: 1},
    
        0x11: {op: this.LD_DE_D16.bind(this),len: 3},
        0x12: {op: this.LD_MDE_A.bind(this), len: 1},
        0x13: {op: this.INC_DE.bind(this),   len: 1},
        0x14: {op: this.INC_D.bind(this),    len: 1},
        0x15: {op: this.DEC_D.bind(this),    len: 1},
        0x16: {op: this.LD_D_D8.bind(this),  len: 2},
        0x17: {op: this.RLA.bind(this),      len: 1},
        0x18: {op: this.JR_R8.bind(this),    len: 2},
        0x19: {op: this.ADD_HL_DE.bind(this),len: 1},
        0x1A: {op: this.LD_A_MDE.bind(this), len: 1},
        0x1B: {op: this.DEC_DE.bind(this),   len: 1},
        0x1C: {op: this.INC_E.bind(this),    len: 1},
        0x1D: {op: this.DEC_E.bind(this),    len: 1},
        0x1E: {op: this.LD_E_D8.bind(this),  len: 2},
        0x1F: {op: this.RRA.bind(this),      len: 1},
        
        0x20: {op: this.JR_NZ_R8.bind(this), len: 2},
        0x21: {op: this.LD_HL_D16.bind(this),len: 3},
        0x22: {op: this.LD_MHLI_A.bind(this),len: 1},
        0x23: {op: this.INC_HL.bind(this),   len: 1},
        0x24: {op: this.INC_H.bind(this),    len: 1},
        0x25: {op: this.DEC_H.bind(this),    len: 1},
        0x26: {op: this.LD_H_D8.bind(this),  len: 2},
        0x27: {op: this.DAA.bind(this),      len: 1},
        0x28: {op: this.JR_Z_R8.bind(this),  len: 2},
        0x29: {op: this.ADD_HL_HL.bind(this),len: 1},
        0x2A: {op: this.LD_A_MHLI.bind(this),len: 1},
        0x2B: {op: this.DEC_HL.bind(this),   len: 1},
        0x2C: {op: this.INC_L.bind(this),    len: 1},
        0x2D: {op: this.DEC_L.bind(this),    len: 1},
        0x2E: {op: this.LD_L_D8.bind(this),  len: 2},
        0x2F: {op: this.CPL.bind(this),      len: 1},
    
        0x30: {op: this.JR_NC_R8.bind(this), len: 2},
        0x31: {op: this.LD_SP_D16.bind(this),len: 3},
        0x32: {op: this.LD_MHLD_A.bind(this),len: 1},
        0x33: {op: this.INC_SP.bind(this),   len: 1},
        0x34: {op: this.INC_MHL.bind(this),  len: 1},
        0x35: {op: this.DEC_MHL.bind(this),  len: 1},
        0x36: {op: this.LD_MHL_D8.bind(this),len: 2},
        0x37: {op: this.SCF.bind(this),      len: 1},
        0x38: {op: this.JR_C_R8.bind(this),  len: 2},
        0x39: {op: this.ADD_HL_SP.bind(this),len: 1},
        0x3A: {op: this.LD_A_MHLD.bind(this),len: 1},
        0x3B: {op: this.DEC_SP.bind(this),   len: 1},
        0x3C: {op: this.INC_A.bind(this),    len: 1},
        0x3D: {op: this.DEC_A.bind(this),    len: 1},
        0x3E: {op: this.LD_A_D8.bind(this),  len: 2},
        0x3F: {op: this.CCF.bind(this),      len: 1},

        0x40: {op: this.LD_B_B.bind(this),   len: 1},
        0x41: {op: this.LD_B_C.bind(this),   len: 1},
        0x42: {op: this.LD_B_D.bind(this),   len: 1},
        0x43: {op: this.LD_B_E.bind(this),   len: 1},
        0x44: {op: this.LD_B_H.bind(this),   len: 1},
        0x45: {op: this.LD_B_L.bind(this),   len: 1},
        0x46: {op: this.LD_B_MHL.bind(this), len: 1},
        0x47: {op: this.LD_B_A.bind(this),   len: 1},
        0x48: {op: this.LD_C_B.bind(this),   len: 1},
        0x49: {op: this.LD_C_C.bind(this),   len: 1},
        0x4A: {op: this.LD_C_D.bind(this),   len: 1},
        0x4B: {op: this.LD_C_E.bind(this),   len: 1},
        0x4C: {op: this.LD_C_H.bind(this),   len: 1},
        0x4D: {op: this.LD_C_L.bind(this),   len: 1},
        0x4E: {op: this.LD_C_MHL.bind(this), len: 1},
        0x4F: {op: this.LD_C_A.bind(this),   len: 1},

        0x50: {op: this.LD_D_B.bind(this),   len: 1},
        0x51: {op: this.LD_D_C.bind(this),   len: 1},
        0x52: {op: this.LD_D_D.bind(this),   len: 1},
        0x53: {op: this.LD_D_E.bind(this),   len: 1},
        0x54: {op: this.LD_D_H.bind(this),   len: 1},
        0x55: {op: this.LD_D_L.bind(this),   len: 1},
        0x56: {op: this.LD_D_MHL.bind(this), len: 1},
        0x57: {op: this.LD_D_A.bind(this),   len: 1},
        0x58: {op: this.LD_E_B.bind(this),   len: 1},
        0x59: {op: this.LD_E_C.bind(this),   len: 1},
        0x5A: {op: this.LD_E_D.bind(this),   len: 1},
        0x5B: {op: this.LD_E_E.bind(this),   len: 1},
        0x5C: {op: this.LD_E_H.bind(this),   len: 1},
        0x5D: {op: this.LD_E_L.bind(this),   len: 1},
        0x5E: {op: this.LD_E_MHL.bind(this), len: 1},
        0x5F: {op: this.LD_E_A.bind(this),   len: 1},

        0x60: {op: this.LD_H_B.bind(this),   len: 1},
        0x61: {op: this.LD_H_C.bind(this),   len: 1},
        0x62: {op: this.LD_H_D.bind(this),   len: 1},
        0x63: {op: this.LD_H_E.bind(this),   len: 1},
        0x64: {op: this.LD_H_H.bind(this),   len: 1},
        0x65: {op: this.LD_H_L.bind(this),   len: 1},
        0x66: {op: this.LD_H_MHL.bind(this), len: 1},
        0x67: {op: this.LD_H_A.bind(this),   len: 1},
        0x68: {op: this.LD_L_B.bind(this),   len: 1},
        0x69: {op: this.LD_L_C.bind(this),   len: 1},
        0x6A: {op: this.LD_L_D.bind(this),   len: 1},
        0x6B: {op: this.LD_L_E.bind(this),   len: 1},
        0x6C: {op: this.LD_L_H.bind(this),   len: 1},
        0x6D: {op: this.LD_L_L.bind(this),   len: 1},
        0x6E: {op: this.LD_L_MHL.bind(this), len: 1},
        0x6F: {op: this.LD_L_A.bind(this),   len: 1},

        0x70: {op: this.LD_MHL_B.bind(this), len: 1},
        0x71: {op: this.LD_MHL_C.bind(this), len: 1},
        0x72: {op: this.LD_MHL_D.bind(this), len: 1},
        0x73: {op: this.LD_MHL_E.bind(this), len: 1},
        0x74: {op: this.LD_MHL_H.bind(this), len: 1},
        0x75: {op: this.LD_MHL_L.bind(this), len: 1},
        0x76: {op: this.HALT.bind(this),     len: 1},
        0x77: {op: this.LD_MHL_A.bind(this), len: 1},
        0x78: {op: this.LD_A_B.bind(this),   len: 1},
        0x79: {op: this.LD_A_C.bind(this),   len: 1},
        0x7A: {op: this.LD_A_D.bind(this),   len: 1},
        0x7B: {op: this.LD_A_E.bind(this),   len: 1},
        0x7C: {op: this.LD_A_H.bind(this),   len: 1},
        0x7D: {op: this.LD_A_L.bind(this),   len: 1},
        0x7E: {op: this.LD_A_MHL.bind(this), len: 1},
        0x7F: {op: this.LD_A_A.bind(this),   len: 1},

        0x80: {op: this.ADD_A_B.bind(this),  len: 1},
        0x81: {op: this.ADD_A_C.bind(this),  len: 1},
        0x82: {op: this.ADD_A_D.bind(this),  len: 1},
        0x83: {op: this.ADD_A_E.bind(this),  len: 1},
        0x84: {op: this.ADD_A_H.bind(this),  len: 1},
        0x85: {op: this.ADD_A_L.bind(this),  len: 1},
        0x86: {op: this.ADD_A_MHL.bind(this),len: 1},
        0x87: {op: this.ADD_A_A.bind(this),  len: 1},
        0x88: {op: this.ADC_A_B.bind(this),  len: 1},
        0x89: {op: this.ADC_A_C.bind(this),  len: 1},
        0x8A: {op: this.ADC_A_D.bind(this),  len: 1},
        0x8B: {op: this.ADC_A_E.bind(this),  len: 1},
        0x8C: {op: this.ADC_A_H.bind(this),  len: 1},
        0x8D: {op: this.ADC_A_L.bind(this),  len: 1},
        0x8E: {op: this.ADC_A_MHL.bind(this),  len: 1},
        0x8F: {op: this.ADC_A_A.bind(this),  len: 1},

        0x90: {op: this.SUB_B.bind(this),    len: 1},
        0x91: {op: this.SUB_C.bind(this),    len: 1},
        0x92: {op: this.SUB_D.bind(this),    len: 1},
        0x93: {op: this.SUB_E.bind(this),    len: 1},
        0x94: {op: this.SUB_H.bind(this),    len: 1},
        0x95: {op: this.SUB_L.bind(this),    len: 1},
        0x96: {op: this.SUB_MHL.bind(this),    len: 1},
        0x97: {op: this.SUB_A.bind(this),    len: 1},
        0x98: {op: this.SBC_A_B.bind(this),    len: 1},
        0x99: {op: this.SBC_A_C.bind(this),    len: 1},
        0x9A: {op: this.SBC_A_D.bind(this),    len: 1},
        0x9B: {op: this.SBC_A_E.bind(this),    len: 1},
        0x9C: {op: this.SBC_A_H.bind(this),    len: 1},
        0x9D: {op: this.SBC_A_L.bind(this),    len: 1},
        0x9E: {op: this.SBC_A_MHL.bind(this),    len: 1},
        0x9F: {op: this.SBC_A_A.bind(this),    len: 1},

        0xA0: {op: this.AND_B.bind(this),    len: 1},
        0xA1: {op: this.AND_C.bind(this),    len: 1},
        0xA2: {op: this.AND_D.bind(this),    len: 1},
        0xA3: {op: this.AND_E.bind(this),    len: 1},
        0xA4: {op: this.AND_H.bind(this),    len: 1},
        0xA5: {op: this.AND_L.bind(this),    len: 1},
        0xA6: {op: this.AND_MHL.bind(this),  len: 1},
        0xA7: {op: this.AND_A.bind(this),    len: 1},
        0xA8: {op: this.XOR_B.bind(this),    len: 1},
        0xA9: {op: this.XOR_C.bind(this),    len: 1},
        0xAA: {op: this.XOR_D.bind(this),    len: 1},
        0xAB: {op: this.XOR_E.bind(this),    len: 1},
        0xAC: {op: this.XOR_H.bind(this),    len: 1},
        0xAD: {op: this.XOR_L.bind(this),    len: 1},
        0xAE: {op: this.XOR_MHL.bind(this),  len: 1},
        0xAF: {op: this.XOR_A.bind(this),    len: 1},

        0xB0: {op: this.OR_B.bind(this),     len: 1},
        0xB1: {op: this.OR_C.bind(this),     len: 1},
        0xB2: {op: this.OR_D.bind(this),     len: 1},
        0xB3: {op: this.OR_E.bind(this),     len: 1},
        0xB4: {op: this.OR_H.bind(this),     len: 1},
        0xB5: {op: this.OR_L.bind(this),     len: 1},
        0xB6: {op: this.OR_MHL.bind(this),   len: 1},
        0xB7: {op: this.OR_A.bind(this),     len: 1},
        0xB8: {op: this.CP_B.bind(this),     len: 1},
        0xB9: {op: this.CP_C.bind(this),     len: 1},
        0xBA: {op: this.CP_D.bind(this),     len: 1},
        0xBB: {op: this.CP_E.bind(this),     len: 1},
        0xBC: {op: this.CP_H.bind(this),     len: 1},
        0xBD: {op: this.CP_L.bind(this),     len: 1},
        0xBE: {op: this.CP_MHL.bind(this),   len: 1},
        0xBF: {op: this.CP_A.bind(this),     len: 1},

        0xC0: {op: this.RET_NZ.bind(this),   len: 1},
        0xC1: {op: this.POP_BC.bind(this),   len: 1},
        0xC2: {op: this.JP_NZ_A16.bind(this),len: 3},
        0xC3: {op: this.JP_A16.bind(this),   len: 3},
        0xC4: {op: this.CALL_NZ_A16.bind(this), len: 3},
        0xC5: {op: this.PUSH_BC.bind(this),  len: 1},
        0xC6: {op: this.ADD_A_D8.bind(this), len: 2},
        0xC7: {op: this.RST_00H.bind(this),  len: 1},
        0xC8: {op: this.RET_Z.bind(this),    len: 1},
        0xC9: {op: this.RET.bind(this),      len: 1},
        0xCA: {op: this.JP_Z_A16.bind(this), len: 3},
        0xCB: {op: this.CB.bind(this),       len: 2},
        0xCC: {op: this.CALL_Z_A16.bind(this),len: 3},
        0xCD: {op: this.CALL_A16.bind(this), len: 3},
        0xCE: {op: this.ADC_A_D8.bind(this), len: 2},
        0xCF: {op: this.RST_08H.bind(this),  len: 1},

        0xD0: {op: this.RET_NC.bind(this),   len: 1},
        0xD1: {op: this.POP_DE.bind(this),   len: 1},
        0xD2: {op: this.JP_NC_A16.bind(this),len: 3},
        0xD4: {op: this.CALL_NC_A16.bind(this),len: 3},
        0xD5: {op: this.PUSH_DE.bind(this),  len: 1},
        0xD6: {op: this.SUB_D8.bind(this),   len: 2},
        0xD7: {op: this.RST_10H.bind(this),  len: 1},
        0xD8: {op: this.RET_C.bind(this),    len: 1},
        0xD9: {op: this.RETI.bind(this),     len: 1},
        0xDA: {op: this.JP_C_A16.bind(this), len: 3},
        0xDC: {op: this.CALL_C_A16.bind(this),len: 3},
        0xDE: {op: this.SBC_A_D8.bind(this), len: 2},
        0xDF: {op: this.RST_18H.bind(this),  len: 1},

        0xE0: {op: this.LDH_MA8_A.bind(this),len: 2},
        0xE1: {op: this.POP_HL.bind(this),   len: 1},
        0xE2: {op: this.LD_MC_A.bind(this),  len: 1},
        0xE5: {op: this.PUSH_HL.bind(this),  len: 1},
        0xE6: {op: this.AND_D8.bind(this),   len: 2},
        0xE7: {op: this.RST_20H.bind(this),  len: 1},
        0xE8: {op: this.ADD_SP_R8.bind(this),len: 2},
        0xE9: {op: this.JP_MHL.bind(this),   len: 1},
        0xEA: {op: this.LD_MA16_A.bind(this),len: 3},
        0xEE: {op: this.XOR_D8.bind(this),   len: 2},
        0xEF: {op: this.RST_28H.bind(this),  len: 1},

        0xF0: {op: this.LDH_A_MA8.bind(this),len: 2},
        0xF1: {op: this.POP_AF.bind(this),   len: 1},
        0xF2: {op: this.LD_A_MC.bind(this),  len: 1},
        0xF3: {op: this.DI.bind(this),       len: 1},
        0xF5: {op: this.PUSH_AF.bind(this),  len: 1},
        0xF6: {op: this.OR_D8.bind(this),    len: 2},
        0xF7: {op: this.RST_30H.bind(this),  len: 1},
        0xF8: {op: this.LD_HL_SPR8.bind(this),len: 2},
        0xF9: {op: this.LD_SP_HL.bind(this), len: 1},
        0xFA: {op: this.LD_A_MA16.bind(this),len: 3},
        0xFB: {op: this.EI.bind(this),       len: 1},
        0xFE: {op: this.CP_D8.bind(this),    len: 2},
        0xFF: {op: this.RST_38H.bind(this),  len: 1},
    };


    //Lookup table for all cb instructions
    cb: { [key : number] : () => number } = {
        //RLC
        0x00: () => { this._state.b = this.cb_rlc(this._state.b); return 8; },
        0x01: () => { this._state.c = this.cb_rlc(this._state.c); return 8; },
        0x02: () => { this._state.d = this.cb_rlc(this._state.d); return 8; },
        0x03: () => { this._state.e = this.cb_rlc(this._state.e); return 8; },
        0x04: () => { this._state.h = this.cb_rlc(this._state.h); return 8; },
        0x05: () => { this._state.l = this.cb_rlc(this._state.l); return 8; },
        0x06: () => { const addr = get_hl(this._state); const rlc = this.cb_rlc(this._mmu.read_byte(addr)); this.updateDevices(); this._mmu.write_byte(addr, rlc); this.updateDevices(); return 16; },
        0x07: () => { this._state.a = this.cb_rlc(this._state.a); return 8; },

        //RRC
        0x08: () => { this._state.b = this.cb_rrc(this._state.b); return 8; },
        0x09: () => { this._state.c = this.cb_rrc(this._state.c); return 8; },
        0x0A: () => { this._state.d = this.cb_rrc(this._state.d); return 8; },
        0x0B: () => { this._state.e = this.cb_rrc(this._state.e); return 8; },
        0x0C: () => { this._state.h = this.cb_rrc(this._state.h); return 8; },
        0x0D: () => { this._state.l = this.cb_rrc(this._state.l); return 8; },
        0x0E: () => { const addr = get_hl(this._state); const rrc = this.cb_rrc(this._mmu.read_byte(addr)); this.updateDevices(); this._mmu.write_byte(addr, rrc); this.updateDevices(); return 16;  },
        0x0F: () => { this._state.a = this.cb_rrc(this._state.a); return 8; },

        //RL
        0x10: () => { this._state.b = this.cb_rl(this._state.b); return 8; },
        0x11: () => { this._state.c = this.cb_rl(this._state.c); return 8; },
        0x12: () => { this._state.d = this.cb_rl(this._state.d); return 8; },
        0x13: () => { this._state.e = this.cb_rl(this._state.e); return 8; },
        0x14: () => { this._state.h = this.cb_rl(this._state.h); return 8; },
        0x15: () => { this._state.l = this.cb_rl(this._state.l); return 8; },
        0x16: () => { const addr = get_hl(this._state); const rl = this.cb_rl(this._mmu.read_byte(addr)); this.updateDevices(); this._mmu.write_byte(addr, rl); this.updateDevices(); return 16; },
        0x17: () => { this._state.a = this.cb_rl(this._state.a); return 8; },

        //RR
        0x18: () => { this._state.b = this.cb_rr(this._state.b); return 8; },
        0x19: () => { this._state.c = this.cb_rr(this._state.c); return 8; },
        0x1A: () => { this._state.d = this.cb_rr(this._state.d); return 8; },
        0x1B: () => { this._state.e = this.cb_rr(this._state.e); return 8; },
        0x1C: () => { this._state.h = this.cb_rr(this._state.h); return 8; },
        0x1D: () => { this._state.l = this.cb_rr(this._state.l); return 8; },
        0x1E: () => { const addr = get_hl(this._state); const rr = this.cb_rr(this._mmu.read_byte(addr)); this.updateDevices(); this._mmu.write_byte(addr, rr); this.updateDevices(); return 16;  },
        0x1F: () => { this._state.a = this.cb_rr(this._state.a); return 8; },

        //SLA
        0x20: () => { this._state.b = this.cb_sla(this._state.b); return 8; },
        0x21: () => { this._state.c = this.cb_sla(this._state.c); return 8; },
        0x22: () => { this._state.d = this.cb_sla(this._state.d); return 8; },
        0x23: () => { this._state.e = this.cb_sla(this._state.e); return 8; },
        0x24: () => { this._state.h = this.cb_sla(this._state.h); return 8; },
        0x25: () => { this._state.l = this.cb_sla(this._state.l); return 8; },
        0x26: () => { const addr = get_hl(this._state); const sla = this.cb_sla(this._mmu.read_byte(addr)); this.updateDevices(); this._mmu.write_byte(addr, sla); this.updateDevices(); return 16;  },
        0x27: () => { this._state.a = this.cb_sla(this._state.a); return 8; },

        //SRA
        0x28: () => { this._state.b = this.cb_sra(this._state.b); return 8; },
        0x29: () => { this._state.c = this.cb_sra(this._state.c); return 8; },
        0x2A: () => { this._state.d = this.cb_sra(this._state.d); return 8; },
        0x2B: () => { this._state.e = this.cb_sra(this._state.e); return 8; },
        0x2C: () => { this._state.h = this.cb_sra(this._state.h); return 8; },
        0x2D: () => { this._state.l = this.cb_sra(this._state.l); return 8; },
        0x2E: () => { const addr = get_hl(this._state); const sra = this.cb_sra(this._mmu.read_byte(addr)); this.updateDevices(); this._mmu.write_byte(addr, sra); this.updateDevices(); return 16;  },
        0x2F: () => { this._state.a = this.cb_sra(this._state.a); return 8; },

        //SWAP
        0x30: () => { this._state.b = this.cb_swap(this._state.b); return 8; },
        0x31: () => { this._state.c = this.cb_swap(this._state.c); return 8; },
        0x32: () => { this._state.d = this.cb_swap(this._state.d); return 8; },
        0x33: () => { this._state.e = this.cb_swap(this._state.e); return 8; },
        0x34: () => { this._state.h = this.cb_swap(this._state.h); return 8; },
        0x35: () => { this._state.l = this.cb_swap(this._state.l); return 8; },
        0x36: () => { const addr = get_hl(this._state); const swap = this.cb_swap(this._mmu.read_byte(addr)); this.updateDevices(); this._mmu.write_byte(addr, swap); this.updateDevices(); return 16;  },
        0x37: () => { this._state.a = this.cb_swap(this._state.a); return 8; },

        //SRL
        0x38: () => { this._state.b = this.cb_srl(this._state.b); return 8; },
        0x39: () => { this._state.c = this.cb_srl(this._state.c); return 8; },
        0x3A: () => { this._state.d = this.cb_srl(this._state.d); return 8; },
        0x3B: () => { this._state.e = this.cb_srl(this._state.e); return 8; },
        0x3C: () => { this._state.h = this.cb_srl(this._state.h); return 8; },
        0x3D: () => { this._state.l = this.cb_srl(this._state.l); return 8; },
        0x3E: () => { const addr = get_hl(this._state); const srl = this.cb_srl(this._mmu.read_byte(addr)); this.updateDevices(); this._mmu.write_byte(addr, srl); this.updateDevices(); return 16;  },
        0x3F: () => { this._state.a = this.cb_srl(this._state.a); return 8; },

        //BIT 0
        0x40: () => { this.bit(0, this._state.b); return 8; },
        0x41: () => { this.bit(0, this._state.c); return 8; },
        0x42: () => { this.bit(0, this._state.d); return 8; },
        0x43: () => { this.bit(0, this._state.e); return 8; },
        0x44: () => { this.bit(0, this._state.h); return 8; },
        0x45: () => { this.bit(0, this._state.l); return 8; },
        0x46: () => { this.bit(0, this._mmu.read_byte(get_hl(this._state))); this.updateDevices(); return 12; },
        0x47: () => { this.bit(0, this._state.a); return 8; },

        //BIT 1
        0x48: () => { this.bit(1, this._state.b); return 8; },
        0x49: () => { this.bit(1, this._state.c); return 8; },
        0x4A: () => { this.bit(1, this._state.d); return 8; }, 
        0x4B: () => { this.bit(1, this._state.e); return 8; },
        0x4C: () => { this.bit(1, this._state.h); return 8; }, 
        0x4D: () => { this.bit(1, this._state.l); return 8; },
        0x4E: () => { this.bit(1, this._mmu.read_byte(get_hl(this._state))); this.updateDevices(); return 12; },
        0x4F: () => { this.bit(1, this._state.a); return 8; },

        //BIT 2
        0x50: () => { this.bit(2, this._state.b); return 8; },
        0x51: () => { this.bit(2, this._state.c); return 8; },
        0x52: () => { this.bit(2, this._state.d); return 8; },
        0x53: () => { this.bit(2, this._state.e); return 8; },
        0x54: () => { this.bit(2, this._state.h); return 8; },
        0x55: () => { this.bit(2, this._state.l); return 8; },
        0x56: () => { this.bit(2, this._mmu.read_byte(get_hl(this._state))); this.updateDevices(); return 12; },
        0x57: () => { this.bit(2, this._state.a); return 8; },

        //BIT 3
        0x58: () => { this.bit(3, this._state.b); return 8; },
        0x59: () => { this.bit(3, this._state.c); return 8; },
        0x5A: () => { this.bit(3, this._state.d); return 8; },
        0x5B: () => { this.bit(3, this._state.e); return 8; },
        0x5C: () => { this.bit(3, this._state.h); return 8; },
        0x5D: () => { this.bit(3, this._state.l); return 8; },
        0x5E: () => { this.bit(3, this._mmu.read_byte(get_hl(this._state))); this.updateDevices(); return 12; },
        0x5F: () => { this.bit(3, this._state.a); return 8; },

        //BIT 4
        0x60: () => { this.bit(4, this._state.b); return 8; },
        0x61: () => { this.bit(4, this._state.c); return 8; }, 
        0x62: () => { this.bit(4, this._state.d); return 8; },
        0x63: () => { this.bit(4, this._state.e); return 8; },
        0x64: () => { this.bit(4, this._state.h); return 8; },
        0x65: () => { this.bit(4, this._state.l); return 8; },
        0x66: () => { this.bit(4, this._mmu.read_byte(get_hl(this._state))); this.updateDevices(); return 12; },
        0x67: () => { this.bit(4, this._state.a); return 8; },

        //BIT 5
        0x68: () => { this.bit(5, this._state.b); return 8; },
        0x69: () => { this.bit(5, this._state.c); return 8; },
        0x6A: () => { this.bit(5, this._state.d); return 8; },
        0x6B: () => { this.bit(5, this._state.e); return 8; },
        0x6C: () => { this.bit(5, this._state.h); return 8; },
        0x6D: () => { this.bit(5, this._state.l); return 8; },
        0x6E: () => { this.bit(5, this._mmu.read_byte(get_hl(this._state))); this.updateDevices(); return 12; },
        0x6F: () => { this.bit(5, this._state.a); return 8; },

        //BIT 6
        0x70: () => { this.bit(6, this._state.b); return 8; },
        0x71: () => { this.bit(6, this._state.c); return 8; },
        0x72: () => { this.bit(6, this._state.d); return 8; },
        0x73: () => { this.bit(6, this._state.e); return 8; },
        0x74: () => { this.bit(6, this._state.h); return 8; },
        0x75: () => { this.bit(6, this._state.l); return 8; },
        0x76: () => { this.bit(6, this._mmu.read_byte(get_hl(this._state))); this.updateDevices(); return 12; },
        0x77: () => { this.bit(6, this._state.a); return 8; },

        //BIT 7
        0x78: () => { this.bit(7, this._state.b); return 8; },
        0x79: () => { this.bit(7, this._state.c); return 8; },
        0x7A: () => { this.bit(7, this._state.d); return 8; },
        0x7B: () => { this.bit(7, this._state.e); return 8; },
        0x7C: () => { this.bit(7, this._state.h); return 8; },
        0x7D: () => { this.bit(7, this._state.l); return 8; },
        0x7E: () => { this.bit(7, this._mmu.read_byte(get_hl(this._state))); this.updateDevices(); return 12; },
        0x7F: () => { this.bit(7, this._state.a); return 8; },

        //RES 0
        0x80: () => {this._state.b = this.cb_res(0, this._state.b); return 8; },
        0x81: () => {this._state.c = this.cb_res(0, this._state.c); return 8; },
        0x82: () => {this._state.d = this.cb_res(0, this._state.d); return 8; },
        0x83: () => {this._state.e = this.cb_res(0, this._state.e); return 8; },
        0x84: () => {this._state.h = this.cb_res(0, this._state.h); return 8; },
        0x85: () => {this._state.l = this.cb_res(0, this._state.l); return 8; },
        0x86: () => {const addr = get_hl(this._state); const res = this.cb_res(0, this._mmu.read_byte(addr)); this.updateDevices(); this._mmu.write_byte(addr, res); this.updateDevices(); return 16; },
        0x87: () => {this._state.a = this.cb_res(0, this._state.a); return 8; },

        //RES 1
        0x88: () => {this._state.b = this.cb_res(1, this._state.b); return 8; },
        0x89: () => {this._state.c = this.cb_res(1, this._state.c); return 8; },
        0x8A: () => {this._state.d = this.cb_res(1, this._state.d); return 8; },
        0x8B: () => {this._state.e = this.cb_res(1, this._state.e); return 8; },
        0x8C: () => {this._state.h = this.cb_res(1, this._state.h); return 8; },
        0x8D: () => {this._state.l = this.cb_res(1, this._state.l); return 8; },
        0x8E: () => {const addr = get_hl(this._state); const res = this.cb_res(1, this._mmu.read_byte(addr)); this.updateDevices(); this._mmu.write_byte(addr, res); this.updateDevices(); return 16;  },
        0x8F: () => {this._state.a = this.cb_res(1, this._state.a); return 8; },

        //RES 2
        0x90: () => {this._state.b = this.cb_res(2, this._state.b); return 8; },
        0x91: () => {this._state.c = this.cb_res(2, this._state.c); return 8; },
        0x92: () => {this._state.d = this.cb_res(2, this._state.d); return 8; },
        0x93: () => {this._state.e = this.cb_res(2, this._state.e); return 8; },
        0x94: () => {this._state.h = this.cb_res(2, this._state.h); return 8; },
        0x95: () => {this._state.l = this.cb_res(2, this._state.l); return 8; },
        0x96: () => {const addr = get_hl(this._state); const res = this.cb_res(2, this._mmu.read_byte(addr)); this.updateDevices(); this._mmu.write_byte(addr, res); this.updateDevices(); return 16;  },
        0x97: () => {this._state.a = this.cb_res(2, this._state.a); return 8; },

        //RES 3
        0x98: () => {this._state.b = this.cb_res(3, this._state.b); return 8; },
        0x99: () => {this._state.c = this.cb_res(3, this._state.c); return 8; },
        0x9A: () => {this._state.d = this.cb_res(3, this._state.d); return 8; },
        0x9B: () => {this._state.e = this.cb_res(3, this._state.e); return 8; },
        0x9C: () => {this._state.h = this.cb_res(3, this._state.h); return 8; },
        0x9D: () => {this._state.l = this.cb_res(3, this._state.l); return 8; },
        0x9E: () => {const addr = get_hl(this._state); const res = this.cb_res(3, this._mmu.read_byte(addr)); this.updateDevices(); this._mmu.write_byte(addr, res); this.updateDevices(); return 16;  },
        0x9F: () => {this._state.a = this.cb_res(3, this._state.a); return 8; },

        //RES 4
        0xA0: () => {this._state.b = this.cb_res(4, this._state.b); return 8; },
        0xA1: () => {this._state.c = this.cb_res(4, this._state.c); return 8; },
        0xA2: () => {this._state.d = this.cb_res(4, this._state.d); return 8; },
        0xA3: () => {this._state.e = this.cb_res(4, this._state.e); return 8; },
        0xA4: () => {this._state.h = this.cb_res(4, this._state.h); return 8; },
        0xA5: () => {this._state.l = this.cb_res(4, this._state.l); return 8; },
        0xA6: () => {const addr = get_hl(this._state); const res = this.cb_res(4, this._mmu.read_byte(addr)); this.updateDevices(); this._mmu.write_byte(addr, res); this.updateDevices(); return 16;  },
        0xA7: () => {this._state.a = this.cb_res(4, this._state.a); return 8; },

        //RES 5
        0xA8: () => {this._state.b = this.cb_res(5, this._state.b); return 8; },
        0xA9: () => {this._state.c = this.cb_res(5, this._state.c); return 8; },
        0xAA: () => {this._state.d = this.cb_res(5, this._state.d); return 8; },
        0xAB: () => {this._state.e = this.cb_res(5, this._state.e); return 8; },
        0xAC: () => {this._state.h = this.cb_res(5, this._state.h); return 8; },
        0xAD: () => {this._state.l = this.cb_res(5, this._state.l); return 8; },
        0xAE: () => {const addr = get_hl(this._state); const res = this.cb_res(5, this._mmu.read_byte(addr)); this.updateDevices(); this._mmu.write_byte(addr, res); this.updateDevices(); return 16; },
        0xAF: () => {this._state.a = this.cb_res(5, this._state.a); return 8; },

        //RES 6
        0xB0: () => {this._state.b = this.cb_res(6, this._state.b); return 8; },
        0xB1: () => {this._state.c = this.cb_res(6, this._state.c); return 8; },
        0xB2: () => {this._state.d = this.cb_res(6, this._state.d); return 8; },
        0xB3: () => {this._state.e = this.cb_res(6, this._state.e); return 8; },
        0xB4: () => {this._state.h = this.cb_res(6, this._state.h); return 8; },
        0xB5: () => {this._state.l = this.cb_res(6, this._state.l); return 8; },
        0xB6: () => {const addr = get_hl(this._state); const res = this.cb_res(6, this._mmu.read_byte(addr)); this.updateDevices(); this._mmu.write_byte(addr, res); this.updateDevices(); return 16;  },
        0xB7: () => {this._state.a = this.cb_res(6, this._state.a); return 8; },

        //RES 7
        0xB8: () => {this._state.b = this.cb_res(7, this._state.b); return 8; },
        0xB9: () => {this._state.c = this.cb_res(7, this._state.c); return 8; },
        0xBA: () => {this._state.d = this.cb_res(7, this._state.d); return 8; },
        0xBB: () => {this._state.e = this.cb_res(7, this._state.e); return 8; },
        0xBC: () => {this._state.h = this.cb_res(7, this._state.h); return 8; },
        0xBD: () => {this._state.l = this.cb_res(7, this._state.l); return 8; },
        0xBE: () => {const addr = get_hl(this._state); const res = this.cb_res(7, this._mmu.read_byte(addr)); this.updateDevices(); this._mmu.write_byte(addr, res); this.updateDevices(); return 16;  },
        0xBF: () => {this._state.a = this.cb_res(7, this._state.a); return 8; },

        //SET 0
        0xC0: () => {this._state.b = this.cb_set(0, this._state.b); return 8; },
        0xC1: () => {this._state.c = this.cb_set(0, this._state.c); return 8; },
        0xC2: () => {this._state.d = this.cb_set(0, this._state.d); return 8; },
        0xC3: () => {this._state.e = this.cb_set(0, this._state.e); return 8; },
        0xC4: () => {this._state.h = this.cb_set(0, this._state.h); return 8; },
        0xC5: () => {this._state.l = this.cb_set(0, this._state.l); return 8; },
        0xC6: () => {const addr = get_hl(this._state); const set = this.cb_set(0, this._mmu.read_byte(addr)); this.updateDevices(); this._mmu.write_byte(addr, set); this.updateDevices(); return 16; },
        0xC7: () => {this._state.a = this.cb_set(0, this._state.a); return 8; },

        //SET 1
        0xC8: () => {this._state.b = this.cb_set(1, this._state.b); return 8; },
        0xC9: () => {this._state.c = this.cb_set(1, this._state.c); return 8; },
        0xCA: () => {this._state.d = this.cb_set(1, this._state.d); return 8; },
        0xCB: () => {this._state.e = this.cb_set(1, this._state.e); return 8; },
        0xCC: () => {this._state.h = this.cb_set(1, this._state.h); return 8; },
        0xCD: () => {this._state.l = this.cb_set(1, this._state.l); return 8; },
        0xCE: () => {const addr = get_hl(this._state); const set = this.cb_set(1, this._mmu.read_byte(addr)); this.updateDevices(); this._mmu.write_byte(addr, set); this.updateDevices(); return 16; },
        0xCF: () => {this._state.a = this.cb_set(1, this._state.a); return 8; },

        //SET 2
        0xD0: () => {this._state.b = this.cb_set(2, this._state.b); return 8; },
        0xD1: () => {this._state.c = this.cb_set(2, this._state.c); return 8; },
        0xD2: () => {this._state.d = this.cb_set(2, this._state.d); return 8; },
        0xD3: () => {this._state.e = this.cb_set(2, this._state.e); return 8; },
        0xD4: () => {this._state.h = this.cb_set(2, this._state.h); return 8; },
        0xD5: () => {this._state.l = this.cb_set(2, this._state.l); return 8; },
        0xD6: () => {const addr = get_hl(this._state); const set = this.cb_set(2, this._mmu.read_byte(addr)); this.updateDevices(); this._mmu.write_byte(addr, set); this.updateDevices(); return 16; },
        0xD7: () => {this._state.a = this.cb_set(2, this._state.a); return 8; },

        //SET 3
        0xD8: () => {this._state.b = this.cb_set(3, this._state.b); return 8; },
        0xD9: () => {this._state.c = this.cb_set(3, this._state.c); return 8; },
        0xDA: () => {this._state.d = this.cb_set(3, this._state.d); return 8; },
        0xDB: () => {this._state.e = this.cb_set(3, this._state.e); return 8; },
        0xDC: () => {this._state.h = this.cb_set(3, this._state.h); return 8; },
        0xDD: () => {this._state.l = this.cb_set(3, this._state.l); return 8; },
        0xDE: () => {const addr = get_hl(this._state); const set = this.cb_set(3, this._mmu.read_byte(addr)); this.updateDevices(); this._mmu.write_byte(addr, set); this.updateDevices(); return 16; },
        0xDF: () => {this._state.a = this.cb_set(3, this._state.a); return 8; },

        //SET 4
        0xE0: () => {this._state.b = this.cb_set(4, this._state.b); return 8; },
        0xE1: () => {this._state.c = this.cb_set(4, this._state.c); return 8; },
        0xE2: () => {this._state.d = this.cb_set(4, this._state.d); return 8; },
        0xE3: () => {this._state.e = this.cb_set(4, this._state.e); return 8; },
        0xE4: () => {this._state.h = this.cb_set(4, this._state.h); return 8; },
        0xE5: () => {this._state.l = this.cb_set(4, this._state.l); return 8; },
        0xE6: () => {const addr = get_hl(this._state); const set = this.cb_set(4, this._mmu.read_byte(addr)); this.updateDevices(); this._mmu.write_byte(addr, set); this.updateDevices(); return 16; },
        0xE7: () => {this._state.a = this.cb_set(4, this._state.a); return 8; },

        //SET 5
        0xE8: () => {this._state.b = this.cb_set(5, this._state.b); return 8; },
        0xE9: () => {this._state.c = this.cb_set(5, this._state.c); return 8; },
        0xEA: () => {this._state.d = this.cb_set(5, this._state.d); return 8; },
        0xEB: () => {this._state.e = this.cb_set(5, this._state.e); return 8; },
        0xEC: () => {this._state.h = this.cb_set(5, this._state.h); return 8; },
        0xED: () => {this._state.l = this.cb_set(5, this._state.l); return 8; },
        0xEE: () => {const addr = get_hl(this._state); const set = this.cb_set(5, this._mmu.read_byte(addr)); this.updateDevices(); this._mmu.write_byte(addr, set); this.updateDevices(); return 16; },
        0xEF: () => {this._state.a = this.cb_set(5, this._state.a); return 8; },

        //SET 6
        0xF0: () => {this._state.b = this.cb_set(6, this._state.b); return 8; },
        0xF1: () => {this._state.c = this.cb_set(6, this._state.c); return 8; },
        0xF2: () => {this._state.d = this.cb_set(6, this._state.d); return 8; },
        0xF3: () => {this._state.e = this.cb_set(6, this._state.e); return 8; },
        0xF4: () => {this._state.h = this.cb_set(6, this._state.h); return 8; },
        0xF5: () => {this._state.l = this.cb_set(6, this._state.l); return 8; },
        0xF6: () => {const addr = get_hl(this._state); const set = this.cb_set(6, this._mmu.read_byte(addr)); this.updateDevices(); this._mmu.write_byte(addr, set); this.updateDevices(); return 16; },
        0xF7: () => {this._state.a = this.cb_set(6, this._state.a); return 8; },

        //SET 7
        0xF8: () => {this._state.b = this.cb_set(7, this._state.b); return 8; },
        0xF9: () => {this._state.c = this.cb_set(7, this._state.c); return 8; },
        0xFA: () => {this._state.d = this.cb_set(7, this._state.d); return 8; },
        0xFB: () => {this._state.e = this.cb_set(7, this._state.e); return 8; },
        0xFC: () => {this._state.h = this.cb_set(7, this._state.h); return 8; },
        0xFD: () => {this._state.l = this.cb_set(7, this._state.l); return 8; },
        0xFE: () => {const addr = get_hl(this._state); const set = this.cb_set(7, this._mmu.read_byte(addr)); this.updateDevices(); this._mmu.write_byte(addr, set); this.updateDevices(); return 16; },
        0xFF: () => {this._state.a = this.cb_set(7, this._state.a); return 8; },
    };

    constructor(romData: Uint8Array, updateDevices: Function) {
        this._state = {a: 0, b: 0, c: 0, d: 0, e: 0, f: 0, h: 0, l: 0};
        this._sp = 0;
        this._pc = 0;
        this._isRunning = false;
        this._IME = false;
        this._interrupt_enable_pending = false;
        this._mmu = new MMU(romData);
        this._isHalted = false;
        this.updateDevices = updateDevices;
    }

    start_cpu() {
        this._pc = 0x0100;
        this._sp = 0xFFFE;

        this._state.a = 0x01;
        this._state.f = 0xB0;

        this._state.c = 0x13;

        this._state.e = 0xD8;

        this._state.h = 0x01;
        this._state.l = 0x4D;

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
        if(args.length !== this.instructions[opcode].len - 1) {
            console.log("Invalid argument size of " + args.length + " for opcode " + opcode.toString(16) + " (should be " + (this.instructions[opcode].len - 1)  + ")");
            console.log("@ pc = " + this._pc.toString(16));
            return -1;
        }
        const op_to_exec = this.instructions[opcode].op;
        return op_to_exec(args);
    }

    //cb helpers
    private cb_rlc(val: number): number {
        let carry: bit = 0;
        
        //Rotate left
        let res = (val << 1) & 0xFF;
        if(((val >> 7) & 1) !== 0) {
            //Left bit carried, append to the end
            carry = 1;
            res |= 1;
        }
        this.set_flags(res === 0 ? 1 : 0, 0, 0, carry);
        return res;
    }

    private cb_rrc(val: number): number {
        let carry: bit = 0;
        
        //Rotate right
        let res = (val >> 1);
        if((val & 1) !== 0) {
            //Right bit carried, append to the start
            carry = 1;
            res |= (1 << 7);
        }
        this.set_flags(res === 0 ? 1 : 0, 0, 0, carry);
        return res;
    }

    private cb_rl(val: number): number {
        let carry: bit = 0;
        let res = (val << 1) & 0xFF;
        if((val >> 7 & 0x01) !== 0) {
            carry = 1;
        }
        res |= this.get_carry();
        this.set_flags(res === 0 ? 1 : 0, 0, 0, carry);
        return res;
    }

    private cb_rr(val: number): number {
        let carry: bit = 0;

        let res = (val >> 1);
        if((val & 1) !== 0) {
            carry = 1;
        }
        res |= (this.get_carry() << 7);
        this.set_flags(res === 0 ? 1 : 0, 0, 0, carry);
        return res;
    }

    private cb_sla(val: number): number {
        let carry: bit = 0;
        const res = (val << 1) & 0xFF;
        if(((val >> 7) & 1) !== 0) {
            carry = 1;
        }
        this.set_flags(res === 0 ? 1 : 0, 0, 0, carry);
        return res;
    }

    private cb_sra(val: number): number {
        let carry: bit = 0;
        let res = (val >> 1);
        if((val & 1) !== 0) {
            carry = 1;
        }
        //msb does not change
        res |= ((val >> 7 & 1) << 7);
        this.set_flags(res === 0 ? 1 : 0, 0, 0, carry);
        return res;
    }

    private cb_swap(val: number): number {
        const hi = (val & 0b11110000) >> 4;
        const lo = (val & 0b00001111) << 4;
        const res = hi | lo;
        this.set_flags(res === 0 ? 1 : 0, 0, 0, 0);
        return res;
    }

    private cb_srl(val: number): number {
        let carry: bit = 0;
        const res = (val >> 1) & 0xFF;
        if((val & 1) !== 0) {
            carry = 1;
        }
        this.set_flags(res === 0 ? 1 : 0, 0, 0, carry);
        return res;
    }

    private bit(k: number, val: number) {
        const res = (val & (1 << k)) === 0 ? 1 : 0;
        this.set_flags(res, 0, 1, undefined);
    }

    private cb_res(k: number, val: number) {
        const res = val & ~(1 << k);
        return res;
    }

    private cb_set(k: number, val: number) {
        const res = val | (1 << k);
        return res;
    }

    //operation logic here
    private ret_step() {
        const lo = this.pop_8bit();
        this._pc = (this._pc & 0xFF00) | lo;
        this.updateDevices();
        
        const hi = this.pop_8bit();
        this._pc = (hi << 8) | lo;
        this.updateDevices();
        this.updateDevices();
    }

    private restart_step(addr: number) {
        this.updateDevices();
        this.push_16bit(this._pc);
        this._pc = addr;
    }

    private inc_hl() {
        const hl = get_hl(this._state);
        const res = add16Bit(hl, 1).res;
        this._state.l = res & 0xFF;
        this.updateDevices();
        this._state.h = res >> 8;
    }

    private dec_hl() {
        const hl = get_hl(this._state);
        const res = subtract16bit(hl, 1).res;
        this._state.l = res & 0xFF;
        this.updateDevices();
        this._state.h = res >> 8;
    }

    private inc_bc() {
        const bc = get_bc(this._state);
        const res = add16Bit(bc, 1).res;
        this._state.c = res & 0xFF;
        this.updateDevices();
        this._state.b = res >> 8;
    }

    private dec_bc() {
        const bc = get_bc(this._state);
        const res = subtract16bit(bc, 1).res;
        this._state.c = res & 0xFF;
        this.updateDevices();
        this._state.b = res >> 8;
    }

    private inc_de() {
        const de = get_de(this._state);
        const res = add16Bit(de, 1).res;
        this._state.e = res & 0xFF;
        this.updateDevices();
        this._state.d = res >> 8;
    }

    private dec_de() {
        const de = get_de(this._state);
        const res = subtract16bit(de, 1).res;
        this._state.e = res & 0xFF;
        this.updateDevices();
        this._state.d = res >> 8;
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

    private add_val(val: number): number {
        const res = add8Bit(this._state.a, val);
        this._state.a = res.res;
        this.set_flags(res.zero, 0, res.halfCarry, res.carry);
        return res.res;
    }

    private addC_val(val: number): number {
        const res = add8BitC(this._state.a, val, this.get_carry());
        this._state.a = res.res;
        this.set_flags(res.zero, 0, res.halfCarry, res.carry);
        return res.res;
    }

    private sub_val(val: number): number {
        const res = subtract8Bit(this._state.a, val);
        this._state.a = res.res;
        this.set_flags(res.zero, 1, res.halfCarry, res.carry);
        return res.res;
    }

    private subC_val(val: number): number {
        const res = subtract8BitC(this._state.a, val, this.get_carry());
        this._state.a = res.res;
        this.set_flags(res.zero, 1, res.halfCarry, res.carry);
        return res.res;
    }

    push_8bit(val: number) {
        this._mmu.write_byte(--this._sp, val);
        this.updateDevices();
    }

    push_16bit(val: number) {
        //Push msb
        this.push_8bit((val >> 8) & 0xFF);
        //Push lsb
        this.push_8bit(val & 0xFF);
    }

    pop_8bit(): number {
        const val = this._mmu.read_byte(this._sp++);
        return val;
    }

    // pop_16bit(): number {
    //     const lo = this.pop_8bit();
    //     const hi = this.pop_8bit();
    //     return (hi << 8) | lo;
    // }

    //0x00 : NOP
    private NOP(): number {
        return 4;
    }

    //0x01 : LD_BC_D16
    private LD_BC_D16(args: Uint8Array): number {
        this._state.b = args[1];
        this._state.c = args[0];
        return 12;
    }

    //0x02 : LD_MBC_A
    private LD_MBC_A(): number {
        const addr = get_bc(this._state);
        this._mmu.write_byte(addr, this._state.a);
        this.updateDevices();
        return 8;
    }

    //0x03 : INC_BC
    private INC_BC(): number {
        this.inc_bc();
        return 8;
    }

    //0x04 : INC_B
    private INC_B(): number {
        const res = add8Bit(this._state.b, 1);
        this._state.b = res.res;
        this.set_flags(res.zero, 0, res.halfCarry, undefined);
        return 4;
    }

    //0x05 : DEC_B
    private DEC_B(): number {
        const res = subtract8Bit(this._state.b, 1);
        this._state.b = res.res;
        this.set_flags(res.zero, 1, res.halfCarry, undefined);
        return 4;
    }

    //0x06 : LD_B_D8
    private LD_B_D8(args: Uint8Array): number {
        this._state.b = args[0];
        return 8;
    }

    //0x07 : RLCA
    private RLCA(): number {
        this._state.a = this.cb_rlc(this._state.a);
        this.set_flags(0, undefined, undefined, undefined); 
        return 4;
    }

    //0x08 : LD_MA16_SP
    private LD_MA16_SP(args: Uint8Array): number {
        const addr = leTo16Bit(args[0], args[1]);
        this._mmu.write_byte(addr, this._sp & 0xFF);
        this.updateDevices();
        this._mmu.write_byte(addr + 1, (this._sp >> 8) & 0xFF);
        this.updateDevices();
        return 20;
    }
    
    //0x09 : ADD_HL_BC
    private ADD_HL_BC(): number {
        this.updateDevices();
        const res = add16Bit(get_hl(this._state), get_bc(this._state));
        set_hl(this._state, res.res);
        this.set_flags(undefined, 0, res.halfCarry, res.carry);
        return 8;
    }

    //0x0A : LD_A_MBC
    private LD_A_MBC(): number {
        const addr = get_bc(this._state);
        const newVal = this._mmu.read_byte(addr);
        this.updateDevices();
        this._state.a = newVal;
        return 8;
    }

    //0x0B : DEC_BC
    private DEC_BC(): number {
        this.dec_bc();
        return 8;
    }

    //0x0C : INC_C
    private INC_C(): number {
        const res = add8Bit(this._state.c, 1);
        this._state.c = res.res;
        this.set_flags(res.zero, 0, res.halfCarry, undefined);
        return 4;
    }

    //0x0D : DEC_C
    private DEC_C(): number {
        const res = subtract8Bit(this._state.c, 1);
        this._state.c = res.res;
        this.set_flags(res.zero, 1, res.halfCarry, undefined);
        return 4;
    }

    //0x0E : LD_C_D8
    private LD_C_D8(args: Uint8Array): number {
        this._state.c = args[0];
        return 8;
    }

    //0x0F : RRCA
    private RRCA(): number {
        this._state.a = this.cb_rrc(this._state.a);
        this.set_flags(0, undefined, undefined, undefined); 
        return 4;
    }

    //0x11 : LD_DE_D16
    private LD_DE_D16(args: Uint8Array): number {
        this._state.d = args[1];
        this._state.e = args[0];
        return 12;
    }

    //0x12 : LD_MDE_A
    private LD_MDE_A(): number {
        const addr = get_de(this._state);
        this._mmu.write_byte(addr, this._state.a);
        this.updateDevices();
        return 8;
    }

    //0x13 : INC_DE
    private INC_DE(): number {
        this.inc_de();
        return 8;
    }

    //0x14 : INC_D
    private INC_D(): number {
        const res = add8Bit(this._state.d, 1);
        this._state.d = res.res;
        this.set_flags(res.zero, 0, res.halfCarry, undefined);
        return 4;
    }

    //0x15 : DEC_D
    private DEC_D(): number {
        const res = subtract8Bit(this._state.d, 1);
        this._state.d = res.res;
        this.set_flags(res.zero, 1, res.halfCarry, undefined);
        return 4;
    }

    //0x16 : LD_D_D8
    private LD_D_D8(args: Uint8Array): number {
        this._state.d = args[0];
        return 8;
    }

    //0x17 : RLA
    private RLA(): number {
        let res = this.cb_rl(this._state.a);
        this._state.a = res;
        this.set_flags(0, undefined, undefined, undefined);
        return 4;
    }

    //0x18 : JR_R8
    private JR_R8(args: Uint8Array): number {
        const e = u8Toi8(args[0]);
        this._pc += e;
        this.updateDevices();
        return 12;
    }

    //0x19 : ADD_HL_DE
    private ADD_HL_DE(): number {
        this.updateDevices();
        const res = add16Bit(get_hl(this._state), get_de(this._state));
        set_hl(this._state, res.res);
        this.set_flags(undefined, 0, res.halfCarry, res.carry);
        return 8;
    }

    //0x1A : LD_A_MDE
    private LD_A_MDE(): number {
        const addr = get_de(this._state);
        const newVal = this._mmu.read_byte(addr);
        this.updateDevices();
        this._state.a = newVal;
        return 8;
    }

    //0x1B : DEC_DE
    private DEC_DE(): number {
        this.dec_de();
        return 8;
    }

    //0x1C : INC_E
    private INC_E(): number {
        const res = add8Bit(this._state.e, 1);
        this._state.e = res.res;
        this.set_flags(res.zero, 0, res.halfCarry, undefined);
        return 4;
    }

    //0x1D : DEC_E
    private DEC_E(): number {
        const res = subtract8Bit(this._state.e, 1);
        this._state.e = res.res;
        this.set_flags(res.zero, 1, res.halfCarry, undefined);
        return 4;
    }

    //0x1E : LD_E_D8
    private LD_E_D8(args: Uint8Array): number {
        this._state.e = args[0];
        return 8;
    }

    //0x1F : RRA
    private RRA(): number {
        let res = this.cb_rr(this._state.a);
        this._state.a = res;
        this.set_flags(0, undefined, undefined, undefined);
        return 4;
    }

    //0x20 : JR_NZ_R8
    private JR_NZ_R8(args: Uint8Array): number {
        const zeroFlag = this.get_zero();
        if(!zeroFlag) {
            const e = u8Toi8(args[0]);
            this._pc += e;
            this.updateDevices();
            return 12;
        }
        return 8;
    }

    //0x21 : LD_HL_D16
    private LD_HL_D16(args: Uint8Array): number {
        this._state.h = args[1];
        this._state.l = args[0];
        return 12;
    }

    //0x22 : LD_MHLI_A
    private LD_MHLI_A(): number {
        const addr = get_hl(this._state);
        this._mmu.write_byte(addr, this._state.a);
        this.inc_hl();
        return 8;
    }

    //0x23 : INC_HL
    private INC_HL(): number {
        this.inc_hl();
        return 8;
    }

    //0x24 : INC_H
    private INC_H(): number {
        const res = add8Bit(this._state.h, 1);
        this._state.h = res.res;
        this.set_flags(res.zero, 0, res.halfCarry, undefined);
        return 4;
    }

    //0x25 : DEC_H
    private DEC_H(): number {
        const res = subtract8Bit(this._state.h, 1);
        this._state.h = res.res;
        this.set_flags(res.zero, 1, res.halfCarry, undefined);
        return 4;
    }

    //0x26 : LD_H_D8
    private LD_H_D8(args: Uint8Array): number {
        this._state.h = args[0];
        return 8;
    }

    //0x27 : DAA
    private DAA(): number {
        //idrk whats going on here
        let u = 0;
        let setFlagC: bit = 0;

        if(this.get_halfCarry() || (!this.get_sub() && (this._state.a & 0xF) > 0x09)) {
            u = 6;
        }

        if(this.get_carry() || (!this.get_sub() && this._state.a > 0x99)) {
            u |= 0x60;
            setFlagC = 1;
        }

        this._state.a += this.get_sub() ? -u : u;
        this._state.a &= 0xFF;

        this.set_flags(this._state.a === 0 ? 1 : 0, undefined, 0, setFlagC); 
        return 4;
    }

    //0x28 : JR_Z_R8
    private JR_Z_R8(args: Uint8Array): number {
        const zeroFlag = this.get_zero();
        if(zeroFlag) {
            const e = u8Toi8(args[0]);
            this._pc += e;
            this.updateDevices();
            return 12;
        }
        return 8;
    }

    //0x29 : ADD_HL_HL
    private ADD_HL_HL(): number {
        const hl = get_hl(this._state);
        const res = add16Bit(hl, hl);
        this.updateDevices();
        set_hl(this._state, res.res);
        this.set_flags(undefined, 0, res.halfCarry, res.carry);
        return 8;
    }

    //0x2A : LD_A_MHLI
    private LD_A_MHLI(): number {
        const addr = get_hl(this._state);
        const val = this._mmu.read_byte(addr);
        this._state.a = val;
        this.inc_hl();
        return 8;
    }

    //0x2B : DEC_HL
    private DEC_HL(): number {
        this.dec_hl();
        return 8;
    }

    //0x2C : INC_L
    private INC_L(): number {
        const res = add8Bit(this._state.l, 1);
        this._state.l = res.res;
        this.set_flags(res.zero, 0, res.halfCarry, undefined);
        return 4;
    }

    //0x2D : DEC_L
    private DEC_L(): number {
        const res = subtract8Bit(this._state.l, 1);
        this._state.l = res.res;
        this.set_flags(res.zero, 1, res.halfCarry, undefined);
        return 4;
    }

    //0x2E : LD_L_D8
    private LD_L_D8(args: Uint8Array): number {
        this._state.l = args[0];
        return 8;
    }

    //0x2F : CPL
    private CPL(): number {
        this._state.a = ~(this._state.a) & 0xFF;
        this.set_flags(undefined, 1, 1, undefined);
        return 4;
    }

    //0x30 : JR_NC_R8
    private JR_NC_R8(args: Uint8Array): number {
        const carryFlag = this.get_carry();
        if(!carryFlag) {
            const e = u8Toi8(args[0]);
            this._pc += e;
            this.updateDevices();
            return 12;
        }
        return 8;
    }

    //0x31 : LD_SP_D16
    private LD_SP_D16(args: Uint8Array): number {
        const val = leTo16Bit(args[0], args[1]);
        this._sp = val;
        return 12;
    }

    //0x32 : LD_MHLD_A
    private LD_MHLD_A(): number {
        const addr = get_hl(this._state);
        this._mmu.write_byte(addr, this._state.a);
        this.dec_hl();
        return 8;
    }

    //0x33 : INC_SP
    private INC_SP(): number {
        this.updateDevices();
        const res = add16Bit(this._sp, 1).res;
        this._sp = res;
        return 8;
    }

    //0x34 : INC_MHL
    private INC_MHL(): number {
        const addr = get_hl(this._state);
        const res = add8Bit(this._mmu.read_byte(addr), 1);
        this.updateDevices();

        this._mmu.write_byte(addr, res.res);
        this.set_flags(res.zero, 0, res.halfCarry, undefined);
        this.updateDevices();
        return 12;
    }

    //0x35 : DEC_MHL
    private DEC_MHL(): number {
        const hl = get_hl(this._state);
        const res = subtract8Bit(this._mmu.read_byte(hl), 1);
        this.updateDevices();

        this._mmu.write_byte(hl, res.res);
        this.set_flags(res.zero, 1, res.halfCarry, undefined);
        this.updateDevices();
        return 12;
    }

    //0x36 : LD_MHL_D8
    private LD_MHL_D8(args: Uint8Array): number {
        const addr = get_hl(this._state);
        this._mmu.write_byte(addr, args[0]);
        this.updateDevices();
        return 12;
    }

    //0x37 : SCF
    private SCF(): number {
        this.set_flags(undefined, 0, 0, 1);
        return 4;
    }

    //0x38 : JP_C_R8
    private JR_C_R8(args: Uint8Array) {
        if(this.get_carry()) {
            const e = u8Toi8(args[0]);
            this._pc += e;
            this.updateDevices();
            return 12;
        }
        return 8;
    }

    //0x39 : ADD_HL_SP
    private ADD_HL_SP(): number {
        this.updateDevices();
        const res = add16Bit(get_hl(this._state), this._sp);
        set_hl(this._state, res.res);
        this.set_flags(undefined, 0, res.halfCarry, res.carry);
        return 8;
    }

    //0x3A : LD_A_MHLD
    private LD_A_MHLD(): number {
        const addr = get_hl(this._state);
        const val = this._mmu.read_byte(addr);
        this._state.a = val;
        this.dec_hl();
        return 8;
    }

    //0x3B : DEC_SP
    private DEC_SP(): number {
        this.updateDevices();
        this.dec_sp();
        return 8;
    }

    //0x3C : INC_A
    private INC_A(): number {
        const res = add8Bit(this._state.a, 1);
        this._state.a = res.res;
        this.set_flags(res.zero, 0, res.halfCarry, undefined);
        return 4;
    }

    //0x3D : DEC_A
    private DEC_A(): number {
        const res = subtract8Bit(this._state.a, 1);
        this._state.a = res.res;
        this.set_flags(res.zero, 1, res.halfCarry, undefined);
        return 4;
    }

    //0x3E : LD_A_D8
    private LD_A_D8(args: Uint8Array): number {
        this._state.a = args[0];
        return 8;
    }
    
    //0x3F : CCF
    private CCF(): number {
        let carry: bit = 0;
        if(this.get_carry() === 0) {
            carry = 1;
        }   
        this.set_flags(undefined, 0, 0, carry);
        return 4;
    }

    //0x40 : LD_B_B
    private LD_B_B(): number {
        return 4;
    }

    //0x41 : LD_B_C
    private LD_B_C(): number {
        this._state.b = this._state.c;
        return 4;
    }

    //0x42 : LD_B_D
    private LD_B_D(): number {
        this._state.b = this._state.d;
        return 4;
    }

    //0x43 : LD_B_E
    private LD_B_E(): number {
        this._state.b = this._state.e;
        return 4;
    }

    //0x44 : LD_B_H
    private LD_B_H(): number {
        this._state.b = this._state.h;
        return 4;
    }

    //0x45 : LD_B_L
    private LD_B_L(): number {
        this._state.b = this._state.l;
        return 4;
    }

    //0x46 : LD_B_MHL
    private LD_B_MHL(): number {
        const addr = get_hl(this._state);
        const val = this._mmu.read_byte(addr);
        this._state.b = val;
        this.updateDevices();
        return 8;
    }

    //0x47 : LD_B_A
    private LD_B_A(): number {
        this._state.b = this._state.a;
        return 4;
    }

    //0x48 : LD_C_B
    private LD_C_B(): number {
        this._state.c = this._state.b;
        return 4;
    }

    //0x49 : LD_C_C
    private LD_C_C(): number {
        return 4;
    }

    //0x4A : LD_C_D
    private LD_C_D(): number {
        this._state.c = this._state.d;
        return 4;
    }

    //0x4B : LD_C_E
    private LD_C_E(): number {
        this._state.c = this._state.e;
        return 4;
    }

    //0x4C : LD_C_H
    private LD_C_H(): number {
        this._state.c = this._state.h;
        return 4;
    }

    //0x4D : LD_C_L
    private LD_C_L(): number {
        this._state.c = this._state.l;
        return 4;
    }

    //0x4E : LD_C_MHL
    private LD_C_MHL(): number {
        const addr = get_hl(this._state);
        const val = this._mmu.read_byte(addr);
        this._state.c = val;
        this.updateDevices();
        return 8;
    }

    //0x4F : LD_C_A
    private LD_C_A(): number {
        this._state.c = this._state.a;
        return 4;
    }

    //0x50 : LD_D_B
    private LD_D_B(): number {
        this._state.d = this._state.b;
        return 4;
    }

    //0x51 : LD_D_C
    private LD_D_C(): number {
        this._state.d = this._state.c
        return 4;
    }

    //0x52 : LD_D_D
    private LD_D_D(): number {
        return 4;
    }

    //0x53 : LD_D_E
    private LD_D_E(): number {
        this._state.d = this._state.e;
        return 4;
    }

    //0x54 : LD_D_H
    private LD_D_H(): number {
        this._state.d = this._state.h;
        return 4;
    }

    //0x55 : LD_D_L
    private LD_D_L(): number {
        this._state.d = this._state.l;
        return 4;
    }

    //0x56 : LD_D_MHL
    private LD_D_MHL(): number {
        const val = this._mmu.read_byte(get_hl(this._state));
        this._state.d = val;
        this.updateDevices();
        return 8;
    }

    //0x57 : LD_D_A
    private LD_D_A(): number {
        this._state.d = this._state.a;
        return 4;
    }

    //0x58 : LD_E_B
    private LD_E_B(): number {
        this._state.e = this._state.b;
        return 4;
    }

    //0x59 : LD_E_C
    private LD_E_C(): number {
        this._state.e = this._state.c;
        return 4;
    }

    //0x5A : LD_E_D
    private LD_E_D(): number {
        this._state.e = this._state.d;
        return 4;
    } 

    //0x5B : LD_E_E
    private LD_E_E(): number {
        return 4;
    }

    //0x5C : LD_E_H
    private LD_E_H(): number {
        this._state.e = this._state.h;
        return 4;
    }

    //0x5D : LD_E_L
    private LD_E_L(): number {
        this._state.e = this._state.l;
        return 4;
    }

    //0x5E : LD_E_MHL
    private LD_E_MHL(): number {
        const val = this._mmu.read_byte(get_hl(this._state));
        this._state.e = val;
        this.updateDevices();
        return 8; 
    }

    //0x5F : LD_E_A
    private LD_E_A(): number {
        this._state.e = this._state.a;
        return 4;
    }

    //0x60 : LD_H_B
    private LD_H_B(): number {
        this._state.h = this._state.b;
        return 4;
    }

    //0x61 : LD_H_C
    private LD_H_C(): number {
        this._state.h = this._state.c;
        return 4;
    }

    //0x62 : LD_H_D
    private LD_H_D(): number {
        this._state.h = this._state.d;
        return 4;
    }

    //0x63 : LD_H_E
    private LD_H_E(): number {
        this._state.h = this._state.e;
        return 4;
    }

    //0x64 : LD_H_H
    private LD_H_H(): number {
        return 4;
    }

    //0x65 : LD_H_L
    private LD_H_L(): number {
        this._state.h = this._state.l;
        return 4
    }

    //0x66 : LD_H_MHL
    private LD_H_MHL(): number {
        const val = this._mmu.read_byte(get_hl(this._state));
        this._state.h = val;
        this.updateDevices();
        return 8;
    }

    //0x67 : LD_H_A
    private LD_H_A(): number {
        this._state.h = this._state.a; 
        return 4;
    }

    //0x68 : LD_L_B
    private LD_L_B(): number {
        this._state.l = this._state.b;
        return 4;
    }

    //0x69 : LD_L_C
    private LD_L_C(): number {
        this._state.l = this._state.c;
        return 4;
    }

    //0x6A : LD_L_D
    private LD_L_D(): number {
        this._state.l = this._state.d;
        return 4;
    }

    //0x6B : LD_L_E
    private LD_L_E(): number {
        this._state.l = this._state.e;
        return 4;
    }

    //0x6C : LD_L_H
    private LD_L_H(): number {
        this._state.l = this._state.h;
        return 4;
    }

    //0x6D : LD_L_L
    private LD_L_L(): number {
        return 4;
    }

    //0x6E : LD_L_MHL
    private LD_L_MHL(): number {
        const val = this._mmu.read_byte(get_hl(this._state));
        this._state.l = val;
        this.updateDevices();
        return 8; 
    }

    //0x6F : LD_L_A
    private LD_L_A(): number {
        this._state.l = this._state.a;
        return 4;
    }

    //0x70 : LD_MHL_B
    private LD_MHL_B(): number {
        const addr = get_hl(this._state);
        this._mmu.write_byte(addr, this._state.b);
        this.updateDevices();
        return 8;
    }

    //0x71 : LD_MHL_C
    private LD_MHL_C(): number {
        const addr = get_hl(this._state);
        this._mmu.write_byte(addr, this._state.c);
        this.updateDevices();
        return 8;
    }

    //0x72 : LD_MHL_D
    private LD_MHL_D(): number {
        const addr = get_hl(this._state);
        this._mmu.write_byte(addr, this._state.d);
        this.updateDevices();
        return 8;
    }

    //0x73 : LD_MHL_E
    private LD_MHL_E(): number {
        const addr = get_hl(this._state);
        this._mmu.write_byte(addr, this._state.e);
        this.updateDevices();
        return 8;
    }

    //0x74 : LD_MHL_H
    private LD_MHL_H(): number {
        const addr = get_hl(this._state);
        this._mmu.write_byte(addr, this._state.h);
        this.updateDevices();
        return 8;
    }

    //0x75 : LD_MHL_L
    private LD_MHL_L(): number {
        const addr = get_hl(this._state);
        this._mmu.write_byte(addr, this._state.l);
        this.updateDevices();
        return 8;
    }

    //0x76 : HALT
    private HALT(): number {
        console.log("Halted");
        this._isHalted = true;
        return 4;
    }

    //0x77 : LD_MHL_A
    private LD_MHL_A(): number {
        const addr = get_hl(this._state);
        this._mmu.write_byte(addr, this._state.a);
        this.updateDevices();
        return 8;
    }

    //0x78 : LD_A_B
    private LD_A_B(): number {
        this._state.a = this._state.b;
        return 4;
    }

    //0x79 : LD_A_C
    private LD_A_C(): number {
        this._state.a = this._state.c;
        return 4;
    }

    //0x7A : LD_A_D
    private LD_A_D(): number {
        this._state.a = this._state.d;
        return 4;
    }

    //0x7B : LD_A_E
    private LD_A_E(): number {
        this._state.a = this._state.e;
        return 4;
    }

    //0x7C : LD_A_H
    private LD_A_H(): number {
        this._state.a = this._state.h;
        return 4;
    }

    //0x7D LD_A_L
    private LD_A_L(): number {
        this._state.a = this._state.l;
        return 4;
    }

    //0x7E : LD_A_MHL
    private LD_A_MHL(): number {
        const addr = get_hl(this._state);
        const val = this._mmu.read_byte(addr);
        this._state.a = val;
        this.updateDevices();
        return 8;
    }

    //0x7F : LD_A_A
    private LD_A_A(): number {
        this._state.a = this._state.a;
        return 4;
    }

    //0x80 : ADD_A_B
    private ADD_A_B(): number {
        this.add_val(this._state.b);
        return 4;
    }

    //0x81 : ADD_A_C
    private ADD_A_C(): number {
        this.add_val(this._state.c);
        return 4;
    }

    //0x82 : ADD_A_D
    private ADD_A_D(): number {
        this.add_val(this._state.d);
        return 4;
    }

    //0x83 : ADD_A_E
    private ADD_A_E(): number {
        this.add_val(this._state.e);
        return 4;
    }

    //0x84 : ADD_A_H
    private ADD_A_H(): number {
        this.add_val(this._state.h);
        return 4;
    }

    //0x85 : ADD_A_L
    private ADD_A_L(): number {
        this.add_val(this._state.l);
        return 4;
    }

    //0x86 : ADD_A_MHL
    private ADD_A_MHL(): number {
        const val = this._mmu.read_byte(get_hl(this._state));
        this.add_val(val);
        this.updateDevices();
        return 8;
    }

    //0x87 : ADD_A_A
    private ADD_A_A(): number {
        this.add_val(this._state.a);
        return 4;
    }

    //0x88 : ADC_A_B
    private ADC_A_B(): number {
        this.addC_val(this._state.b);
        return 4;
    }

    //0x89 : ADC_A_C
    private ADC_A_C(): number {
        this.addC_val(this._state.c);
        return 4;
    }

    //0x8A : ADC_A_D
    private ADC_A_D(): number {
        this.addC_val(this._state.d);
        return 4;
    }

    //0x8B : ADC_A_E
    private ADC_A_E(): number {
        this.addC_val(this._state.e);
        return 4;
    }

    //0x8C : ADC_A_H
    private ADC_A_H(): number {
        this.addC_val(this._state.h);
        return 4;
    }

    //0x8D : ADC_A_L
    private ADC_A_L(): number {
        this.addC_val(this._state.l);
        return 4;
    }

    //0x8E : ADC_A_MHL
    private ADC_A_MHL(): number {
        const val = this._mmu.read_byte(get_hl(this._state));
        this.updateDevices();
        this.addC_val(val);
        return 8;
    }   

    //0x8F : ADC_A_A
    private ADC_A_A(): number {
        this.addC_val(this._state.a);
        return 4;
    }

    //0x90 : SUB_B
    private SUB_B(): number {
        this.sub_val(this._state.b);
        return 4;
    }

    //0x91 : SUB_C
    private SUB_C(): number {
        this.sub_val(this._state.c);
        return 4;
    }

    //0x92 : SUB_D
    private SUB_D(): number {
        this.sub_val(this._state.d);
        return 4;
    }

    //0x93 : SUB_E
    private SUB_E(): number {
        this.sub_val(this._state.e);
        return 4;
    }

    //0x94 : SUB_H
    private SUB_H(): number {
        this.sub_val(this._state.h);
        return 4;
    }

    //0x95 : SUB_L
    private SUB_L(): number {
        this.sub_val(this._state.l);
        return 4;
    }

    //0x96 : SUB_MHL
    private SUB_MHL(): number {
        const val = this._mmu.read_byte(get_hl(this._state));
        this.updateDevices();
        this.sub_val(val);
        return 8;
    }

    //0x97 : SUB_A
    private SUB_A(): number {
        this.sub_val(this._state.a);
        return 4;
    }

    //0x98 : SBC_A_B
    private SBC_A_B(): number {
        this.subC_val(this._state.b);
        return 4;
    }

    //0x99 : SBC_A_C
    private SBC_A_C(): number {
        this.subC_val(this._state.c);
        return 4;
    }

    //0x9A : SBC_A_D
    private SBC_A_D(): number {
        this.subC_val(this._state.d);
        return 4;
    }

    //0x9B : SBC_A_E
    private SBC_A_E(): number {
        this.subC_val(this._state.e);
        return 4;
    }

    //0x9C : SBC_A_H
    private SBC_A_H(): number {
        this.subC_val(this._state.h);
        return 4;
    }

    //0x9D : SBC_A_L
    private SBC_A_L(): number {
        this.subC_val(this._state.l);
        return 4;
    }

    //0x9E : SBC_A_MHL
    private SBC_A_MHL(): number {
        const val = this._mmu.read_byte(get_hl(this._state));
        this.updateDevices();
        this.subC_val(val);
        return 8;
    }

    //0x9F : SBC_A_A
    private SBC_A_A(): number {
        this.subC_val(this._state.a);
        return 4;
    }

    //0xA0 : AND_B
    private AND_B(): number {
        this.and_val(this._state.b);
        return 4;
    }

    //0xA1 : AND_C
    private AND_C(): number {
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
        this.updateDevices();
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
        this.updateDevices();
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
        this.updateDevices();
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
        this.updateDevices();
        this.cp_val(val);
        return 8;
    }

    //0xBF : CP_A
    private CP_A() {
        this.cp_val(this._state.a);
        return 4;
    }

    //0xC0 : RET_NZ
    private RET_NZ() {
        this.updateDevices();
        const zero = this.get_zero();
        if(!zero) {
            this.ret_step();
            return 20;
        }
        return 8;
    }

    //0xC1 : POP_BC
    private POP_BC() {
        const lo = this.pop_8bit();
        this._state.c = lo;
        this.updateDevices();
        const hi = this.pop_8bit();
        this._state.b = hi;
        this.updateDevices();
        return 12;
    }

    //0xC2 : JP_NZ_A16
    private JP_NZ_A16(args: Uint8Array) {
        console.log("JP NZ");
        const addr = leTo16Bit(args[0], args[1]);
        if(!this.get_zero()) {
            this.updateDevices();
            this._pc = addr;
            return 16;
        }
        return 12;
    }

    //0xC3 : JP_A16
    private JP_A16(args: Uint8Array) {
        const addr = leTo16Bit(args[0], args[1]);
        this.updateDevices();
        this._pc = addr;
        return 16;
    }

    //0xC4 : CALL_NZ_A16
    private CALL_NZ_A16(args: Uint8Array) {
        const addr = leTo16Bit(args[0], args[1]);
        if(!this.get_zero()) {
            this.updateDevices();
            this.push_16bit(this._pc);
            this._pc = addr;
            return 24;
        }
        return 12;
    }

    //0xC5 : PUSH_BC
    private PUSH_BC() {
        this.push_16bit(get_bc(this._state));
        this.updateDevices();
        return 16;
    }

    //0xC6 : ADD_A_D8
    private ADD_A_D8(args: Uint8Array) {
        const res = add8Bit(this._state.a, args[0]);
        this._state.a = res.res;
        this.set_flags(res.zero, 0, res.halfCarry, res.carry);
        return 8;
    }

    //0xC7 : RST_00H
    private RST_00H() {
        this.restart_step(0x0000);
        return 16;
    }

    //0xC8 : RET_Z
    private RET_Z() {
        // console.log("Returning if zero: " + this.get_zero());
        // console.log("A = " + this._state.a);
        this.updateDevices();
        if(this.get_zero()) {
            this.ret_step();
            return 20;
        }
        return 8;
    }

    //0xC9 : RET
    private RET(): number {
        this.ret_step();
        return 16;
    }

    //0xCA : JP_Z_A16
    private JP_Z_A16(args: Uint8Array): number {
        if(this.get_zero()) {
            this.updateDevices();
            this._pc = leTo16Bit(args[0], args[1]);
            return 16;
        }
        return 12;
    }

    //0xCB : CB
    private CB(args: Uint8Array): number {
        // if(((args[0]) & 0xF) === 0x06 || ((args[0]) & 0xF) === 0x0E) {
        //     this.updateDevices();
        //     if((((args[0]) >> 4) !== 0x4) && (((args[0]) >> 4) !== 0x5) && (((args[0]) >> 4) !== 0x6) && (((args[0]) >> 4) !== 0x7)) {
        //         this.updateDevices();
        //     }   
        // }
        const val = this.cb[args[0]]();
        return val;
    }

    //0xCC : CALL_Z_A16
    private CALL_Z_A16(args: Uint8Array): number {
        const msb = args[1];
        const lsb = args[0];
        if(this.get_zero()) {
            this.updateDevices();
            this.push_16bit(this._pc);
            this._pc = (msb << 8) | lsb;
            return 24;
        }
        return 12;
    }

    //0xCD : CALL_A16
    private CALL_A16(args: Uint8Array) {
        const msb = args[1];
        const lsb = args[0];
        this.updateDevices();
        this.push_16bit(this._pc);
        this._pc = (msb << 8) | lsb;
        return 24;
    }

    //0xCE : ADC_A_D8
    private ADC_A_D8(args: Uint8Array) {
        const res = add8BitC(this._state.a, args[0], this.get_carry());
        this._state.a = res.res;
        this.set_flags(res.zero, 0, res.halfCarry, res.carry);
        return 8;
    }

    //0xCF : RST_08H
    private RST_08H() {
        this.restart_step(0x0008);
        return 16;
    }

    //0xD0 : RET_NC
    private RET_NC(): number {
        this.updateDevices();
        if(!this.get_carry()) {
            this.ret_step();
            return 20;
        }
        return 8;
    }

    //0xD1 : POP_DE
    private POP_DE(): number {
        const lo = this.pop_8bit();
        this._state.e = lo;
        this.updateDevices();
        const hi = this.pop_8bit();
        this._state.d = hi;
        this.updateDevices();
        return 12;
    }

    //0xD2 : JP_NC_A16
    private JP_NC_A16(args: Uint8Array) {
        const addr = leTo16Bit(args[0], args[1]);
        if(!this.get_carry()) {
            this._pc = addr;
            this.updateDevices();
            return 16;
        }
        return 12;
    }

    //0xD4 : CALL_NC_A16
    private CALL_NC_A16(args: Uint8Array): number {
        const addr = leTo16Bit(args[0], args[1]);
        if(!this.get_carry()) {
            this.updateDevices();
            this.push_16bit(this._pc);
            this._pc = addr;
            return 24;
        }
        return 12;
    }

    //0xD5 : PUSH_DE
    private PUSH_DE(): number {
        this.updateDevices();
        this.push_16bit(get_de(this._state));
        return 16;
    }

    //0xD6 : SUB_D8
    private SUB_D8(args: Uint8Array) {
        const res = subtract8Bit(this._state.a, args[0]);
        this._state.a = res.res;
        this.set_flags(res.zero, 1, res.halfCarry, res.carry);
        return 8;
    }

    //0xD7 : RST_10H
    private RST_10H(): number {
        this.restart_step(0x0010);
        return 16;
    }

    //0xD8 : RET_C
    private RET_C(): number {
        this.updateDevices();
        if(this.get_carry()) {
            this.ret_step();
            return 20;
        }
        return 8;
    }

    //0xD9 : RETI
    private RETI(): number {
        console.log("RETI @" + this._pc.toString(16));
        this.ret_step();
        //Ret step already caused cycle delay, so we can just enable it here
        this.IME = true;
        return 16;
    }

    //0xDA : JP_C_A16
    private JP_C_A16(args: Uint8Array): number {
        if(this.get_carry()) {
            this._pc = leTo16Bit(args[0], args[1]);
            this.updateDevices();
            return 16;
        }
        return 12;
    }

    //0xDC : CALL_C_A16
    private CALL_C_A16(args: Uint8Array): number {
        const msb = args[1];
        const lsb = args[0];
        if(this.get_carry()) {
            this.updateDevices();
            this.push_16bit(this._pc);
            this._pc = (msb << 8) | lsb;
            return 24;
        }
        return 12;
    }

    //0xDE : SBC_A_D8
    private SBC_A_D8(args: Uint8Array): number {
        this.subC_val(args[0]);
        return 8;
    }

    //0xDF : RST_18H
    private RST_18H(): number {
        this.restart_step(0x0018);
        return 16;
    }

    //0xE0 : LDH_MA8_A
    private LDH_MA8_A(args: Uint8Array): number {
        const addr = (0xFF << 8) | args[0];
        this._mmu.write_byte(addr, this._state.a);  
        this.updateDevices();
        return 12;
    }

    //0xE1 : POP_HL
    private POP_HL(): number {
        const lo = this.pop_8bit();
        this._state.l = lo;
        this.updateDevices();
        const hi = this.pop_8bit();
        this._state.h = hi;
        this.updateDevices();
        return 12;
    }

    //0xE2 : LD_MC_A
    private LD_MC_A(): number {
        const addr = (0xFF << 8) | this._state.c;
        this.mmu.write_byte(addr, this._state.a);
        this.updateDevices();
        return 8;
    }

    //0xE5 : PUSH_HL
    private PUSH_HL(): number {
        this.push_16bit(get_hl(this._state));
        this.updateDevices();
        return 16;
    }

    //0xE6 : AND_D8
    private AND_D8(args: Uint8Array): number {
        this.and_val(args[0]);
        return 8;
    }

    //0xE7 : RST_20H
    private RST_20H(): number {
        this.restart_step(0x0020);
        return 16;
    }

    //0xE8 : ADD_SP_R8
    private ADD_SP_R8(args: Uint8Array): number {
        this.updateDevices();
        this.updateDevices();
        const val = u8Toi8(args[0]);
        const halfCarry = ((this._sp & 0xF) + (args[0] & 0xF) >= 0x10) ? 1 : 0;
        const carry = ((this._sp & 0xFF) + (val & 0xFF) >= 0x100) ? 1 : 0;
        const newSP = this._sp + val;
        this._sp = (this._sp & 0xF0) | (newSP & 0x0F);
        this._sp = newSP;
        this.set_flags(0, 0, halfCarry, carry);
        return 16;
    }

    //0xE9 : JP_MHL
    private JP_MHL(): number {
        this._pc = get_hl(this._state);
        return 4;
    }

    //0xEA : LD_MA16_A
    private LD_MA16_A(args: Uint8Array): number {
        const addr = leTo16Bit(args[0], args[1]);
        this._mmu.write_byte(addr, this._state.a);
        this.updateDevices();
        return 16;
    }

    //0xEE : XOR_D8
    private XOR_D8(args: Uint8Array): number {
        this.xor_val(args[0]);
        return 8;
    }

    //0xEF : RST_28H
    private RST_28H(): number {
        this.restart_step(0x0028);
        return 16;
    }

    //0xF0 : LDH_A_MA8
    private LDH_A_MA8(args: Uint8Array): number {
        const addr = (0xFF << 8) | args[0];
        const val = this._mmu.read_byte(addr);
        this.updateDevices();
        this._state.a = val;
        return 12;
    }

    //0xF1 : POP_AF
    private POP_AF(): number {
        const lo = this.pop_8bit();
        this._state.f = lo & 0xF0;
        this.updateDevices();
        
        const hi = this.pop_8bit();
        this._state.a = hi;
        this.updateDevices();
        return 12;
    }

    //0xF2 : LD_A_MC
    private LD_A_MC(): number {
        const addr = (0xFF << 8) | this._state.c;
        const val = this._mmu.read_byte(addr);
        this._state.a = val;
        this.updateDevices();
        return 8;
    }

    //0xF3 : DI
    private DI(): number {
        console.log("Disable interrupts");
        this._IME = false;
        return 4;
    }

    //0xF5 : PUSH_AF
    private PUSH_AF(): number {
        this.updateDevices();
        this.push_16bit(get_af(this._state));
        return 16;
    }

    //0xF6 : OR_D8
    private OR_D8(args: Uint8Array): number {
        this.or_val(args[0]);
        return 8;
    }

    //0xF7 : RST_30H
    private RST_30H(): number {
        this.restart_step(0x0030);
        return 16;
    }

    //0xF8 : LD_HL_SPR8
    private LD_HL_SPR8(args: Uint8Array): number {
        this.updateDevices();
        const val = u8Toi8(args[0]);
        const halfCarry = ((this._sp & 0xF) + (args[0] & 0xF) >= 0x10) ? 1 : 0;
        const carry = ((this._sp & 0xFF) + (val & 0xFF) >= 0x100) ? 1 : 0;
        set_hl(this._state, this._sp + val);
        this.set_flags(0, 0, halfCarry, carry);
        return 12;
    }

    //0xF9 : LD_SP_HL
    private LD_SP_HL(): number {
        this.updateDevices();
        this._sp = get_hl(this._state);
        return 8;
    }

    //0xFA : LD_A_MA16
    private LD_A_MA16(args: Uint8Array): number {
        const addr = leTo16Bit(args[0], args[1]);
        const val = this._mmu.read_byte(addr);
        this.updateDevices();
        this._state.a = val;
        return 16;
    }

    //0xFB : EI
    private EI(): number {
        console.log("Enable interrupts");

        //Hack
        if(this.mmu.read_byte(this._pc) !== 0x76) {
            this._interrupt_enable_pending = true;
        } else {
            console.log("EI edge case");
            this.IME = true;
        }
        
        return 4;
    }

    //0xFE : CP_D8
    private CP_D8(args: Uint8Array): number {
        this.cp_val(args[0]);
        return 8;
    }

    //0xFF : RST_38H
    private RST_38H(): number {
        this.restart_step(0x0038);
        return 16;
    }

    public get pc() {
        return this._pc;
    }

    public get state() {
        return this._state;
    }

    public get sp() {
        return this._sp;
    }

    public set sp(sp: number) {
        this._sp = sp;
    }

    public set pc(pc: number) {
        this._pc = pc;
    }

    public get isRunning() {
        return this._isRunning;
    }

    public get isHalted() {
        return this._isHalted;
    }

    public set isHalted(isHalted: boolean) {
        this._isHalted = isHalted;
    }

    public get mmu() {
        return this._mmu;
    }

    public set isRunning(isRunning: boolean) {
        this._isRunning = isRunning;
    }

    public get IME() {
        return this._IME;
    }

    public set IME(val: boolean) {
        this._IME = val;
    }

    public get interrupt_enable_pending() {
        return this._interrupt_enable_pending;
    }

    public set interrupt_enable_pending(val: boolean) {
        this._interrupt_enable_pending = val;
    }

    public get_zero(): bit {
        const zeroMask = 1 << FLAGS_ZERO;
        return (this._state.f & zeroMask) !== 0 ? 1 : 0;
    }

    private get_sub(): bit {
        const subMask = 1 << FLAGS_SUBTRACT;
        return (this._state.f & subMask) !== 0 ? 1 : 0;
    }

    private get_halfCarry(): bit {
        const hcMask = 1 << FLAGS_HALF_CARRY;
        return (this._state.f & hcMask) !== 0 ? 1 : 0;
    }

    public get_carry(): bit {
        const carryMask = 1 << FLAGS_CARRY;
        return (this._state.f & carryMask) !== 0 ? 1 : 0;
    }

    set_flags(z?: bit, n?: bit, h?: bit, c?: bit) {
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
    s.f = ((val & 0xF0));
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
function add8Bit(a: number, b: number): {res: number, zero: bit, halfCarry: bit, carry: bit} {
    const res = (a + b) & 0xFF;
    const zero = (res === 0) ? 1 : 0;
    const carry = ((a & 0xFF) + (b & 0xFF) >= 0x100) ? 1 : 0;
    const halfCarry = ((a & 0xF) + (b & 0xF) >= 0x10) ? 1 : 0;
    return {res, zero, halfCarry, carry};
}

//Add two 8 bit numbers with carry
function add8BitC(a: number, b: number, C: bit): {res: number, zero: bit, halfCarry: bit, carry: bit} {
    const res = (a + b + C) & 0xFF;
    const zero = (res === 0) ? 1 : 0;
    const carry = (a + b + C > 0xFF) ? 1 : 0;
    const halfCarry = ((a & 0xF) + (b & 0xF) + (C) > 0xF) ? 1 : 0;
    return {res, zero, halfCarry, carry};
}

function add16Bit(a: number, b: number): {res: number, halfCarry: bit, carry: bit} {
    const res = (a + b) & 0xFFFF;
    const carry = ((a + b) >= 0x10000) ? 1 : 0;
    const halfCarry = ((a & 0xFFF) + (b & 0xFFF) >= 0x1000) ? 1 : 0;
    return {res, halfCarry, carry};
}

function subtract8Bit(a: number, b: number): {res: number, zero: bit, halfCarry: bit, carry: bit} {
    const res = (a - b) & 0xFF;
    const zero = (res === 0) ? 1 : 0;
    const carry = (a - b < 0) ? 1 : 0;
    const halfCarry = ((a & 0xF) - (b & 0xF) < 0) ? 1 : 0;
    return {res, zero, halfCarry, carry};
}

//Subtract two 8 bit numbers with carry
function subtract8BitC(a: number, b: number, C: bit): {res: number, zero: bit, halfCarry: bit, carry: bit} {
    const res = (a - C - b) & 0xFF;
    const zero = (res === 0) ? 1 : 0;
    const carry = ((a - C - b) < 0) ? 1 : 0;
    const halfCarry = (((a & 0xF) - (C) - (b & 0xF)) < 0) ? 1 : 0;
    return {res, zero, halfCarry, carry};
}

function subtract16bit(a: number, b: number): {res: number, halfCarry: bit, carry: bit} {
    const res = (a - b) & 0xFFFF;
    const carry = ((a - b) < 0) ? 1 : 0;
    const halfCarry = ((a & 0xFFF) - (b &0xFFF) < 0) ? 1 : 0;
    return {res, halfCarry, carry};
}

export {CPUContext, type CPUState, set_hl, subtract8Bit, u8Toi8};