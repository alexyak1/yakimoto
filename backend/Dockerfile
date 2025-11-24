FROM python:3.11-slim

# Create a non-root user
RUN useradd -m -u 1000 appuser

WORKDIR /app

# Create and activate virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Update pip to latest version
RUN pip install --upgrade pip --no-cache-dir

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app

# Create directories that will be used for volumes and ensure proper permissions
RUN mkdir -p /app/app/data /app/app/uploads && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

