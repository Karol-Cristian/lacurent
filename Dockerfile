FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

COPY commercial/requirements.txt ./commercial/requirements.txt
RUN python -m pip install --no-cache-dir -r commercial/requirements.txt

COPY commercial ./commercial

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD python -c "import os, sys, urllib.request; port = os.environ.get('PORT', '8000'); response = urllib.request.urlopen(f'http://127.0.0.1:{port}/health', timeout=2); sys.exit(0 if response.status == 200 else 1)"

CMD ["sh", "-c", "uvicorn commercial.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
