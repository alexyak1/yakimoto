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

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create directories that will be used for volumes
RUN mkdir -p /app/app/data /app/app/uploads

# Set entrypoint (runs as root to fix permissions, then switches to appuser)
ENTRYPOINT ["/entrypoint.sh"]

# Default command (will be run as appuser after entrypoint)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

