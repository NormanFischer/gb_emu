import { expect, test } from 'vitest';
import { CPUContext, set_hl, subtract8Bit } from '../src/cpu';

test("JP tests", () => {
    const cpu = new CPUContext(new Uint8Array());

    //JP_A16
    cpu.execute_instruction(0xC3, new Uint8Array([0x02, 0x15]));
    expect(cpu.pc).toBe(0x1502);

    //JP_Z_A16 
    cpu.set_flags(0,0,0,0);
    //Should not jump
    cpu.execute_instruction(0xCA, new Uint8Array([0x03, 0x10]));
    expect(cpu.pc).toBe(0x1502);

    //Should jump
    cpu.set_flags(1,0,0,0);
    cpu.execute_instruction(0xCA, new Uint8Array([0x30, 0x01]));
    expect(cpu.pc).toBe(0x130);

    //JP_MHL
    set_hl(cpu.state, 0xFF57);
    cpu.execute_instruction(0xE9, new Uint8Array());
    expect(cpu.pc).toBe(0xFF57);
});

test("RST tests", () => {
    const cpu = new CPUContext(new Uint8Array());

    //RST_00H
    cpu.execute_instruction(0xC7, new Uint8Array());
    expect(cpu.pc).toBe(0x0000);

    //RST_10H
    cpu.execute_instruction(0xD7, new Uint8Array());
    expect(cpu.pc).toBe(0x0010);

    //RST_20H
    cpu.execute_instruction(0xE7, new Uint8Array());
    expect(cpu.pc).toBe(0x0020);

    //RST_30H
    cpu.execute_instruction(0xF7, new Uint8Array());
    expect(cpu.pc).toBe(0x0030);

    //RST_08H
    cpu.execute_instruction(0xCF, new Uint8Array());
    expect(cpu.pc).toBe(0x0008);

    //RST_18H
    cpu.execute_instruction(0xDF, new Uint8Array());
    expect(cpu.pc).toBe(0x0018);

    //RST_28H
    cpu.execute_instruction(0xEF, new Uint8Array());
    expect(cpu.pc).toBe(0x0028);

    //RST_38H
    cpu.execute_instruction(0xFF, new Uint8Array());
    expect(cpu.pc).toBe(0x0038);
});

test("CALL/RET tests", () => {
    const cpu = new CPUContext(new Uint8Array());

    //CALL_A16
    cpu.pc = 0x1234;
    cpu.sp = 0xFFFF;
    cpu.execute_instruction(0xCD, new Uint8Array([0x6E, 0xED]));
    expect(cpu.pc).toBe(0xED6E);
    expect(cpu.sp).toBe(0xFFFD);

    //CALL_NZ_A16
    cpu.set_flags(1,0,0,0);
    cpu.execute_instruction(0xC4, new Uint8Array([0x99, 0x99]));
    expect(cpu.pc).toBe(0xED6E);
    expect(cpu.sp).toBe(0xFFFD);
    cpu.set_flags(0,0,0,0);
    cpu.execute_instruction(0xC4, new Uint8Array([0x99, 0x99]));
    expect(cpu.pc).toBe(0x9999);
    expect(cpu.sp).toBe(0xFFFB);

    /* Stack
        6E
        ED
        34
        12
    */

    //RET_Z
    cpu.execute_instruction(0xC8, new Uint8Array());
    expect(cpu.pc).toBe(0x9999);
    expect(cpu.sp).toBe(0xFFFB);
    cpu.set_flags(1,0,0,0);
    cpu.execute_instruction(0xC8, new Uint8Array());
    expect(cpu.pc).toBe(0xED6E);
    expect(cpu.sp).toBe(0xFFFD);

    //RET_NZ
    cpu.set_flags(1,0,0,0);
    cpu.execute_instruction(0xC0, new Uint8Array());
    expect(cpu.pc).toBe(0xED6E);
    expect(cpu.sp).toBe(0xFFFD);
    cpu.set_flags(0,0,0,0);
    cpu.execute_instruction(0xC0, new Uint8Array());
    expect(cpu.pc).toBe(0x1234);
    expect(cpu.sp).toBe(0xFFFF);
});

test("CB tests", () => {
    const cpu = new CPUContext(new Uint8Array());
    //SWAP
    cpu.state.a = 0x34;
    cpu.execute_instruction(0xCB, new Uint8Array([0x37]));
    expect(cpu.state.a).toBe(0x43);

    //RES 0
    cpu.state.a = 0b11111111;
    cpu.execute_instruction(0xCB, new Uint8Array([0x87]));
    expect(cpu.state.a).toBe(0b11111110);
    cpu.execute_instruction(0xCB, new Uint8Array([0x87]));
    expect(cpu.state.a).toBe(0b11111110);

    cpu.state.a = 0b11110000;
    cpu.set_flags(0,0,0,1);
    cpu.execute_instruction(0x17, new Uint8Array([]));
    expect(cpu.state.a).toBe(0b11100001);
    expect(cpu.get_carry()).toBe(1);

    cpu.state.a = 0b00000000;
    cpu.set_flags(0,0,0,1);
    cpu.execute_instruction(0x17, new Uint8Array([]));
    expect(cpu.state.a).toBe(0b00000001);
    expect(cpu.get_carry()).toBe(0);

    cpu.state.a = 0b11111111;
    cpu.set_flags(0,0,0,0);
    cpu.execute_instruction(0x17, new Uint8Array([]));
    expect(cpu.state.a).toBe(0b11111110);
    expect(cpu.get_carry()).toBe(1);

});

test("POP AF", () => {
    const cpu = new CPUContext(new Uint8Array);
    cpu.sp = 0xFFFE;

    //ld bc, $1200
    cpu.execute_instruction(0x01 ,new Uint8Array([0x00, 0x12]));
    expect(cpu.state.b).toBe(0x12);
    expect(cpu.state.c).toBe(0x00);

    //push bc
    cpu.execute_instruction(0xC5, new Uint8Array);
    expect(cpu.sp).toBe(0xFFFE - 2);

    //pop af
    cpu.execute_instruction(0xF1, new Uint8Array);
    expect(cpu.state.a).toBe(0x12);
    expect(cpu.state.f).toBe(0x00);
    expect(cpu.sp).toBe(0xFFFE);

    //push af
    cpu.execute_instruction(0xF5, new Uint8Array);
    expect(cpu.sp).toBe(0xFFFE - 2);

    //pop de
    cpu.execute_instruction(0xD1, new Uint8Array);
    expect(cpu.state.d).toBe(0x12);
    expect(cpu.state.f).toBe(0x00);

    //ld a, c
    cpu.execute_instruction(0x79, new Uint8Array);
    expect(cpu.state.a).toBe(cpu.state.c);

    //and $F0
    cpu.execute_instruction(0xE6, new Uint8Array([0xF0]));
    expect(cpu.state.a).toBe(0x00);
    expect(cpu.state.e).toBe(0x00);
    expect(subtract8Bit(cpu.state.a, cpu.state.e).res).toBe(0x00);
});