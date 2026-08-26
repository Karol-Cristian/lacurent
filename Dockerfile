FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HOST=0.0.0.0 \
    PORT=8765

WORKDIR /app

COPY python_engine ./python_engine

EXPOSE 8765

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import os, sys, urllib.request; port = os.environ.get('PORT', '8765'); response = urllib.request.urlopen(f'http://127.0.0.1:{port}/health', timeout=2); sys.exit(0 if response.status == 200 else 1)"

CMD ["python", "-m", "python_engine", "serve"]
