from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from app.routes import (auth_routes, admin_routes, binventory_routes, 
                        bemployee_routes, bakerydashboardstats, admindashboardstats, 
                        bdonation_routes, charitydonation_routes, bnotification, messages,
                        complaint_routes, reports_route, direct_donation
                        )
from app.database import engine, SessionLocal
from app import models, crud
from fastapi.middleware.cors import CORSMiddleware
import os
from fastapi.staticfiles import StaticFiles
from app.routes.binventory_routes import check_threshold_and_create_donation
from fastapi_utils.tasks import repeat_every


models.Base.metadata.create_all(bind=engine)

app = FastAPI()

origins = ["http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(admin_routes.router)
app.include_router(binventory_routes.router)
app.include_router(bemployee_routes.router)
app.include_router(bakerydashboardstats.router)
app.include_router(admindashboardstats.router)
app.include_router(bdonation_routes.router)
app.include_router(bnotification.router)
app.include_router(messages.router)
app.include_router(complaint_routes.router)
app.include_router(charitydonation_routes.router)
app.include_router(reports_route.router)
app.include_router(direct_donation.router)

@app.on_event("startup")
def seed_admin():
    db = SessionLocal()
    try:
        crud.seed_admin_user(db)
    finally:
        db.close()
        
if not os.path.exists("uploads"):
    os.makedirs("uploads")

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.on_event("startup")
@repeat_every(seconds=3600) 
def auto_check_threshold_task() -> None:
    db = SessionLocal()
    try:
        check_threshold_and_create_donation(db)
    finally:
        db.close()