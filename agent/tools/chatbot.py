import os
import sys
import json

# Ensure the agent root is on the path when run directly
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from typing import TypedDict, Annotated, Literal
from dotenv import load_dotenv

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, BaseMessage
from langgraph.graph.message import add_messages
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.prebuilt import ToolNode, tools_condition

from langchain_core.tools import tool
from services.news_service import NewsService
from services.weather_service import WeatherService
from tools.memory_tool import update_longterm_memory

env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(env_path)

# 1. State Definition
class State(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    longterm_memory: str

# 2. LLM Setup
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash-lite",
    api_key=os.getenv("GOOGLE_API_KEY"),
    temperature=0.7
)

@tool
def fetch_news(query: str):
    """Fetch latest news strictly based on a query."""
    return NewsService().fetch_news(query)

@tool
def get_weather(city: str):
    """Get the current weather for a specified city."""
    return WeatherService().get_weather(city)

# Combine ALL tools
all_tools = [fetch_news, get_weather, update_longterm_memory]
llm_with_tools = llm.bind_tools(all_tools)

# 3. Nodes
def chatbot_node(state: State):
    messages = state.get("messages", [])
    memory = state.get("longterm_memory", "")
    
    # Pre-processing: Keep last 10 messages safely
    recent_messages = messages[-10:] if len(messages) > 10 else messages
    
    # Inject memory as System Message
    sys_msg = SystemMessage(content=f"You are a helpful Supply Chain AI.\nUser's Long-term Memory:\n{memory}")
    final_messages = [sys_msg] + recent_messages
    
    response = llm_with_tools.invoke(final_messages)
    return {"messages": [response]}

# 4. Graph Construction
graph_builder = StateGraph(State)

graph_builder.add_node("chatbot", chatbot_node)
graph_builder.add_node("tools", ToolNode(all_tools))

graph_builder.add_edge(START, "chatbot")
graph_builder.add_conditional_edges("chatbot", tools_condition)
graph_builder.add_edge("tools", "chatbot")

# For testing, we just use InMemorySaver. 
# Your backend router should pass `PostgresSaver(conn)` here if `is_logged_in` is True
memory_saver = InMemorySaver()
app = graph_builder.compile(checkpointer=memory_saver)

# 5. Dynamic Execution Wrapper with Streaming
async def run_chat(user_id: str, is_logged_in: bool, prompt: str, thread_id: str, longterm_memory: str = ""):
    config = {"configurable": {"thread_id": thread_id, "user_id": user_id}}
    
    initial_state = {
        "messages": [HumanMessage(content=prompt)],
        "longterm_memory": longterm_memory
    }
    
    # Using astream_events to catch tool calls natively
    try:
        async for event in app.astream_events(initial_state, config, version="v1"):
            kind = event["event"]
            
            if kind == "on_tool_start":
                tool_name = event['name']
                if tool_name == "update_longterm_memory":
                    yield f"data: {json.dumps({'type': 'status', 'content': 'Saving to long term memory...'})}\n\n"
                elif "weather" in tool_name.lower():
                    yield f"data: {json.dumps({'type': 'status', 'content': 'Weather getting fetched...'})}\n\n"
                elif "news" in tool_name.lower():
                    yield f"data: {json.dumps({'type': 'status', 'content': 'News getting fetched...'})}\n\n"
                else:
                    yield f"data: {json.dumps({'type': 'status', 'content': f'Running tool {tool_name}...'})}\n\n"
                    
            elif kind == "on_chat_model_stream":
                content = event["data"]["chunk"].content
                if content:
                    yield f"data: {json.dumps({'type': 'message', 'content': content})}\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
    
    # Indicate stream complete (optional)
    yield "data: [DONE]\n\n"

if __name__ == "__main__":
    import asyncio
    print("Testing pipeline with streaming...")
    asyncio.run(
        run_chat(
            user_id="user_123", 
            is_logged_in=True, 
            prompt="Hello, my name is Bob. I care about extreme weather in Tokyo.", 
            thread_id="thread_abc"
        )
    )
    asyncio.run(
        run_chat(
            user_id="user_123", 
            is_logged_in=True, 
            prompt="What is the weather there? Also please remember my name and location.", 
            thread_id="thread_abc",
            longterm_memory="" # Would normally be fetched from the DB
        )
    )