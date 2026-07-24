import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { api, apiUpload } from "../services/api";

// Fonte única de verdade das despesas do motorista: busca a lista de despesas
// registradas e o resumo de custos ANTT (/custos-resumo, que soma combustível +
// desgaste estimados de todos os fretes aceitos). `total` já sai correto —
// antes, uma das telas que mostrava despesas somava só o valor bruto da lista,
// ignorando o resumo ANTT, e batia um total diferente da outra tela pro mesmo mês.
export function useDespesasMotorista() {
  const { token } = useAuth();
  const [despesas, setDespesas] = useState([]);
  const [resumoCustos, setResumoCustos] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nova, setNova] = useState({ tipo: "combustivel", descricao: "", valor: "", data: new Date().toISOString().slice(0,10) });
  const [comprovanteUrl, setComprovanteUrl] = useState(null);
  const [lendoNf, setLendoNf] = useState(false);
  const [nfAviso, setNfAviso] = useState("");
  const setN = (k, v) => setNova(f => ({ ...f, [k]: v }));

  const carregarResumoCustos = () => {
    api("GET", "/api/motoristas/custos-resumo", null, token)
      .then(setResumoCustos).catch(() => setResumoCustos(null));
  };

  useEffect(() => {
    api("GET", "/api/motoristas/despesas", null, token)
      .then(setDespesas).catch(() => {});
    carregarResumoCustos();
  }, [token]);

  const total = resumoCustos ? resumoCustos.totalGeral : despesas.reduce((a, d) => a + Number(d.valor || 0), 0);

  const add = async () => {
    if (!nova.valor) return;
    setLoading(true);
    try {
      const salva = await api("POST", "/api/motoristas/despesas", { ...nova, comprovanteUrl }, token);
      setDespesas(d => [salva, ...d]);
      setNova({ tipo: "combustivel", descricao: "", valor: "", data: new Date().toISOString().slice(0,10) });
      setComprovanteUrl(null);
      setNfAviso("");
      setShowAdd(false);
      carregarResumoCustos();
    } catch (e) { alert("Erro ao salvar: " + e.message); }
    finally { setLoading(false); }
  };

  const remover = async (id) => {
    try {
      await api("DELETE", `/api/motoristas/despesas/${id}`, null, token);
      setDespesas(d => d.filter(x => x.id !== id));
      carregarResumoCustos();
    } catch (e) { alert("Erro ao remover: " + e.message); }
  };

  // Bug real relatado: o anexo de NF nunca era realmente enviado pro backend -- só
  // adivinhava o "tipo" pelo NOME do arquivo e descartava o arquivo, sem nunca ler o
  // valor. Agora envia de verdade pro POST /despesas/ler-nf, que salva o comprovante
  // e (pra PDF) tenta extrair o valor do texto automaticamente. Foto/imagem ainda não
  // tem OCR de verdade — nesse caso só o tipo é sugerido e o valor precisa ser conferido.
  const handleNF = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLendoNf(true);
    setNfAviso("");
    try {
      const formData = new FormData();
      formData.append("arquivo", file);
      const resp = await apiUpload("POST", "/api/motoristas/despesas/ler-nf", formData, token);
      setComprovanteUrl(resp.comprovante_url);
      setNova(f => ({
        ...f,
        tipo: resp.tipoSugerido || f.tipo,
        descricao: f.descricao || file.name.replace(/\.[^.]+$/, ""),
        valor: resp.valorSugerido != null ? String(resp.valorSugerido) : f.valor,
      }));
      if (resp.valorSugerido != null) {
        setNfAviso("✅ Valor lido automaticamente da NF — confira antes de salvar.");
      } else if (resp.leituraAutomaticaDisponivel) {
        setNfAviso("Não consegui identificar um valor no PDF — digite manualmente.");
      } else {
        setNfAviso("Leitura automática de valor só funciona para NF em PDF por enquanto — digite o valor manualmente.");
      }
    } catch (err) {
      setNfAviso("Erro ao enviar o comprovante: " + err.message);
    } finally {
      setLendoNf(false);
      e.target.value = "";
    }
  };

  return {
    despesas, resumoCustos, total, showAdd, setShowAdd, loading,
    nova, setN, comprovanteUrl, lendoNf, nfAviso,
    add, remover, handleNF,
  };
}
