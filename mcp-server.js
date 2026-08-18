import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";

// ===== WIDGET HTML (UI) =====
const WIDGET_TEMPLATE_URI = "ui://widget/stellantis-cards.html";
const widgetHtml = `...`; // (mantenha o HTML que você já tem)

// ===== BASE DE VEÍCULOS COM CATEGORIA =====
const veiculos = [
  // FIAT
  {
    id: "f1",
    marca: "Fiat",
    modelo: "Mobi Like",
    ano: 2026,
    preco: 74990,
    categoria: "Hatch",
    imagem_url: "https://www.fiat.com.br/content/dam/fiat/br/mobi/2025/versoes/like/like-frente.png",
    destaques: ["1.0 Firefly", "Ar-condicionado", "Kit dignidade"]
  },
  {
    id: "f2",
    marca: "Fiat",
    modelo: "Argo Drive",
    ano: 2026,
    preco: 89990,
    categoria: "Hatch",
    imagem_url: "https://www.fiat.com.br/content/dam/fiat/br/argo/2025/versoes/drive/drive-frente.png",
    destaques: ["1.3 Firefly", "Central multimídia", "Vidros elétricos"]
  },
  {
    id: "f3",
    marca: "Fiat",
    modelo: "Cronos Precision",
    ano: 2026,
    preco: 109990,
    categoria: "Sedan",
    imagem_url: "https://www.fiat.com.br/content/dam/fiat/br/cronos/2025/versoes/precision/precision-frente.png",
    destaques: ["1.3 Firefly", "Câmbio CVT", "Central 7\""]
  },
  {
    id: "f4",
    marca: "Fiat",
    modelo: "Pulse Drive",
    ano: 2026,
    preco: 114990,
    categoria: "SUV",
    imagem_url: "https://www.fiat.com.br/content/dam/fiat/br/pulse/2025/versoes/drive/drive-frente.png",
    destaques: ["1.0 Turbo 200", "Central 10.1\"", "Hill Holder"]
  },
  {
    id: "f5",
    marca: "Fiat",
    modelo: "Fastback Abarth",
    ano: 2026,
    preco: 149990,
    categoria: "SUV Coupé",
    imagem_url: "https://www.fiat.com.br/content/dam/fiat/br/fastback/2025/versoes/abarth/abarth-frente.png",
    destaques: ["1.3 Turbo 270", "Câmbio automático 6 marchas", "Escapamento esportivo"]
  },
  {
    id: "f6",
    marca: "Fiat",
    modelo: "Toro Freedom",
    ano: 2026,
    preco: 169990,
    categoria: "Picape",
    imagem_url: "https://www.fiat.com.br/content/dam/fiat/br/toro/2025/versoes/freedom/freedom-frente.png",
    destaques: ["1.3 Turbo", "Caçamba de 937L", "Central 10.1\""]
  },
  {
    id: "f7",
    marca: "Fiat",
    modelo: "Toro Volcano",
    ano: 2026,
    preco: 189990,
    categoria: "Picape",
    imagem_url: "https://www.fiat.com.br/content/dam/fiat/br/toro/2025/versoes/volcano/volcano-frente.png",
    destaques: ["2.0 Turbo Diesel", "Tração 4x4", "Rodas 18\""]
  },
  {
    id: "f8",
    marca: "Fiat",
    modelo: "Strada Ranch",
    ano: 2026,
    preco: 129990,
    categoria: "Picape",
    imagem_url: "https://www.fiat.com.br/content/dam/fiat/br/strada/2025/versoes/ranch/ranch-frente.png",
    destaques: ["1.3 Firefly", "Cabine dupla", "Barras de teto"]
  },
  {
    id: "f9",
    marca: "Fiat",
    modelo: "Ducato Cargo",
    ano: 2026,
    preco: 219990,
    categoria: "Utilitário",
    imagem_url: "https://www.fiat.com.br/content/dam/fiat/br/ducato/2025/versoes/cargo/cargo-frente.png",
    destaques: ["2.3 Turbo Diesel", "Capacidade de carga 13m³", "Piso de borracha"]
  },
  // JEEP
  {
    id: "j1",
    marca: "Jeep",
    modelo: "Renegade Sport",
    ano: 2026,
    preco: 119990,
    categoria: "SUV",
    imagem_url: "https://www.jeep.com.br/content/dam/jeep/br/renegade/2025/versoes/sport/sport-frente.png",
    destaques: ["1.3 Turbo", "Tração dianteira", "Central 8.4\""]
  },
  {
    id: "j2",
    marca: "Jeep",
    modelo: "Renegade Longitude",
    ano: 2026,
    preco: 139990,
    categoria: "SUV",
    imagem_url: "https://www.jeep.com.br/content/dam/jeep/br/renegade/2025/versoes/longitude/longitude-frente.png",
    destaques: ["1.3 Turbo", "Tração 4x4", "Teto solar"]
  },
  {
    id: "j3",
    marca: "Jeep",
    modelo: "Compass Sport",
    ano: 2026,
    preco: 174990,
    categoria: "SUV",
    imagem_url: "https://www.jeep.com.br/content/dam/jeep/br/compass/2025/versoes/sport/sport-frente.png",
    destaques: ["2.0 Turbo Diesel", "Tração 4x4", "Central 10.1\""]
  },
  {
    id: "j4",
    marca: "Jeep",
    modelo: "Compass Longitude",
    ano: 2026,
    preco: 199990,
    categoria: "SUV",
    imagem_url: "https://www.jeep.com.br/content/dam/jeep/br/compass/2025/versoes/longitude/longitude-frente.png",
    destaques: ["2.0 Turbo Diesel", "Tração 4x4", "Pacote Adventure"]
  },
  {
    id: "j5",
    marca: "Jeep",
    modelo: "Compass S",
    ano: 2026,
    preco: 229990,
    categoria: "SUV",
    imagem_url: "https://www.jeep.com.br/content/dam/jeep/br/compass/2025/versoes/s/s-frente.png",
    destaques: ["2.0 Turbo Diesel", "Tração 4x4", "Bank premium"]
  },
  {
    id: "j6",
    marca: "Jeep",
    modelo: "Commander Sport",
    ano: 2026,
    preco: 229990,
    categoria: "SUV",
    imagem_url: "https://www.jeep.com.br/content/dam/jeep/br/commander/2025/versoes/sport/sport-frente.png",
    destaques: ["2.0 Turbo Diesel", "7 lugares", "Tração 4x4"]
  },
  {
    id: "j7",
    marca: "Jeep",
    modelo: "Commander Limited",
    ano: 2026,
    preco: 269990,
    categoria: "SUV",
    imagem_url: "https://www.jeep.com.br/content/dam/jeep/br/commander/2025/versoes/limited/limited-frente.png",
    destaques: ["2.0 Turbo Diesel", "7 lugares", "Bank premium"]
  },
  {
    id: "j8",
    marca: "Jeep",
    modelo: "Wrangler Sport",
    ano: 2026,
    preco: 319990,
    categoria: "SUV",
    imagem_url: "https://www.jeep.com.br/content/dam/jeep/br/wrangler/2025/versoes/sport/sport-frente.png",
    destaques: ["2.0 Turbo", "Tração 4x4", "Capota removível"]
  },
  {
    id: "j9",
    marca: "Jeep",
    modelo: "Wrangler Rubicon",
    ano: 2026,
    preco: 389990,
    categoria: "SUV",
    imagem_url: "https://www.jeep.com.br/content/dam/jeep/br/wrangler/2025/versoes/rubicon/rubicon-frente.png",
    destaques: ["2.0 Turbo", "Tração 4x4", "Diferenciais bloqueáveis"]
  },
  // RAM
  {
    id: "r1",
    marca: "Ram",
    modelo: "Rampage Express",
    ano: 2026,
    preco: 239990,
    categoria: "Picape",
    imagem_url: "https://www.ram.com.br/content/dam/ram/br/rampage/2025/versoes/express/express-frente.png",
    destaques: ["2.0 Turbo Diesel", "Tração 4x4", "Caçamba de 750kg"]
  },
  {
    id: "r2",
    marca: "Ram",
    modelo: "Rampage Laramie",
    ano: 2026,
    preco: 279990,
    categoria: "Picape",
    imagem_url: "https://www.ram.com.br/content/dam/ram/br/rampage/2025/versoes/laramie/laramie-frente.png",
    destaques: ["2.0 Turbo Diesel", "Tração 4x4", "Bank premium"]
  },
  {
    id: "r3",
    marca: "Ram",
    modelo: "Rampage R/T",
    ano: 2026,
    preco: 319990,
    categoria: "Picape",
    imagem_url: "https://www.ram.com.br/content/dam/ram/br/rampage/2025/versoes/rt/rt-frente.png",
    destaques: ["2.0 Turbo Diesel", "Tração 4x4", "Escapamento esportivo"]
  },
  {
    id: "r4",
    marca: "Ram",
    modelo: "1500 Rebel",
    ano: 2026,
    preco: 489990,
    categoria: "Picape",
    imagem_url: "https://www.ram.com.br/content/dam/ram/br/1500/2025/versoes/rebel/rebel-frente.png",
    destaques: ["5.7 V8 HEMI", "Tração 4x4", "Suspensão elevada"]
  },
  {
    id: "r5",
    marca: "Ram",
    modelo: "1500 Laramie",
    ano: 2026,
    preco: 559990,
    categoria: "Picape",
    imagem_url: "https://www.ram.com.br/content/dam/ram/br/1500/2025/versoes/laramie/laramie-frente.png",
    destaques: ["5.7 V8 HEMI", "Tração 4x4", "Acabamento premium"]
  },
  // CITROËN
  {
    id: "c1",
    marca: "Citroën",
    modelo: "C3 Live",
    ano: 2026,
    preco: 79990,
    categoria: "Hatch",
    imagem_url: "https://www.citroen.com.br/content/dam/citroen/br/c3/2025/versoes/live/live-frente.png",
    destaques: ["1.0 Firefly", "Ar-condicionado", "Central multimídia"]
  },
  {
    id: "c2",
    marca: "Citroën",
    modelo: "C3 Feel",
    ano: 2026,
    preco: 89990,
    categoria: "Hatch",
    imagem_url: "https://www.citroen.com.br/content/dam/citroen/br/c3/2025/versoes/feel/feel-frente.png",
    destaques: ["1.0 Turbo", "Central 10.1\"", "Ar condicionado automático"]
  },
  {
    id: "c3",
    marca: "Citroën",
    modelo: "C3 Aircross",
    ano: 2026,
    preco: 109990,
    categoria: "SUV",
    imagem_url: "https://www.citroen.com.br/content/dam/citroen/br/c3-aircross/2025/versoes/feel/feel-frente.png",
    destaques: ["1.0 Turbo", "7 lugares", "Central 10.1\""]
  },
  {
    id: "c4",
    marca: "Citroën",
    modelo: "C4 Lounge",
    ano: 2026,
    preco: 139990,
    categoria: "Sedan",
    imagem_url: "https://www.citroen.com.br/content/dam/citroen/br/c4/2025/versoes/lounge/lounge-frente.png",
    destaques: ["1.6 THP", "Câmbio automático", "Acabamento premium"]
  },
  // PEUGEOT
  {
    id: "p1",
    marca: "Peugeot",
    modelo: "208 Like",
    ano: 2026,
    preco: 89990,
    categoria: "Hatch",
    imagem_url: "https://www.peugeot.com.br/content/dam/peugeot/br/208/2025/versoes/like/like-frente.png",
    destaques: ["1.0 Firefly", "Central 7\"", "Ar-condicionado"]
  },
  {
    id: "p2",
    marca: "Peugeot",
    modelo: "208 GT",
    ano: 2026,
    preco: 119990,
    categoria: "Hatch",
    imagem_url: "https://www.peugeot.com.br/content/dam/peugeot/br/208/2025/versoes/gt/gt-frente.png",
    destaques: ["1.0 Turbo 200", "Painel 3D", "Bank premium"]
  },
  {
    id: "p3",
    marca: "Peugeot",
    modelo: "2008 Allure",
    ano: 2026,
    preco: 139990,
    categoria: "SUV",
    imagem_url: "https://www.peugeot.com.br/content/dam/peugeot/br/2008/2025/versoes/allure/allure-frente.png",
    destaques: ["1.0 Turbo 200", "Central 10.1\"", "Teto panorâmico"]
  },
  {
    id: "p4",
    marca: "Peugeot",
    modelo: "3008 GT",
    ano: 2026,
    preco: 219990,
    categoria: "SUV",
    imagem_url: "https://www.peugeot.com.br/content/dam/peugeot/br/3008/2025/versoes/gt/gt-frente.png",
    destaques: ["1.6 THP", "Painel i-Cockpit", "Acabamento exclusivo"]
  }
];

// ===== CONFIGURAÇÕES DE FINANCIAMENTO =====
const TAXA_JUROS_MENSAL = 0.0099;
const PRAZOS = [12, 24, 36, 48, 60, 72];

function calcularParcela(preco, taxa, meses) {
  const i = taxa;
  const n = meses;
  return (preco * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
}

function calcularParcelas(preco, taxa, prazos) {
  return prazos.map(meses => ({
    meses,
    parcela: Math.round(calcularParcela(preco, taxa, meses) * 100) / 100
  }));
}

function filtrarPorOrcamento(veiculos, orcamentoMensal, taxa, prazos) {
  const resultados = [];
  for (const veiculo of veiculos) {
    const opcoes = [];
    for (const meses of prazos) {
      const parcela = calcularParcela(veiculo.preco, taxa, meses);
      if (parcela <= orcamentoMensal) {
        opcoes.push({ meses, parcela: Math.round(parcela * 100) / 100 });
      }
    }
    if (opcoes.length > 0) {
      resultados.push({ veiculo, opcoes });
    }
  }
  return resultados;
}

// ===== SERVIDOR MCP =====
const server = new Server(
  { name: "stellantis-assistant", version: "1.0.0" },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// ===== HANDLERS DE RECURSOS (UI) =====
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

// ===== LISTA DE FERRAMENTAS =====
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "listar_veiculos",
      description: "Lista todos os veículos da Stellantis, com opção de filtrar por marca.",
      inputSchema: {
        type: "object",
        properties: {
          marca: { type: "string", description: "Marca (ex: Jeep, Fiat, Ram)" },
        },
      },
    },
    {
      name: "calcular_financiamento",
      description: "Calcula quais veículos cabem no orçamento mensal do cliente. Retorna dados estruturados para UI e uma mensagem amigável.",
      inputSchema: {
        type: "object",
        properties: {
          orcamento_mensal: { type: "number", description: "Valor mensal que o cliente pode pagar (em reais)" },
          prazo_desejado: { type: "number", description: "Opcional: número de meses desejado (12,24,36,48,60,72). Se não informado, considera todos." },
          categoria_preferida: { type: "string", description: "Opcional: categoria (Hatch, Sedan, SUV, Picape, Utilitário, SUV Coupé)" },
        },
        required: ["orcamento_mensal"],
      },
    },
    {
      name: "detalhes_veiculo",
      description: "Retorna os detalhes de um veículo específico, incluindo todas as opções de parcelamento.",
      inputSchema: {
        type: "object",
        properties: {
          id_veiculo: { type: "string", description: "ID do veículo" },
        },
        required: ["id_veiculo"],
      },
    },
    {
      name: "agendar_test_drive",
      description: "Agenda um test drive para um veículo, verificando disponibilidade de data/hora.",
      inputSchema: {
        type: "object",
        properties: {
          id_veiculo: { type: "string", description: "ID do veículo" },
          nome_cliente: { type: "string", description: "Nome completo do cliente" },
          data: { type: "string", description: "Data desejada (formato YYYY-MM-DD)" },
          hora: { type: "string", description: "Horário desejado (formato HH:MM)" },
        },
        required: ["id_veiculo", "nome_cliente", "data", "hora"],
      },
    },
    {
      name: "renderizar_financiamento",
      description: "Renderiza os resultados do financiamento em cards visuais. Deve ser chamada APÓS calcular_financiamento, passando os dados retornados por ela.",
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

// ===== HANDLERS DAS FERRAMENTAS =====
const agendamentos = [];

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // 1. LISTAR VEÍCULOS
  if (name === "listar_veiculos") {
    const { marca } = args;
    let resultado = veiculos;
    if (marca) {
      resultado = veiculos.filter(v => v.marca.toLowerCase() === marca.toLowerCase());
    }
    const texto = resultado.map(v =>
      `${v.marca} ${v.modelo} - R$ ${v.preco.toFixed(2)} - ${v.categoria}`
    ).join('\n');
    return { content: [{ type: "text", text: texto || "Nenhum veículo encontrado." }] };
  }

  // 2. CALCULAR FINANCIAMENTO (VENDEDOR DINÂMICO)
  if (name === "calcular_financiamento") {
    const { orcamento_mensal, prazo_desejado, categoria_preferida } = args;

    // Aplica filtros
    let lista = veiculos;
    if (categoria_preferida) {
      lista = lista.filter(v => v.categoria.toLowerCase() === categoria_preferida.toLowerCase());
    }

    let resultados = filtrarPorOrcamento(lista, orcamento_mensal, TAXA_JUROS_MENSAL, PRAZOS);

    // Se não houver resultados, busca o veículo mais barato com o maior prazo
    if (resultados.length === 0) {
      const maisBarato = veiculos.reduce((a, b) => a.preco < b.preco ? a : b);
      const parcela72 = calcularParcela(maisBarato.preco, TAXA_JUROS_MENSAL, 72);
      const mensagem = `Olá! Com R$ ${orcamento_mensal} por mês, nenhum veículo da Stellantis se encaixa exatamente. 😕
Mas com uma pequena entrada extra ou alongando o prazo, você pode conseguir o ${maisBarato.marca} ${maisBarato.modelo} por R$ ${parcela72.toFixed(2)} em 72 meses.
Que tal simular com um pouco mais de orçamento ou considerar uma entrada maior?`;
      return {
        content: [{ type: "text", text: mensagem }],
        structuredContent: { mensagem, cards: [] }
      };
    }

    // Se houver resultados, monta uma resposta personalizada
    const cards = resultados.map(item => ({
      id_veiculo: item.veiculo.id,
      veiculo: `${item.veiculo.marca} ${item.veiculo.modelo}`,
      imagem: item.veiculo.imagem_url,
      opcoes_texto: item.opcoes.map(o => `${o.meses}x R$ ${o.parcela.toFixed(2)}`).join(' | '),
      menor_parcela: item.opcoes[0].parcela.toFixed(2)
    }));

    // Agrupa por categoria para sugestões
    const porCategoria = {};
    resultados.forEach(r => {
      const cat = r.veiculo.categoria;
      if (!porCategoria[cat]) porCategoria[cat] = [];
      porCategoria[cat].push(r.veiculo.modelo);
    });
    let sugestaoCategoria = '';
    if (Object.keys(porCategoria).length > 0) {
      const cats = Object.keys(porCategoria);
      sugestaoCategoria = `Encontrei opções nas categorias: ${cats.join(', ')}. `;
      if (cats.includes('SUV')) sugestaoCategoria += 'Se você gosta de espaço e versatilidade, os SUVs são ótimos. ';
      if (cats.includes('Hatch')) sugestaoCategoria += 'Os hatches são econômicos e práticos para a cidade. ';
      if (cats.includes('Picape')) sugestaoCategoria += 'As picapes são ideais para trabalho e lazer. ';
    }

    const melhorCusto = resultados.reduce((a, b) => {
      const parcelaA = a.opcoes[0].parcela;
      const parcelaB = b.opcoes[0].parcela;
      return parcelaA < parcelaB ? a : b;
    });
    const recomendacao = `💡 Dica: O ${melhorCusto.veiculo.marca} ${melhorCusto.veiculo.modelo} tem a menor parcela entre os selecionados (R$ ${melhorCusto.opcoes[0].parcela.toFixed(2)} em ${melhorCusto.opcoes[0].meses}x).`;

    const mensagem = `👋 Olá! Com R$ ${orcamento_mensal} por mês, você pode financiar estes ${resultados.length} modelos da Stellantis:\n\n${sugestaoCategoria}\n${recomendacao}\n\nVeja os cards abaixo para mais detalhes e agende um test drive!`;

    return {
      structuredContent: { mensagem, cards },
      content: [{ type: "text", text: mensagem }],
      _meta: {
        ui: {
          resourceUri: WIDGET_TEMPLATE_URI
        }
      }
    };
  }

  // 3. DETALHES DO VEÍCULO
  if (name === "detalhes_veiculo") {
    const { id_veiculo } = args;
    const veiculo = veiculos.find(v => v.id === id_veiculo);
    if (!veiculo) throw new Error("Veículo não encontrado.");
    const parcelas = calcularParcelas(veiculo.preco, TAXA_JUROS_MENSAL, PRAZOS);
    const texto = `🔍 Detalhes do ${veiculo.marca} ${veiculo.modelo}:
💰 Preço: R$ ${veiculo.preco.toFixed(2)}
📊 Parcelas: ${parcelas.map(p => `${p.meses}x R$ ${p.parcela.toFixed(2)}`).join(', ')}
🏷️ Categoria: ${veiculo.categoria}
⭐ Destaques: ${veiculo.destaques.join(', ')}
🖼️ Imagem: ${veiculo.imagem_url}

Para agendar um test drive, use o comando: agendar_test_drive id_veiculo="${veiculo.id}"`;
    return { content: [{ type: "text", text: texto }] };
  }

  // 4. AGENDAR TEST DRIVE (com validação)
  if (name === "agendar_test_drive") {
    const { id_veiculo, nome_cliente, data, hora } = args;
    const veiculo = veiculos.find(v => v.id === id_veiculo);
    if (!veiculo) throw new Error("Veículo não encontrado.");

    const conflito = agendamentos.some(a => a.data === data && a.hora === hora);
    if (conflito) {
      const ocupados = agendamentos.filter(a => a.data === data).map(a => a.hora);
      const disponiveis = ['09:00','10:00','11:00','14:00','15:00','16:00','17:00']
        .filter(h => !ocupados.includes(h));
      return {
        content: [{
          type: "text",
          text: `⏰ Horário ${hora} do dia ${data} já está ocupado. ${disponiveis.length > 0 ? `Horários disponíveis: ${disponiveis.join(', ')}` : 'Nenhum horário disponível neste dia.'}`
        }]
      };
    }

    const protocolo = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    agendamentos.push({ id_veiculo, nome_cliente, data, hora, protocolo });
    return {
      content: [{
        type: "text",
        text: `✅ Test drive confirmado para ${nome_cliente} no dia ${data} às ${hora} no veículo ${veiculo.marca} ${veiculo.modelo}. Protocolo: ${protocolo}`
      }]
    };
  }

  // 5. RENDERIZAR FINANCIAMENTO (UI)
  if (name === "renderizar_financiamento") {
    const { mensagem, cards } = args;
    if (!cards || !Array.isArray(cards)) {
      throw new Error("Dados de financiamento inválidos para renderizar.");
    }
    return {
      structuredContent: { mensagem, cards },
      content: [{ type: "text", text: mensagem }],
      _meta: {
        ui: {
          resourceUri: WIDGET_TEMPLATE_URI
        }
      }
    };
  }

  throw new Error(`Ferramenta desconhecida: ${name}`);
});

// ===== SERVIDOR EXPRESS =====
const app = express();
const port = process.env.PORT || 3000;

let activeTransport = null;

app.get("/sse", async (req, res) => {
  console.log("🔌 Nova conexão SSE");
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

app.get("/appointments", (req, res) => {
  res.json({ total: agendamentos.length, agendamentos });
});

app.listen(port, () => {
  console.log(`🚀 MCP SSE server rodando em http://localhost:${port}`);
  console.log(`📡 Endpoint SSE: http://localhost:${port}/sse`);
  console.log(`📋 Ferramentas disponíveis:`);
  console.log(`   - listar_veiculos`);
  console.log(`   - calcular_financiamento (com sugestões dinâmicas)`);
  console.log(`   - detalhes_veiculo`);
  console.log(`   - agendar_test_drive`);
  console.log(`   - renderizar_financiamento (UI)`);
});