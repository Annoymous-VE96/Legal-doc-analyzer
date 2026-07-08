# ⚖️ LexAI

Chat with your legal documents. Upload a PDF (contract, filing, agreement) and ask questions — answers are grounded in the document, with automatic web-search fallback when the document doesn't have the answer.

# Public Link : https://lexaifrontend-1nqsnignu-sandipan-sarkar-s-projects.vercel.app

## What it does

- **Upload & Parse** — Drop in a PDF, it's chunked and embedded automatically.
- **Corrective RAG (CRAG)** — Retrieved chunks are graded for relevance before being used. Bad retrievals trigger a rewritten query + live web search instead of hallucinating.
- **Chat Management** — Multiple chats, rename, delete one/all, per-user history.
- **PDF Viewer** — Read the source doc side-by-side, highlight text, right-click → "Explain"/"Summarize"/"Ask".
- **Auth** — JWT-based login/register.

## How CRAG works (in short)

1. Retrieve top-k chunks from the PDF's vector store.
2. LLM scores each chunk's relevance → verdict: `CORRECT` / `AMBIGUOUS` / `INCORRECT`.
3. `CORRECT` → answer from document only.
   `INCORRECT` → the user's query is rewritten into a search-engine-friendly query, web-searched, answer from web only.
   `AMBIGUOUS` → rewrite query, search the web, combine both document + web, clearly labeled by source.
4. **Refine step** — the gathered context (doc and/or web) is broken into sentences, and only the ones actually relevant to the user's query are kept. This trims out noise before the final answer is generated, which keeps the model grounded and prevents hallucination.

Think of it like a paralegal who double-checks their own research before handing you an answer, and only Googles it if the case file comes up empty.

## Real-world use cases

- Reviewing contracts/NDAs before signing.
- Quickly finding a clause in a long lease or policy document.
- Summarizing filings for non-lawyers.
- Legal research assistant that cites document vs. web sources separately, so you know what to verify.

**Not** a substitute for a licensed lawyer — it's a document-comprehension tool, not legal advice.

## Tech Stack

**Frontend:** React, React Router, react-pdf, react-markdown

**Backend:** FastAPI, SQLAlchemy (async), PostgreSQL/SQLite, JWT auth (python-jose), bcrypt

**AI/RAG:** LangChain, LangGraph (CRAG pipeline), Groq (LLM), HuggingFace embeddings, FAISS (vector store), Tavily (web search)

**Storage:** Supabase (file storage)

## Project Structure

```
backend/
├── main.py                 # FastAPI app entrypoint
├── routes/
│   ├── auth.py              # register / login / delete account
│   ├── chats.py             # upload, history, rename, delete chat(s)
│   └── messages.py          # send/get messages, SSE streaming
├── core/
│   ├── crag.py               # CRAG pipeline (retrieve→eval→refine→answer)
│   └── storage.py            # R2/S3 file storage helpers
├── auth/
│   ├── authentication.py     # JWT create/decode
│   └── dependencies.py       # get_current_user dependency
├── db/
│   ├── models.py              # User, Chat, Messages tables
│   ├── schemas.py             # Pydantic request schemas
│   └── database.py            # async engine/session
└── requirements.txt

frontend/
└── src/
    ├── pages/
    │   ├── LandingPage.jsx
    │   ├── AuthPage.jsx
    │   └── ChatPage.jsx
    ├── components/
    │   ├── Sidebar.jsx        # chat list, rename/delete, user menu
    │   ├── PDFViewer.jsx      # PDF rendering + text highlight/select
    │   └── ChatPanel.jsx      # message list + input
    └── api/api.js             # backend API calls
```

## Future Scope

- **Multi-document support & analysis** — upload and cross-reference multiple documents in one chat.
- **Clause drafting** — let the LLM draft/suggest legal clauses, not just answer questions.
- **App integrations** — Gmail, Outlook, etc. for pulling in and acting on documents directly from email.

## Running Locally

**Backend**
```bash
cd backend
uv add -r requirements.txt
# set .env: DATABASE_URL, SECRET_KEY, GROQ_API_KEY, TAVILY_API_KEY, SUPABASE_* keys
uvicorn main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm start
```