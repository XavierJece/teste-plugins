FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY server.js .
COPY mcp-sse-server.js .
COPY openapi.yaml .
COPY ai-plugin.json .
EXPOSE 3000
CMD ["node", "mcp-sse-server.js"]