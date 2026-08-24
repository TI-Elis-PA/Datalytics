# 🚀 Guia de Deploy no Vercel (Frontend + FastAPI)

Este projeto está 100% configurado para rodar no **Vercel** como uma aplicação Full-Stack (Frontend React/Vite + Backend Python Serverless com FastAPI).

---

## 📋 Pré-requisitos
1. Uma conta no [Vercel](https://vercel.com).
2. Seu código enviado para um repositório no **GitHub**, **GitLab** ou **Bitbucket**.

---

## 🛠️ Passo a Passo para o Deploy

### 1. Importar o Projeto no Vercel
1. Acesse o [Dashboard da Vercel](https://vercel.com/dashboard) e clique em **"Add New..."** → **"Project"**.
2. Selecione o repositório do **Datalytics Elis**.
3. O Vercel detectará automaticamente as configurações através do arquivo `vercel.json`.

---

### 2. Configurar as Variáveis de Ambiente (Environment Variables)
Antes de clicar em **Deploy**, abra a seção **"Environment Variables"** no painel da Vercel e adicione as seguintes chaves:

| Nome da Variável | Valor Exemplo / Origem |
| :--- | :--- |
| `SUPABASE_URL` | `https://vzsknnbacsgdiiqwocxq.supabase.co` |
| `SUPABASE_ANON_KEY` | *(Sua chave anon do Supabase)* |
| `SUPABASE_SERVICE_ROLE_KEY` | *(Sua chave service_role do Supabase)* |
| `GEMINI_API_KEY` | `AQ.Ab8RN6...` *(Sua chave de IA Gemini)* |
| `JWT_SECRET` | `datalytics-elis-secret-2026-cnn-team` *(Opcional, possui valor padrão)* |

---

### 3. Fazer o Deploy
1. Clique no botão **"Deploy"**.
2. Aguarde cerca de 1 a 2 minutos enquanto o Vercel compila o frontend e prepara as funções Python.
3. Pronto! Você receberá um link como: `https://datalytics-elis.vercel.app`.

---

## 💡 Dica para a Apresentação do Hackathon
- **Aquecimento do Servidor (Cold Start):** Como as funções Python rodam no modelo *Serverless*, acesse o sistema no navegador cerca de **1 a 2 minutos antes do seu pitch** e faça um login para "acordar" a API. Isso garante respostas em milissegundos durante a apresentação aos jurados!
