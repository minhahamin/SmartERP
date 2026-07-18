#!/bin/sh
set -e

# Railway Volume은 마운트 시 기본적으로 root 소유가 되어, 이미지에 미리 넣어둔 non-root
# 실행 유저(node)로는 /app/uploads에 쓰기 권한이 없다 — 컨테이너를 root로 시작해
# 마운트된 디렉터리 소유권을 넘긴 뒤, su-exec로 권한을 node로 낮춰 실제 앱을 실행한다.
mkdir -p /app/uploads
chown -R node:node /app/uploads

exec su-exec node "$@"
