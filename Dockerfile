
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .   # copia todos os arquivos do projeto
EXPOSE 3000
CMD ["node", "server.js"]