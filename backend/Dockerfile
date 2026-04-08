# ════════════════════════════════════════════════════════════════
# Stage 1: Builder — install Python dependencies
# ════════════════════════════════════════════════════════════════
FROM python:3.11-slim AS builder

WORKDIR /build

# System libs required by psycopg2, Pillow, cryptography
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev \
    libffi-dev \
    libssl-dev \
    libjpeg-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install all Python packages under /install for clean copying
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir --prefix=/install -r requirements.txt


# ════════════════════════════════════════════════════════════════
# Stage 2: Runtime — minimal production image
# ════════════════════════════════════════════════════════════════
FROM python:3.11-slim AS runtime

WORKDIR /app

# Runtime-only OS libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    libjpeg62-turbo \
    zlib1g \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from builder
COPY --from=builder /install /usr/local

# Copy application source
COPY app/ ./app/

# Create directories for uploaded files (mounted as volumes in production)
RUN mkdir -p uploads/receipts uploads/attachments logs

# Non-root user for security
RUN groupadd -r appgroup && useradd -r -g appgroup appuser \
    && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8000

# Health check — hits the /health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Run with 4 workers in production
# Override WEB_CONCURRENCY env var to change worker count
CMD ["uvicorn", "app.main:app", \
    "--host", "0.0.0.0", \
    "--port", "8000", \
    "--workers", "4", \
    "--log-level", "info"]
