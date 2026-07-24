import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";

// ─────────────────────────────────────────────
// CHAT
// ─────────────────────────────────────────────
export function ChatScreen({ data, onNavigate }) {
  const { user, token } = useAuth();
  const frete = data?.frete;
  const freteId = frete?.id;
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState("");
  const [erroLoad, setErroLoad] = useState("");
  const bottomRef = useRef(null);
  const intervalRef = useRef(null);

  const carregarMsgs = async () => {
    if (!freteId) { setLoading(false); return; }
    try {
      const res = await api("GET", `/api/chat/${freteId}`, null, token);
      if (Array.isArray(res)) { setMsgs(res); setErroLoad(""); }
    } catch(e) { setErroLoad(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    carregarMsgs();
    intervalRef.current = setInterval(carregarMsgs, 5000);
    return () => clearInterval(intervalRef.current);
  }, [freteId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    if (!text.trim() || enviando) return;
    if (!freteId) { setErroEnvio("Abra o chat a partir de um frete ativo"); return; }
    const texto = text.trim();
    setText(""); setErroEnvio(""); setEnviando(true);
    try {
      await api("POST", `/api/chat/${freteId}`, { mensagem: texto }, token);
      await carregarMsgs();
    } catch(e) {
      setErroEnvio("Erro ao enviar: " + e.message);
      setText(texto);
    }
    finally { setEnviando(false); }
  };

  const formatHora = (dt) => {
    if (!dt) return "";
    const d = new Date(dt);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2,"0")}`;
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div className="header">
        <button className="back-btn" onClick={() => onNavigate(-1)}>←</button>
        <h1>Chat{frete ? ` — ${frete.origem_cidade || "Frete"}` : ""}</h1>
      </div>
      <div className="chat-area">
        <div style={{ flex: 1, minHeight: 8 }} />
        {loading && <div style={{ textAlign: "center", padding: 20, color: "var(--text3)" }}>Carregando...</div>}
        {!loading && msgs.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text3)" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>💬</div>
            <p>Nenhuma mensagem ainda. Inicie a conversa!</p>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={m.id || i} style={{ alignSelf: m.e_meu ? "flex-end" : "flex-start", maxWidth: "80%" }}>
            {!m.e_meu && <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 2, paddingLeft: 4 }}>{m.nome}</div>}
            <div className={`msg ${m.e_meu ? "msg-me" : "msg-other"}`}>{m.mensagem}</div>
            <div className="msg-time" style={{ textAlign: m.e_meu ? "right" : "left" }}>{formatHora(m.criado_em)}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {erroLoad && <div style={{ background: "rgba(192,57,43,0.08)", color: "var(--red)", padding: "8px 14px", fontSize: 12, borderTop: "1px solid rgba(192,57,43,0.2)" }}>&#9888; {erroLoad}</div>}
      {erroEnvio && <div style={{ background: "rgba(192,57,43,0.08)", color: "var(--red)", padding: "6px 14px", fontSize: 12 }}>{erroEnvio}</div>}
      <div className="chat-input">
        <input
          placeholder={freteId ? "Digite uma mensagem..." : "Abra por um frete ativo"}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          disabled={!freteId}
        />
        <button className="chat-send" onClick={send} disabled={enviando || !freteId}>
          {enviando ? "•••" : "➤"}
        </button>
      </div>
    </div>
  );
}
