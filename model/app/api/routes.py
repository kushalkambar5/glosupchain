from fastapi import APIRouter, HTTPException, status
from app.api.schemas import AssignRequest, AssignResponse
from app.utils.driver_assignment import assign_drivers
from datetime import datetime

router = APIRouter(prefix="/api/v1", tags=["assignments"])


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status":    "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service":   "Smart Route AI",
    }


@router.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Smart Route AI API is running 🚀",
        "version": "2.0.0",
        "docs":    "/docs",
        "redoc":   "/redoc",
    }


# ─────────────────────────────────────────────────────────────────────────────
#  THE ONLY BUSINESS ENDPOINT
# ─────────────────────────────────────────────────────────────────────────────
@router.post(
    "/assign",
    response_model=AssignResponse,
    status_code=status.HTTP_200_OK,
    summary="Auto-Assign Free Drivers to a Route",
    description=(
        "Provide the UUID of an existing route row. "
        "The system will:\n"
        "1. Read route details (src/dest coords, goods amount, manager) from the DB.\n"
        "2. Find all free drivers (work_done=false) with their current lat/lon from the DB.\n"
        "3. Select the minimum number of nearest drivers whose combined capacity covers the goods.\n"
        "4. Compute the optimal smart route (with AI scoring: traffic + weather + news events) "
        "for every driver — leg-1 from their location to source, leg-2 from source to destination.\n"
        "5. Save one `assignments` row per driver in the DB with the computed route and goods share.\n"
        "6. Return full assignment details including which news events influenced route selection."
    ),
)
async def assign_endpoint(request: AssignRequest):
    """
    Single endpoint for the driver assignment system.

    Body:
        { "route_id": "<uuid>" }

    The rest is automatic — free drivers, locations, capacity and manager
    are all read from the database.
    """
    try:
        result = assign_drivers(str(request.route_id))
        if not result.get("success"):
            # Return 200 with success=false so the caller can read the message
            return result
        return result
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Assignment failed: {exc}",
        )