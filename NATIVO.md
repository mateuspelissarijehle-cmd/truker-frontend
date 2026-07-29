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

Hoje usa `navigator.geolocation` (API padrão do navegador). Isso **funciona**
dentro do WebView do Capacitor, mas com duas ressalvas importantes:
- O Android vai pedir a permissão de localização automaticamente na primeira
  vez que o app tentar usar o GPS — isso é normal.
- `EmTransitoScreen` e `MotoristaHome` usam `watchPosition` (rastreamento
  contínuo). Em Android moderno (10+), rastrear localização com o app **em
  segundo plano** (tela apagada, app minimizado) exige a permissão especial
  "Localização o tempo todo" e configuração adicional — a API web sozinha só
  garante o rastreio com o app aberto e em primeiro plano.
- **Recomendação pra depois:** migrar essas telas pro plugin
  `@capacitor/geolocation`, que dá controle explícito sobre essas permissões
  e funciona de forma mais confiável dentro do app nativo do que a API web
  pura (os comentários no próprio código, em `SosButton.jsx` e
  `AceitarFreteScreen.jsx`, já mencionam bugs conhecidos de `getCurrentPosition`
  travando em WebViews — isso reforça que vale a pena trocar).

### Upload de arquivo (NF) — usado em `FinancasMotorista`/`DespesasTab`

Usa `<input type="file">` simples (escolher foto/PDF da galeria ou tirar
foto). Isso **já funciona** dentro do WebView do Capacitor sem mudança
nenhuma — o Android abre o seletor de arquivo/câmera nativo normalmente.
Não é necessário o plugin `@capacitor/camera` a menos que se queira uma
experiência de câmera mais customizada (ex: preview antes de confirmar).

### Notificações push — `src/services/push.js`

Esse é o ponto que **precisa de mais trabalho** antes de funcionar bem no
app nativo. Hoje o push usa a Web Push API padrão (`PushManager` + chave
VAPID), que depende do navegador. Dentro de um app Android embalado pelo
Capacitor, esse mecanismo **não é confiável** — o caminho nativo correto é:
1. Adicionar o plugin `@capacitor/push-notifications`.
2. Criar um projeto no **Firebase** (gratuito) e configurar o Firebase Cloud
   Messaging (FCM) pro app Android — isso gera um arquivo `google-services.json`
   que precisa ir em `android/app/`.
3. Ajustar o backend pra também conseguir mandar notificações via FCM (além
   ou no lugar do VAPID/web-push atual), guardando o token de dispositivo
   que o plugin do Capacitor devolve.

Essa parte não foi implementada agora porque envolve criar uma conta/projeto
Firebase e mudar o backend — decisão que vale alinhar com o Mateus antes.

## Resumo rápido pro Mateus

- ✅ O projeto já está pronto pra virar um app Android instalável.
- ⏳ Falta só compilar numa máquina com Android Studio (passo a passo acima)
  pra sair o primeiro `.apk` de teste.
- ⚠️ O push notification vai precisar de um trabalho extra (Firebase) antes
  de funcionar 100% dentro do app — hoje ele deve simplesmente não notificar
  nada quando empacotado, então não é bloqueante pro sideload inicial, mas é
  bloqueante pra experiência completa.
- 📱 iOS fica pra depois, quando houver acesso a um Mac.
