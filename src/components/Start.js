import React, {useRef} from 'react'

const Start = () => {
    const inputRef=useRef();
    const handleclick=()=>{
            inputref.current.value && setusername(inputref.current.value)
        }
  return (
    <div>
      <input className="startInput" placeholder='Enter your Name' ref={inputref}>
      <button onClick={handleclick}>Start</button>
      </input>
    </div>
  )
}

export default Start
