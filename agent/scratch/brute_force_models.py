import os
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

models_to_try = [
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-2.0-flash-lite-preview",
]

for model in models_to_try:
    print(f"Trying {model}...", end=" ", flush=True)
    try:
        llm = ChatGoogleGenerativeAI(model=model, api_key=api_key)
        res = llm.invoke("Hi")
        print("SUCCESS!")
    except Exception as e:
        err = str(e)
        if "404" in err:
            print("404 (Not Found)")
        elif "429" in err:
            print("429 (Resource Exhausted)")
        else:
            print(f"Error: {err[:50]}...")
