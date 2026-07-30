FROM python:3.10-slim AS base

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libasound2-dev \
    portaudio19-dev \
    ffmpeg \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
RUN pip install --default-timeout=1000 --no-cache-dir -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu

COPY . .

# Main service target
FROM base AS realtime-voice
CMD ["python", "LLM.py"]

# Worker target
FROM base AS python-worker
CMD ["python", "worker.py"]
