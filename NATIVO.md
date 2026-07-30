# TRUKER nativo (Android/iOS) — guia pra quem não programa

Este documento explica, em linguagem simples, o que já foi feito pra transformar
o TRUKER (hoje um PWA/site) em um app instalável (.apk / .aab) e o que ainda
falta fazer numa máquina com Android Studio.

## O que é o Capacitor e por que ele resolve o problema

O TRUKER é construído em React + Vite e já funciona como PWA (dá pra "instalar"
pelo navegador). Só que um PWA sozinho **não gera um arquivo .apk** pra
sideload nem pode ser publicado como app nativo na Play Store/App Store.

O [Capacitor](https://capacitorjs.com) é uma ferramenta que pega o site já
pronto (a pasta `dist/` gerada pelo `npm run build`) e embrulha ele dentro de
um projeto Android (e, futuramente, iOS) nativo de verdade — com um ícone, um
nome de app, um `.apk` que pode ser instalado direto no celular, e a
possibilidade de publicar nas lojas.

**Importante: isso não reescreveu o app.** O código React em `src/` continua
sendo a fonte de verdade. O Capacitor só empacota o resultado do build.

## O que já foi feito

1. Instalados os pacotes `@capacitor/core`, `@capacitor/cli` (dev) e
   `@capacitor/android` (e `@capacitor/ios`, já que preparar a base pro iOS
   saiu barato).
2. Criado `capacitor.config.json` na raiz do projeto:
   - `appId`: `com.truker.app` (identificador único do app — não existia
     nenhum definido antes, então foi escolhido esse; **se você já registrou
     esse app em algum lugar com outro id, avise antes de gerar a versão
     final**, porque trocar o `appId` depois de publicar na loja não é
     trivial).
   - `appName`: `TRUKER`
   - `webDir`: `dist` (a pasta que o `npm run build` gera)
3. Gerada a pasta `android/` — um projeto Android nativo completo (Gradle,
   `AndroidManifest.xml`, ícones, etc), já sincronizado com o build atual do
   site (`npx cap sync`).
4. Ajustado `android/.gitignore` pra nunca versionar arquivos de keystore
   (`.jks`/`.keystore`) — a chave que assina o app é sensível e não pode ir
   pro Git.

## O que NÃO foi possível fazer aqui (e por quê)

Este ambiente (onde o Claude trabalhou) **não tem Java nem o Android SDK/Android
Studio instalados** — só o Node.js. Então não foi possível:

- Compilar o projeto Android de verdade (`./gradlew assembleDebug` etc falha
  com `JAVA_HOME is not set`).
- Gerar um `.apk` ou `.aab` de fato.
- Testar o app rodando num emulador ou celular físico.

A estrutura do projeto Android foi gerada e validada (arquivos corretos,
`appId` e nome consistentes em todos os lugares), mas a compilação final
**precisa ser feita numa máquina com Android Studio instalado**.

## Passo a passo pra gerar o APK (numa máquina com Android Studio)

1. **Baixe e instale o [Android Studio](https://developer.android.com/studio)**
   (gratuito). Ele já vem com o Android SDK e o Java (JDK) necessários — não
   precisa instalar nada separado.
2. **Clone/baixe o repositório do projeto** (`truker-frontend`) nessa máquina.
3. Abra um terminal na pasta do projeto e rode:
   ```
   npm install
   npm run build
   npx cap sync android
   ```
   Isso garante que a pasta `android/` está com a versão mais recente do site.
4. **Abra a pasta `android/` no Android Studio** (`File > Open`, selecione a
   pasta `android` dentro do projeto — não a raiz do projeto).
5. Espere o Android Studio baixar as dependências e indexar o projeto (pode
   demorar alguns minutos na primeira vez).
6. Pra testar rápido: conecte um celular Android via USB (com "Depuração USB"
   ativada nas opções de desenvolvedor) ou use um emulador, e clique no botão
   verde de "Run" (▶). Isso instala uma versão de teste (debug) direto no
   aparelho.
7. **Pra gerar o APK final pra distribuir (sideload)**:
   - Menu `Build > Generate Signed Bundle / APK...`
   - Escolha **APK**.
   - Na primeira vez, clique em "Create new..." pra criar uma **keystore**
     (é o arquivo que "assina" o app — funciona como uma assinatura digital
     permanente do TRUKER). **Guarde esse arquivo `.jks` e a senha em local
     seguro (ex: gerenciador de senhas) — se perder, não dá pra atualizar o
     app depois com a mesma identidade, precisaria publicar como um app
     novo.**
   - Escolha o build type `release`.
   - O Android Studio gera o `.apk` em
     `android/app/release/app-release.apk`. Esse é o arquivo que pode ser
     enviado direto pro celular do motorista/contratante pra instalar
     manualmente (sideload), enquanto o D-U-N-S não sai.
8. **Pra gerar o `.aab` (formato exigido pela Play Store)**: mesmo menu,
   escolha **Android App Bundle** em vez de APK, usando a mesma keystore.
   Esse é o arquivo que se envia no Google Play Console quando for publicar
   oficialmente.

### Sobre o ícone e a splash screen

O ícone atual do Android foi gerado automaticamente a partir de um ícone
padrão do Capacitor — **não é o ícone real do TRUKER ainda**. Pra trocar:
- Use o [Image Asset Studio](https://developer.android.com/studio/write/image-asset-studio)
  dentro do Android Studio (`botão direito em res/ > New > Image Asset`),
  usando como base o `public/icon-512.png` do projeto.

## iOS — o que falta

A base foi preparada (`@capacitor/ios` instalado), mas a plataforma iOS em si
(`npx cap add ios`) ainda não foi gerada porque isso exige um Mac com Xcode
pra sequer abrir o projeto — não tem sentido gerar sem poder testar. Quando
tiver acesso a um Mac:
```
npx cap add ios
npx cap sync ios
npx cap open ios
```
Publicar na App Store também exige uma conta Apple Developer (US$ 99/ano) e
segue um processo de revisão manual da Apple — diferente da Play Store, que é
mais rápida.

## Funcionalidades nativas: o que funciona direto e o que precisa de ajuste

O app já usa algumas APIs do navegador que, dentro do app empacotado pelo
Capacitor, têm comportamento diferente:

### Geolocalização (GPS) — usada em `SosButton`, `AceitarFreteScreen`,
`EmTransitoScreen`, `MotoristaHome`

**✅ Migrado.** Toda a captura de localização passa agora por
`src/services/geolocation.js`, um wrapper único usado pelas quatro telas
acima (nenhuma chama mais `navigator.geolocation` diretamente):

- `watchPosition(onPosition, onError)` — rastreamento contínuo, usado em
  `EmTransitoScreen` e `MotoristaHome`.
- `getCurrentPosition({ timeoutMs })` — captura pontual (uma posição só),
  usado em `SosButton` e `AceitarFreteScreen`. Mantém o mesmo padrão de
  timeout redundante por fora que já existia (WebViews Android às vezes
  travam o `getCurrentPosition` sem nunca resolver nem rejeitar).

O wrapper detecta a plataforma (`Capacitor.isNativePlatform()`) e escolhe a
implementação automaticamente:

- **No navegador/PWA** (`isNativePlatform() === false`): usa
  `@capacitor/geolocation`, que por baixo dos panos chama a Geolocation API
  padrão do navegador. Comportamento idêntico ao de antes — só funciona com
  a aba em primeiro plano.
- **No app nativo Android** (`isNativePlatform() === true`): usa
  `@capacitor-community/background-geolocation` para o rastreio contínuo,
  que mantém o GPS ativo com o **app em segundo plano ou a tela apagada**
  (essencial pro motorista em viagem longa com o celular no bolso). Pra
  captura pontual (`getCurrentPosition`), continua usando
  `@capacitor/geolocation`, que já funciona nativamente sem precisar de
  segundo plano.

**Por que `@capacitor-community/background-geolocation` e não outro plugin:**
pesquisei as opções mais usadas pra background location em Capacitor. As
soluções da Transistorsoft (`cordova-plugin-background-geolocation` e
`@transistorsoft/capacitor-background-geolocation`), que são as mais
conhecidas e robustas do mercado, **exigem licença paga pra uso comercial**
(só são gratuitas para desenvolvimento/teste) — como o TRUKER é comercial,
descartei essas pra não gerar uma cobrança surpresa. O
`@capacitor-community/background-geolocation` é open source, licença MIT,
mantido pela comunidade Ionic/Capacitor, sem conta nem licença nenhuma —
por isso foi o escolhido.

**Como o rastreio em segundo plano funciona no Android:** o plugin sobe um
*foreground service* nativo com uma **notificação persistente e obrigatória**
("TRUKER — rastreamento ativo") enquanto o rastreamento estiver ligado — o
próprio Android exige essa notificação visível pra permitir GPS contínuo em
segundo plano; não tem como esconder. Justamente por usar foreground service
(e não a permissão especial "Localização o tempo todo"), o app **não pede**
a permissão `ACCESS_BACKGROUND_LOCATION` — isso é uma decisão deliberada:
essa permissão especial exige um processo de revisão manual extra da Play
Store (formulário justificando o uso) quando for publicar, e o foreground
service é isento dela. Ficou mais simples e evita esse processo extra.

Foi adicionado `"android": { "useLegacyBridge": true }` em
`capacitor.config.json` — exigência documentada do próprio plugin, sem isso
as atualizações de localização param de chegar em segundo plano depois de
~5 minutos (é o modo de bridge que mantém o JS respondendo aos callbacks
nativos mesmo com a tela apagada).

`android/app/src/main/AndroidManifest.xml` recebeu as permissões
`ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `FOREGROUND_SERVICE`,
`FOREGROUND_SERVICE_LOCATION` e `POST_NOTIFICATIONS` (essa última exigida
pelo Android 13+ pra mostrar a notificação do foreground service). O plugin
já mescla essas mesmas permissões automaticamente no manifest final via
merge do Gradle, mas foram declaradas explicitamente também pra clareza.

**⚠️ Limitação importante — não testado em dispositivo real:** este ambiente
onde o Claude trabalhou não tem Android SDK/emulador, só Node.js (mesma
limitação já descrita na seção "O que NÃO foi possível fazer aqui" acima).
`npm run build` e `npx cap sync android` rodaram sem erro e os plugins foram
registrados corretamente no projeto Android (`capacitor.build.gradle`), mas
**o comportamento de segundo plano em si — GPS continuando com o app
minimizado ou a tela apagada, a notificação aparecendo, a permissão sendo
pedida corretamente — só pode ser validado rodando o app de verdade num
celular ou emulador Android**, seguindo o passo a passo da seção acima
("Passo a passo pra gerar o APK"). Ao testar, vale conferir:
1. Se a notificação "TRUKER — rastreamento ativo" aparece assim que o
   motorista entra em uma tela com rastreio (`MotoristaHome` ou
   `EmTransitoScreen`).
2. Se a posição enviada ao backend (`PATCH /api/motoristas/localizacao`)
   continua atualizando a cada ~30s com o app minimizado e com a tela
   apagada por alguns minutos.
3. Se o Android pede a permissão de localização (e de notificações, no
   Android 13+) corretamente na primeira vez.

### Upload de arquivo (NF) — usado em `FinancasMotorista`/`DespesasTab`

Usa `<input type="file">` simples (escolher foto/PDF da galeria ou tirar
foto). Isso **já funciona** dentro do WebView do Capacitor sem mudança
nenhuma — o Android abre o seletor de arquivo/câmera nativo normalmente.
Não é necessário o plugin `@capacitor/camera` a menos que se queira uma
experiência de câmera mais customizada (ex: preview antes de confirmar).

### Notificações push — `src/services/push.js`

**✅ Migrado (código) / ⏳ falta o Mateus criar o projeto Firebase.**
`src/services/push.js` agora detecta a plataforma (`Capacitor.isNativePlatform()`,
mesmo padrão de `geolocation.js` acima) e escolhe o canal certo:

- **No navegador/PWA**: continua usando Web Push (VAPID) exatamente como
  antes, sem nenhuma mudança de comportamento.
- **No app nativo Android/iOS**: usa o plugin `@capacitor/push-notifications`
  (já instalado) para pedir permissão, registrar o dispositivo no Firebase
  Cloud Messaging (FCM) e mandar o token pro backend em
  `POST /api/push/subscribe-fcm` — um endpoint novo, separado do
  `/api/push/subscribe` (Web Push), pra não interferir em quem ainda usa o
  navegador.

No backend (`truker-app`), `services/firebase.js` inicializa o Firebase
Admin SDK só se a variável `FIREBASE_SERVICE_ACCOUNT_JSON` estiver
configurada; `routes/push.js` tenta mandar via FCM primeiro pra quem tem um
token FCM salvo, e cai automaticamente no Web Push pra quem não tem — sem
essa variável configurada, o sistema simplesmente continua funcionando só
com Web Push, do jeito que já funcionava antes (nada quebra).

O que falta é 100% fora do alcance de quem só mexe em código: criar a conta
gratuita no Firebase Console, baixar o `google-services.json` (vai em
`android/app/`) e a chave de service account (vai no `.env` do backend).
Isso está documentado passo a passo, sem jargão técnico, em
**`FIREBASE_SETUP.md`** na raiz deste projeto — é só o Mateus seguir aquele
guia sozinho.

## Resumo rápido pro Mateus

- ✅ O projeto já está pronto pra virar um app Android instalável.
- ⏳ Falta só compilar numa máquina com Android Studio (passo a passo acima)
  pra sair o primeiro `.apk` de teste.
- ⚠️ O push notification já está pronto no código — falta só você criar o
  projeto gratuito no Firebase e baixar 2 arquivos, seguindo o passo a passo
  em `FIREBASE_SETUP.md`. Enquanto isso não for feito, o app simplesmente
  continua notificando do jeito antigo (só funciona bem no navegador), sem
  quebrar nada — não é bloqueante pro sideload inicial, mas é bloqueante pra
  notificação funcionar 100% dentro do app instalado.
- 📱 iOS fica pra depois, quando houver acesso a um Mac.
