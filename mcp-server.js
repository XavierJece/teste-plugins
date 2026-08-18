import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// ===== Dados em memória =====
const veiculos = [
  {
    id: "v1",
    marca: "Jeep",
    modelo: "Compass Longitude",
    ano: 2026,
    preco: "194990.00",
    imagem_url: "https://www.jeep.com.br/content/dam/jeep/br/compass/my25/versoes/longitude/longitude-t270-frente.png",
    destaques: ["Motor T270", "Central Multimídia 10.1\"", "Tração 4x4"]
  },
  {
    id: "v2",
    marca: "Fiat",
    modelo: "Toro Volcano",
    ano: 2026,
    preco: "179990.00",
    imagem_url: "https://www.fiat.com.br/content/dam/fiat/br/toro/my25/versoes/volcano/volcano-frente.png",
    destaques: ["Caçamba de 937L", "Motor Turbo Diesel", "Rodas 18\""]
  },
  {
    id: "v3",
    marca: "Ram",
    modelo: "Rampage Laramie",
    ano: 2026,
    preco: "259990.00",
    imagem_url: "https://www.ram.com.br/content/dam/ram/br/rampage/my25/versoes/laramie/laramie-frente.png",
    destaques: ["Motor Hurricane 4", "Acabamento Premium", "Tração 4x4"]
  }
];

// ===== Servidor MCP =====
const server = new Server(
  { name: 'stellantis-assistant', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Handlers (mesmo de antes)
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'listar_veiculos',
      description: 'Lista veículos do portfólio Stellantis, opcionalmente filtrados por marca.',
      inputSchema: {
        type: 'object',
        properties: {
          marca: { type: 'string', description: 'Marca do veículo (ex: Jeep, Fiat, Ram)' },
        },
      },
    },
    {
      name: 'agendar_test_drive',
      description: 'Agenda um test drive para um veículo.',
      inputSchema: {
        type: 'object',
        properties: {
          id_veiculo: { type: 'string', description: 'ID do veículo' },
          nome_cliente: { type: 'string', description: 'Nome completo do cliente' },
          data: { type: 'string', description: 'Data desejada (formato YYYY-MM-DD)' },
        },
        required: ['id_veiculo', 'nome_cliente', 'data'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  if (name === 'listar_veiculos') {
    const { marca } = args;
    let resultado = veiculos;
    if (marca) {
      resultado = veiculos.filter(v => v.marca.toLowerCase() === marca.toLowerCase());
    }
    return { content: [{ type: 'text', text: JSON.stringify(resultado, null, 2) }] };
  }
  if (name === 'agendar_test_drive') {
    const { id_veiculo, nome_cliente, data } = args;
    if (!id_veiculo || !nome_cliente || !data) {
      throw new Error('Dados incompletos.');
    }
    const protocolo = Math.floor(Math.random() * 100000).toString();
    const mensagem = `Test drive confirmado para ${nome_cliente} no dia ${data}. Protocolo: ${protocolo}`;
    return {
      content: [{ type: 'text', text: JSON.stringify({ sucesso: true, mensagem, protocolo }) }],
    };
  }
  throw new Error(`Ferramenta desconhecida: ${name}`);
});

// ===== Servidor Express com SSE =====
const app = express();
const port = process.env.PORT || 3000;

// Armazena o transporte ativo (apenas uma conexão por vez)
let activeTransport = null;

app.get('/sse', async (req, res) => {
  console.log('Nova conexão SSE');
  const transport = new SSEServerTransport('/messages', res);
  activeTransport = transport;
  await server.connect(transport);
});

app.post('/messages', async (req, res) => {
  if (!activeTransport) {
    res.status(400).send('No active SSE connection');
    return;
  }
  await activeTransport.handlePostMessage(req, res);
});

app.listen(port, () => {
  console.log(`MCP SSE server rodando na porta ${port}`);
});