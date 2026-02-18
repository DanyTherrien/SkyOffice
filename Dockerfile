# Dockerfile pour le serveur Capturia Office (Colyseus + Express)
# Deploiement sur Fly.io — region yul (Montreal)

FROM node:20

WORKDIR /app

# Copier les fichiers de dependances (root + types)
COPY package.json yarn.lock ./
COPY types/ types/

# Installer les dependances (devDeps incluses pour ts-node)
RUN yarn install --frozen-lockfile
RUN cd types && yarn install --frozen-lockfile

# Copier le code serveur
COPY server/ server/

# Variables d'environnement
ENV NODE_ENV=production
ENV PORT=2567

EXPOSE 2567

# Demarrer le serveur avec ts-node (mode production)
CMD ["yarn", "start:prod"]
