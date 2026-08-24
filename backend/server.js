// Ignora erro de certificado SSL (útil em redes corporativas ou com proxy/VPN ativo)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const express = require('express');
const cors = require('cors');
const { Client, NoAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

const app = express();
const port = 3005; // Alterado para 3005 para não conflitar com a API legada do frontend

// Middlewares
app.use(cors());
app.use(express.json());

console.log('🚀 Notification Backend starting up...');

// Descobrir onde o Chrome está instalado no Windows
let chromePath = '';
const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
];

for (const path of possiblePaths) {
    if (fs.existsSync(path)) {
        chromePath = path;
        break;
    }
}

if (!chromePath) {
    console.warn('⚠️ Google Chrome não encontrado nos caminhos padrão. O Puppeteer pode falhar.');
}

// Inicializando o cliente do WhatsApp
// Usando NoAuth para evitar erros de corrupção de arquivos do LocalAuth no Windows
const client = new Client({
    authStrategy: new NoAuth(),
    puppeteer: { 
        executablePath: chromePath || undefined,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ] 
    },
    webVersionCache: {
        type: 'none'
    }
});

let isReady = false;

// Gera o QR Code no terminal
client.on('qr', (qr) => {
    console.log('\n=========================================');
    console.log('📱 ESCANEIE O QR CODE COM SEU WHATSAPP');
    console.log('=========================================\n');
    qrcode.generate(qr, { small: true });
});

// Quando o WhatsApp conectar com sucesso
client.on('ready', () => {
    console.log('\n✅ [SUCESSO] API do WhatsApp conectada e pronta para envios!');
    isReady = true;
});

client.on('authenticated', () => {
    console.log('✅ Sessão do WhatsApp autenticada e salva.');
});

client.on('auth_failure', msg => {
    console.error('❌ Falha na autenticação do WhatsApp:', msg);
});

// Endpoint para envio de notificações (O Frontend vai chamar essa rota)
app.post('/api/notify', async (req, res) => {
    const { number, message, mediaUrl } = req.body;

    if (!isReady) {
        return res.status(503).json({ 
            error: 'Serviço do WhatsApp ainda não está pronto. Verifique o console do backend.' 
        });
    }

    if (!number || !message) {
        return res.status(400).json({ error: 'Número e mensagem são obrigatórios.' });
    }

    try {
        // Limpa o número de caracteres especiais
        let formattedNumber = number.replace(/\D/g, '');
        
        // Se for um número brasileiro sem o DDI (55), adiciona automaticamente
        if (formattedNumber.length === 11 || formattedNumber.length === 10) {
            formattedNumber = '55' + formattedNumber;
        }
        
        // Busca o ID oficial do WhatsApp para este número (evita o erro 'No LID for user')
        const numberId = await client.getNumberId(formattedNumber);
        
        if (!numberId) {
            console.error(`❌ Número não encontrado no WhatsApp: ${formattedNumber}`);
            return res.status(404).json({ error: 'Este número não está registrado no WhatsApp.' });
        }
        
        // Se tiver uma URL de imagem, cria a mídia para anexar
        if (mediaUrl) {
            console.log(`🖼️ Baixando mídia de: ${mediaUrl}`);
            try {
                const media = await MessageMedia.fromUrl(mediaUrl, { unsafeMime: true });
                await client.sendMessage(numberId._serialized, media, { caption: message });
            } catch (mediaErr) {
                console.error('❌ Falha ao baixar a mídia. Enviando apenas texto.', mediaErr.message);
                await client.sendMessage(numberId._serialized, message);
            }
        } else {
            // Envia apenas o texto
            await client.sendMessage(numberId._serialized, message);
        }
        
        console.log(`✉️ [NOTIFICAÇÃO ENVIADA] Destino: ${formattedNumber}`);
        
        res.status(200).json({ success: true, message: 'Mensagem enviada com sucesso!' });
    } catch (error) {
        console.error('❌ [ERRO AO ENVIAR]', error);
        res.status(500).json({ error: 'Falha ao enviar a mensagem', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`🌐 Servidor rodando na porta http://localhost:${port}`);
    console.log(`⌛ Iniciando navegador invisível (Puppeteer)... aguarde o QR Code.`);
    
    // Inicia o cliente após o servidor express estar de pé
    client.initialize();
});
