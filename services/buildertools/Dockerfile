# syntax=docker/dockerfile:1
# Single stage: no compiled dependencies, so multi-stage wouldn't reduce image size
FROM python:3.14-slim

# Directory must be owned by sneezy so app can create files at runtime (e.g., secretkey)
ARG UID=1000
RUN useradd -r -u $UID -ms /bin/bash sneezy && \
    mkdir -p /code && chown sneezy:sneezy /code

WORKDIR /code

# Copy requirements first for better layer caching
COPY requirements.txt .

# Cache pip downloads between builds to speed up dependency changes
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

COPY --chown=sneezy:sneezy . .

USER sneezy

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5001').read()" || exit 1

LABEL org.opencontainers.image.title="SneezyMUD Builder Tools" \
    org.opencontainers.image.description="Flask web interface for area, mob, and object editing"

CMD ["python", "main.py"]
