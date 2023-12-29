import { ChangeEvent, useEffect, useState } from 'react'
import './App.css'
import Rom from './rom';
import Emulator from './emulator';
import ReactDOM from 'react-dom';

function App() {
  const [currentRom, setRom] = useState<Blob| null>(null);
  const [emu, setEmu] = useState<Emulator | null>(null);
  const [currentPC, setPC] = useState<string>("");
  const [currentA, setA] = useState<string>("");

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

  useEffect(() => {
    if(emu !== null) {
      console.log("Starting emulator");
      emu.changeStateCallback = updateCPUStateDisplay;
      (emu as Emulator).start_emu();
    }
  }, [emu]);
  
  function retrieveCartData() {
    const fr = new FileReader();
    fr.onload = function(ev) {
      const u8Arr = new Uint8Array(ev.target?.result as ArrayBuffer);
      setEmu(new Emulator(u8Arr));
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
        </>
      }
      <canvas id="gameScreen" width="160" height="144" style={{border: "1px solid #d3d3d3"}}></canvas>
      <input type="file" accept=".gb" onChange={handleSelectFile}/>
      {
        currentRom &&
        <button onClick={retrieveCartData}>Start emu</button>
      }
    </>
  )
}

export default App
