import { useState } from "react";

export function PasswordInput({ value, onChange, placeholder, inputStyle }) {
  const [show, setShow] = useState(false);
  return (
    <div className="input-eye">
      <input type={show ? "text" : "password"} value={value} onChange={onChange} placeholder={placeholder || "••••••••"} style={inputStyle} />
      <button className="eye" type="button" onClick={() => setShow(!show)}>{show ? "🙈" : "👁"}</button>
    </div>
  );
}
