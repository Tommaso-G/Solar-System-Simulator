# Sistema Solare

Visualizzatore 3D del sistema solare (React + Three.js), pronto per essere pubblicato su GitHub Pages.

## Pubblicare su GitHub Pages

1. **Crea un repository su GitHub** (es. `sistema-solare`), vuoto (senza README/licenza).

2. **Installa le dipendenze** (serve [Node.js](https://nodejs.org) installato):
   ```bash
   npm install
   ```

3. **Collega il progetto al repository e fai il primo push:**
   ```bash
   git init
   git add .
   git commit -m "Primo commit"
   git branch -M main
   git remote add origin https://github.com/<tuo-utente>/<nome-repo>.git
   git push -u origin main
   ```

4. **Pubblica il sito** (compila il progetto e lo carica sul branch `gh-pages`):
   ```bash
   npm run deploy
   ```

5. **Attiva GitHub Pages** sul repository:
   - Vai su GitHub → il tuo repository → *Settings* → *Pages*
   - In "Build and deployment" → *Source*: seleziona **Deploy from a branch**
   - *Branch*: scegli **gh-pages**, cartella **/(root)** → *Save*

6. Dopo 1-2 minuti il sito sarà online su:
   ```
   https://<tuo-utente>.github.io/<nome-repo>/
   ```

Ogni volta che modifichi il codice e vuoi ripubblicare, ripeti solo il passo 4 (`npm run deploy`).

## Nota sui dati delle sonde in tempo reale

L'aggiornamento automatico delle distanze delle sonde chiama l'API di Anthropic direttamente dal browser. Questo funziona all'interno di Claude.ai (che gestisce l'autenticazione automaticamente), ma **su GitHub Pages questa chiamata fallirà** (nessuna chiave API, nessuna autenticazione lato client) — l'app lo gestisce comunque in modo sicuro: se la richiesta fallisce, mostra automaticamente "sonde: dati non disponibili, uso valori approssimati" e utilizza le distanze approssimate già presenti nel codice, senza bloccarsi. Le sonde e la ISS restano quindi visibili e funzionanti, solo con distanze fisse invece che aggiornate via ricerca web.

Se in futuro vuoi dati davvero live anche fuori da Claude.ai, servirebbe un piccolo backend proprio (es. una funzione serverless su Cloudflare Workers o Vercel) che tenga la chiave API al sicuro e a cui il sito faccia le richieste al posto di chiamare direttamente `api.anthropic.com`.
