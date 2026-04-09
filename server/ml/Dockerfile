FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY . .

# Expose the port FastAPI runs on
EXPOSE 7860

# Command to run the application (HF Spaces use port 7860 by default)
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
