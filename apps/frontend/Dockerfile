# docs/14-deployment-architecture.md 14.3을 Railway 배포용으로 확장
# (원 문서는 dist/만 만들어 EC2로 rsync하는 전제였으나, Railway는 컨테이너 자체를
# 서비스로 실행하므로 두 번째 스테이지에서 Nginx로 직접 서빙한다.)

# ── Build Stage ──────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Vite는 빌드 시점에 env를 정적 파일에 박아 넣으므로 빌드 인자로 주입한다.
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# ── Serve Stage (Nginx, SPA) ──────────────────
FROM nginx:1.27-alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
# Railway는 PORT 환경변수로 리스닝 포트를 지정 — nginx 공식 이미지의
# envsubst-on-templates 엔트리포인트가 ${PORT}를 실제 값으로 치환한다.
ENV PORT=8080
EXPOSE 8080
