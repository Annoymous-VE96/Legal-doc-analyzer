from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma

VECTOR_STORE_PATH = 'db/vector_db'

def embeddings(chunks):
    embeddings = OpenAIEmbeddings(model='text-embedding-ada-002')
    vectorstore = Chroma.from_documents(
        documents=chunks, 
        embedding=embeddings,
        persist_directory=VECTOR_STORE_PATH
    )
    return vectorstore