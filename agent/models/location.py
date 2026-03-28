class Location(Base):
    __tablename__ = "locations"

    id = Column(BigInteger, primary_key=True)

    name = Column(String(255), nullable=False)  
    # "Mumbai Port", "Suez Canal", "Shanghai"

    type = Column(Enum(
        "port",
        "city",
        "chokepoint",
        "region",
        name="location_type_enum"
    ), nullable=False)

    country = Column(String(100), nullable=False)
    continent = Column(String(100), nullable=True)
    # Asia, Europe, Middle East etc.

    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    priority = Column(Integer, nullable=False, default=2)
    # 1 = critical (Suez Canal, Strait of Hormuz)
    # 2 = high (major ports like Shanghai)
    # 3 = medium
    # 4 = low

    weather_poll_interval_hours = Column(Integer, nullable=False)
    # Instead of hardcoding logic in code

    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)