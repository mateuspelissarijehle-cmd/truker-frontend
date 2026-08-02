import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { css } from "./styles/css";
import { SuporteScreen } from "./screens/shared/SuporteScreen";
import { SobreScreen } from "./screens/shared/SobreScreen";
import { PrivacidadeScreen } from "./screens/shared/PrivacidadeScreen";
import { AlterarSenhaScreen } from "./screens/shared/AlterarSenhaScreen";
import { NotificacoesScreen } from "./screens/shared/NotificacoesScreen";
import { TermosScreen } from "./screens/shared/TermosScreen";
import { SplashScreen } from "./screens/auth/SplashScreen";
import { EntradaScreen } from "./screens/auth/EntradaScreen";
import { LoginScreen } from "./screens/auth/LoginScreen";
import { EsqueciSenhaScreen } from "./screens/auth/EsqueciSenhaScreen";
import { AdminLoginScreen } from "./screens/admin/AdminLoginScreen";
import { AdminDashboard } from "./screens/admin/AdminDashboard";
import { AdminUsuarios } from "./screens/admin/AdminUsuarios";
import { AdminMotoristaTeste } from "./screens/admin/AdminMotoristaTeste";
import { AdminSeguradorasScreen } from "./screens/admin/AdminSeguradorasScreen";
import { AdminTrocarSenha } from "./screens/admin/AdminTrocarSenha";
import { AdminFretesProblemaScreen } from "./screens/admin/AdminFretesProblemaScreen";
import { AdminCancelamentosScreen } from "./screens/admin/AdminCancelamentosScreen";
import { ChatScreen } from "./screens/shared/ChatScreen";
import { AvaliarScreen } from "./screens/shared/AvaliarScreen";
import { OpcoesMotorista } from "./screens/motorista/OpcoesMotorista";
import { OpcoesContratante } from "./screens/contratante/OpcoesContratante";
import { ContratanteHome } from "./screens/contratante/ContratanteHome";
import { BuscarMotoristasScreen } from "./screens/contratante/BuscarMotoristasScreen";
import { MeusFretes } from "./screens/contratante/MeusFretes";
import { DetalheFrete } from "./screens/contratante/DetalheFrete";
import { PropostasRecebidasScreen } from "./screens/contratante/PropostasRecebidasScreen";
import { FinancasContratante } from "./screens/contratante/FinancasContratante";
import { PagamentosScreen } from "./screens/contratante/PagamentosScreen";
import { AvaliacoesScreen } from "./screens/shared/AvaliacoesScreen";
import { PagamentoScreen } from "./screens/shared/PagamentoScreen";
import { DisponibilidadeScreen } from "./screens/motorista/DisponibilidadeScreen";
import { SeguroScreen } from "./screens/motorista/SeguroScreen";
import { ConvitesScreen } from "./screens/motorista/ConvitesScreen";
import { AceitarFreteScreen } from "./screens/motorista/AceitarFreteScreen";
import { MinhasPropostasScreen } from "./screens/motorista/MinhasPropostasScreen";
import { MeusFretesMot } from "./screens/motorista/MeusFretesMot";
import { DespesasTab } from "./screens/motorista/DespesasTab";
import { DadosPessoaisContratante } from "./screens/contratante/DadosPessoaisContratante";
import { DadosPessoaisMotorista } from "./screens/motorista/DadosPessoaisMotorista";
import { ExtratoFreteMotoristaScreen } from "./screens/motorista/ExtratoFreteMotoristaScreen";
import { PerfilContratante } from "./screens/contratante/PerfilContratante";
import { PerfilMotorista } from "./screens/motorista/PerfilMotorista";
import { DadosCaminhaoMotorista } from "./screens/motorista/DadosCaminhaoMotorista";
import { FinancasMotorista } from "./screens/motorista/FinancasMotorista";
import { MotoristaHome } from "./screens/motorista/MotoristaHome";
import { EmTransitoScreen } from "./screens/motorista/EmTransitoScreen";
import { CadastroScreen } from "./screens/auth/CadastroScreen";
import { SolicitarFreteScreen } from "./screens/contratante/SolicitarFreteScreen";
import { SosButton } from "./components/SosButton";

// ─────────────────────────────────────────────
// ROUTER
// ─────────────────────────────────────────────
function Router() {
  const { user } = useAuth();
  const [screen, setScreen] = useState("splash");
  const [screenData, setScreenData] = useState(null);

  useEffect(() => {
    if (user) {
      if (user.tipo === "admin") setScreen("admin-dashboard");
      else if (user.tipo === "motorista") setScreen("home-motorista");
      else setScreen("home-contratante");
    } else {
      // ?admin=1 é a única forma de chegar na tela de login admin — não existe
      // link nenhum na interface, de propósito (não expor pra visitante comum).
      const params = new URLSearchParams(window.location.search);
      setScreen(params.get("admin") === "1" ? "login-admin" : "entrada");
    }
  }, [user?.id, user?.tipo]);

  const navigate = (to, data = null) => {
    if (to === -1) { setScreen(user?.tipo === "motorista" ? "home-motorista" : user?.tipo === "admin" ? "admin-dashboard" : "home-contratante"); return; }
    setScreenData(data); setScreen(to); window.scrollTo(0, 0);
  };

  const p = { onNavigate: navigate };

  const renderScreen = () => {
    switch (screen) {
      case "splash": return <SplashScreen {...p} />;
      case "entrada": return <EntradaScreen {...p} />;
      case "login": return <LoginScreen {...p} />;
      case "cadastro": return <CadastroScreen screenData={screenData} {...p} />;
      case "login-admin": return <AdminLoginScreen {...p} />;
      case "esqueci-senha": return <EsqueciSenhaScreen {...p} />;
      case "admin-dashboard": return <AdminDashboard {...p} />;
      case "admin-usuarios": return <AdminUsuarios {...p} />;
      case "admin-motorista-teste": return <AdminMotoristaTeste {...p} />;
      case "admin-seguradoras": return <AdminSeguradorasScreen {...p} />;
      case "admin-trocar-senha": return <AdminTrocarSenha {...p} />;
      case "admin-fretes-problema": return <AdminFretesProblemaScreen {...p} />;
      case "admin-cancelamentos": return <AdminCancelamentosScreen {...p} />;
      case "home-contratante": return <ContratanteHome {...p} />;
      case "solicitar-frete": return <SolicitarFreteScreen screenData={screenData} {...p} />;
      case "buscar-motoristas": return <BuscarMotoristasScreen {...p} />;
      case "meus-fretes": return <MeusFretes {...p} />;
      case "detalhe-frete": return <DetalheFrete frete={screenData} {...p} />;
      case "propostas-recebidas": return <PropostasRecebidasScreen frete={screenData} {...p} />;
      case "perfil": return <PerfilContratante {...p} />;
      case "dados-pessoais-contratante": return <DadosPessoaisContratante {...p} />;
      case "pagamentos": return <PagamentosScreen {...p} />;
      case "financas-contratante": return <FinancasContratante {...p} />;
      case "home-motorista": return <MotoristaHome {...p} />;
      case "aceitar-frete": return <AceitarFreteScreen frete={screenData} {...p} />;
      case "disponibilidade-motorista": return <DisponibilidadeScreen {...p} />;
      case "seguro-motorista": return <SeguroScreen {...p} />;
      case "convites-motorista": return <ConvitesScreen {...p} />;
      case "minhas-propostas": return <MinhasPropostasScreen {...p} />;
      case "meus-fretes-motorista": return <MeusFretesMot {...p} />;
      case "em-transito": return <EmTransitoScreen frete={screenData} {...p} />;
      case "perfil-motorista": return <PerfilMotorista {...p} />;
      case "dados-pessoais-motorista": return <DadosPessoaisMotorista {...p} />;
      case "dados-caminhao": return <DadosCaminhaoMotorista {...p} />;
      case "financas-motorista": return <FinancasMotorista {...p} />;
      case "extrato-frete-motorista": return <ExtratoFreteMotoristaScreen dados={screenData} {...p} />;
      case "chat": return <ChatScreen data={screenData} {...p} />;
      case "avaliar": return <AvaliarScreen data={screenData} {...p} />;
      case "opcoes-motorista": return <OpcoesMotorista {...p} />;
      case "opcoes-contratante": return <OpcoesContratante {...p} />;
      case "termos": return <TermosScreen {...p} />;
      case "pagamento": return <PagamentoScreen data={screenData} {...p} />;
      case "avaliacoes": return <AvaliacoesScreen {...p} />;
      case "suporte": return <SuporteScreen {...p} />;
      case "sobre": return <SobreScreen {...p} />;
      case "privacidade": return <PrivacidadeScreen {...p} />;
      case "alterar-senha": return <AlterarSenhaScreen {...p} />;
      case "notificacoes": return <NotificacoesScreen {...p} />;
      default: return <SplashScreen {...p} />;
    }
  };

  return (
    <>
      {renderScreen()}
      {user?.tipo === "motorista" && <SosButton />}
    </>
  );
}

// ─────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────
export default function App() {
  return (
    <>
      <style>{css}</style>
      <AuthProvider><Router /></AuthProvider>
    </>
  );
}