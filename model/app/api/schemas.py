from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import uuid


# ─────────────────────────────────────────────────────────────
#  Single-endpoint: Driver Assignment via Route ID
# ─────────────────────────────────────────────────────────────

class AssignRequest(BaseModel):
    """
    Body sent to POST /api/v1/assign
    Just supply the route row's UUID — everything else is read from the DB.
    """
    route_id: uuid.UUID = Field(..., description="UUID of the route row in the `routes` table")


# ── Response shapes ───────────────────────────────────────────

class RouteLegDetail(BaseModel):
    nodes:             List[Dict[str, float]]
    selection_reason:  str
    winner_reason:     Optional[str] = None
    impacting_news:    List[Dict[str, Any]] = []
    factors:           Dict[str, Any] = {}
    duration_min:      Optional[float] = None
    distance_m:        Optional[float] = None


class AssignedDriverResult(BaseModel):
    driver_id:          str
    assignment_id:      str
    truck_capacity:     float
    goods_assigned:     float
    distance_to_source: float
    route: Dict[str, Any]


class AssignResponse(BaseModel):
    success:           bool
    message:           str
    route_id:          Optional[str]      = None
    goods_amount:      Optional[float]    = None
    total_drivers:     Optional[int]      = None
    total_capacity:    Optional[float]    = None