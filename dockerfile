# Stage 1: Build
FROM node:alpine as builder

# Imposta la directory di lavoro nel container
WORKDIR /app

# Copia i file `package.json` e `package-lock.json` (o `yarn.lock`)
COPY package*.json ./

# Installa le dipendenze del progetto
RUN npm install

# Copia il resto dei file del progetto
COPY . .

# Costruisce l'applicazione per la produzione
RUN npm run build

# Stage 2: Serve
FROM node:alpine

# Imposta la directory di lavoro nel container
WORKDIR /app

# Copia tutti i file sorgente e risorse statiche
COPY --from=builder /app /app

# Avvia il server Next.js
CMD ["npm", "start"]