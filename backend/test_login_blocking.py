"""
Test script for login blocking functionality
Tests the escalating timeout mechanism for failed login attempts
"""
import requests
import time
import json

BASE_URL = "http://localhost:8000"

def test_user_login_blocking():
    """Test login blocking for regular user accounts"""
    print("\n" + "="*80)
    print("🧪 Testing User Login Blocking")
    print("="*80 + "\n")
    
    # Test with a non-existent or wrong password for an existing user
    test_email = "test@example.com"
    wrong_password = "wrongpassword123"
    
    print(f"Testing failed logins for: {test_email}\n")
    
    for attempt in range(1, 8):
        print(f"Attempt {attempt}:")
        try:
            response = requests.post(
                f"{BASE_URL}/login",
                json={
                    "email": test_email,
                    "password": wrong_password,
                    "role": "Donor"
                }
            )
            
            if response.status_code == 401:
                print(f"  ✓ Failed login (expected) - Status: {response.status_code}")
            else:
                print(f"  Status: {response.status_code}")
                print(f"  Response: {response.json()}")
                
        except requests.exceptions.RequestException as e:
            print(f"  ❌ Request failed: {e}")
            
        # Add a small delay between attempts
        time.sleep(0.5)
    
    # Try one more time after being blocked
    print(f"\nAttempt 8 (should be blocked):")
    try:
        response = requests.post(
            f"{BASE_URL}/login",
            json={
                "email": test_email,
                "password": wrong_password,
                "role": "Donor"
            }
        )
        
        if response.status_code == 429:
            detail = response.json().get("detail", {})
            print(f"  🚫 BLOCKED! Status: {response.status_code}")
            if isinstance(detail, dict):
                print(f"  Message: {detail.get('message')}")
                print(f"  Remaining time: {detail.get('remaining_time')}")
                print(f"  Block level: {detail.get('block_level')}")
                print(f"  Total failures: {detail.get('total_failures')}")
            else:
                print(f"  Detail: {detail}")
        else:
            print(f"  Status: {response.status_code}")
            print(f"  Response: {response.json()}")
            
    except requests.exceptions.RequestException as e:
        print(f"  ❌ Request failed: {e}")
    
    print("\n✅ User login blocking test completed\n")


def test_employee_login_blocking():
    """Test login blocking for employee accounts"""
    print("\n" + "="*80)
    print("🧪 Testing Employee Login Blocking")
    print("="*80 + "\n")
    
    # Test with a non-existent employee or wrong password
    test_data = {
        "name": "TestEmployee",
        "bakery_id": 1,
        "password": "wrongpassword123"
    }
    
    print(f"Testing failed logins for: {test_data['name']} (Bakery {test_data['bakery_id']})\n")
    
    for attempt in range(1, 8):
        print(f"Attempt {attempt}:")
        try:
            response = requests.post(
                f"{BASE_URL}/employee-login",
                json=test_data
            )
            
            if response.status_code == 401 or response.status_code == 404:
                print(f"  ✓ Failed login (expected) - Status: {response.status_code}")
            else:
                print(f"  Status: {response.status_code}")
                print(f"  Response: {response.json()}")
                
        except requests.exceptions.RequestException as e:
            print(f"  ❌ Request failed: {e}")
            
        # Add a small delay between attempts
        time.sleep(0.5)
    
    # Try one more time after being blocked
    print(f"\nAttempt 8 (should be blocked):")
    try:
        response = requests.post(
            f"{BASE_URL}/employee-login",
            json=test_data
        )
        
        if response.status_code == 429:
            detail = response.json().get("detail", {})
            print(f"  🚫 BLOCKED! Status: {response.status_code}")
            if isinstance(detail, dict):
                print(f"  Message: {detail.get('message')}")
                print(f"  Remaining time: {detail.get('remaining_time')}")
                print(f"  Block level: {detail.get('block_level')}")
                print(f"  Total failures: {detail.get('total_failures')}")
            else:
                print(f"  Detail: {detail}")
        else:
            print(f"  Status: {response.status_code}")
            print(f"  Response: {response.json()}")
            
    except requests.exceptions.RequestException as e:
        print(f"  ❌ Request failed: {e}")
    
    print("\n✅ Employee login blocking test completed\n")


def show_blocking_mechanism():
    """Display the blocking escalation mechanism"""
    print("\n" + "="*80)
    print("📋 Login Blocking Escalation Mechanism")
    print("="*80 + "\n")
    
    print("Block Levels and Durations:")
    print("  Level 0: No block (First 5 attempts allowed)")
    print("  Level 1: 5 minutes block (After 5 failed attempts)")
    print("  Level 2: 10 minutes block (After 2 more failed attempts)")
    print("  Level 3: 30 minutes block (After 2 more failed attempts)")
    print("  Level 4: 1 hour block (After 2 more failed attempts)")
    print("  Level 5: 3 hours block (After 2 more failed attempts)")
    print("  Level 6: 6 hours block (After 2 more failed attempts)")
    print("  Level 7: 12 hours block (After 2 more failed attempts)")
    print("  Level 8: 24 hours block (After 2 more failed attempts)")
    
    print("\n" + "="*80 + "\n")


if __name__ == "__main__":
    print("\n" + "="*80)
    print("🔐 LOGIN SECURITY TEST SUITE")
    print("="*80)
    
    show_blocking_mechanism()
    
    choice = input("Choose test:\n1. Test User Login Blocking\n2. Test Employee Login Blocking\n3. Run Both Tests\n\nEnter choice (1-3): ")
    
    if choice == "1":
        test_user_login_blocking()
    elif choice == "2":
        test_employee_login_blocking()
    elif choice == "3":
        test_user_login_blocking()
        time.sleep(2)
        test_employee_login_blocking()
    else:
        print("Invalid choice")
    
    print("\n" + "="*80)
    print("✅ Test Suite Complete!")
    print("="*80 + "\n")
