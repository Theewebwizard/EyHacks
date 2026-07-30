FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y gcc g++ libasound-dev portaudio19-dev libportaudio2 libportaudiocpp0 ffmpeg tesseract-ocr && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --default-timeout=1000 --no-cache-dir -r requirements.txt
RUN pip install --default-timeout=1000 twilio websockets

COPY . .

CMD ["python", "LLM.py"]
