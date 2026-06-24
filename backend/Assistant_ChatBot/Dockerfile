FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y gcc g++ tesseract-ocr && rm -rf /var/lib/apt/lists/*

COPY requirement.txt .
RUN pip install --no-cache-dir -r requirement.txt

COPY . .

CMD ["python", "app.py"]
