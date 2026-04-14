import os
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

# This is a bit of a hack as ChatGoogleGenerativeAI doesn't have a direct list_models
# but we can try to see if it exposes any underlying client or just use a dummy call
llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash-latest", api_key=api_key)
print(f"Testing model: {llm.model}")

try:
    # Just a simple check
    from google.api_core import exceptions
    print("Attempting to list models via genai if possible...")
    import google.generativeai as genai
    genai.configure(api_key=api_key)
    for m in genai.list_models():
        print(m.name)
except ImportError:
    print("google-generativeai not installed. Trying langchain invocation...")
    try:
        res = llm.invoke("Hi")
        print("Success with gemini-1.5-flash")
    except Exception as e:
        print(f"Error with gemini-1.5-flash: {e}")
