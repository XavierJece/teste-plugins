import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";

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
        "Calcula quais veículos da Stellantis cabem no orçamento mensal do cliente.",
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

    // Formata os resultados com cards
    const cards = resultados.map((item) => {
      const opcoesTexto = item.opcoes
        .map((o) => `${o.meses}x de R$ ${o.parcela.toFixed(2)}`)
        .join(" | ");
      return {
        type: "card",
        title: `${item.veiculo.marca} ${item.veiculo.modelo}`,
        subtitle: `A partir de R$ ${item.opcoes[0].parcela.toFixed(2)}/mês`,
        image: item.veiculo.imagem_url,
        description: `Opções: ${opcoesTexto}`,
        buttons: [
          {
            label: "Agendar Test Drive",
            action: "agendar_test_drive",
            params: { id_veiculo: item.veiculo.id },
          },
        ],
      };
    });

    // No handler do calcular_financiamento
    return {
      content: [
        {
          type: "text",
          text: `Encontramos ${resultados.length} veículos para seu orçamento:`,
        },
        ...resultados.map((item) => ({
          type: "card",
          title: `${item.veiculo.marca} ${item.veiculo.modelo}`,
          subtitle: `R$ ${item.opcoes[0].parcela.toFixed(2)}/mês`,
          image: item.veiculo.imagem_url,
          description: item.opcoes
            .map((o) => `${o.meses}x de R$ ${o.parcela.toFixed(2)}`)
            .join(" | "),
          buttons: [
            {
              label: "Ver detalhes",
              action: "detalhes_veiculo",
              params: { id: item.veiculo.id },
            },
            {
              label: "Agendar test drive",
              action: "agendar_test_drive",
              params: { id_veiculo: item.veiculo.id },
            },
          ],
        })),
      ],
    };
  }
  throw new Error(`Ferramenta desconhecida: ${name}`);
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
