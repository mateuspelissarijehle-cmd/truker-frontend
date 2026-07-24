import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { formatMoney } from "../utils/format";

// Cartão discreto de histórico de preços da rota (piso ANTT + média de mercado)
export function HistoricoPrecoRota({ origemCidade, origemUf, destCidade, destUf, tipoVeiculo, tipoCarga, numeroEixos, mostrarPiso = true }) {
  const { token } = useAuth();
  const [historico, setHistorico] = useState(null);

  useEffect(() => {
    if (!origemCidade || !origemUf || !destCidade || !destUf) { setHistorico(null); return; }
    let cancelado = false;
    const params = new URLSearchParams({ origem_cidade: origemCidade, origem_uf: origemUf, dest_cidade: destCidade, dest_uf: destUf });
    if (tipoVeiculo) params.set("tipo_veiculo", tipoVeiculo);
    if (tipoCarga) params.set("tipo_carga", tipoCarga);
    if (numeroEixos) params.set("numero_eixos", numeroEixos);
    api("GET", `/api/fretes/historico-precos-rota?${params.toString()}`, null, token)
      .then(data => { if (!cancelado) setHistorico(data); })
      .catch(() => { if (!cancelado) setHistorico(null); });
    return () => { cancelado = true; };
  }, [origemCidade, origemUf, destCidade, destUf, tipoVeiculo, tipoCarga, numeroEixos]);

  if (!historico) return null;
  const temMedia = historico.mediaMercado != null;

  return (
    <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", marginBottom: 14, fontSize: 12, color: "var(--text2)" }}>
      <span>📊{" "}
        {mostrarPiso && <>Piso ANTT: <strong>{formatMoney(historico.pisoAntt)}</strong></>}
        {mostrarPiso && temMedia && " · "}
        {temMedia && <>Média paga nessa rota: <strong>{formatMoney(historico.mediaMercado)}</strong> (baseado em {historico.totalFretes} frete{historico.totalFretes === 1 ? "" : "s"})</>}
      </span>
      {temMedia && historico.granularidade === "estado" && (
        <div style={{ marginTop: 4, color: "var(--text3)" }}>Média do estado — poucos dados nessa cidade exata</div>
      )}
    </div>
  );
}
