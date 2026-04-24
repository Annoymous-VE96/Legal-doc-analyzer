from langchain_text_splitters import RecursiveCharacterTextSplitter

def chunker(docs):
    spliter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50
    )
    chunks = spliter.split(docs)
    return chunks 
