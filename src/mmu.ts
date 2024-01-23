import Cartridge from "./cartridge";
import HRAM from "./hram";
import { request_interrupt } from "./interruptHandler";
import IO from "./io";
import MBC1 from "./mbc1";
import PPU from "./ppu";
import Rom from "./rom";
import Timer from "./timer";


//Has access to all devices' memory
class MMU {
    rom: Cartridge;
    ppu: PPU;
    io: IO;
    hram: HRAM;
    ie: number;
    if: number;
    serial_data: number;
    serial_buf: string;
    timer: Timer;

    audioPlaceHolder: number;

    //Joypad controls
    joypadUpperNibble: number;
    buttonNibble: number;
    dpadNibble: number;
    buttonSelect: boolean;

    constructor(romData: Uint8Array) {
        console.log("Rom type = " + romData[0x147].toString(16));
        switch(romData[0x147]) {
            case 0x00:
            case 0x08:
            case 0x09:
                this.rom = new Rom(romData);
                break;
            case 0x01:
            case 0x02:
            case 0x03:
                this.rom = new MBC1(romData);
                break;
            default:
                throw new Error("Invalid rom type found: " + romData[0x147].toString(16));
        }
        this.ppu = new PPU();
        this.io = new IO();
        this.hram = new HRAM();
        this.ie = 0;
        this.if = 0xE1;
        this.serial_data = 0;
        this.serial_buf = "";
        this.timer = new Timer();
        this.joypadUpperNibble = 0b1100;
        this.buttonNibble = 0b1111;
        this.dpadNibble = 0b1111;
        this.buttonSelect = false;
        this.audioPlaceHolder = 0;
    }

    read_byte(addr: number): number {
        if (addr < 0x4000) {
            //rom data
            return this.rom.readBankA(addr);
        } else if(addr < 0x8000) {
            return this.rom.readBankB(addr);
        } else if (addr < 0xA000) {
            //vram
            const val = this.ppu.vram_read(addr);
            return val;
        } else if (addr < 0xC000) {
            //cart ram
            return this.rom.externRead(addr);
        } else if (addr < 0xE000) {
            //wram
            return this.rom.wramRead(addr);
        } else if (addr < 0xFE00) {
            //echo ram
            return this.rom.wramRead(addr - 0x2000);
        } else if (addr < 0xFEA0) {
            if(this.dma_transfer) {
                return 0xFF;
            }
            return this.ppu.oam_read(addr);
        } else if (addr < 0xFF00) {
            return 0xff;
        } else if (addr < 0xFF80) {
            if(addr === 0xFF26) {
                return this.audioPlaceHolder;
            }

            if(addr === 0xFF00) {
                if(this.buttonSelect) {
                    return (this.joypadUpperNibble << 4) | this.buttonNibble;
                } else {
                    return (this.joypadUpperNibble << 4) | this.dpadNibble;
                }
            }

            if(addr >= 0xFF04 && addr <= 0xFF07) {
                return this.timer.timer_read(addr);
            }

            if(addr === 0xFF47) {
                console.log("READ PALETTE");
            }

            if(addr == 0xFF45 || addr == 0xFF44 || addr == 0xFF41 || addr == 0xFF42 || addr == 0xFF43 || addr === 0xFF40 || addr === 0xFF4A || addr === 0xFF4B) {
                return this.ppu.io_read(addr);
            }
            if(addr === 0xFF46) {
                return this.dmaWriteVal;
            }
            if(addr === 0xFF0F) {
                return this.if;
            }
            if(addr === 0xFF01) {
                return this.serial_data;
            }
            if(addr === 0xFF02) {
                return 0x7e;
            }
            console.log("IO read for unimplemented addr @" + addr.toString(16));
            return 0xff;
        } else if(addr === 0xFFFF) {
            return this.ie;
        } else {
            //hram
            const val = this.hram.read(addr);
            return val;
        }
    }

    write_byte(addr: number, val: number) {
        if (addr < 0x4000) {
            //rom data
            this.rom.writeBankA(addr, val);
        } else if (addr < 0x8000) {
            this.rom.writeBankB(addr, val);
        } else if (addr < 0xA000) {
            //vram
            this.ppu.vram_write(addr, val);
        } else if (addr < 0xC000) {
            //cart ram
            this.rom.externWrite(addr, val);
            return;
        } else if (addr < 0xE000) {
            //wram
            this.rom.wramWrite(addr, val);
            return;
        } else if (addr < 0xFE00) {
            //reserved echo ram
            this.rom.wramWrite(addr - 0x2000, val);
            return;
        } else if (addr < 0xFEA0) {
            if(!this.dma_transfer) {
                this.ppu.oam_write(addr, val);
            }
        } else if (addr < 0xFF00) {
            console.log("Reserved unusable write denied...");
        } else if (addr < 0xFF80) {
            if(addr === 0xFF00) {
                this.joypadUpperNibble = val >> 4;
                //Can only write to upper nibble for joypad
                if((val & 0b100000) >> 5 === 1) {
                    this.buttonSelect = false;
                } else if((val & 0b010000) >> 4 === 1) {
                    this.buttonSelect = true;
                }
            }

            if(addr >= 0xFF04 && addr <= 0xFF07) {
                this.timer.timer_write(this, addr, val);
            }

            if(addr == 0xFF0F) {
                this.if = 0b11100000 | (val & 0b00011111);
                return;
            }
            if(addr == 0xFF45 || addr == 0xFF44 || addr == 0xFF41 || addr == 0xFF42 || addr == 0xFF43 || addr === 0xFF40 || addr === 0xFF4A || addr === 0xFF4B) {
                this.ppu.io_write(addr, val, this);
                return;
            }
            if(addr === 0xFF46) {
                //DMA Transfer subroutine
                this.dma_enabled = true;
                this.dma_addr = val << 8;
                this.dmaWriteVal = val;
                return;
            }
            if(addr === 0xFF01) {
                if(val === 10) {
                    console.log("Serial: " + this.serial_buf);
                    this.serial_buf = "";
                } else {
                    this.serial_buf += String.fromCharCode(val);
                }
                return;
            }
            if(addr === 0xFF02 && val === 0x81) {
                request_interrupt(this, 3);
                return;
            }
            return;
        } else if(addr === 0xFFFF) {
            console.log("Ie = " + this.ie.toString(16));
            this.ie = val;
            return;
        } else {
            //hram
            this.hram.write(addr, val);
        }
    }

    private dmaWriteVal = 0;
    private dma_clock = 0;
    private dma_enabled = false;
    private dma_transfer = false;
    private dma_addr = 0xFF;
    dma_step() {
        if(this.dma_enabled) {
            console.assert(this.dma_addr !== 0x00);
            //Two clock delay
            if(this.dma_clock >= 1) {
                this.dma_transfer = true;
                const dma_byte = this.read_byte(this.dma_addr + this.dma_clock - 1);
                const dst = 0xFE00 + (this.dma_clock - 1);
                this.ppu.oam_write(dst, dma_byte);
            }
            if(this.dma_clock++ > 0xA0) {
                this.dma_clock = 0;
                this.dma_transfer = false;
                this.dma_enabled = false;
            } 
        }
    }

    joypad_nibble_condition(prev: number, newNibble: number) {
        return (((prev & 0b1) === 1 && (newNibble & 0b1) === 0) ||
        ((((prev & 0b10) >> 1)) === 1) && (((newNibble &0b10) >> 1) === 0) ||
        ((((prev & 0b100) >> 2)) === 1) && (((newNibble &0b100) >> 2) === 0) ||
        ((((prev & 0b1000) >> 3)) === 1) && (((newNibble &0b1000) >> 3) === 0));
    }
    
    //User pressed a button
    joypad_set(bit: number, button: boolean) {
        //Buttons
        if(button) {
            const prev = this.buttonNibble;
            this.buttonNibble &= ~(1 << bit);
            //console.log("Set button");
            if(this.buttonSelect && this.joypad_nibble_condition(prev, this.buttonNibble)) {
                request_interrupt(this, 4);
            }
        } else {
            //D-pad
            //console.log("Setting dpad");
            const prev = this.dpadNibble;
            this.dpadNibble &= ~(1 << bit);
            if(!this.buttonSelect && this.joypad_nibble_condition(prev, this.dpadNibble)) {
                request_interrupt(this, 4);
            }
        }
    }

    //User released a button
    joypad_unset(bit: number, button: boolean) {
        if(button) {
            this.buttonNibble |= (1 << bit);
        } else {
            this.dpadNibble |= (1 << bit);
        }
    }

}

export default MMU;