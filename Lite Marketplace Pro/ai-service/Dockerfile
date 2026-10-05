FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
COPY wsgi.py .
RUN useradd --system --uid 1001 app
USER app
EXPOSE 8000
CMD ["gunicorn", "-w", "2", "--threads", "4", "-t", "60", "-b", "0.0.0.0:8000", "wsgi:app"]
