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
RUN apk add --no-cache openssl su-exec
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000
# 컨테이너는 root로 시작해 entrypoint에서 Volume 소유권을 정리한 뒤 node로 권한을 낮춘다
# (USER node를 여기서 고정하면 Railway Volume 마운트 시 /app/uploads 쓰기 권한이 막힌다).
ENTRYPOINT ["docker-entrypoint.sh"]
# Railway는 별도 1회성 마이그레이션 Job을 지원하지 않으므로 컨테이너 기동 시 적용한다.
# (docs/14 14.6이 전제한 "별도 Job 분리"는 단일 인스턴스 포트폴리오 배포 규모에서는 과함)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
