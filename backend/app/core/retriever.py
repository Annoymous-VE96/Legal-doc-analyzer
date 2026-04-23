from langchain_community.vectorstores import Chroma

def retriever(query: str, vectorstore, k: int = 5):
    results = vectorstore.similarity_search(
        query_texts=[query],
        n_results=k
    )
    return results