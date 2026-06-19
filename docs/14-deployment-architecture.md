# 14. 배포 아키텍처

## 14.1 컨테이너 구성 (`docker-compose.yml`)

```yaml
version: "3.9"

services:
  nginx:
    image: nginx:1.27-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./nginx/certbot/conf:/etc/letsencrypt:ro
      - ./frontend/dist:/usr/share/nginx/html:ro
    depends_on:
      - api
    restart: always

  api:
    image: ghcr.io/erpilot/api:${IMAGE_TAG}
    env_file: .env.production
    expose:
      - "3000"
    depends_on:
      - redis
    restart: always
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/v1/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  worker:
    image: ghcr.io/erpilot/worker:${IMAGE_TAG}
    env_file: .env.production
    command: ["node", "dist/worker.js"]
    depends_on:
      - redis
    restart: always

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    restart: always

volumes:
  redis-data:
```

> PostgreSQL은 운영 안정성을 위해 동일 Compose가 아닌 **별도 RDS for PostgreSQL**(또는 동일 EC2의 독립 systemd 서비스)로 분리하여, API 컨테이너 재배포 시 DB가 함께 재시작되는 위험을 차단한다. 연결 정보는 `.env.production`의 `DATABASE_URL`로 주입한다.

## 14.2 Dockerfile (NestJS API, Multi-stage Build)

```dockerfile
# ── Build Stage ──────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# ── Production Stage ─────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000
USER node
CMD ["node", "dist/main.js"]
```

## 14.3 Dockerfile (React Frontend, Multi-stage Build)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build
# 빌드 결과(dist/)는 CI에서 EC2로 직접 동기화(rsync)하여 Nginx가 정적 파일로 서빙
```

## 14.4 Nginx 설정

```nginx
# nginx/conf.d/erpilot.conf
server {
    listen 80;
    server_name erpilot.io;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name erpilot.io;

    ssl_certificate     /etc/letsencrypt/live/erpilot.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/erpilot.io/privkey.pem;

    gzip on;
    gzip_types text/css application/javascript application/json;

    # React SPA 정적 파일
    root /usr/share/nginx/html;
    location / {
        try_files $uri /index.html;
        add_header Cache-Control "no-cache";
    }
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API 리버스 프록시
    location /api/ {
        proxy_pass http://api:3000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # AI 챗봇 SSE 스트리밍을 위한 버퍼링 해제
        proxy_buffering off;
        proxy_read_timeout 120s;
    }
}
```

- `proxy_buffering off`는 AI 챗봇의 SSE 스트리밍 응답이 Nginx 버퍼에 모였다가 한꺼번에 전달되지 않고 토큰 단위로 즉시 클라이언트에 전달되도록 하는 핵심 설정이다.

## 14.5 GitHub Actions CI/CD

```yaml
# .github/workflows/deploy.yml
name: CI/CD

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx prisma generate
      - run: npm run lint
      - run: npm run test
      - run: npm run build

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: ./apps/api
          push: true
          tags: ghcr.io/erpilot/api:${{ github.sha }}
      - uses: docker/build-push-action@v5
        with:
          context: ./apps/worker
          push: true
          tags: ghcr.io/erpilot/worker:${{ github.sha }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - name: Build frontend
        run: |
          npm ci --prefix apps/frontend
          npm run build --prefix apps/frontend
        env:
          VITE_API_BASE_URL: https://erpilot.io/api/v1

      - name: Sync frontend build to EC2
        uses: easingthemes/ssh-deploy@main
        with:
          SSH_PRIVATE_KEY: ${{ secrets.EC2_SSH_KEY }}
          SOURCE: "apps/frontend/dist/"
          REMOTE_HOST: ${{ secrets.EC2_HOST }}
          REMOTE_USER: ubuntu
          TARGET: "/home/ubuntu/erpilot/frontend/dist"

      - name: Deploy containers via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_KEY }}
          envs: IMAGE_TAG
          script: |
            cd /home/ubuntu/erpilot
            export IMAGE_TAG=${{ github.sha }}
            echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin
            docker compose pull
            docker compose up -d --remove-orphans
            docker image prune -f
```

## 14.6 배포 전략

- **무중단 배포(간이)**: `docker compose up -d`는 변경된 서비스만 재생성하므로 Nginx/Redis는 그대로 유지되고 API 컨테이너만 교체된다. 완전한 무중단을 위해서는 헬스체크 통과 후 트래픽을 전환하는 Blue-Green이 이상적이나, 포트폴리오 규모(단일 EC2)에서는 **API 컨테이너 재시작 수 초간의 짧은 다운타임을 허용**하는 실용적 선택을 했고, 이를 로드맵에 "ALB + Target Group 기반 Blue-Green 배포"로 명시한다.
- **헬스체크**: `GET /api/v1/health`가 DB 연결, Redis 연결을 확인 후 200을 반환하여 `docker-compose.yml`의 `healthcheck`와 배포 후 스모크 테스트에 활용된다.
- **마이그레이션 적용**: 배포 스크립트에서 컨테이너 기동 전 `npx prisma migrate deploy`를 1회성 Job으로 실행 — API 컨테이너가 여러 개로 스케일될 경우에도 마이그레이션이 중복 실행되지 않도록 별도 단계로 분리.
- **롤백**: 이미지 태그가 Git SHA 기준으로 관리되므로, 장애 시 `IMAGE_TAG`를 이전 SHA로 지정해 `docker compose up -d`만 재실행하면 즉시 롤백 가능.

## 14.7 환경변수/Secrets 관리

| 구분 | 저장 위치 |
|---|---|
| `DATABASE_URL`, `JWT_ACCESS_SECRET`, `OPENAI_API_KEY` | GitHub Actions Secrets(빌드 시) + EC2 서버 `.env.production`(런타임, Git 추적 제외) |
| `EC2_SSH_KEY`, `EC2_HOST` | GitHub Actions Secrets (배포 파이프라인 전용) |
| SSL 인증서 | Let's Encrypt(Certbot), EC2 내 볼륨에 저장 후 Nginx 마운트, 90일 자동 갱신 cron |

`.env.production` 파일은 절대 리포지토리에 커밋하지 않고, 최초 EC2 셋업 시 1회 수동 배치 후 GitHub Actions는 해당 파일을 변경하지 않는다(시크릿 회전 시에만 수동 갱신).
