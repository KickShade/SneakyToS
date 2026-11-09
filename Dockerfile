FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements
COPY requirements-api.txt .

# Install Python packages
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements-api.txt

# Copy backend application source
COPY src/ /app/src/

# Set environment variables
ENV PYTHONPATH=/app/src
ENV PORT=8000
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# Start Uvicorn bound to 0.0.0.0 and dynamically listen on $PORT
CMD ["sh", "-c", "uvicorn sneakytos.api:app --host 0.0.0.0 --port ${PORT:-8000}"]

