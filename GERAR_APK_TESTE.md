# Como gerar um APK de teste do TRUKER e instalar no celular

Este guia é pra você (Mateus) gerar, sozinho, um arquivo `.apk` de teste do
TRUKER e instalar no seu Android pra testar como app de verdade — sem
precisar publicar em loja nenhuma.

## Por que o Android Studio travou nas tentativas anteriores

Antes de mais nada: **não é um bug no projeto.** Eu verifiquei os arquivos de
erro que ficaram salvos na pasta `android/` (`hs_err_pid*.log`) das suas
tentativas anteriores, e todos eles dizem a mesma coisa:

> "There is insufficient memory for the Java Runtime Environment to continue"
> (não há memória suficiente para o Java continuar)

Ou seja: **o processo ficou sem RAM e morreu.** Seu computador tem só 3 GB de
memória RAM (confirmado nos próprios arquivos de erro). O Android Studio
completo — a IDE gráfica, com editor, indexação de código, etc — é pesado e,
rodando ao mesmo tempo que o processo de build (Gradle), estoura essa memória
com facilidade num PC de 3 GB.

**A boa notícia:** as tentativas anteriores já deixaram tudo pronto no seu PC:
- ✅ Android Studio instalado (`C:\Program Files\Android\Android Studio`),
  que já vem com o Java embutido — não precisa instalar Java separado.
- ✅ Android SDK instalado (`C:\Users\mateu\AppData\Local\Android\Sdk`).
- ✅ O projeto Android (`android/`) já configurado corretamente — pacote
  `com.truker.app`, permissões de localização e notificação já no lugar.

Então **não falta instalar nada.** Só falta gerar o APK de um jeito mais leve
que não estoure a memória: pela linha de comando, sem abrir a interface
gráfica do Android Studio.

## Caminho recomendado: gerar o APK pela linha de comando (mais leve)

Isso usa só o terminal — sem abrir a janela do Android Studio, sem indexação,
sem editor. Bem mais leve pro seu PC de 3 GB.

### Passo 1 — Feche tudo que não precisa

Antes de começar, feche o Android Studio (se estiver aberto) e o máximo de
programas/abas do navegador que conseguir. Quanto mais RAM livre, menor a
chance de travar de novo.

### Passo 2 — Abra o PowerShell na pasta do projeto

Abra o PowerShell e entre na pasta do projeto (ajuste o caminho se for
diferente na sua máquina):

```powershell
cd C:\dev\truker-frontend
```

### Passo 3 — Aponte o terminal pro JDK 21

> **Atualização (15/08/2026):** o Android Studio foi desinstalado desta
> máquina depois que este guia foi escrito, então o caminho antigo
> (`...\Android Studio\jbr`) não existe mais. Em vez de reinstalar a IDE
> inteira (pesada pra um PC de 3GB), foi instalado só um JDK leve — o
> **Eclipse Temurin 21** (a versão certa: um dos plugins do projeto exige
> Java 21 especificamente, não só "um Java qualquer"), extraído em
> `C:\dev\_tools\jdk-21.0.12+8` (sem instalador, sem precisar de admin).

```powershell
$env:JAVA_HOME = "C:\dev\_tools\jdk-21.0.12+8"
```

⚠️ Esse comando vale só pra essa janela do PowerShell que está aberta agora.
Se fechar e abrir de novo, precisa rodar de novo antes dos próximos passos.

### Passo 4 — Atualize o site empacotado dentro do projeto Android

```powershell
npm install
npm run build
npx cap sync android
```

Isso builda o site (pasta `dist/`) e copia a versão mais recente pra dentro
do projeto Android. Sempre que você alterar o código do TRUKER e quiser
testar de novo, repita esse passo 4 antes de gerar um novo APK.

### Passo 5 — Gere o APK de teste (debug)

```powershell
cd android
.\gradlew.bat assembleDebug --no-daemon
```

- `assembleDebug` gera uma versão de **teste**, já assinada automaticamente
  com uma chave de teste do próprio Android (não precisa criar keystore nem
  senha nenhuma — isso só é necessário na hora de gerar a versão final pra
  loja, que é um passo separado, mais pra frente).
- `--no-daemon` faz o Gradle não deixar um processo "residente" consumindo
  RAM depois que o build termina — mais lento se você rodar várias vezes
  seguidas, mas mais seguro pro seu PC com pouca memória.

Esse comando pode demorar alguns minutos na primeira vez (baixa dependências
da internet). É normal a tela ficar "parada" mostrando `<==========---> 80%`
por um tempo.

Se tudo der certo, no final vai aparecer algo como `BUILD SUCCESSFUL`.

### Passo 6 — Onde fica o APK

O arquivo gerado fica em:

```
android\app\build\outputs\apk\debug\app-debug.apk
```

## Se mesmo assim travar por falta de memória de novo

1. Reinicie o computador (limpa RAM ocupada por processos zumbis) e tente de
   novo só com o PowerShell aberto, nada mais.
2. Se ainda travar, rode o build limitando ainda mais a memória do Gradle:
   ```powershell
   .\gradlew.bat assembleDebug --no-daemon "-Dorg.gradle.jvmargs=-Xmx1024m"
   ```
3. Evite abrir o emulador Android (o simulador de celular na tela do PC) —
   ele sozinho já consome mais RAM do que os 3 GB do seu PC costumam ter de
   sobra. Teste sempre no celular físico via cabo (próxima seção).

## Instalando o APK no seu celular pra testar

### Opção A — Cabo USB (mais rápida, recomendada)

1. No celular: vá em **Ajustes > Sobre o telefone** e toque 7 vezes em
   "Número da versão" (ou "Build number") até aparecer a mensagem "Você
   agora é um desenvolvedor".
2. Volte em Ajustes, entre em **Opções do desenvolvedor** (geralmente dentro
   de "Sistema") e ative **Depuração USB**.
3. Conecte o celular no PC via cabo USB. No celular vai aparecer um popup
   perguntando se você confia nesse computador — toque em **Permitir**.
4. No PowerShell (ainda na pasta `android`, ou abra uma nova janela e entre
   em `C:\dev\truker-frontend\android`):
   ```powershell
   & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install app\build\outputs\apk\debug\app-debug.apk
   ```
5. Se aparecer `Success`, o app TRUKER já está instalado no celular — procure
   o ícone na tela.

Pra reinstalar depois de gerar um novo APK (ex: depois de alterar o código),
é só repetir o mesmo comando `adb install` — ele substitui a versão anterior.

### Opção B — Transferir o arquivo direto pro celular (sem cabo/adb)

1. Copie o arquivo `android\app\build\outputs\apk\debug\app-debug.apk` pro
   celular — por WhatsApp (pra você mesmo), Google Drive, e-mail, ou um
   pendrive/cabo só copiando o arquivo mesmo.
2. No celular, abra o arquivo `.apk` pelo gerenciador de arquivos.
3. O Android vai bloquear a instalação na primeira vez, avisando que é de
   "fonte desconhecida". Toque em **Configurações** no próprio aviso e
   ative a permissão de instalar apps daquele app (Drive, WhatsApp, etc).
4. Volte e toque em **Instalar**.

Isso é normal e esperado — só acontece porque o APK não veio da Play Store.
Como é você mesmo gerando e enviando o arquivo, não tem risco de segurança
aqui.

## Alternativa: usar o Android Studio (se preferir tentar de novo)

Se num outro momento você tiver um PC com mais RAM disponível (ou quiser
tentar mesmo assim), o caminho pela interface gráfica é:

1. Abra o Android Studio.
2. `File > Open`, selecione a pasta `android` dentro do projeto (não a raiz).
3. Espere indexar (pode demorar e consumir bastante RAM nesse momento).
4. Conecte o celular via USB (com Depuração USB ativada, passos acima) e
   clique no botão verde ▶ (Run) — instala direto no celular.

Esse caminho é mais visual, mas é exatamente o que estourou a memória nas
tentativas anteriores. Pra um PC de 3 GB, a linha de comando (seção acima) é
a aposta mais segura.

## Resumo rápido

1. Fechar programas pesados.
2. `$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"`
3. `npm run build` → `npx cap sync android`
4. `cd android` → `.\gradlew.bat assembleDebug --no-daemon`
5. APK em `android\app\build\outputs\apk\debug\app-debug.apk`
6. Instalar no celular via `adb install` (USB) ou copiando o arquivo direto.

Esse APK de teste **não é a versão final pra loja** — é só pra instalar e
testar no seu próprio celular. A versão final (assinada, pra Play Store) é
um processo separado, descrito em `NATIVO.md`, e só faz sentido depois que
você validar que esse teste está funcionando bem.
