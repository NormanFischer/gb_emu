import { ChangeEvent, useEffect, useRef, useState } from 'react'
import './App.css'
import Emulator from './emulator';

function App() {
  const [currentRom, setRom] = useState<Blob| null>(null);
  const [emu, setEmu] = useState<Emulator | null>(null);
  const [currentPC, setPC] = useState<string>("");
  const [currentA, setA] = useState<string>("");
  const [debug, setDebug] = useState<boolean>(false);

  const vramCanvas = useRef<HTMLCanvasElement | null>(null);
  const gameScreenCanvas = useRef<HTMLCanvasElement | null>(null);

  function handleSelectFile(e: ChangeEvent<HTMLInputElement>) {
    if(e.target.files && e.target.files?.length > 0) {
      const blob = new Blob([e.target.files[0]], {type : e.target.files[0].type});
      setRom(blob);
    }
  }

  function updateCPUStateDisplay(a: string, pc: string) {
    setA(a);
    setPC(pc);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if(emu != null) {
      console.log("Key down");
      switch(e.key) {
        //Start
        case " ":
          emu.cpu.mmu.joypad_set(3, true);
          break;
        //Down
        case "ArrowDown":
          emu.cpu.mmu.joypad_set(3, false);
          break;
        //Select
        case "Enter":
          emu.cpu.mmu.joypad_set(2, true);
          break;
        //Up
        case "ArrowUp":
          emu.cpu.mmu.joypad_set(2, false);
          break;
        //B
        case "z":
          emu.cpu.mmu.joypad_set(1, true);
          break;
        //Left
        case "ArrowLeft":
          emu.cpu.mmu.joypad_set(1, false);
          break;
        //A
        case "x":
          emu.cpu.mmu.joypad_set(0, true);
          break;
        //Right
        case "ArrowRight":
          emu.cpu.mmu.joypad_set(0, false);
          break;
        default:
          break;
      }
    }

  }

  function handleKeyUp(e: KeyboardEvent) {
    if(emu) {
      switch(e.key) {
        //Start
        case " ":
          emu.cpu.mmu.joypad_unset(3, true);
          break;
        //Down
        case "ArrowDown":
          emu.cpu.mmu.joypad_unset(3, false);
          break;
        //Select
        case "Enter":
          emu.cpu.mmu.joypad_unset(2, true);
          break;
        //Up
        case "ArrowUp":
          emu.cpu.mmu.joypad_unset(2, false);
          break;
        //B
        case "z":
          emu.cpu.mmu.joypad_unset(1, true);
          break;
        //Left
        case "ArrowLeft":
          emu.cpu.mmu.joypad_unset(1, false);
          break;
        //A
        case "x":
          emu.cpu.mmu.joypad_unset(0, true);
          break;
        //Right
        case "ArrowRight":
          emu.cpu.mmu.joypad_unset(0, false);
          break;
        default:
          break;
      }
    }
  }

  useEffect(() => {
    if(emu !== null) {
      console.log("Starting emulator");
      emu.changeStateCallback = updateCPUStateDisplay;
      (emu as Emulator).start_emu();
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return(() => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    });
  }, [emu]);
  
  function retrieveCartData() {
    const fr = new FileReader();
    fr.onload = function(ev) {
      const u8Arr = new Uint8Array(ev.target?.result as ArrayBuffer);
      setEmu(new Emulator(u8Arr, 
        (vramCanvas.current as HTMLCanvasElement).getContext('2d') as CanvasRenderingContext2D, 
        (gameScreenCanvas.current as HTMLCanvasElement).getContext('2d') as CanvasRenderingContext2D
        ,debug));
    };
    fr.readAsArrayBuffer(currentRom as Blob);
  }

  return (
    <>
      {
        emu &&
        <>
          <h2>pc: {currentPC}</h2>
          <h2>A: {currentA}</h2>
          <button onClick={() => {
            emu.cpu.isRunning = false;
          }}>Stop</button>
          <button onClick={() => {
            if(emu.debug) {
              emu.emu_step();
            }
          }}>Step</button>
        </>
      }
      <canvas id="vramMap" ref={vramCanvas} width="128" height="192" style={{border: "1px solid #d3d3d3"}}></canvas>
      <canvas id="gameScreen" ref={gameScreenCanvas} width="160" height = "144" style={{border: "1px solid #d3d3d3"}}></canvas>
      <input type="file" accept=".gb" onChange={handleSelectFile}/>
      {
        currentRom &&
        <>
        <button onClick={retrieveCartData}>Start emu</button>
        <button onClick={() => setDebug(!debug)}>Debug: {debug}</button>
        </>
      }
    </>
  )
}

export default App
