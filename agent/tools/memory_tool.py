from langchain_core.tools import tool
from db.session import SessionLocal
from models.user import User

@tool
def update_longterm_memory(user_id: str, new_information: str) -> str:
    """Updates the user's long term memory with new and relevant information about them, their preferences, or the supply chain context they care about."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return "User not found."
            
        current_memory = user.longterm_memory or ""
        # Append new information with a newline
        user.longterm_memory = f"{current_memory}\n- {new_information}".strip()
        db.commit()
        return "Memory updated successfully."
    except Exception as e:
        db.rollback()
        return f"Failed to update memory: {str(e)}"
    finally:
        db.close()
