FROM node:18-alpine

WORKDIR /app

# Inicializa o projeto e instala o express
RUN npm init -y && npm install express

# Cria o arquivo server.js
COPY server.js .

EXPOSE 3000

CMD ["node", "server.js"]
