import { ChangeEvent, useEffect, useState } from 'react'
import './App.css'
import Rom from './rom';
import Emulator from './emulator';

function App() {
  const [currentRom, setRom] = useState<Blob| null>(null);
  const [emu, setEmu] = useState<Emulator | null>(null);
  const [currentPC, setPC] = useState<string>("");

  function handleSelectFile(e: ChangeEvent<HTMLInputElement>) {
    if(e.target.files && e.target.files?.length > 0) {
      const blob = new Blob([e.target.files[0]], {type : e.target.files[0].type});
      setRom(blob);
    }
  }

  useEffect(() => {
    if(emu !== null) {
      console.log("Starting emulator");
      emu.changeStateCallback = setPC;
      (emu as Emulator).start_emu();
    }
  }, [emu]);
  
  function retrieveCartData() {
    const fr = new FileReader();
    fr.onload = function(ev) {
      const u8Arr = new Uint8Array(ev.target?.result as ArrayBuffer);
      console.log(u8Arr);
      setEmu(new Emulator(u8Arr));
    };
    fr.readAsArrayBuffer(currentRom as Blob);
  }

  return (
    <>
      {
        emu &&
        <h1>pc: {currentPC}</h1>
      }
      <input type="file" accept=".gb" onChange={handleSelectFile}/>
      {
        currentRom &&
        <button onClick={retrieveCartData}>Start emu</button>
      }
    </>
  )
}

export default App
