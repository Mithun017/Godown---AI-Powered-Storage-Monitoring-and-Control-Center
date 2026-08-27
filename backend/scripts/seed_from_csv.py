import os
import sys
import asyncio
import pandas as pd
from pymongo.errors import BulkWriteError

# Ensure backend root is in python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.mongo import get_sensor_readings_collection, get_warehouses_collection, init_db_indexes

CSV_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "Dataset",
    "data_warehouse.csv"
)

async def seed_data():
    print(f"Reading dataset from {CSV_PATH}...")
    if not os.path.exists(CSV_PATH):
        print(f"Error: CSV file not found at {CSV_PATH}")
        sys.exit(1)

    df = pd.read_csv(CSV_PATH)
    print(f"Loaded {len(df)} rows from CSV.")

    await init_db_indexes()

    # 1. Seed Warehouses metadata
    warehouses_col = get_warehouses_collection()
    warehouses_df = df.groupby(["Warehouse_ID", "Warehouse_Name", "District", "Latitude", "Longitude"]).agg(
        zones=("Zone_ID", lambda s: sorted(list(set(s))))
    ).reset_index()

    for _, row in warehouses_df.iterrows():
        zones_detail = []
        w_id = int(row["Warehouse_ID"])
        w_zones = df[df["Warehouse_ID"] == w_id]["Zone_ID"].unique()
        for z in sorted(w_zones):
            z_data = df[(df["Warehouse_ID"] == w_id) & (df["Zone_ID"] == z)].iloc[0]
            zones_detail.append({
                "zone_id": int(z),
                "commodity_type": str(z_data["Commodity_Type"]),
                "capacity_sacks": int(z_data["Zone_Capacity_Sacks"])
            })

        w_doc = {
            "warehouse_id": w_id,
            "name": str(row["Warehouse_Name"]),
            "district": str(row["District"]),
            "latitude": float(row["Latitude"]),
            "longitude": float(row["Longitude"]),
            "zones": zones_detail
        }
        await warehouses_col.update_one(
            {"warehouse_id": w_id},
            {"$set": w_doc},
            upsert=True
        )
    print(f"Seeded {len(warehouses_df)} warehouse metadata records.")

    # 2. Seed Sensor Readings
    sensor_col = get_sensor_readings_collection()
    
    records = []
    for _, row in df.iterrows():
        rec = {
            "Timestamp": str(row["Timestamp"]),
            "Warehouse_ID": int(row["Warehouse_ID"]),
            "Warehouse_Name": str(row["Warehouse_Name"]),
            "District": str(row["District"]),
            "Latitude": float(row["Latitude"]),
            "Longitude": float(row["Longitude"]),
            "Zone_ID": int(row["Zone_ID"]),
            "Commodity_Type": str(row["Commodity_Type"]),
            "Distance_cm": float(row["Distance_cm"]),
            "Temperature_C": float(row["Temperature_C"]),
            "Humidity_%": float(row["Humidity_%"]),
            "Smoke_ppm": float(row["Smoke_ppm"]),
            "Motion": int(row["Motion"]),
            "Number_of_Sacks": int(row["Number_of_Sacks"]),
            "Avg_Weight_per_Sack_kg": float(row["Avg_Weight_per_Sack_kg"]),
            "Total_Weight_kg": float(row["Total_Weight_kg"]),
            "Zone_Capacity_Sacks": int(row["Zone_Capacity_Sacks"]),
            "Occupancy_Pct": float(row["Occupancy_Pct"]),
            "Vacant_Space_Pct": float(row["Vacant_Space_Pct"]),
            "Rack_Status": str(row["Rack_Status"]),
            "Temp_Status": str(row["Temp_Status"]),
            "Smoke_Status": str(row["Smoke_Status"]),
            "Warehouse_Status": str(row["Warehouse_Status"]),
            "Month": int(row["Month"]),
            "Year": int(row["Year"]),
            "Previous_Year_Avg_Fill_Pct": float(row["Previous_Year_Avg_Fill_Pct"]),
            "Previous_Year_Days_RackFull": int(row["Previous_Year_Days_RackFull"]),
            "Next_Year_Projected_Occupancy_Pct": float(row["Next_Year_Projected_Occupancy_Pct"])
        }
        records.append(rec)

    # Insert in chunks of 10000 with ordered=False for idempotency
    chunk_size = 10000
    inserted_total = 0
    duplicate_total = 0

    for i in range(0, len(records), chunk_size):
        chunk = records[i:i + chunk_size]
        try:
            res = await sensor_col.insert_many(chunk, ordered=False)
            inserted_total += len(res.inserted_ids)
        except BulkWriteError as e:
            n_inserted = e.details.get("nInserted", 0)
            inserted_total += n_inserted
            write_errors = e.details.get("writeErrors", [])
            non_dup = [err for err in write_errors if err.get("code") != 11000]
            duplicate_total += len(write_errors) - len(non_dup)
            if non_dup:
                print(f"Non-duplicate BulkWriteError encountered: {non_dup[:2]}")
                raise

    final_count = await sensor_col.count_documents({})
    print(f"Seeding complete!")
    print(f"Total inserted in this run: {inserted_total}")
    print(f"Duplicates skipped: {duplicate_total}")
    print(f"Total documents in sensor_readings collection: {final_count}")

if __name__ == "__main__":
    asyncio.run(seed_data())
