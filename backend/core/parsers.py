from langchain_community.document_loaders import UnstructuredFileLoader

def parser(filename):
    path = './backend/uploads/{filename}'
    loader = UnstructuredFileLoader(path)
    docs = loader.load()
    return docs


