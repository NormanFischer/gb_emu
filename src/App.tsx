import { ChangeEvent, useState } from 'react'
import './App.css'
import Rom from './rom';
import Emulator from './emulator';

function App() {
  const [currentRom, setRom] = useState<Blob| null>(null);

  function handleSelectFile(e: ChangeEvent<HTMLInputElement>) {
    if(e.target.files && e.target.files?.length > 0) {
      const blob = new Blob([e.target.files[0]], {type : e.target.files[0].type});
      setRom(blob);
    }
  }
  
  function retrieveCartData() {
    const fr = new FileReader();
    fr.onload = function(ev) {
      const u8Arr = new Uint8Array(ev.target?.result as ArrayBuffer);
      console.log(u8Arr);
      const emu = new Emulator(u8Arr);
      emu.start_emu();
    };
    fr.readAsArrayBuffer(currentRom as Blob);
  }

  return (
    <>
      <input type="file" accept=".gb" onChange={handleSelectFile}/>
      {
        currentRom &&
        <button onClick={retrieveCartData}>Start emu</button>
      }
    </>
  )
}

export default App
