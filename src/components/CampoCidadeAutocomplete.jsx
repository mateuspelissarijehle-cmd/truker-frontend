import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { resolverUF } from "../utils/geo";

// Campo de cidade com autocomplete (Google Places, restrito a cidades via
// GET /api/maps/autocomplete). Controlado — value/onChange ficam com quem chama,
// então o usuário sempre pode digitar livremente mesmo sem usar sugestão nenhuma.
// Ao escolher uma sugestão, onSelecionar recebe {cidade, uf, descricao, placeId}
// já com a UF resolvida pra sigla de 2 letras.
export function CampoCidadeAutocomplete({ label = "Cidade", value, onChange, onSelecionar, placeholder = "Digite a cidade", inputStyle }) {
  const { token } = useAuth();
  const [sugestoes, setSugestoes] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!value || value.trim().length < 3) { setSugestoes([]); setAberto(false); return; }
    let cancelado = false;
    setBuscando(true);
    const t = setTimeout(() => {
      api("GET", `/api/maps/autocomplete?q=${encodeURIComponent(value.trim())}`, null, token)
        .then(data => { if (!cancelado) { setSugestoes(data); setAberto(data.length > 0); } })
        .catch(() => { if (!cancelado) { setSugestoes([]); setAberto(false); } })
        .finally(() => { if (!cancelado) setBuscando(false); });
    }, 300);
    return () => { cancelado = true; clearTimeout(t); };
  }, [value]);

  useEffect(() => {
    const fechar = e => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setAberto(false); };
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, []);

  const escolher = sug => {
    const termos = sug.terms || [];
    const cidade = termos[0]?.value || sug.descricao.split(",")[0].trim();
    const uf = resolverUF(termos[1]?.value);
    setAberto(false);
    setSugestoes([]);
    onSelecionar({ cidade, uf, descricao: sug.descricao, placeId: sug.placeId });
  };

  return (
    <div className={label ? "field" : undefined} style={{ position: "relative" }} ref={wrapperRef}>
      {label && <label>{label}</label>}
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => sugestoes.length > 0 && setAberto(true)}
        placeholder={placeholder}
        autoComplete="off"
        style={inputStyle}
      />
      {aberto && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", zIndex: 50, maxHeight: 220, overflowY: "auto" }}>
          {buscando && <div style={{ padding: "10px 14px", fontSize: 13, color: "var(--text3)" }}>Buscando...</div>}
          {!buscando && sugestoes.map(s => (
            <div key={s.placeId} onMouseDown={e => e.preventDefault()} onClick={() => escolher(s)}
              style={{ padding: "10px 14px", fontSize: 13, color: "var(--text)", cursor: "pointer", borderBottom: "1px solid var(--border)" }}>
              📍 {s.descricao}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
