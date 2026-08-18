import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema, // ← adicione
  ReadResourceRequestSchema, // ← adicione
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";

// 1. Defina o HTML do seu Widget
const WIDGET_TEMPLATE_URI = "ui://widget/stellantis-cards.html";
const widgetHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Stellantis Cards</title>
  <style>
    /* Estilos básicos para os cards */
    body { font-family: system-ui, sans-serif; padding: 16px; background: transparent; }
    .card-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
    @media (min-width: 600px) { .card-grid { grid-template-columns: 1fr 1fr; } }
    .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .card img { width: 100%; height: auto; border-radius: 4px; margin-bottom: 12px; }
    .card h3 { margin: 0 0 4px 0; font-size: 1.1em; }
    .card .price { font-weight: bold; color: #2563eb; }
    .card .details { font-size: 0.9em; color: #4b5563; margin: 8px 0; }
    .card button { background: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 500; }
    .card button:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    // Este script recebe os dados do tool result e renderiza os cards
    function renderCards(data) {
      const root = document.getElementById('root');
      if (!data || !data.cards) {
        root.innerHTML = '<p>Nenhum veículo encontrado.</p>';
        return;
      }

      let html = '<div class="card-grid">';
      data.cards.forEach(card => {
        html += \`
          <div class="card">
            <img src="\${card.imagem}" alt="\${card.veiculo}" onerror="this.style.display='none'">
            <h3>\${card.veiculo}</h3>
            <div class="price">A partir de R$ \${card.menor_parcela}/mês</div>
            <div class="details">Opções: \${card.opcoes_texto}</div>
            <button onclick="window.openai.callTool('agendar_test_drive', { id_veiculo: '\${card.id_veiculo}' })">
              Agendar Test Drive
            </button>
          </div>
        \`;
      });
      html += '</div>';
      root.innerHTML = html;
    }

    // Configura a comunicação com o host (ChatGPT)
    window.addEventListener('message', (event) => {
      if (event.source !== window.parent) return;
      const message = event.data;
      if (!message || message.jsonrpc !== '2.0') return;

      // Recebe o resultado da ferramenta de renderização
      if (message.method === 'ui/notifications/tool-result') {
        const result = message.params?.structuredContent;
        if (result) {
          renderCards(result);
        }
      }
    });

    // Notifica o host que o widget está pronto
    window.parent.postMessage({ jsonrpc: '2.0', method: 'ui/initialize' }, '*');
  </script>
</body>
</html>
`.trim();

// ===== Dados dos veículos (atualizados com preços reais) =====
const veiculos = [
  {
    id: "v1",
    marca: "Jeep",
    modelo: "Compass Longitude",
    ano: 2026,
    preco: 194990.0, // preço em número (R$)
    imagem_url:
      "https://motorshow.com.br/wp-content/uploads/sites/2/2026/01/jeep-compass-longitude-t270-preto-carbon.jpg",
    destaques: ["Motor T270", 'Central Multimídia 10.1"', "Tração 4x4"],
  },
  {
    id: "v2",
    marca: "Fiat",
    modelo: "Toro Volcano",
    ano: 2026,
    preco: 179990.0,
    imagem_url:
      "https://toro.fiat.com.br/content/dam/fiat/products/226/3pu/2/2027/page/hero-webp/hero-176.webp",
    destaques: ["Caçamba de 937L", "Motor Turbo Diesel", 'Rodas 18"'],
  },
  {
    id: "v3",
    marca: "Ram",
    modelo: "Rampage Laramie",
    ano: 2026,
    preco: 259990.0,
    imagem_url:
      "https://production.autoforce.com/uploads/version/profile_image/9571/model_main_webp_comprar-laramie-gasolina_ad38d2b3d6.png.webp",
    destaques: ["Motor Hurricane 4", "Acabamento Premium", "Tração 4x4"],
  },
];

// ===== Banco de agendamentos (em memória) =====
const agendamentos = [];

// ===== Servidor MCP =====
const server = new Server(
  { name: "stellantis-assistant", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

// ===== Configurações de financiamento =====
const TAXA_JUROS_MENSAL = 0.0099; // 0,99% ao mês (taxa do Banco Stellantis)[reference:6]
const PRAZOS = [12, 24, 36, 48, 60, 72]; // meses

// ===== Calcula parcelas para um veículo =====
function calcularParcelas(preco, taxa, prazos) {
  const resultados = [];
  for (const meses of prazos) {
    // Fórmula de juros compostos: PMT = PV * i * (1+i)^n / ((1+i)^n - 1)
    const i = taxa;
    const n = meses;
    const parcela = (preco * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
    resultados.push({
      meses: meses,
      parcela: Math.round(parcela * 100) / 100, // arredonda para 2 casas
    });
  }
  return resultados;
}

// ===== Filtra veículos por orçamento mensal =====
function filtrarPorOrcamento(veiculos, orcamentoMensal, taxa, prazos) {
  const resultados = [];
  for (const veiculo of veiculos) {
    const opcoes = [];
    for (const meses of prazos) {
      const parcela = calcularParcela(veiculo.preco, taxa, meses);
      if (parcela <= orcamentoMensal) {
        opcoes.push({ meses, parcela });
      }
    }
    if (opcoes.length > 0) {
      resultados.push({
        veiculo: veiculo,
        opcoes: opcoes,
      });
    }
  }
  return resultados;
}

function calcularParcela(preco, taxa, meses) {
  const i = taxa;
  const n = meses;
  return (preco * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
}

// 2. Registre o recurso do widget no servidor
server.registerResource(
  "stellantis-widget",
  WIDGET_TEMPLATE_URI,
  {},
  async () => ({
    contents: [
      {
        uri: WIDGET_TEMPLATE_URI,
        mimeType: "text/html;profile=mcp-app",
        text: widgetHtml,
        _meta: { ui: { prefersBorder: true } },
      },
    ],
  }),
);

// Handlers (mesmo de antes)
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "listar_veiculos",
      description:
        "Lista veículos do portfólio Stellantis, opcionalmente filtrados por marca.",
      inputSchema: {
        type: "object",
        properties: {
          marca: {
            type: "string",
            description: "Marca do veículo (ex: Jeep, Fiat, Ram)",
          },
        },
      },
    },
    // ===== Ferramenta: Agendar test drive (com validação) =====
    {
      name: "agendar_test_drive",
      description:
        "Agenda um test drive para um veículo, verificando disponibilidade de data/hora.",
      inputSchema: {
        type: "object",
        properties: {
          id_veiculo: { type: "string", description: "ID do veículo" },
          nome_cliente: {
            type: "string",
            description: "Nome completo do cliente",
          },
          data: {
            type: "string",
            description: "Data desejada (formato YYYY-MM-DD)",
          },
          hora: {
            type: "string",
            description: "Horário desejado (formato HH:MM)",
          },
        },
        required: ["id_veiculo", "nome_cliente", "data", "hora"],
      },
    },
    {
      name: "calcular_financiamento",
      description:
        "Calcula quais veículos da Stellantis cabem no orçamento mensal do cliente. Retorna dados estruturados.",
      inputSchema: {
        type: "object",
        properties: {
          orcamento_mensal: {
            type: "number",
            description: "Valor mensal que o cliente pode pagar (em reais)",
          },
        },
        required: ["orcamento_mensal"],
      },
    },
    {
      name: "renderizar_financiamento",
      description:
        "Renderiza os resultados do financiamento em cards visuais. Deve ser chamada APÓS calcular_financiamento, passando os dados retornados por ela.",
      inputSchema: {
        type: "object",
        properties: {
          mensagem: { type: "string" },
          cards: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id_veiculo: { type: "string" },
                veiculo: { type: "string" },
                imagem: { type: "string" },
                opcoes_texto: { type: "string" },
                menor_parcela: { type: "string" },
              },
            },
          },
        },
        required: ["mensagem", "cards"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  if (name === "listar_veiculos") {
    const { marca } = args;
    let resultado = veiculos;
    if (marca) {
      resultado = veiculos.filter(
        (v) => v.marca.toLowerCase() === marca.toLowerCase(),
      );
    }
    return {
      content: [{ type: "text", text: JSON.stringify(resultado, null, 2) }],
    };
  }
  if (name === "agendar_test_drive") {
    const { id_veiculo, nome_cliente, data, hora } = args;

    // Verifica se o veículo existe
    const veiculo = veiculos.find((v) => v.id === id_veiculo);
    if (!veiculo) {
      throw new Error("Veículo não encontrado.");
    }

    // Verifica conflito de horário
    const conflito = agendamentos.some(
      (a) => a.data === data && a.hora === hora,
    );
    if (conflito) {
      // Busca horários disponíveis no mesmo dia
      const horariosOcupados = agendamentos
        .filter((a) => a.data === data)
        .map((a) => a.hora);
      const horariosDisponiveis = [
        "09:00",
        "10:00",
        "11:00",
        "14:00",
        "15:00",
        "16:00",
        "17:00",
      ].filter((h) => !horariosOcupados.includes(h));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                erro: true,
                mensagem: `Horário ${hora} do dia ${data} já está ocupado.`,
                horarios_disponiveis:
                  horariosDisponiveis.length > 0
                    ? `Horários disponíveis: ${horariosDisponiveis.join(", ")}`
                    : "Nenhum horário disponível neste dia.",
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    // Registra o agendamento
    const protocolo = Math.floor(Math.random() * 100000).toString();
    agendamentos.push({ id_veiculo, nome_cliente, data, hora, protocolo });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              sucesso: true,
              mensagem: `Test drive confirmado para ${nome_cliente} no dia ${data} às ${hora}.`,
              veiculo: `${veiculo.marca} ${veiculo.modelo}`,
              protocolo: protocolo,
            },
            null,
            2,
          ),
        },
      ],
    };
  }
  if (name === "calcular_financiamento") {
    const { orcamento_mensal } = args;
    const resultados = filtrarPorOrcamento(
      veiculos,
      orcamento_mensal,
      TAXA_JUROS_MENSAL,
      PRAZOS,
    );

    // Retorna APENAS os dados estruturados
    const cardsData = resultados.map((item) => ({
      id_veiculo: item.veiculo.id,
      veiculo: `${item.veiculo.marca} ${item.veiculo.modelo}`,
      imagem: item.veiculo.imagem_url,
      opcoes_texto: item.opcoes
        .map((o) => `${o.meses}x R$ ${o.parcela.toFixed(2)}`)
        .join(" | "),
      menor_parcela: item.opcoes[0].parcela.toFixed(2),
    }));

    return {
      structuredContent: {
        mensagem: `Encontramos ${resultados.length} veículo(s) que cabem no seu orçamento.`,
        cards: cardsData,
      },
      content: [
        {
          type: "text",
          text: `Encontramos ${resultados.length} veículo(s) que cabem no seu orçamento de R$ ${orcamento_mensal}/mês.`,
        },
      ],
    };
  }
  if (name === "renderizar_financiamento") {
    // Espera receber os mesmos dados que a ferramenta de dados retornou
    const { mensagem, cards } = args;

    // Valida se os dados necessários estão presentes
    if (!cards || !Array.isArray(cards)) {
      throw new Error("Dados de financiamento inválidos para renderizar.");
    }

    // Retorna os dados e a referência ao template UI
    return {
      structuredContent: { mensagem, cards },
      content: [{ type: "text", text: mensagem }],
      _meta: {
        ui: {
          resourceUri: WIDGET_TEMPLATE_URI, // <-- Link para o template HTML
        },
      },
    };
  }
  throw new Error(`Ferramenta desconhecida: ${name}`);
});

// Handler para listar recursos disponíveis
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: WIDGET_TEMPLATE_URI,
      name: "Stellantis Cards Widget",
      description: "Widget que exibe cards de veículos financiáveis",
      mimeType: "text/html;profile=mcp-app",
    },
  ],
}));

// Handler para ler o conteúdo do recurso
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  if (uri === WIDGET_TEMPLATE_URI) {
    return {
      contents: [
        {
          uri: WIDGET_TEMPLATE_URI,
          mimeType: "text/html;profile=mcp-app",
          text: widgetHtml,
          _meta: { ui: { prefersBorder: true } },
        },
      ],
    };
  }
  throw new Error(`Recurso não encontrado: ${uri}`);
});

// ===== Servidor Express com SSE =====
const app = express();
const port = process.env.PORT || 3000;

// Armazena o transporte ativo (apenas uma conexão por vez)
let activeTransport = null;

app.get("/sse", async (req, res) => {
  console.log("Nova conexão SSE");
  const transport = new SSEServerTransport("/messages", res);
  activeTransport = transport;
  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  if (!activeTransport) {
    res.status(400).send("No active SSE connection");
    return;
  }
  await activeTransport.handlePostMessage(req, res);
});

// --- NOVO ENDPOINT PARA VER AGENDAMENTOS ---
app.get("/appointments", (req, res) => {
  res.json({
    total: agendamentos.length,
    agendamentos: agendamentos,
  });
});

app.listen(port, () => {
  console.log(`🚀 MCP SSE server rodando em http://localhost:${port}`);
  console.log(`📡 Endpoint SSE: http://localhost:${port}/sse`);
  console.log(`📋 Ferramentas disponíveis:`);
  console.log(`   - listar_veiculos (filtro por marca)`);
  console.log(`   - calcular_financiamento (orçamento mensal)`);
  console.log(`   - agendar_test_drive (com validação de conflito)`);
});
