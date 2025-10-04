from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from app.routes import (auth_routes, admin_routes, binventory_routes, 
                        bemployee_routes, bakerydashboardstats, admindashboardstats, 
                        bdonation_routes, bnotification, cnotification, messages, charitydonation_routes,
                        direct_donation, CFeedback, BFeedback, Compute_TOT_Donations, complaint_routes, BReportGene, 
                        AdminReportGene, geofence, badges, RecentDonations, DashboardSearch, leaderboards
                        )
from app.database import engine, SessionLocal
from app import models, crud, database
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
import os
from fastapi.staticfiles import StaticFiles
from app.models import User
from app.routes.binventory_routes import check_threshold_and_create_donation
from app.routes.cnotification import process_geofence_notifications
from fastapi_utils.tasks import repeat_every
from app.crud import update_user_badges

from apscheduler.schedulers.background import BackgroundScheduler

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

# Create scheduler
scheduler = BackgroundScheduler()


origins = ["http://localhost:5173",
           "http://127.0.0.1:5173",]

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
app.include_router(cnotification.router)
app.include_router(charitydonation_routes.router)
app.include_router(direct_donation.router)
app.include_router(messages.router)
app.include_router(CFeedback.router),
app.include_router(BFeedback.router),
app.include_router(Compute_TOT_Donations.router)
app.include_router(complaint_routes.router)
app.include_router(BReportGene.router)
app.include_router(AdminReportGene.router)
app.include_router(geofence.router)
app.include_router(badges.router)
app.include_router(RecentDonations.router)
app.include_router(DashboardSearch.router)
app.include_router(leaderboards.router)

@app.on_event("startup")
def seed_admin():
    db = SessionLocal()
    update_user_badges(db, 2)
    try:
        crud.seed_admin_user(db)
        crud.seed_badges(db)
    finally:
        db.close()
        
if not os.path.exists("uploads"):
    os.makedirs("uploads")

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.on_event("startup")
@repeat_every(seconds=3600) 
def auto_check_threshold_task() -> None:
    db = SessionLocal()
    update_user_badges(db, 2)
    try:
        check_threshold_and_create_donation(db)
    finally:
        db.close()

def geofence_job():
    db = SessionLocal()
    try:
        # Run for each bakery
        bakeries = db.query(User).filter(User.role == "Bakery").all()
        for bakery in bakeries:
            process_geofence_notifications(db, bakery.id)
    finally:
        db.close()

# Schedule it (every 5 minutes)
scheduler.add_job(geofence_job, "interval", minutes=5)
scheduler.start()

@app.on_event("shutdown")
def shutdown_event():
    scheduler.shutdown()