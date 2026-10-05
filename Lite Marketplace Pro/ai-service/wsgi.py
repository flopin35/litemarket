"""Entry point.

Development:  python wsgi.py                (http://localhost:8000)
Production:   gunicorn -w 2 -b 0.0.0.0:8000 wsgi:app
"""
import os

from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "8000")), debug=False)
