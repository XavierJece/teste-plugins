const express = require("express");
const app = express();
const path = require("path");
const cors = require("cors");

app.use(cors());
app.use(express.json());

// Servir arquivos estáticos (opcional, mas prático)
app.use(express.static(__dirname));

// Ou, se quiser rotas explícitas:
app.get("/openapi.yaml", (req, res) => {
  res.sendFile(path.join(__dirname, "openapi.yaml"));
});

app.get("/ai-plugin.json", (req, res) => {
  res.sendFile(path.join(__dirname, "ai-plugin.json"));
});

app.get("/.well-known/ai-plugin.json", (req, res) => {
  res.sendFile(path.join(__dirname, "ai-plugin.json"));
});
// Banco de dados em memória simulando o catálogo Stellantis
const veiculos = [
  {
    id: "v1",
    marca: "Jeep",
    modelo: "Compass Longitude",
    ano: 2026,
    preco: "194990.00",
    imagem_url:
      "https://www.jeep.com.br/content/dam/jeep/br/compass/my25/versoes/longitude/longitude-t270-frente.png",
    destaques: ["Motor T270", 'Central Multimídia 10.1"', "Tração 4x4"],
  },
  {
    id: "v2",
    marca: "Fiat",
    modelo: "Toro Volcano",
    ano: 2026,
    preco: "179990.00",
    imagem_url:
      "https://www.fiat.com.br/content/dam/fiat/br/toro/my25/versoes/volcano/volcano-frente.png",
    destaques: ["Caçamba de 937L", "Motor Turbo Diesel", 'Rodas 18"'],
  },
  {
    id: "v3",
    marca: "Ram",
    modelo: "Rampage Laramie",
    ano: 2026,
    preco: "259990.00",
    imagem_url:
      "https://www.ram.com.br/content/dam/ram/br/rampage/my25/versoes/laramie/laramie-frente.png",
    destaques: ["Motor Hurricane 4", "Acabamento Premium", "Tração 4x4"],
  },
];

// Endpoint 1: Consultar portfólio Stellantis
app.get("/api/veiculos", (req, res) => {
  const { marca } = req.query;
  if (marca) {
    const filtrados = veiculos.filter(
      (v) => v.marca.toLowerCase() === marca.toLowerCase(),
    );
    return res.json({ veiculos: filtrados });
  }
  res.json({ veiculos });
});

// Endpoint 2: Agendar um Test Drive
app.post("/api/test-drive", (req, res) => {
  const { id_veiculo, nome_cliente, data } = req.body;

  if (!id_veiculo || !nome_cliente || !data) {
    return res
      .status(400)
      .json({ erro: "Dados incompletos para o agendamento." });
  }

  const protocolo = Math.floor(Math.random() * 100000).toString();

  res.json({
    sucesso: true,
    mensagem: `Test drive confirmado para ${nome_cliente} no dia ${data}.`,
    protocolo: protocolo,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor Stellantis rodando na porta ${PORT}`);
});
