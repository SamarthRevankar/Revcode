FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY . .

# Set environment variables for the ML engine
ENV PYTHONUNBUFFERED=1
ENV PORT=7860

# Expose the port FastAPI runs on
EXPOSE 7860

# Command to run the application using gunicorn for higher stability
# We use uvicorn workers for high-concurrency FastAPI support
CMD ["gunicorn", "app:app", "--workers", "1", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:7860", "--timeout", "600"]
