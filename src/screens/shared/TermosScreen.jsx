import { useAuth } from "../../context/AuthContext";

export function TermosScreen({ onNavigate }) {
  const { user } = useAuth();
  const isMotorista = user?.tipo === "motorista";
  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Termos de Uso</h1></div>
      <div className="content">
        <div className="card">
          <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7 }}>
            <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: "var(--text)" }}>Política de Privacidade e Termos de Uso — TRUKER</p>
            <p style={{ marginBottom: 10 }}><strong>Última atualização:</strong> {new Date().toLocaleDateString("pt-BR")}</p>
            <p style={{ marginBottom: 14 }}>A TRUKER Plataforma de Fretes Pesados ("TRUKER", "nós") valoriza sua privacidade. Este documento descreve como coletamos, usamos e protegemos suas informações ao usar nosso aplicativo.</p>
            <p style={{ fontWeight: 700, marginBottom: 6 }}>1. Informações que coletamos</p>
            <p style={{ marginBottom: 14 }}>Coletamos informações que você fornece diretamente (nome, e-mail, CPF/CNPJ, telefone), dados de localização GPS quando o app está em uso, informações do veículo e documentos enviados pelos motoristas, e dados de uso da plataforma.</p>
            <p style={{ fontWeight: 700, marginBottom: 6 }}>2. Como usamos suas informações</p>
            <p style={{ marginBottom: 14 }}>Utilizamos seus dados para conectar contratantes e motoristas, processar pagamentos, enviar notificações sobre fretes disponíveis, melhorar nossos serviços e cumprir obrigações legais.</p>
            <p style={{ fontWeight: 700, marginBottom: 6 }}>3. Compartilhamento de dados</p>
            <p style={{ marginBottom: 14 }}>Seus dados são compartilhados apenas entre as partes envolvidas em um frete (contratante e motorista). Não vendemos seus dados a terceiros. Podemos compartilhar dados com autoridades quando exigido por lei.</p>
            <p style={{ fontWeight: 700, marginBottom: 6 }}>4. Localização GPS</p>
            <p style={{ marginBottom: 14 }}>A localização do motorista é coletada em tempo real durante fretes ativos. O contratante pode visualizar a posição do motorista durante a entrega. Você pode desativar o GPS a qualquer momento nas configurações do dispositivo.</p>
            <p style={{ fontWeight: 700, marginBottom: 6 }}>5. Segurança</p>
            <p style={{ marginBottom: 14 }}>Utilizamos criptografia e boas práticas de segurança para proteger seus dados. Senhas são armazenadas com hash seguro e tokens JWT com expiração.</p>
            <p style={{ fontWeight: 700, marginBottom: 6 }}>6. Seus direitos</p>
            <p style={{ marginBottom: 14 }}>Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento pelo suporte. Em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).</p>
            <p style={{ fontWeight: 700, marginBottom: 6 }}>7. Contato</p>
            <p>Para dúvidas sobre privacidade: <strong>privacidade@truker.app</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
}
