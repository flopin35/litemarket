# Running it locally

The fastest way is Docker (see the README). This guide runs each part on its own, which is what you want while changing code.

## What you need

| Tool | Version | Check with |
|---|---|---|
| Java (JDK) | 21 | `java -version` |
| Maven | 3.9+ | `mvn -v` |
| Python | 3.11+ | `python --version` |
| Node.js | 20.19+ or 22+ | `node -v` |

On Windows, install Java from [Adoptium](https://adoptium.net) (Temurin 21), Maven from [maven.apache.org](https://maven.apache.org/download.cgi), Python from [python.org](https://www.python.org/downloads/) (tick "Add to PATH") and Node from [nodejs.org](https://nodejs.org). IntelliJ IDEA Community can open `backend/pom.xml` and run the API with one click.

## 1. The Java API (port 8080)

```bash
cd backend
mvn spring-boot:run
```

With no settings it uses an H2 database file in `backend/data/`, creates the admin and the demo shop, and turns on demo payments. To start over, stop the API and delete `backend/data/`.

Any setting from `.env.example` can be passed as an environment variable, for example:

```bash
# macOS / Linux
JWT_SECRET="$(openssl rand -base64 48)" mvn spring-boot:run
# Windows PowerShell
$env:JWT_SECRET="paste-a-long-random-string-here"; mvn spring-boot:run
```

## 2. The Python AI service (port 8000)

```bash
cd ai-service
python -m venv .venv
# Windows:  .venv\Scripts\activate      macOS/Linux:  source .venv/bin/activate
pip install -r requirements.txt
python wsgi.py
```

Without an API key it uses the built-in engine. To use Claude, set `ANTHROPIC_API_KEY` before `python wsgi.py` (see [AI.md](AI.md)). Check it's running: http://localhost:8000/health

## 3. The website (port 5173)

```bash
cd web
npm install
npm run dev
```

Open http://localhost:5173. Vite forwards `/api` and `/uploads` to the API on port 8080, so the login cookie works without any CORS setup.

Want to look at the website without running the API? `npm run dev -- --mode demo` runs everything in the browser with sample data.

## Running the tests

```bash
cd backend && mvn test
cd ai-service && python -m unittest discover -s tests -v
cd web && npm run typecheck
```

## Common problems

| Problem | Fix |
|---|---|
| `Port 8080 was already in use` | Another program uses it. Stop it, or run the API with `PORT=8081` and change the proxy in `web/vite.config.ts`. |
| "The AI assistant is offline right now" | Start the AI service (step 2). The API expects it at `AI_SERVICE_URL` (default http://localhost:8000). |
| `release version 21 not supported` | Maven is using an older Java. Set `JAVA_HOME` to your JDK 21. |
| Login works, then you're logged out on refresh | The website and API must share one address (use the Vite proxy in dev and nginx/Caddy in production). |
| Payment page opens but never confirms | Check the gateway keys and that `WEB_BASE_URL` is the address you're browsing. For webhooks on your own computer, use a tunnel (see [PAYMENTS.md](PAYMENTS.md)). |
