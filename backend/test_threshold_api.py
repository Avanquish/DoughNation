"""
Quick test script to verify threshold alerts API
Run this after logging in to check if the endpoint returns data
"""
import requests
import sys

# You need to paste your actual token here after logging in
TOKEN = "YOUR_TOKEN_HERE"  # Replace with actual token from localStorage

API_URL = "http://localhost:8000"

def test_threshold_alerts():
    print("🔍 Testing Threshold Alerts API...\n")
    
    # Test 1: Check if endpoint is accessible
    print("1. Testing GET /threshold-alerts")
    headers = {"Authorization": f"Bearer {TOKEN}"}
    
    try:
        response = requests.get(f"{API_URL}/threshold-alerts", headers=headers)
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Success! Found {len(data)} products at threshold")
            
            if data:
                print("\n   Products at threshold:")
                for product in data:
                    print(f"   - {product['name']} (ID: {product['product_id']})")
                    print(f"     Days until expiration: {product['days_until_expiration']}")
                    print(f"     Threshold: {product['threshold']} days")
                    print()
            else:
                print("   ℹ️  No products currently at threshold")
                print("   💡 Create a test product with:")
                print("      - Creation Date: Today")
                print("      - Expiration Date: Tomorrow")
                print("      - Threshold will auto-calculate to 0")
        elif response.status_code == 401:
            print("   ❌ Unauthorized - Token is invalid or expired")
            print("   💡 Get a new token by logging in and checking localStorage")
        elif response.status_code == 403:
            print("   ❌ Forbidden - Only donors can access this endpoint")
        else:
            print(f"   ❌ Error: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("   ❌ Connection Error - Is the backend running on port 8000?")
    except Exception as e:
        print(f"   ❌ Error: {e}")

    # Test 2: Check stats endpoint
    print("\n2. Testing GET /threshold-stats")
    try:
        response = requests.get(f"{API_URL}/threshold-stats", headers=headers)
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            stats = response.json()
            print("   ✅ Stats retrieved:")
            print(f"      Products at threshold: {stats['products_at_threshold']}")
            print(f"      Total notifications: {stats['total_notifications_shown']}")
            print(f"      Times dismissed: {stats['times_dismissed']}")
            print(f"      Times donated: {stats['times_donated']}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

if __name__ == "__main__":
    if TOKEN == "YOUR_TOKEN_HERE":
        print("❌ Please edit this file and add your token!")
        print("\n📝 How to get your token:")
        print("1. Open browser and login to your app")
        print("2. Press F12 to open DevTools")
        print("3. Go to Console tab")
        print("4. Type: localStorage.getItem('token')")
        print("5. Copy the token (without quotes) and paste it in this file")
        sys.exit(1)
    
    test_threshold_alerts()
