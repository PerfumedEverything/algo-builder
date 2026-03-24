#!/bin/bash
set -e

echo "=== Pulling latest code ==="
cd /opt/algo-builder && git pull

echo "=== Cleaning Docker cache ==="
docker system prune -f
docker builder prune -f

echo "=== Stopping Supabase ==="
cd /opt/supabase/docker && docker compose stop

echo "=== Building ==="
cd /opt/algo-builder && docker compose build nextjs --no-cache
cd /opt/algo-builder && docker compose build price-worker --no-cache

echo "=== Starting Supabase ==="
cd /opt/supabase/docker && docker compose up -d

echo "=== Starting app ==="
cd /opt/algo-builder && docker compose up -d nextjs price-worker && docker compose restart nginx

echo "=== Cleaning dangling images ==="
docker image prune -f

echo "=== Done ==="
docker compose ps
