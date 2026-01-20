"""
Check if there are products that should trigger threshold alerts
Run this to see which products meet the criteria
"""
from sqlalchemy import create_engine, text
from datetime import date, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def check_threshold_products():
    print("🔍 Checking for products at threshold...\n")
    
    today = date.today()
    print(f"📅 Today's date: {today}")
    print("=" * 80)
    
    query = text("""
        SELECT 
            id,
            product_id,
            name,
            bakery_id,
            creation_date,
            expiration_date,
            threshold,
            status,
            donation_type,
            (expiration_date - creation_date) as total_days,
            (expiration_date - INTERVAL '1 day' * threshold) as threshold_date,
            (CURRENT_DATE - (expiration_date - INTERVAL '1 day' * threshold)) as days_since_threshold,
            (expiration_date - CURRENT_DATE) as days_until_expiration
        FROM bakery_inventory
        WHERE 
            status = 'available'
            AND expiration_date IS NOT NULL
            AND CURRENT_DATE >= (expiration_date - INTERVAL '1 day' * threshold)
            AND CURRENT_DATE < expiration_date
        ORDER BY bakery_id, days_until_expiration
    """)
    
    with engine.connect() as conn:
        result = conn.execute(query)
        rows = result.fetchall()
        
        if not rows:
            print("❌ No products at threshold found!")
            print("\n💡 To test, create a product with:")
            print("   - Creation Date: Today")
            print("   - Expiration Date: Tomorrow or later")
            print("   - Threshold will auto-calculate (should be 0 for tomorrow)")
            print("\n   This will trigger an immediate alert!")
            return
        
        print(f"✅ Found {len(rows)} product(s) at threshold:\n")
        
        for row in rows:
            print(f"📦 Product: {row.name}")
            print(f"   ID: {row.product_id}")
            print(f"   Bakery ID: {row.bakery_id}")
            print(f"   Type: {row.donation_type}")
            print(f"   Created: {row.creation_date}")
            print(f"   Expires: {row.expiration_date}")
            print(f"   Threshold: {row.threshold} days")
            print(f"   Threshold Date: {row.threshold_date.date()}")
            print(f"   Days since threshold: {row.days_since_threshold.days if hasattr(row.days_since_threshold, 'days') else row.days_since_threshold} days")
            print(f"   Days until expiration: {row.days_until_expiration.days if hasattr(row.days_until_expiration, 'days') else row.days_until_expiration} days")
            print(f"   Status: {row.status}")
            
            days_since = row.days_since_threshold.days if hasattr(row.days_since_threshold, 'days') else row.days_since_threshold
            if days_since >= 0:
                print(f"   🎯 SHOULD TRIGGER ALERT! (at or past threshold)")
            else:
                print(f"   ⏰ Not yet at threshold")
            
            print("-" * 80)
        
        # Also check all products to understand the data
        print("\n📊 All available products (for context):\n")
        all_query = text("""
            SELECT 
                id, product_id, name, bakery_id, creation_date, expiration_date, 
                threshold, status, donation_type
            FROM bakery_inventory
            WHERE status = 'available' AND expiration_date IS NOT NULL
            ORDER BY bakery_id, creation_date DESC
            LIMIT 10
        """)
        
        all_result = conn.execute(all_query)
        all_rows = all_result.fetchall()
        
        for row in all_rows:
            threshold_date = row.creation_date + timedelta(days=row.threshold)
            days_until_threshold = (threshold_date - today).days
            days_until_expiration = (row.expiration_date - today).days
            
            print(f"   {row.name} (Bakery {row.bakery_id})")
            print(f"      Created: {row.creation_date} | Expires: {row.expiration_date}")
            print(f"      Threshold: {row.threshold} days | Threshold Date: {threshold_date}")
            print(f"      Days to threshold: {days_until_threshold} | Days to expiration: {days_until_expiration}")
            
            if days_until_threshold <= 0 and days_until_expiration >= 0:
                print(f"      ✅ AT THRESHOLD - SHOULD ALERT")
            elif days_until_expiration < 0:
                print(f"      ❌ EXPIRED")
            else:
                print(f"      ⏳ Not yet at threshold")
            print()

if __name__ == "__main__":
    check_threshold_products()
