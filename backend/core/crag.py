from __future__ import annotations

import os
import re
from typing import List, TypedDict, Annotated, Optional
from operator import add

from dotenv import load_dotenv
from pydantic import BaseModel

from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_groq import ChatGroq
#from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_text_splitters import RecursiveCharacterTextSplitter
#from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_tavily import TavilySearch
from langgraph.graph import StateGraph, START, END
from langchain_voyageai import VoyageAIEmbeddings

from pathlib import Path

# ─────────────────────────────────────────────
# Load env + Shared embedding model (loaded once on startup)
# ─────────────────────────────────────────────
load_dotenv(Path(__file__).parent.parent / ".env", override=True)

# _embeddings = VoyageAIEmbeddings(model="voyage-law-2")
_embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)


# ─────────────────────────────────────────────
# Graph State
# ─────────────────────────────────────────────
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


# ─────────────────────────────────────────────
# Structured Output Schemas
# ─────────────────────────────────────────────
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


# ─────────────────────────────────────────────
# CRAG Pipeline
# ─────────────────────────────────────────────
class CRAGPipeline:

    def __init__(
        self,
        pdf_path: str,
        filename: str,
        upload_dir: str = "../uploads",
        vector_store_dir: str = "../vector_store",
        chunk_size: int = 900,
        chunk_overlap: int = 100,
        upper_th: float = 0.7,
        lower_th: float = 0.3,
        llm_model: str = "llama-3.3-70b-versatile",
        temperature: float = 0.2,
    ):
        self.pdf_path = pdf_path
        self.filename = filename
        self.upload_dir = upload_dir
        self.vector_store_dir = vector_store_dir
        self.upper_th = upper_th
        self.lower_th = lower_th
        self.page_offset = 0

        # Core components
        self.loader = PyPDFLoader(self.pdf_path)
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
        self.embeddings = _embeddings
        # self.llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=temperature, streaming=True)
        self.llm = ChatGroq(model=llm_model, temperature=temperature, streaming=True)
        self.structured_llm = ChatGroq(model=llm_model, temperature=temperature, streaming=False)
        self.tavily = TavilySearch(max_results=10)

        # Internal state
        self.docs: List[Document] = []
        self.chunks: List[Document] = []
        self.vector_store: Optional[FAISS] = None
        self.retriever = None

        # Build chains, knowledge base, and graph
        self.doc_eval_chain = self._build_doc_eval_chain()
        self.filter_chain   = self._build_filter_chain()
        self.rewrite_chain  = self._build_rewrite_chain()
        self.answer_chain   = self._build_answer_chain()

        self._prepare_knowledge_base()
        self.app = self._build_graph()


    # ─────────────────────────────────────────
    # Document Loading & Chunking
    # ─────────────────────────────────────────

    def load_documents(self) -> List[Document]:
        self.docs = self.loader.load()
        return self.docs

    def chunk_documents(self) -> List[Document]:
        if not self.docs:
            self.load_documents()
        self.chunks = self.splitter.split_documents(self.docs)
        for chunk in self.chunks:
            chunk.metadata["source"] = self.filename
        return self.chunks


    # ─────────────────────────────────────────
    # Vector Store
    # ─────────────────────────────────────────

    def build_vector_store(self) -> FAISS:
        if not self.chunks:
            self.chunk_documents()
        self.vector_store = FAISS.from_documents(self.chunks, self.embeddings)
        os.makedirs(self.vector_store_dir, exist_ok=True)
        self.vector_store.save_local(self.vector_store_dir)
        self.vector_store = FAISS.load_local(
            self.vector_store_dir,
            self.embeddings,
            allow_dangerous_deserialization=True
        )
        return self.vector_store

    def _prepare_knowledge_base(self) -> None:
        """
        First upload  → build embeddings + detect page offset → save both to disk
        Subsequent    → load embeddings + page offset from disk (fast)
        """
        offset_path = f"{self.vector_store_dir}/page_offset.txt"

        if os.path.exists(self.vector_store_dir):
            # Load pre-built vector store
            self.vector_store = FAISS.load_local(
                self.vector_store_dir,
                self.embeddings,
                allow_dangerous_deserialization=True
            )
            # Load saved page offset
            self.page_offset = int(open(offset_path).read()) if os.path.exists(offset_path) else 0

        else:
            # First time: build everything from scratch
            self.load_documents()
            self.chunk_documents()
            self.build_vector_store()

            # Detect and save page offset
            self.page_offset = self._detect_page_offset()
            open(offset_path, 'w').write(str(self.page_offset))

        self.retriever = self.vector_store.as_retriever(
            search_type="similarity",
            search_kwargs={"k": 8}
        )

    def _detect_page_offset(self) -> int:
        """
        Scans the PDF to find how many un-numbered pages exist before page 1.

        Formula used during retrieval:
            actual_index = user_page + page_offset - 1

        Example: PDF has 4 cover/TOC pages → offset = 4
            User says 'page 5' → actual_index = 5 + 4 - 1 = 8 ✓

        Returns 0 if no page numbers found (safe fallback).
        """
        if not self.docs:
            self.load_documents()

        for i, doc in enumerate(self.docs):
            text = doc.page_content.strip()
            # Check both top and bottom of the page (page numbers can be either)
            edges = text[:100] + text[-100:]
            # Look for standalone "1" — not part of 10, 21, 100, etc.
            if re.search(r'(?<!\d)1(?!\d)', edges):
                return i  # This physical index is where document's "Page 1" lives

        return 0  # No page numbers found → assume no offset


    # ─────────────────────────────────────────
    # LLM Chains
    # ─────────────────────────────────────────

    def _build_doc_eval_chain(self):
        """Scores each retrieved chunk for relevance to the question (0 to 1)."""
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
        """Filters sentences — keeps only those directly relevant to the question."""
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
        """Rewrites the user's question into a search-engine-friendly legal query."""
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
        """Final answer generation using labeled context + verdict."""
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
    # Graph Nodes
    # ─────────────────────────────────────────

    def retrieve(self, state: State) -> State:
        """
        Retrieves relevant chunks from the vector store.
        If the query mentions a page number → filters by page metadata directly.
        Otherwise → falls back to semantic similarity search.
        """
        q = state["question"]

        page_match = re.search(r'page\s+(\d+)', q.lower())
        if page_match:
            user_page = int(page_match.group(1))
            # Formula: user_page + offset - 1 (convert to 0-based PyPDFLoader index)
            actual_index = user_page + self.page_offset - 1

            all_docs = list(self.vector_store.docstore._dict.values())
            page_docs = [d for d in all_docs if d.metadata.get('page') == actual_index]

            if page_docs:
                return {"docs": page_docs}

        # Default: semantic similarity search
        return {"docs": self.retriever.invoke(q)}

    def eval_each_docs(self, state: State) -> State:
        """
        Scores all retrieved chunks in a single LLM call.
        Verdict:
          CORRECT   → at least one chunk scores above upper_th (0.7)
          INCORRECT → all chunks score below lower_th (0.3)
          AMBIGUOUS → scores are mixed (between thresholds)
        """
        q = state["question"]
        docs = state.get("docs", [])

        chunks_text = "\n\n".join(
            f"[Chunk {i}]:\n{d.page_content}"
            for i, d in enumerate(docs)
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
        """Rewrites the question into a better web search query."""
        output = self.rewrite_chain.invoke({"question": state["question"]})
        return {"web_query": output.query}

    def web_search_node(self, state: State) -> State:
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
        """
        Filters and structures context based on verdict:
          CORRECT   → document chunks only   → labeled [SOURCE: DOCUMENT]
          INCORRECT → web results only       → labeled [SOURCE: WEB SEARCH]
          AMBIGUOUS → both, filtered separately, combined with clear labels
        """
        verdict = state.get("verdict", "")
        q = state["question"]

        if verdict == "CORRECT":
            doc_context = self._filter_sentences(q, state.get("good_docs", []))
            refined_context = f"[SOURCE: DOCUMENT]\n{doc_context}"

        elif verdict == "INCORRECT":
            web_context = self._filter_sentences(q, state.get("web_docs", []))
            refined_context = f"[SOURCE: WEB SEARCH]\n{web_context}"

        else:  # AMBIGUOUS — combine both
            doc_context = self._filter_sentences(q, state.get("good_docs", []))
            web_context = self._filter_sentences(q, state.get("web_docs", []))
            refined_context = (
                f"[SOURCE: DOCUMENT]\n{doc_context}\n\n"
                f"[SOURCE: WEB SEARCH]\n{web_context}"
            )

        return {"refined_context": refined_context}

    def _filter_sentences(self, question: str, docs: List[Document]) -> str:
        """
        Helper: extracts sentences from docs and keeps only relevant ones.
        Falls back to full context if filter removes everything.
        """
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

        # Fallback: if filter removes everything, return full context
        return "\n".join(kept).strip() if kept else context

    def tokenize_sentences(self, text: str) -> List[str]:
        """Splits text into clean sentences (min 20 chars each)."""
        text = re.sub(r"\s+", " ", text).strip()
        sentences = re.split(r"(?<=[.!?])\s+", text)
        return [s.strip() for s in sentences if len(s.strip()) > 20]


    # ─────────────────────────────────────────
    # Routing
    # ─────────────────────────────────────────

    def route_after_eval(self, state: State) -> str:
        """
        CORRECT   → go straight to refine (document context is good enough)
        AMBIGUOUS → rewrite query + web search + combine with doc context
        INCORRECT → rewrite query + web search only
        """
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

    def run(self, question: str, chat_history: List[dict]) -> State:
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