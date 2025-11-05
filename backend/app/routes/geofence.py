from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import database, models
from datetime import datetime, timedelta
import math
import httpx
import os

import requests

router = APIRouter(prefix="/geofence", tags=["geofence"])

GOOGLE_API_KEY = os.getenv("VITE_GOOGLE_MAPS_API_KEY")

# --- Haversine formula ---
def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # km
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2
    )
    return 2 * R * math.asin(math.sqrt(a))

# --- Geocode address using Google Maps ---
async def geocode_address(address: str):
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {"address": address, "key": GOOGLE_API_KEY}
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params=params)
        data = resp.json()
        if data["status"] == "OK":
            loc = data["results"][0]["geometry"]["location"]
            return loc["lat"], loc["lng"]
        return None, None

# --- Trigger geofence manually for testing ---
@router.get("/test/{bakery_id}")
async def test_geofence(bakery_id: int, db: Session = Depends(database.get_db)):
    print(f"[Geofence] Running for bakery {bakery_id}, cutoff = {datetime.utcnow() + timedelta(days=2)}")

    # Example: fetch charity users
    charities = db.query(models.User).filter(models.User.role == "Charity").all()
    print(f"[Geofence] Found {len(charities)} charities")

    return {"status": "geofence triggered", "charities_checked": len(charities)}



def get_coordinates_osm(address: str):
    url = "https://nominatim.openstreetmap.org/search"
    params = {"q": address, "format": "json", "limit": 1}
    headers = {"User-Agent": "DoughNationApp/1.0 (contact@yourapp.com)"}  # must include!

    try:
        res = requests.get(url, params=params, headers=headers, timeout=10)
        res.raise_for_status()  # raise error if HTTP != 200

        # only try parsing JSON if response is not empty
        if res.text.strip():  
            data = res.json()
            if data:
                return float(data[0]["lat"]), float(data[0]["lon"])
            else:
                print(f"[INFO] No results for address: {address}")
        else:
            print(f"[INFO] Empty response from OSM for: {address}")

    except Exception as e:
        print(f"[WARN] OSM geocoding failed: {e}")

    return None, None