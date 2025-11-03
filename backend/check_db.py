from app.database import SessionLocal
from app.models import Employee, User

db = SessionLocal()

print("\n" + "="*80)
print("DATABASE CHECK")
print("="*80)

# Check employees
emps = db.query(Employee).all()
print(f"\n📊 Total Employees: {len(emps)}")

if emps:
    for e in emps:
        print(f"\n   ID: {e.id}")
        print(f"   Name: '{e.name}'")
        print(f"   Bakery ID: {e.bakery_id}")
        print(f"   Role: {e.role}")
        print(f"   Has Password: {e.hashed_password is not None}")
else:
    print("\n❌ NO EMPLOYEES FOUND!")
    
    # Check bakeries
    bakeries = db.query(User).filter(User.role == "Bakery").all()
    print(f"\n📦 Total Bakeries: {len(bakeries)}")
    
    for b in bakeries:
        print(f"\n   Bakery ID: {b.id}")
        print(f"   Name: {b.name}")
        print(f"   Contact Person: '{b.contact_person}'")

print("\n" + "="*80 + "\n")

db.close()
