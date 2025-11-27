from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from typing import List
import os, shutil, csv
from datetime import datetime, timedelta
from sqlalchemy import func

from app import models, database, schemas, auth, crud
from app.timezone_utils import today_ph
from app.routes.cnotification import process_geofence_notifications

router = APIRouter()
UPLOAD_DIR = "uploads"
CSV_DIR = "bakery_templates"  # New directory for bakery-specific CSVs

# Ensure CSV directory exists
os.makedirs(CSV_DIR, exist_ok=True)

# === CSV HELPER FUNCTIONS ===
def get_bakery_csv_path(bakery_id: int):
    """Get the CSV file path for a specific bakery"""
    filename = f"bakery_{bakery_id}_products.csv"
    return os.path.join(CSV_DIR, filename)


def initialize_bakery_csv(bakery_id: int):
    """Create CSV file with headers if it doesn't exist"""
    csv_path = get_bakery_csv_path(bakery_id)
    
    if not os.path.exists(csv_path):
        print(f"[CSV] Creating new CSV for bakery {bakery_id}")
        with open(csv_path, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.DictWriter(f, fieldnames=['Product Name', 'Threshold', 'Expiration', 'Description', 'Image'])
            writer.writeheader()
        print(f"[CSV] ✅ Created: {csv_path}")
    
    return csv_path


def load_bakery_templates(bakery_id: int):
    """Load product templates from bakery's CSV file"""
    csv_path = get_bakery_csv_path(bakery_id)
    templates = {}
    
    if not os.path.exists(csv_path):
        print(f"[CSV] No CSV found for bakery {bakery_id}")
        return templates
    
    encodings = ['utf-8-sig', 'utf-8', 'latin-1', 'cp1252']
    
    for encoding in encodings:
        try:
            with open(csv_path, 'r', encoding=encoding) as f:
                reader = csv.DictReader(f)
                
                for row in reader:
                    product_name = row.get('Product Name', '').strip()
                    if not product_name:
                        continue
                    
                    # Normalize name for matching
                    normalized_name = product_name.lower().replace(' ', '')
                    
                    try:
                        threshold = int(row.get('Threshold', 0))
                        expiration = int(row.get('Expiration', 0))
                    except ValueError:
                        continue
                    
                    templates[normalized_name] = {
                        'shelf_life_days': expiration,
                        'threshold': threshold,
                        'description': row.get('Description', '').strip(),
                        'original_name': product_name,
                        'image': row.get('Image', '')
                    }
            
            print(f"[CSV] ✅ Loaded {len(templates)} templates for bakery {bakery_id}")
            return templates
            
        except UnicodeDecodeError:
            continue
        except Exception as e:
            print(f"[CSV] ❌ Error loading CSV: {e}")
            continue
    
    return templates


def save_product_to_csv(bakery_id: int, product_name: str, threshold: int, shelf_life_days: int, description: str = "", image: str = ""):
    """Save or update a product template in bakery's CSV"""
    csv_path = initialize_bakery_csv(bakery_id)
    
    # Load existing templates
    templates = load_bakery_templates(bakery_id)
    normalized_name = product_name.strip().lower().replace(' ', '')
    
    # Check if product already exists
    if normalized_name in templates:
        print(f"[CSV] Product '{product_name}' already exists for bakery {bakery_id}, skipping...")
        return False
    
    # Add new product to CSV
    try:
        with open(csv_path, 'a', newline='', encoding='utf-8-sig') as f:
            writer = csv.DictWriter(f, fieldnames=['Product Name', 'Threshold', 'Expiration', 'Description', 'Image'])
            writer.writerow({
                'Product Name': product_name.strip(),
                'Threshold': threshold,
                'Expiration': shelf_life_days,
                'Description': description.strip(),
                'Image': image
            })
        
        print(f"[CSV] ✅ Added '{product_name}' to bakery {bakery_id} CSV")
        return True
        
    except Exception as e:
        print(f"[CSV] ❌ Error saving to CSV: {e}")
        return False


def update_product_in_csv(bakery_id: int, old_product_name: str, new_product_name: str, threshold: int, shelf_life_days: int, description: str = "", image: str = ""):
    """Update an existing product template in bakery's CSV"""
    csv_path = get_bakery_csv_path(bakery_id)
    
    if not os.path.exists(csv_path):
        print(f"[CSV] No CSV found for bakery {bakery_id}")
        return False
    
    try:
        # Read all rows
        rows = []
        fieldnames = ['Product Name', 'Threshold', 'Expiration', 'Description', 'Image']
        
        with open(csv_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                rows.append(row)
        
        # Find and update the matching product
        normalized_old_name = old_product_name.strip().lower().replace(' ', '')
        updated = False
        
        for row in rows:
            existing_name = row.get('Product Name', '').strip()
            normalized_existing = existing_name.lower().replace(' ', '')
            
            if normalized_existing == normalized_old_name:
                # Update the row
                row['Product Name'] = new_product_name.strip()
                row['Threshold'] = str(threshold)
                row['Expiration'] = str(shelf_life_days)
                row['Description'] = description.strip()
                row['Image'] = image
                updated = True
                print(f"[CSV] 🔄 Updating '{old_product_name}' to '{new_product_name}' in bakery {bakery_id} CSV")
                break
        
        if not updated:
            print(f"[CSV] ⚠️ Product '{old_product_name}' not found in CSV, adding as new")
            # If not found, add as new entry
            rows.append({
                'Product Name': new_product_name.strip(),
                'Threshold': str(threshold),
                'Expiration': str(shelf_life_days),
                'Description': description.strip(),
                'Image': image
            })
        
        # Write all rows back to CSV
        with open(csv_path, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
        
        print(f"[CSV] ✅ Successfully updated CSV for bakery {bakery_id}")
        return True
        
    except Exception as e:
        print(f"[CSV] ❌ Error updating CSV: {e}")
        return False


def get_template_from_csv(bakery_id: int, product_name: str):
    """Get template for a specific product from bakery's CSV"""
    templates = load_bakery_templates(bakery_id)
    normalized_name = product_name.strip().lower().replace(' ', '')
    
    print(f"[CSV] 🔍 Looking for '{product_name}' in bakery {bakery_id} CSV")
    
    template = templates.get(normalized_name)
    
    if template:
        print(f"[CSV] ✅ Found template for '{product_name}'")
    else:
        print(f"[CSV] ❌ No template found for '{product_name}'")
    
    return template


# INVENTORY ROUTES
@router.post("/inventory", response_model=schemas.BakeryInventoryOut)
def add_inventory(
    name: str = Form(...),
    image: UploadFile = File(None),
    quantity: int = Form(...),
    creation_date: str = Form(...),
    expiration_date: str = Form(...),
    threshold: int = Form(...),
    uploaded: str = Form(...),
    description: str = Form(None),
    template_image: str = Form(None),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.ensure_verified_user)
):
    if current_user.role.lower() != "bakery":
        raise HTTPException(status_code=403, detail="Only bakeries can add inventory")

    # Handle image: either upload new file or use template image
    file_path = None
    if image and image.filename:
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        file_path = os.path.join(UPLOAD_DIR, image.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
    elif template_image:
        file_path = template_image

    # Create inventory item
    new_item = crud.create_inventory(
        db=db,
        bakery_id=current_user.id,
        name=name,
        image=file_path,
        quantity=quantity,
        creation_date=creation_date,
        expiration_date=expiration_date,
        threshold=threshold,
        uploaded=uploaded,
        description=description
    )

    # Calculate shelf life and save to bakery's CSV
    try:
        print(f"[CSV] 📝 Attempting to save product '{name}' for bakery {current_user.id}")
        
        # Ensure CSV directory exists
        os.makedirs(CSV_DIR, exist_ok=True)
        
        # Parse dates
        creation = datetime.strptime(creation_date, "%Y-%m-%d").date()
        expiration = datetime.strptime(expiration_date, "%Y-%m-%d").date()
        shelf_life_days = (expiration - creation).days
        
        print(f"[CSV] Shelf life calculated: {shelf_life_days} days")
        
        # Initialize CSV if it doesn't exist
        csv_path = initialize_bakery_csv(current_user.id)
        print(f"[CSV] CSV path: {csv_path}")
        
        # Save to CSV
        success = save_product_to_csv(
            bakery_id=current_user.id,
            product_name=name,
            threshold=threshold,
            shelf_life_days=shelf_life_days,
            description=description or "",
            image=file_path or ""
        )
        
        if success:
            print(f"[CSV] ✅ Successfully saved '{name}' to CSV")
        else:
            print(f"[CSV] ⚠️ Product '{name}' already exists in CSV, skipped")
            
    except ValueError as e:
        print(f"[CSV] ❌ Date parsing error: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid date format: {e}")
    except Exception as e:
        print(f"[CSV] ❌ Error saving to CSV: {e}")
        # Don't fail the entire request, but log the error
        import traceback
        traceback.print_exc()

    check_threshold_and_create_donation(db)
    check_inventory_status(db)

    return new_item

@router.get("/inventory", response_model=List[schemas.BakeryInventoryOut])
def list_inventory(
    db: Session = Depends(database.get_db),
    current_auth = Depends(auth.get_current_user_or_employee)
):
    bakery_id = auth.get_bakery_id_from_auth(current_auth)
    check_inventory_status(db)

    inventory_items = crud.list_inventory(db, bakery_id=bakery_id)
    updated_items = []

    for item in inventory_items:
        pending_request = db.query(models.DonationRequest).join(models.Donation).filter(
            models.Donation.bakery_inventory_id == item.id,
            models.DonationRequest.status == "pending"
        ).first()

        item_dict = item.__dict__.copy()
        item_dict["is_requested"] = item.status.lower() == "requested"
        item_dict["is_donated"] = item.status.lower() == "donated"

        updated_items.append(item_dict)

    return updated_items


@router.put("/inventory/{inventory_id}", response_model=schemas.BakeryInventoryOut)
def update_inventory(
    inventory_id: int,
    name: str = Form(...),
    image: UploadFile = File(None),
    quantity: int = Form(...),
    creation_date: str = Form(...),
    expiration_date: str = Form(...),
    threshold: int = Form(...),
    uploaded: str = Form(...),
    description: str = Form(None),
    template_image: str = Form(None),
    save_to_template: str = Form(None),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.ensure_verified_user)
):
    if current_user.role.lower() != "bakery":
        raise HTTPException(status_code=403, detail="Only bakeries can update inventory")

    # Get the old product name before updating
    old_item = db.query(models.BakeryInventory).filter(
        models.BakeryInventory.id == inventory_id,
        models.BakeryInventory.bakery_id == current_user.id
    ).first()
    
    if not old_item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    
    old_product_name = old_item.name
    old_image = old_item.image  # Keep the existing image path

    # Handle image: either upload new file, use template image, or retain old image
    image_path = None
    if image and image.filename:
        # New image uploaded
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        image_path = os.path.join(UPLOAD_DIR, image.filename)
        with open(image_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
    elif template_image:
        # Template image provided
        image_path = template_image
    else:
        # No new image, retain the old one
        image_path = old_image

    updated_item = crud.update_inventory(
        db=db,
        inventory_id=inventory_id,
        bakery_id=current_user.id,
        name=name,
        image=image_path,
        quantity=quantity,
        creation_date=creation_date,
        expiration_date=expiration_date,
        threshold=threshold,
        uploaded=uploaded,
        description=description
    )

    # Update bakery's CSV with the new product information
    try:
        creation = datetime.strptime(creation_date, "%Y-%m-%d").date()
        expiration = datetime.strptime(expiration_date, "%Y-%m-%d").date()
        shelf_life_days = (expiration - creation).days
        
        if save_to_template == "true":
            # Name was modified - save as NEW product to CSV
            print(f"[CSV] 📝 Saving NEW product '{name}' to CSV (name was modified)")
            success = save_product_to_csv(
                bakery_id=current_user.id,
                product_name=name,
                threshold=threshold,
                shelf_life_days=shelf_life_days,
                description=description or "",
                image=image_path or ""
            )
            if success:
                print(f"[CSV] ✅ Saved NEW product '{name}' to CSV")
            else:
                print(f"[CSV] ⚠️ Product '{name}' already exists in CSV")
        else:
            # Name not modified - update existing CSV entry
            update_product_in_csv(
                bakery_id=current_user.id,
                old_product_name=old_product_name,
                new_product_name=name,
                threshold=threshold,
                shelf_life_days=shelf_life_days,
                description=description or "",
                image=image_path or ""
            )
            print(f"[CSV] ✅ Updated '{old_product_name}' to '{name}' in CSV")
    except Exception as e:
        print(f"[CSV] Warning: Could not update CSV: {e}")
        import traceback
        traceback.print_exc()

    check_threshold_and_create_donation(db)
    check_inventory_status(db)

    return updated_item

@router.delete("/inventory/{inventory_id}", response_model=dict)
def delete_inventory(
    inventory_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.ensure_verified_user)
):
    if current_user.role.lower() != "bakery":
        raise HTTPException(status_code=403, detail="Only bakeries can delete inventory")

    crud.delete_inventory(db=db, inventory_id=inventory_id, bakery_id=current_user.id)
    check_inventory_status(db)

    return {"message": "Inventory item deleted successfully"}


@router.get("/inventory/template/{product_name}")
def get_product_template(
    product_name: str,
    db: Session = Depends(database.get_db),
    current_auth = Depends(auth.get_current_user_or_employee)
):
    """Get product template - only checks bakery's CSV file"""
    bakery_id = auth.get_bakery_id_from_auth(current_auth)
    
    print(f"\n[Template] 🔎 Request for product: '{product_name}' (Bakery {bakery_id})")
    
    # Check CSV file
    csv_template = get_template_from_csv(bakery_id, product_name)
    
    if csv_template:
        print(f"[Template] ✅ Returning CSV template for '{product_name}'")
        return {
            "exists": True,
            "source": "csv",
            "shelf_life_days": csv_template['shelf_life_days'],
            "threshold": csv_template['threshold'],
            "description": csv_template['description'],
            "product_name": csv_template['original_name'],
            "image": csv_template.get('image', '')
        }
    
    # Not found
    print(f"[Template] ❌ Not found: '{product_name}'")
    return {
        "exists": False,
        "product_name": product_name
    }


@router.get("/server-time")
def get_server_time():
    return {"date": today_ph().isoformat()}


# === HELPER FUNCTIONS (Unchanged) ===
def check_threshold_and_create_donation(db: Session):
    today = today_ph()
    
    bakery_ids_triggered = set()
    products = db.query(models.BakeryInventory).all()

    for p in products:
        exp_date = p.expiration_date
        threshold_days = p.threshold
        
        if exp_date is None:
            days_remaining = None
        else:
            days_remaining = (exp_date - today).days
        
        if days_remaining is None:
            item_status = "fresh"
        elif days_remaining <= 0:
            item_status = "expired"
        elif threshold_days == 0 and days_remaining <= 1:
            item_status = "soon"
        elif days_remaining <= threshold_days:
            item_status = "soon"
        else:
            item_status = "fresh"

        if item_status == "expired":
            existing = db.query(models.Donation).filter(
                models.Donation.bakery_inventory_id == p.id
            ).first()
            if existing:
                db.delete(existing)
            continue

        if p.quantity <= 0 or p.status == "donated":
            existing = db.query(models.Donation).filter(
                models.Donation.bakery_inventory_id == p.id
            ).first()
            if existing:
                db.delete(existing)
            continue
    
        existing = db.query(models.Donation).filter(
            models.Donation.bakery_inventory_id == p.id
        ).first()

        if item_status == "soon":
            if existing:
                existing.quantity = p.quantity
                existing.name = p.name
                existing.image = p.image
                existing.threshold = p.threshold
                existing.creation_date = p.creation_date
                existing.expiration_date = p.expiration_date
                existing.uploaded = p.uploaded
                existing.description = p.description
                bakery_ids_triggered.add(p.bakery_id)
            else:
                donation = models.Donation(
                    bakery_inventory_id=p.id,
                    bakery_id=p.bakery_id,
                    name=p.name,
                    image=p.image,
                    quantity=p.quantity,
                    threshold=p.threshold,
                    creation_date=p.creation_date,
                    expiration_date=p.expiration_date,
                    uploaded=p.uploaded,
                    description=p.description
                )
                db.add(donation)
                bakery_ids_triggered.add(p.bakery_id)
        else:
            if existing:
                db.delete(existing)

    db.commit()

    for b_id in bakery_ids_triggered:
        process_geofence_notifications(db, b_id)


def check_inventory_status(db: Session):
    today = today_ph()

    products = db.query(models.BakeryInventory).all()

    for p in products:
        if not p.expiration_date or p.status == "donated":
            continue

        exp_date = p.expiration_date

        if isinstance(exp_date, datetime):
            exp_date = exp_date.date()
        elif isinstance(exp_date, str):
            try:
                exp_date = datetime.strptime(exp_date, "%Y-%m-%d").date()
            except Exception:
                continue

        if exp_date <= today:
            if p.status != "unavailable":
                p.status = "unavailable"
        else:
            if p.quantity > 0 and p.status == "unavailable":
                p.status = "available"

    db.commit()

@router.get("/server-time")
def get_server_time():
    return {"date": today_ph().isoformat()}


@router.get("/inventory/template/{product_name}")
def get_product_template(
    product_name: str,
    db: Session = Depends(database.get_db),
    current_auth = Depends(auth.get_current_user_or_employee)
):
    """Get product template - only checks bakery's OWN CSV file"""
    bakery_id = auth.get_bakery_id_from_auth(current_auth)
    
    print(f"\n[Template] 🔎 Request for product: '{product_name}' (Bakery {bakery_id})")
    
    #Check bakery's OWN CSV file
    csv_template = get_template_from_csv(bakery_id, product_name)
    
    if csv_template:
        print(f"[Template] ✅ Returning CSV template for '{product_name}' from Bakery {bakery_id}")
        return {
            "exists": True,
            "source": "csv",
            "shelf_life_days": csv_template['shelf_life_days'],
            "threshold": csv_template['threshold'],
            "description": csv_template['description'],
            "product_name": csv_template['original_name'],
            "image": csv_template.get('image', '')
        }
    
    # Not found in this bakery's CSV
    print(f"[Template] ❌ Not found in Bakery {bakery_id} CSV: '{product_name}'")
    return {
        "exists": False,
        "product_name": product_name
    }