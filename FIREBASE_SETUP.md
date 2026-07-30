# Firebase — passo a passo pro Mateus (sem precisar programar)

Esse guia é só pra você, Mateus. O código que usa o Firebase já está pronto
nos dois projetos (`truker-frontend` e `truker-app`) — só falta você criar o
"projeto Firebase" de verdade (é gratuito) e baixar 2 arquivos, seguindo os
passos abaixo. Ninguém além de você consegue fazer essa parte, porque exige
entrar com uma conta Google.

No fim, você vai ter baixado 2 arquivos e vai colocar cada um numa pasta
específica do computador. É basicamente "baixar e colar o arquivo no lugar
certo" — não precisa entender o que tem dentro deles.

## O que é isso e por que precisa

Hoje, as notificações (tipo "novo frete disponível") só funcionam quando
alguém usa o TRUKER pelo navegador (Chrome, Safari, etc). Dentro do **app**
que empacotamos pro Android (aquele `.apk`), esse mecanismo antigo não é
confiável. O Firebase Cloud Messaging (FCM) é o serviço do Google que resolve
isso — é ele que garante que uma notificação chegue certinho no celular
mesmo com o app fechado.

## Passo 1 — Criar o projeto no Firebase

1. Acesse **https://console.firebase.google.com** e entre com uma conta
   Google (pode ser a mesma que você já usa, ou uma nova só pra isso — tanto
   faz).
2. Clique em **"Criar um projeto"** (ou "Add project" / "Adicionar projeto").
3. Dê um nome, por exemplo `TRUKER`. Pode deixar todas as outras opções
   (Google Analytics, etc) como estão — não precisa mexer, pode até
   desativar o Analytics se ele perguntar, não faz diferença aqui.
4. Clique em **"Criar projeto"** e espere carregar (leva uns 30 segundos).
   Isso é **gratuito** — o plano grátis do Firebase (chamado "Spark") cobre
   tranquilamente o uso de notificações do TRUKER.

## Passo 2 — Adicionar o app Android e baixar o 1º arquivo

1. Dentro do projeto que você acabou de criar, procure o ícone do **Android**
   (parece um robozinho verde) na tela inicial — geralmente tem escrito
   "Adicionar app" com ícones de iOS/Android/Web embaixo. Clique no do
   Android.
2. Vai pedir um campo chamado **"Nome do pacote Android" (package name)**.
   Cole exatamente isto (tem que ser IGUAL, com essas letras minúsculas e
   pontos):
   ```
   com.truker.app
   ```
3. Nos campos "Apelido do app" e "Certificado de assinatura" pode deixar em
   branco ou preencher só o apelido (ex: "TRUKER Android") — são opcionais.
4. Clique em **"Registrar app"**.
5. Na tela seguinte, vai aparecer um botão **"Fazer o download de
   google-services.json"**. Clique e salve esse arquivo.
6. Pode clicar em "Próxima" nas telas seguintes até finalizar (os passos de
   "adicionar o SDK" que aparecem ali já estão feitos no código, pode pular).
7. **Onde colocar esse arquivo:** copie o arquivo `google-services.json` que
   você baixou para dentro desta pasta do computador:
   ```
   C:\dev\truker-frontend\android\app\google-services.json
   ```
   (Se já existir um arquivo com esse nome nessa pasta, pode substituir.)

## Passo 3 — Gerar o 2º arquivo (chave do servidor)

Esse segundo arquivo é o que permite o **servidor** do TRUKER (o backend)
mandar as notificações através do Firebase.

1. Ainda no Firebase Console, clique na **engrenagem** (⚙️) no canto
   superior esquerdo, perto do nome do projeto, e escolha
   **"Configurações do projeto"**.
2. Clique na aba **"Contas de serviço"** (Service accounts).
3. Clique no botão **"Gerar nova chave privada"** (Generate new private key).
4. Vai aparecer um aviso confirmando — clique em **"Gerar chave"**. Um
   arquivo `.json` vai ser baixado automaticamente (o nome costuma ser algo
   tipo `truker-xxxxx-firebase-adminsdk-xxxxx.json`).
5. **Esse arquivo é sensível** (funciona como uma senha do servidor) —
   não mande por WhatsApp/e-mail nem suba pro GitHub. Guarde ele com
   cuidado, do mesmo jeito que guardaria uma senha de banco.
6. **Onde colocar esse arquivo:** copie esse arquivo `.json` para dentro
   desta pasta do computador (a pasta do backend):
   ```
   C:\dev\truker-app\
   ```
   Pode renomear o arquivo pra algo mais simples, por exemplo
   `firebase-service-account.json`, pra ficar mais fácil de referenciar no
   próximo passo.

## Passo 4 — Avisar o servidor onde está esse 2º arquivo

1. Abra a pasta `C:\dev\truker-app\` e procure o arquivo chamado **`.env`**
   (se não existir um `.env` ainda, copie o arquivo `.env.example` que já
   existe nessa pasta e renomeie a cópia para `.env`).
2. Abra o `.env` com o Bloco de Notas (ou qualquer editor de texto simples).
3. Procure a linha que diz:
   ```
   FIREBASE_SERVICE_ACCOUNT_JSON=
   ```
4. Depois do sinal de igual, cole o **caminho completo** do arquivo que você
   colocou no Passo 3. Por exemplo, se você renomeou o arquivo pra
   `firebase-service-account.json`, a linha deve ficar assim:
   ```
   FIREBASE_SERVICE_ACCOUNT_JSON=./firebase-service-account.json
   ```
5. Salve o arquivo `.env`.
6. Reinicie o servidor do backend (pare e rode `npm start` de novo, ou peça
   pra reiniciar se estiver rodando num serviço tipo Render/Railway — nesse
   caso, em vez de um caminho de arquivo, cole o **conteúdo inteiro** do
   `.json` como o valor da variável `FIREBASE_SERVICE_ACCOUNT_JSON` no
   painel de variáveis de ambiente do serviço, já que lá não dá pra
   simplesmente colocar um arquivo na pasta).

## Passo 5 — Atualizar o app Android com o novo arquivo

Isso só é necessário na próxima vez que for gerar um novo `.apk` (não afeta
quem já instalou uma versão anterior do app, só as próximas builds). Com uma
máquina que tenha o Android Studio instalado (ver `NATIVO.md` pro passo a
passo completo de gerar o app), rode dentro da pasta do projeto:
```
npm install
npm run build
npx cap sync android
```
e gere o `.apk`/`.aab` normalmente a partir da pasta `android/`.

## Pronto — como saber se funcionou

- Se o arquivo `FIREBASE_SERVICE_ACCOUNT_JSON` **não** estiver configurado,
  nada quebra: o sistema continua mandando notificação do jeito antigo
  (Web Push), só que ela não vai funcionar direito dentro do app empacotado.
- Depois de configurar os dois arquivos e reiniciar o backend, os logs do
  servidor devem mostrar a linha `[FCM] Firebase Admin inicializado.` na
  inicialização — isso confirma que o arquivo foi lido corretamente.
- O teste de verdade é instalar uma nova versão do app (gerada depois do
  Passo 5) no celular e usar o botão **"Testar Push Notification"** na tela
  de Perfil do motorista.

## Dúvidas comuns

- **"Preciso pagar alguma coisa?"** Não. O plano gratuito do Firebase
  (Spark) cobre bem mais notificações do que o TRUKER precisa hoje.
- **"E se eu errar o nome do pacote no Passo 2?"** Sem problema, dá pra
  apagar o app Android dentro do projeto Firebase e cadastrar de novo — só
  não pode ser um nome diferente de `com.truker.app`, senão as
  notificações não batem com o app instalado.
- **"Preciso mexer em algum código?"** Não — só baixar os 2 arquivos e
  colar nos lugares indicados, e editar 1 linha do `.env`.
