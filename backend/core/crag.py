from __future__ import annotations

import os
import re
import tempfile
from typing import List, TypedDict, Annotated, Optional, Callable
from operator import add

from dotenv import load_dotenv
from pydantic import BaseModel
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_community.document_loaders import PyPDFLoader
from langchain_groq import ChatGroq
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_tavily import TavilySearch
from langgraph.graph import StateGraph, START, END
from sqlalchemy import create_engine, text
from pathlib import Path

load_dotenv(Path(__file__).parent.parent / ".env", override=True)

# ─────────────────────────────────────────────────────────────────────────────
# API-Based Embeddings Initialization
# ─────────────────────────────────────────────────────────────────────────────
# Uses remote API calls instead of downloading and running PyTorch model weights locally.
# Prioritizes Voyage AI (optimized for retrieval & legal texts, key in your .env),
# then OpenAI, or Hugging Face Serverless Inference API as fallback.
voyage_key = os.getenv("VOYAGE_AI_KEY") or os.getenv("VOYAGE_API_KEY") or os.getenv("VOYAGE_AI")

if voyage_key:
    from langchain_voyageai import VoyageAIEmbeddings
    _embeddings = VoyageAIEmbeddings(
        voyage_api_key=voyage_key,
        model="voyage-law-2"
    )
elif os.getenv("OPENAI_API_KEY"):
    from langchain_openai import OpenAIEmbeddings
    _embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
else:
    # Remote Hugging Face Inference API fallback (no local model weights loaded)
    from langchain_community.embeddings import HuggingFaceInferenceAPIEmbeddings
    hf_token = os.getenv("HUGGINGFACEHUB_API_TOKEN") or os.getenv("HF_TOKEN")
    _embeddings = HuggingFaceInferenceAPIEmbeddings(
        api_key=hf_token,
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )

sync_engine = create_engine(
    os.environ["DATABASE_URL"]
    .replace("+asyncpg", "")
    .replace("ssl=require", "sslmode=require")
)

class State(TypedDict, total=False):
    question: str
    chat_history: List[dict]
    docs: List[Document]
    good_docs: List[Document]
    verdict: str
    reason: str
    strips: List[str]
    kept_strips: List[str]
    refined_context: str
    web_docs: Annotated[List[Document], add]
    web_query: str


class ChunkScore(BaseModel):
    chunk_index: int
    score: float
    reason: str

class BatchDocsEvalScore(BaseModel):
    scores: List[ChunkScore]

class SentenceVerdict(BaseModel):
    sentence_index: int
    keep: bool

class BatchKeepOrDrop(BaseModel):
    verdicts: List[SentenceVerdict]

class WebQuery(BaseModel):
    query: str


class CRAGPipeline:

    def __init__(
        self,
        pdf_path: str,
        filename: str | None,
        chat_id: int,
        chunk_size: int = 900,
        chunk_overlap: int = 100,
        upper_th: float = 0.7,
        lower_th: float = 0.3,
        llm_model: str = "llama-3.3-70b-versatile",
        temperature: float = 0.2,
    ):
        self.pdf_path = pdf_path  # local path OR supabase key — resolved lazily
        self.filename = filename
        self.chat_id = chat_id
        self.upper_th = upper_th
        self.lower_th = lower_th
        self.page_offset = 0
        self._status_callback: Optional[Callable[[str], None]] = None
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size, chunk_overlap=chunk_overlap
        )
        self.embeddings = _embeddings
        self.llm = ChatGroq(model=llm_model, temperature=temperature, streaming=True)
        self.structured_llm = ChatGroq(model=llm_model, temperature=temperature, streaming=False)
        self.tavily = TavilySearch(max_results=10)

        self.docs: List[Document] = []
        self.chunks: List[Document] = []

        self.doc_eval_chain = self._build_doc_eval_chain()
        self.filter_chain   = self._build_filter_chain()
        self.rewrite_chain  = self._build_rewrite_chain()
        self.answer_chain   = self._build_answer_chain()

        self._prepare_knowledge_base()

        self.app = self._build_graph()

    def _emit_status(self, label: str) -> None:
        if self._status_callback:
            self._status_callback(label)

    # ─────────────────────────────────────────
    # Supabase download (only used if chunks missing)
    # ─────────────────────────────────────────
    def _download_pdf(self) -> str:
        from core.storage import supabase, BUCKET
        data = supabase.storage.from_(BUCKET).download(self.pdf_path)
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        tmp.write(data)
        tmp.close()
        return tmp.name


    # ─────────────────────────────────────────
    # Document Loading & Chunking
    # ─────────────────────────────────────────
    def load_documents(self, local_path: str) -> List[Document]:
        loader = PyPDFLoader(local_path)
        self.docs = loader.load()
        return self.docs

    def chunk_documents(self) -> List[Document]:
        self.chunks = self.splitter.split_documents(self.docs)
        for chunk in self.chunks:
            chunk.page_content = chunk.page_content.replace("\x00", "")
            chunk.metadata["source"] = self.filename
        return self.chunks

    # ─────────────────────────────────────────
    # pgvector storage (fast API-based batch embedding)
    # ─────────────────────────────────────────
    def build_vector_store(self) -> None:
        if not self.chunks:
            return

        texts = [chunk.page_content for chunk in self.chunks]
        # Fast API-based batch embedding call
        embeddings_list = self.embeddings.embed_documents(texts)

        with sync_engine.connect() as conn:
            for chunk, emb in zip(self.chunks, embeddings_list):
                conn.execute(
                    text("""
                        INSERT INTO "Chunk" (chat_id, content, page, embedding)
                        VALUES (:chat_id, :content, :page, :embedding)
                    """),
                    {
                        "chat_id": self.chat_id,
                        "content": chunk.page_content,
                        "page": chunk.metadata.get("page"),
                        "embedding": str(emb),
                    }
                )
            conn.commit()

    def _prepare_knowledge_base(self) -> None:
        with sync_engine.connect() as conn:
            count = conn.execute(
                text('SELECT COUNT(*) FROM "Chunk" WHERE chat_id = :chat_id'),
                {"chat_id": self.chat_id}
            ).scalar()

        if count and count > 0:
            with sync_engine.connect() as conn:
                offset_row = conn.execute(
                    text('SELECT page_offset FROM "Chat" WHERE id = :chat_id'),
                    {"chat_id": self.chat_id}
                ).scalar()
            self.page_offset = offset_row or 0
            return

        # No chunks yet — need to build them.
        # pdf_path might be a local temp file (fresh upload) or a Supabase key (rare fallback).
        local_path = self.pdf_path
        downloaded = False
        if not os.path.exists(local_path):
            local_path = self._download_pdf()
            downloaded = True

        self.load_documents(local_path)
        self.chunk_documents()
        self.build_vector_store()
        self.page_offset = self._detect_page_offset()

        with sync_engine.connect() as conn:
            conn.execute(
                text('UPDATE "Chat" SET page_offset = :offset WHERE id = :chat_id'),
                {"offset": self.page_offset, "chat_id": self.chat_id}
            )
            conn.commit()

        if downloaded:
            os.remove(local_path)

    def _detect_page_offset(self) -> int:
        for i, doc in enumerate(self.docs):
            text_ = doc.page_content.strip()
            edges = text_[:100] + text_[-100:]
            if re.search(r'(?<!\d)1(?!\d)', edges):
                return i
        return 0


    # ─────────────────────────────────────────
    # LLM Chains
    # ─────────────────────────────────────────
    def _build_doc_eval_chain(self):
        prompt = ChatPromptTemplate.from_messages([
            ("system",
             "You are a strict retrieval evaluator for CRAG.\n"
             "You will be given MULTIPLE retrieved chunks and a question.\n"
             "For EACH chunk, return its chunk_index (0-based), a relevance score in [0,1], and a short reason.\n"
             "1 = highly relevant, 0 = irrelevant.\n"
             "You MUST return a score for every chunk provided.\n"
             "Return ONLY valid JSON. Do not include markdown or explanations."),
            ("human", "Question: {question}\n\nChunks:\n{chunks}")
        ])
        return prompt | self.structured_llm.with_structured_output(BatchDocsEvalScore, method="function_calling")

    def _build_filter_chain(self):
        prompt = ChatPromptTemplate.from_messages([
            ("system",
             "You are a relevance filter for legal document retrieval.\n"
             "You will be given MULTIPLE numbered sentences and a question.\n"
             "For EACH sentence, return its sentence_index (0-based) and keep=true "
             "if it helps answer the question (directly or as supporting context).\n"
             "You MUST return a verdict for every sentence.\n"
             "Return ONLY valid JSON. Do not include markdown or explanations."),
            ("human", "Question: {question}\n\nSentences:\n{sentences}")
        ])
        return prompt | self.structured_llm.with_structured_output(BatchKeepOrDrop, method="function_calling")

    def _build_rewrite_chain(self):
        prompt = ChatPromptTemplate.from_messages([
            ("system",
             "You are a search query optimizer for legal document questions.\n"
             "Rewrite the question into a concise, legal-domain search query.\n"
             "Never generate queries about document structure or page layout.\n"
             "Return ONLY valid JSON. Do not include markdown or explanations."),
            ("human", "Question: {question}")
        ])
        return prompt | self.structured_llm.with_structured_output(WebQuery, method="function_calling")

    def _build_answer_chain(self):
        self.answer_prompt = ChatPromptTemplate.from_messages([
            ("system",
             "You are a legal assistant specialized in analyzing uploaded legal documents.\n\n"
             "The context you receive is labeled by source:\n"
             "  [SOURCE: DOCUMENT]   → from the uploaded PDF (primary source)\n"
             "  [SOURCE: WEB SEARCH] → from web search (mention this in your response)\n"
             "  Both labels present  → AMBIGUOUS case, combine both and indicate which info came from where\n\n"
             "Rules:\n"
             "1. Greetings / casual questions → respond briefly and naturally\n"
             "2. Document questions → answer strictly from the labeled context\n"
             "3. Off-topic questions (unrelated to law or the document) → politely decline\n"
             "4. Never make up information not present in the context\n\n"
             "Response format:\n"
             "- Brief 1–2 line intro\n"
             "- Bullet points for key details\n"
             "- **Bold** for important terms\n"
             "- Keep it concise and well-structured"),
            ("human",
             "Verdict: {verdict}\n\n"
             "Chat History:\n{chat_history}\n\n"
             "Question: {question}\n\n"
             "Context:\n{refined_context}")
        ])
        return self.answer_prompt | self.llm


    # ─────────────────────────────────────────
    # Analysis (on-demand feature)
    # ─────────────────────────────────────────
    def _build_analysis_chain(self):
        from db.schemas import AnalysisResult
        prompt = ChatPromptTemplate.from_messages([
            ("system",
             "You are a legal document analyzer.\n"
             "Given the full document text, extract:\n"
             "1. clauses: key clauses with a short title and the clause text\n"
             "2. risks: risky/unusual clauses, each with the clause name, reason, and severity (High/Medium/Low)\n"
             "3. summary: a 3-line plain-English summary\n"
             "4. improvements: a list of suggested improvements/negotiation points\n"
             "Return ONLY valid JSON matching the schema."),
            ("human", "Document:\n{document_text}")
        ])
        return prompt | self.structured_llm.with_structured_output(AnalysisResult, method="function_calling")

    def analyze_document(self):
        with sync_engine.connect() as conn:
            rows = conn.execute(
                text('SELECT content FROM "Chunk" WHERE chat_id = :chat_id'),
                {"chat_id": self.chat_id}
            ).fetchall()
        full_text = "\n\n".join(r[0] for r in rows)[:15000]
        chain = self._build_analysis_chain()
        return chain.invoke({"document_text": full_text})


    # ─────────────────────────────────────────
    # Graph Nodes
    # ─────────────────────────────────────────
    def retrieve(self, state: State) -> State:
        self._emit_status("Retrieving..")
        q = state["question"]
        q_embedding = self.embeddings.embed_query(q)

        page_match = re.search(r'page\s+(\d+)', q.lower())
        with sync_engine.connect() as conn:
            if page_match:
                user_page = int(page_match.group(1))
                actual_index = user_page + self.page_offset - 1
                rows = conn.execute(
                    text('SELECT content FROM "Chunk" WHERE chat_id = :chat_id AND page = :page'),
                    {"chat_id": self.chat_id, "page": actual_index}
                ).fetchall()
                if rows:
                    return {"docs": [Document(page_content=r[0]) for r in rows]}

            rows = conn.execute(
                text("""
                    SELECT content FROM "Chunk"
                    WHERE chat_id = :chat_id
                    ORDER BY embedding <-> :query_embedding
                    LIMIT 8
                """),
                {"chat_id": self.chat_id, "query_embedding": str(q_embedding)}
            ).fetchall()

        return {"docs": [Document(page_content=r[0]) for r in rows]}

    def eval_each_docs(self, state: State) -> State:
        self._emit_status("Evaluating..")
        q = state["question"]
        docs = state.get("docs", [])

        chunks_text = "\n\n".join(
            f"[Chunk {i}]:\n{d.page_content}" for i, d in enumerate(docs)
        )

        output = self.doc_eval_chain.invoke({"question": q, "chunks": chunks_text})
        score_map = {cs.chunk_index: cs.score for cs in output.scores}

        good_docs: List[Document] = []
        scores: List[float] = []

        for i, d in enumerate(docs):
            score = score_map.get(i, 0.0)
            scores.append(score)
            if score > self.lower_th:
                good_docs.append(d)

        if any(s > self.upper_th for s in scores):
            return {"good_docs": good_docs, "verdict": "CORRECT",
                    "reason": f"At least one chunk scored above {self.upper_th}"}

        if scores and all(s < self.lower_th for s in scores):
            return {"good_docs": [], "verdict": "INCORRECT",
                    "reason": f"All chunks scored below {self.lower_th}"}

        return {"good_docs": good_docs, "verdict": "AMBIGUOUS",
                "reason": "Scores are mixed between thresholds"}

    def rewrite_query_node(self, state: State) -> State:
        self._emit_status("Rewriting query..")
        output = self.rewrite_chain.invoke({"question": state["question"]})
        return {"web_query": output.query}

    def web_search_node(self, state: State) -> State:
        self._emit_status("Searching the web..")
        q = state.get("web_query") or state["question"]
        results = self.tavily.invoke({"query": q})

        web_docs = []
        for r in (results or []):
            if isinstance(r, dict):
                title = r.get('title', '')
                url = r.get('url', '')
                content = r.get('content', '') or r.get('snippet', '')
            else:
                title, url, content = '', '', str(r)

            web_docs.append(Document(
                page_content=f"TITLE: {title}\nURL: {url}\nCONTENT:\n{content}",
                metadata={"url": url, "title": title, "source": "web"}
            ))
        return {"web_docs": web_docs}

    def refine(self, state: State) -> State:
        self._emit_status("Compiling context..")
        verdict = state.get("verdict", "")
        q = state["question"]

        if verdict == "CORRECT":
            doc_context = self._filter_sentences(q, state.get("good_docs", []))
            refined_context = f"[SOURCE: DOCUMENT]\n{doc_context}"

        elif verdict == "INCORRECT":
            web_context = self._filter_sentences(q, state.get("web_docs", []))
            refined_context = f"[SOURCE: WEB SEARCH]\n{web_context}"

        else:
            doc_context = self._filter_sentences(q, state.get("good_docs", []))
            web_context = self._filter_sentences(q, state.get("web_docs", []))
            refined_context = (
                f"[SOURCE: DOCUMENT]\n{doc_context}\n\n"
                f"[SOURCE: WEB SEARCH]\n{web_context}"
            )

        return {"refined_context": refined_context}

    def _filter_sentences(self, question: str, docs: List[Document]) -> str:
        context = "\n\n".join(d.page_content for d in docs).strip()
        if not context:
            return ""

        strips = self.tokenize_sentences(context)
        if not strips:
            return context

        sentences_text = "\n".join(f"[Sentence {i}]: {s}" for i, s in enumerate(strips))
        output = self.filter_chain.invoke({"question": question, "sentences": sentences_text})
        keep_map = {sv.sentence_index: sv.keep for sv in output.verdicts}

        kept = [s for i, s in enumerate(strips) if keep_map.get(i, False)]
        return "\n".join(kept).strip() if kept else context

    def tokenize_sentences(self, text: str) -> List[str]:
        text = re.sub(r"\s+", " ", text).strip()
        sentences = re.split(r"(?<=[.!?])\s+", text)
        return [s.strip() for s in sentences if len(s.strip()) > 20]


    # ─────────────────────────────────────────
    # Routing
    # ─────────────────────────────────────────
    def route_after_eval(self, state: State) -> str:
        if state["verdict"] == "CORRECT":
            return "refine"
        return "rewrite_query"


    # ─────────────────────────────────────────
    # Build Graph
    # ─────────────────────────────────────────
    def _build_graph(self):
        g = StateGraph(State)

        g.add_node("retrieve",      self.retrieve)
        g.add_node("eval_each_doc", self.eval_each_docs)
        g.add_node("rewrite_query", self.rewrite_query_node)
        g.add_node("web_search",    self.web_search_node)
        g.add_node("refine",        self.refine)

        g.add_edge(START, "retrieve")
        g.add_edge("retrieve", "eval_each_doc")

        g.add_conditional_edges(
            "eval_each_doc",
            self.route_after_eval,
            {"refine": "refine", "rewrite_query": "rewrite_query"}
        )

        g.add_edge("rewrite_query", "web_search")
        g.add_edge("web_search",    "refine")
        g.add_edge("refine",        END)

        return g.compile()


    # ─────────────────────────────────────────
    # Run
    # ─────────────────────────────────────────
    def run(self, question: str, chat_history: List[dict], status_callback: Optional[Callable[[str], None]] = None) -> State:
        self._status_callback = status_callback
        initial_state: State = {
            "question":       question,
            "chat_history":   chat_history,
            "docs":           [],
            "good_docs":      [],
            "web_docs":       [],
            "verdict":        "",
            "reason":         "",
            "strips":         [],
            "kept_strips":    [],
            "refined_context": "",
        }
        return self.app.invoke(initial_state)