import { API_BASE } from "../config";

// Paleta fixa (não aleatória) pra cor de fundo do círculo de iniciais --
// escolhida por hash do nome, então a MESMA pessoa sempre cai na mesma cor
// em qualquer tela do app. Tons derivados da paleta do app (dourado já é a
// cor de destaque principal, por isso não repetida aqui -- eram todas iguais
// e ficava sem contraste nenhum entre avatares diferentes).
const CORES_INICIAIS = [
  "#2D7A3A", "#2563EB", "#A8873A", "#8A4FBF", "#C0392B",
  "#0E7C86", "#B8590A", "#5B6B8C",
];

function corPorNome(nome) {
  let hash = 0;
  for (let i = 0; i < nome.length; i++) hash = (hash * 31 + nome.charCodeAt(i)) | 0;
  return CORES_INICIAIS[Math.abs(hash) % CORES_INICIAIS.length];
}

// Primeira letra do primeiro nome + primeira letra do último sobrenome
// (ex: "João da Silva" -> "JS"). Nome com uma palavra só -> só 1 letra.
function iniciais(nome) {
  const partes = (nome || "").trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "?";
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

function urlCompleta(path) {
  if (!path) return null;
  return path.startsWith("http") ? path : `${API_BASE}${path}`;
}

/**
 * Avatar reutilizável — usado em qualquer lugar do app que mostra nome de
 * usuário (motorista ou contratante): foto de perfil real, se tiver > logo
 * da empresa cadastrada, se tiver > círculo colorido com as iniciais do nome.
 *
 * Props:
 *   nome            — nome completo (obrigatório, usado pras iniciais/cor/alt)
 *   fotoUrl          — usuarios.foto_url (path relativo tipo "/uploads/perfil/...")
 *   logoEmpresaUrl   — usuarios.logo_empresa_url (mesmo formato)
 *   size             — diâmetro em px (default 40)
 */
export function Avatar({ nome, fotoUrl, logoEmpresaUrl, size = 40 }) {
  const src = urlCompleta(fotoUrl) || urlCompleta(logoEmpresaUrl);
  const baseStyle = {
    width: size, height: size, borderRadius: "50%", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    overflow: "hidden", fontFamily: "Inter, sans-serif",
  };

  if (src) {
    return (
      <img
        src={src}
        alt={nome || "Avatar"}
        style={{ ...baseStyle, objectFit: "cover", border: "1px solid var(--border)" }}
        // Se a imagem falhar (arquivo removido, URL quebrada), troca pro
        // fallback de iniciais em vez de deixar o ícone de imagem quebrada
        // do navegador aparecer -- substitui o próprio <img> por um <div>
        // com o mesmo estilo do fallback abaixo.
        onError={(e) => {
          const div = document.createElement("div");
          Object.assign(div.style, {
            ...baseStyle,
            background: corPorNome(nome || "?"),
            color: "#fff",
            fontWeight: 700,
            fontSize: Math.max(11, Math.round(size * 0.4)) + "px",
          });
          div.textContent = iniciais(nome);
          e.target.replaceWith(div);
        }}
      />
    );
  }

  return (
    <div
      style={{
        ...baseStyle,
        background: corPorNome(nome || "?"),
        color: "#fff",
        fontWeight: 700,
        fontSize: Math.max(11, Math.round(size * 0.4)),
      }}
      title={nome}
    >
      {iniciais(nome)}
    </div>
  );
}
