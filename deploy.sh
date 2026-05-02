#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Velosta — Frontend Deployment to Google Cloud Run
#
# Builds the Next.js Docker image locally (Docker), pushes to Artifact Registry,
# deploys the frontend as a public Cloud Run service, then clears local Docker
# builder cache to avoid stale layers and reclaim disk space.
#
# Usage (from FE/ root):
#   source .gcp-env          # optional: load pre-set GCP env vars
#   ./deploy.sh [--skip-build]
#
# Options:
#   --skip-build   Skip docker build & push (re-deploy current image)
#
# Build uses your machine (fast) instead of Google Cloud Build. Image is pushed
# with `docker push` to Artifact Registry (same destination as before).
#
# Prerequisites: gcloud CLI, Docker (BuildKit recommended)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
PROJECT="${GCP_PROJECT:-versatile-digit-476220-g6}"
REGION="${GCP_REGION:-asia-south1}"
AR_HOST="${GCP_AR_HOST:-${REGION}-docker.pkg.dev/${PROJECT}/velosta}"
SA_EMAIL="${GCP_SA_EMAIL:-velosta-sa@${PROJECT}.iam.gserviceaccount.com}"
PUBLIC_WEB_ORIGINS="${PUBLIC_WEB_ORIGINS:-https://velosta.com,https://www.velosta.com}"
# Canonical browser URL baked into the Next.js client (OAuth redirects, links).
NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://velosta.com}"
IMAGE_REPO="velosta/fe"
IMAGE_TAG="${IMAGE_TAG:-latest}"
IMAGE_FULL="${AR_HOST}/${IMAGE_REPO}:${IMAGE_TAG}"
CR_NAME="velosta-fe"
APP_PORT=8080
SKIP_BUILD=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-build) SKIP_BUILD=true; shift ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

log()  { echo -e "\033[1;36m[deploy-fe]\033[0m $*"; }
ok()   { echo -e "\033[1;32m[  OK  ]\033[0m $*"; }
err()  { echo -e "\033[1;31m[ FAIL ]\033[0m $*" >&2; }
die()  { err "$*"; exit 1; }

cleanup_docker_cache() {
  if ! command -v docker >/dev/null 2>&1; then
    log "Skipping Docker cache cleanup — docker not in PATH."
    return 0
  fi
  log "Clearing local Docker builder cache..."
  docker buildx prune --all --force >/dev/null 2>&1 || true
  docker builder prune --all --force >/dev/null 2>&1 || true
  ok "Docker build cache cleared"
}

sm_get() {
  gcloud secrets versions access latest --secret="$1" --project="$PROJECT" 2>/dev/null || echo ""
}

# ── Verify GCP auth / project access ───────────────────────────────────────────
gcloud auth print-access-token &>/dev/null || die "Not authenticated. Run: gcloud auth login"
gcloud projects describe "$PROJECT" --project="$PROJECT" >/dev/null 2>&1 || \
  die "No access to project '$PROJECT'. Set GCP_PROJECT to a project you can access."

command -v docker >/dev/null 2>&1 || die "Docker is required for local builds. Install Docker and try again."
command -v npm >/dev/null 2>&1 || die "npm is required for frontend build. Install Node.js/npm and try again."

# ── Fetch config from Secret Manager ─────────────────────────────────────────
log "Fetching config from Secret Manager..."
GATEWAY_URL=$(sm_get gateway-url)
GOOGLE_CLIENT_ID=$(sm_get google-client-id)
MAPBOX_TOKEN=$(sm_get mapbox-token)

[[ -z "$GATEWAY_URL" || "$GATEWAY_URL" == "PENDING" ]] && \
  die "gateway-url not set in Secret Manager. Run BE/deploy.sh first."
ok "Gateway URL: $GATEWAY_URL"

# Script runs from FE/ root — no path adjustment needed
FE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Build & push (local Docker → Artifact Registry) ───────────────────────────
if [[ "$SKIP_BUILD" == "false" ]]; then
  log "Building image locally and pushing: $IMAGE_FULL"
  cd "$FE_DIR"

  log "Running local npm build..."
  npm run build

  log "Configuring Docker credential helper for Artifact Registry..."
  gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

  # NEXT_PUBLIC_* must be build args — Next.js inlines them; Cloud Run env alone is not enough.
  export DOCKER_BUILDKIT=1
  docker build \
    --file Dockerfile \
    --platform "${DOCKER_PLATFORM:-linux/amd64}" \
    --tag "$IMAGE_FULL" \
    --build-arg "NEXT_PUBLIC_API_BASE_URL=${GATEWAY_URL}" \
    --build-arg "NEXT_PUBLIC_URL=${NEXT_PUBLIC_SITE_URL}" \
    --build-arg "NEXT_PUBLIC_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}" \
    --build-arg "NEXT_PUBLIC_MAPBOX_TOKEN=${MAPBOX_TOKEN}" \
    --build-arg "NEXT_PUBLIC_SITE_NAME=Velosta" \
    .

  log "Pushing image to Artifact Registry..."
  docker push "$IMAGE_FULL"
  ok "Image pushed: $IMAGE_FULL"
fi

# ── Deploy to Cloud Run ───────────────────────────────────────────────────────
log "Deploying $CR_NAME to Cloud Run..."
gcloud run deploy "$CR_NAME" \
  --image "$IMAGE_FULL" \
  --region "$REGION" \
  --project "$PROJECT" \
  --service-account "$SA_EMAIL" \
  --port "$APP_PORT" \
  --min-instances 1 \
  --max-instances 5 \
  --ingress all \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,NEXT_PUBLIC_API_BASE_URL=${GATEWAY_URL},NEXT_PUBLIC_SITE_NAME=Velosta" \
  --set-secrets "NEXT_PUBLIC_GOOGLE_CLIENT_ID=google-client-id:latest,NEXT_PUBLIC_MAPBOX_TOKEN=mapbox-token:latest,GOOGLE_MAPS_KEY=google-maps-key:latest,API_BASE_URL=gateway-url:latest" \
  --platform managed \
  --quiet
ok "$CR_NAME deployed"

FE_URL=$(gcloud run services describe "$CR_NAME" \
  --region="$REGION" --project="$PROJECT" \
  --format="value(status.url)" 2>/dev/null || echo "")
ok "Frontend URL: $FE_URL"

# ── Store FE URL in Secret Manager ────────────────────────────────────────────
if [[ -n "$FE_URL" ]]; then
  printf '%s' "$FE_URL" | gcloud secrets versions add fe-url \
    --data-file=- --project="$PROJECT"
  log "fe-url stored in Secret Manager"

  # Update gateway with full service URLs + CORS so FE deploys never
  # accidentally leave backend proxy vars in a drifted state.
  log "Updating gateway env (service URLs + CORS)..."
  AUTH_URL=$(gcloud run services describe velosta-auth --region="$REGION" --project="$PROJECT" --format="value(status.url)" 2>/dev/null || echo "")
  TRIPS_URL=$(gcloud run services describe velosta-trips --region="$REGION" --project="$PROJECT" --format="value(status.url)" 2>/dev/null || echo "")
  PLANNER_URL=$(gcloud run services describe velosta-planner --region="$REGION" --project="$PROJECT" --format="value(status.url)" 2>/dev/null || echo "")
  VENDORS_URL=$(gcloud run services describe velosta-vendors --region="$REGION" --project="$PROJECT" --format="value(status.url)" 2>/dev/null || echo "")
  CORS_ORIGINS="${PUBLIC_WEB_ORIGINS},${FE_URL},http://localhost:3000"

  GATEWAY_ENV="^|^SERVICE_NAME=gateway|SERVICE_PORT=8000|JWT_ALGORITHM=HS256|JWT_ACCESS_TTL_MIN=1440|JWT_REFRESH_TTL_DAYS=30|LOG_LEVEL=INFO"
  [[ -n "$AUTH_URL"    ]] && GATEWAY_ENV+="|AUTH_SERVICE_URL=${AUTH_URL}"
  [[ -n "$TRIPS_URL"   ]] && GATEWAY_ENV+="|TRIPS_SERVICE_URL=${TRIPS_URL}"
  [[ -n "$PLANNER_URL" ]] && GATEWAY_ENV+="|PLANNER_SERVICE_URL=${PLANNER_URL}"
  [[ -n "$VENDORS_URL" ]] && GATEWAY_ENV+="|VENDORS_SERVICE_URL=${VENDORS_URL}"
  GATEWAY_ENV+="|CORS_ORIGINS=${CORS_ORIGINS}"

  if gcloud run services describe velosta-gateway --region="$REGION" --project="$PROJECT" >/dev/null 2>&1; then
    gcloud run services update velosta-gateway \
      --region="$REGION" \
      --project="$PROJECT" \
      --set-env-vars "$GATEWAY_ENV" \
      --quiet
    ok "Gateway env updated from FE deploy"
  else
    log "  (gateway not yet deployed — env will be set on next BE deploy)"
  fi
fi

# ── Health check ──────────────────────────────────────────────────────────────
if [[ -n "$FE_URL" ]]; then
  log "Health check (allowing time for cold start)..."
  HTTP_CODE="000"
  for i in $(seq 1 12); do
    sleep 10
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${FE_URL}/api/health" 2>/dev/null || echo "000")
    log "  attempt $i/12 → HTTP $HTTP_CODE"
    [[ "$HTTP_CODE" == "200" ]] && break
  done
  if [[ "$HTTP_CODE" == "200" ]]; then
    ok "Frontend health check passed (HTTP 200)"
  else
    err "Frontend not yet healthy (last HTTP $HTTP_CODE). Check logs:"
    echo "    gcloud run services logs read $CR_NAME --region=$REGION --project=$PROJECT"
  fi
fi

ok "Frontend deployment complete!"

cleanup_docker_cache

echo ""
echo "  Frontend URL    : ${FE_URL:-<check Cloud Run console>}"
echo "  Health endpoint : ${FE_URL:-<url>}/api/health"
echo "  Image           : $IMAGE_FULL"
echo ""
echo "  Build tips:"
echo "    • Override public URL: NEXT_PUBLIC_SITE_URL=https://your-domain ./deploy.sh"
echo "    • Apple Silicon → Cloud Run (amd64): DOCKER_PLATFORM=linux/amd64 ./deploy.sh"
echo ""
echo "  IMPORTANT — Post-deployment:"
echo "    1. Add ${FE_URL} as an authorized JavaScript origin in Google OAuth console"
echo "    2. Add ${FE_URL}/api/auth/google/callback as an authorized redirect URI"
echo ""
