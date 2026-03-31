from typing import Optional
import datetime
import uuid

from sqlalchemy import BigInteger, Boolean, CheckConstraint, Date, DateTime, Double, ForeignKeyConstraint, Index, Integer, JSON, PrimaryKeyConstraint, String, Text, UniqueConstraint, Uuid, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from db.base import Base



class RoadReroute(Base):
    __tablename__ = 'road_reroute'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='road_reroute_pkey'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    response_payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    done: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))


class Roads(Base):
    __tablename__ = 'roads'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='cargo_pkey'),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    user_id: Mapped[str] = mapped_column(Text, nullable=False)
    origin: Mapped[dict] = mapped_column(JSON, nullable=False)
    destination: Mapped[dict] = mapped_column(JSON, nullable=False)
    original_route: Mapped[Optional[dict]] = mapped_column(JSON)
    best_route: Mapped[Optional[dict]] = mapped_column(JSON)
    reasons: Mapped[Optional[dict]] = mapped_column(JSON)
    weather_data: Mapped[Optional[dict]] = mapped_column(JSON)
    news_data: Mapped[Optional[dict]] = mapped_column(JSON)
    status: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'pending'::text"))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('now()'))
    refreshed_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)


class Ships(Base):
    __tablename__ = 'ships'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='shipments_pkey'),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    user_id: Mapped[str] = mapped_column(Text, nullable=False)
    origin: Mapped[dict] = mapped_column(JSON, nullable=False)
    destination: Mapped[dict] = mapped_column(JSON, nullable=False)
    original_route: Mapped[Optional[dict]] = mapped_column(JSON)
    best_route: Mapped[Optional[dict]] = mapped_column(JSON)
    reasons: Mapped[Optional[dict]] = mapped_column(JSON)
    weather_data: Mapped[Optional[dict]] = mapped_column(JSON)
    news_data: Mapped[Optional[dict]] = mapped_column(JSON)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('now()'))
    refreshed_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)





class Drivers(Base):
    __tablename__ = 'drivers'
    __table_args__ = (
        ForeignKeyConstraint(['user_id'], ['users.id'], name='drivers_user_id_users_id_fk'),
        PrimaryKeyConstraint('id', name='drivers_pkey')
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    lat: Mapped[float] = mapped_column(Double(53), nullable=False)
    lon: Mapped[float] = mapped_column(Double(53), nullable=False)
    capacity: Mapped[float] = mapped_column(Double(53), nullable=False)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    onWork: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))

    user: Mapped['Users'] = relationship('Users', back_populates='drivers')




class Routes(Base):
    __tablename__ = 'routes'
    __table_args__ = (
        ForeignKeyConstraint(['manager_id'], ['users.id'], name='routes_manager_id_users_id_fk'),
        PrimaryKeyConstraint('id', name='routes_pkey'),
        Index('idx_routes_manager_id', 'manager_id')
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    src_lat: Mapped[float] = mapped_column(Double(53), nullable=False)
    src_lon: Mapped[float] = mapped_column(Double(53), nullable=False)
    dest_lat: Mapped[float] = mapped_column(Double(53), nullable=False)
    dest_lon: Mapped[float] = mapped_column(Double(53), nullable=False)
    goods_amount: Mapped[float] = mapped_column(Double(53), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('now()'))
    manager_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)

    manager: Mapped['Users'] = relationship('Users', back_populates='routes')
    assignments: Mapped[list['Assignments']] = relationship('Assignments', back_populates='route')


class Assignments(Base):
    __tablename__ = 'assignments'
    __table_args__ = (
        ForeignKeyConstraint(['driver_id'], ['users.id'], name='assignments_driver_id_users_id_fk'),
        ForeignKeyConstraint(['manager_id'], ['users.id'], name='assignments_manager_id_users_id_fk'),
        ForeignKeyConstraint(['route_id'], ['routes.id'], ondelete='CASCADE', name='fk_assignment_route'),
        PrimaryKeyConstraint('id', name='assignments_pkey'),
        Index('idx_assignment_driver_id', 'driver_id'),
        Index('idx_assignment_route_id', 'route_id')
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    manager_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    driver_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    route_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    route_type: Mapped[str] = mapped_column(Text, nullable=False)
    assigned_quantity: Mapped[float] = mapped_column(Double(53), nullable=False, server_default=text('0'))
    work_done: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    assigned_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('now()'))
    completed_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    best_route: Mapped[Optional[dict]] = mapped_column(JSONB)

    driver: Mapped['Users'] = relationship('Users', foreign_keys=[driver_id], back_populates='assignments_driver')
    manager: Mapped['Users'] = relationship('Users', foreign_keys=[manager_id], back_populates='assignments_manager')
    route: Mapped['Routes'] = relationship('Routes', back_populates='assignments')