import Emulator from "./emulator";
import MMU from "./mmu";

//Lower # = higher priority
const I_VBLANK = 0;
const I_LCD = 1;
const I_TIMER = 2;
const I_SERIAL = 3;
const I_JOYPAD = 4;

const ADDR_VBLANK = 0x40;
const ADDR_STAT = 0x48;
const ADDR_TIMER = 0x50;
const ADDR_SERIAL = 0x58;
const ADDR_JOYPAD = 0x60;

function push_interrupt(emu: Emulator, addr: number) {
    emu.cpu.sp--;
    emu.cpu.mmu.write_byte(emu.cpu.sp--, (emu.cpu.pc >> 8) & 0xFF);
    emu.cpu.mmu.write_byte(emu.cpu.sp, emu.cpu.pc & 0xFF);
    emu.cpu.pc = addr;
}

function interrupt_handler(emu: Emulator) {
    emu.cpu.IME = false;
    const IE = emu.cpu.mmu.read_byte(0xFFFF);
    const IF = emu.cpu.mmu.read_byte(0xFF0F);

    //Handle by priority (vblank may be redundant but it looks nice)
    if((IE & (1 << I_VBLANK)) && (IF & (1 << I_VBLANK))) {
        emu.cpu.mmu.write_byte(0xFF0F, IF & ~(1 << I_VBLANK));
        console.log("Servicing vblank interrupt: " + emu.cpu.mmu.read_byte(0xFF0F).toString(2));
        push_interrupt(emu, ADDR_VBLANK);
        return;
    } else if((IE & (1 << I_LCD)) && (IF & (1 << I_LCD))) {
        emu.cpu.mmu.write_byte(0xFF0F, IF & ~(1 << I_LCD));
        push_interrupt(emu, ADDR_STAT);
        return;
    } else if((IE & (1 << I_TIMER)) && (IF & (1 << I_TIMER))) {
        emu.cpu.mmu.write_byte(0xFF0F, IF & ~(1 << I_TIMER));
        push_interrupt(emu, ADDR_TIMER);
        return;
    } else if((IE & (1 << I_SERIAL)) && (IF & (1 << I_SERIAL))) {
        emu.cpu.mmu.write_byte(0xFF0F, IF & ~(1 << I_SERIAL));
        push_interrupt(emu, ADDR_SERIAL);
        return;
    } else if((IE & (1 << I_JOYPAD)) && (IF & (1 << I_JOYPAD))) {
        emu.cpu.mmu.write_byte(0xFF0F, IF & ~(1 << I_JOYPAD));
        push_interrupt(emu, ADDR_JOYPAD);
        return;
    }
}

function request_interrupt(mmu: MMU, pos: number) {
    if(pos < 5) {
        let IF = mmu.read_byte(0xFF0F);
        IF |= (1 << pos);
        mmu.write_byte(0xFF0F, IF);
    }
}

export { push_interrupt, interrupt_handler, request_interrupt }