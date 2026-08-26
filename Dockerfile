FROM node:24-alpine AS dev
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
EXPOSE 4200
CMD ["npm", "start", "--", "--host", "0.0.0.0", "--poll", "2000"]

FROM dev AS build
COPY . .
RUN npm run build

FROM node:24-alpine AS prod
WORKDIR /app
COPY --from=build /app/dist ./dist
EXPOSE 4000
CMD ["node", "dist/restaurante-ops/server/server.mjs"]
