# docs/14-deployment-architecture.md 14.2 — Multi-stage Build (Railway 배포용으로 마이그레이션 스텝 추가)
# ── Build Stage ──────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# ── Production Stage ─────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000
USER node
# Railway는 별도 1회성 마이그레이션 Job을 지원하지 않으므로 컨테이너 기동 시 적용한다.
# (docs/14 14.6이 전제한 "별도 Job 분리"는 단일 인스턴스 포트폴리오 배포 규모에서는 과함)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
