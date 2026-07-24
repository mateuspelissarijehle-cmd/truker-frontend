import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";

// ─────────────────────────────────────────────
// ADMIN — MOTORISTA DE TESTE
// ─────────────────────────────────────────────
export function AdminMotoristaTeste({ onNavigate }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");

  const criar = async () => {
    if (!confirm("Isso vai apagar o motorista de teste anterior (teste@truker.app) e criar um novo. Confirma?")) return;
    setLoading(true); setError(""); setResultado(null);
    try {
      const data = await api("POST", "/api/admin/motorista-teste", {}, token);
      setResultado(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Motorista de Teste</h1></div>
      <div className="content">
        <div className="card" style={{ textAlign: "center", padding: "24px 20px" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🚛</div>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>Criar motorista fictício</div>
          <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6 }}>
            Cria um motorista completo com rodotrem graneleiro 57t para testar o matching e todas as funcionalidades do app.
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <button className="btn btn-primary" onClick={criar} disabled={loading} style={{ width: "100%", marginBottom: 16 }}>
          {loading ? "Criando..." : "🚛 Criar / Recriar Motorista de Teste"}
        </button>

        {resultado && (
          <>
            <div className="alert alert-success">✅ Motorista criado com sucesso!</div>
            {/* FICHA VISUAL */}
            <div className="card" style={{ border: "2px solid var(--gold)", marginTop: 16 }}>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 32 }}>🚛</div>
                <div style={{ fontWeight: 900, fontSize: 18, color: "var(--gold)", letterSpacing: 2 }}>FICHA DO MOTORISTA DE TESTE</div>
              </div>

              <div className="card-title">👤 Dados de Acesso</div>
              <div className="info-row"><span className="info-label">Nome</span><span className="info-value">{resultado.usuario.nome}</span></div>
              <div className="info-row"><span className="info-label">E-mail</span><span className="info-value" style={{ color: "var(--gold)" }}>{resultado.usuario.email}</span></div>
              <div className="info-row"><span className="info-label">Senha</span><span className="info-value" style={{ color: "var(--gold)" }}>{resultado.usuario.senha}</span></div>

              <div className="card-title" style={{ marginTop: 14 }}>🚗 Cavalo Mecânico</div>
              <div className="info-row"><span className="info-label">Tipo</span><span className="info-value">Rodotrem</span></div>
              <div className="info-row"><span className="info-label">Marca/Modelo</span><span className="info-value">Scania R450 2022</span></div>
              <div className="info-row"><span className="info-label">Placa</span><span className="info-value">{resultado.motorista.placa_cavalo}</span></div>
              <div className="info-row"><span className="info-label">RNTRC</span><span className="info-value">{resultado.motorista.rntrc}</span></div>
              <div className="info-row"><span className="info-label">CNH</span><span className="info-value">{resultado.motorista.cnh} (Cat. E)</span></div>

              <div className="card-title" style={{ marginTop: 14 }}>🔗 Conjunto Ativo</div>
              <div className="info-row"><span className="info-label">Nome</span><span className="info-value">{resultado.motorista.conjunto}</span></div>
              <div className="info-row"><span className="info-label">Carretas</span><span className="info-value">{resultado.motorista.carretas.join(", ")}</span></div>
              <div className="info-row"><span className="info-label">Carroceria</span><span className="info-value">Graneleiro</span></div>
              <div className="info-row"><span className="info-label">Capacidade</span><span className="info-value">57 toneladas</span></div>
              <div className="info-row"><span className="info-label">Cargas aceitas</span><span className="info-value">Granel sólido, Neogranel, Geral</span></div>

              <div style={{ marginTop: 16, padding: "12px", background: "rgba(201,168,76,0.08)", borderRadius: 8, fontSize: 12, color: "var(--text3)", textAlign: "center" }}>
                ⚠️ Dados fictícios para uso exclusivo em testes internos
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
