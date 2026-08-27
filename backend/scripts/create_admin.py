import os
import sys
import asyncio
from datetime import datetime

# Ensure backend root is in python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.mongo import get_users_collection, init_db_indexes
from core.security import hash_password

async def create_users():
    await init_db_indexes()
    users_col = get_users_collection()

    default_users = [
        {
            "email": "admin@tnwarehouses.gov.in",
            "name": "HQ Admin",
            "password_hash": hash_password("admin123"),
            "role": "hq_admin",
            "warehouse_scope": None,
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "email": "head1@tnwarehouses.gov.in",
            "name": "Coimbatore Warehouse Head",
            "password_hash": hash_password("head123"),
            "role": "warehouse_head",
            "warehouse_scope": 1,
            "created_at": datetime.utcnow().isoformat()
        }
    ]

    for u in default_users:
        existing = await users_col.find_one({"email": u["email"]})
        if existing:
            await users_col.update_one({"email": u["email"]}, {"$set": u})
            print(f"Updated user: {u['email']} ({u['role']})")
        else:
            await users_col.insert_one(u)
            print(f"Created user: {u['email']} ({u['role']})")

if __name__ == "__main__":
    asyncio.run(create_users())
