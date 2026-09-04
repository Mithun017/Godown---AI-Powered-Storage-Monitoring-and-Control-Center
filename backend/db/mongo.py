import asyncio
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from core.config import settings

_clients = {}

def get_client() -> AsyncIOMotorClient:
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop not in _clients or _clients[loop] is None:
        _clients[loop] = AsyncIOMotorClient(
            settings.MONGO_URI,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            socketTimeoutMS=5000
        )
    return _clients[loop]

def get_database() -> AsyncIOMotorDatabase:
    c = get_client()
    return c[settings.DB_NAME]

def get_users_collection():
    return get_database()["users"]

def get_sessions_collection():
    return get_database()["sessions"]

def get_warehouses_collection():
    return get_database()["warehouses"]

def get_sensor_readings_collection():
    return get_database()["sensor_readings"]

def get_predictions_collection():
    return get_database()["predictions"]

def get_alerts_collection():
    return get_database()["alerts"]

def get_thresholds_collection():
    return get_database()["thresholds"]

async def init_db_indexes():
    """Setup MongoDB indexes for sessions TTL and unique constraints."""
    database = get_database()
    
    # Session TTL index on expires_at field
    await database["sessions"].create_index("expires_at", expireAfterSeconds=0)
    
    # Users unique email index
    await database["users"].create_index("email", unique=True)
    
    # Sensor readings composite index for idempotency
    await database["sensor_readings"].create_index(
        [("Warehouse_ID", 1), ("Zone_ID", 1), ("Timestamp", 1)],
        unique=True
    )
    
    # Warehouse ID index
    await database["warehouses"].create_index("warehouse_id", unique=True)
