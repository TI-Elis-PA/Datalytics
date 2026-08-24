# Backend de Notificações - Datalytics Elis

Este é o serviço Node.js responsável por automatizar os envios do WhatsApp usando o motor do Puppeteer (navegador invisível).

## Como rodar o servidor:

1. Abra um terminal novo e entre nesta pasta (`backend`).
2. Instale as dependências (se ainda não tiver feito):
   ```bash
   npm install
   ```
3. Rode o servidor:
   ```bash
   node server.js
   ```
4. **IMPORTANTE:** O terminal vai gerar um QR Code gigante. Abra o seu WhatsApp no celular, vá em "Aparelhos Conectados" e escaneie o código.
5. Quando o terminal mostrar `✅ API do WhatsApp conectada`, o backend está pronto!

## Testando no Frontend
Volte para o navegador onde o painel Datalytics Elis (React) está rodando. Clique no botão verde de **"Notificar Gestão"** no Dashboard. 

O painel fará um disparo silencioso em background e o seu WhatsApp (conectado no terminal) irá mandar a mensagem automaticamente!

*Nota: No arquivo `Dashboard.tsx`, linha ~75, existe um número de telefone chumbado (`11999999999`). Lembre-se de mudar para o número real do destinatário se quiser testar a mensagem.*
