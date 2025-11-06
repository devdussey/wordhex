#!/usr/bin/env python3
"""
WordHex Supabase Schema Setup Script
Executes SQL statements to create the database schema
"""

import requests
import json
import sys
from pathlib import Path
import os
import io

# Fix encoding on Windows
if sys.platform == 'win32':
    import codecs
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SUPABASE_URL = "https://ztrvimioqaphkbbvzupo.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0cnZpbWlvcWFwaGtiYnZ6dXBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0MDc2MTcsImV4cCI6MjA3Nzk4MzYxN30.5Z10QchQAOo53Nafjb2ewowgfOxSrp1Bv_KJ0vWpZtA"

def read_sql_file():
    """Read the SQL schema file"""
    sql_path = Path(__file__).parent / "supabase_schema.sql"
    with open(sql_path, 'r') as f:
        return f.read()

def execute_sql_via_dashboard(sql):
    """
    Print instructions for manual execution via Supabase dashboard
    since direct SQL execution via API requires service role key
    """
    print("=" * 70)
    print("🚀 WordHex Supabase Schema Setup")
    print("=" * 70)
    print("\n⚠️  IMPORTANT: Direct SQL execution via API requires a Service Role key")
    print("   (not the anonymous key). For security, we'll show you the manual steps:\n")

    print("📋 MANUAL SETUP STEPS:")
    print("-" * 70)
    print("1. Go to: https://app.supabase.com")
    print("2. Login with your credentials")
    print("3. Select your project 'ztrvimioqaphkbbvzupo'")
    print("4. Click 'SQL Editor' in the left sidebar")
    print("5. Click 'New Query'")
    print("6. Paste the following SQL code:")
    print("-" * 70)
    print(sql)
    print("-" * 70)
    print("7. Click the 'Run' button (or Ctrl+Enter)")
    print("8. Check for success message: 'WordHex Supabase Schema Setup Complete!'")
    print("\n✅ Once complete, your database will be ready for the app!\n")

def verify_tables():
    """
    Verify tables exist by making a simple API call
    """
    print("🔍 Attempting to verify existing tables...\n")

    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json"
    }

    tables_to_check = ['player_stats', 'words', 'match_history']
    found_tables = []

    for table in tables_to_check:
        try:
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/{table}?limit=0",
                headers=headers,
                timeout=5
            )
            if response.status_code == 200:
                found_tables.append(table)
                print(f"✅ {table} exists")
            else:
                print(f"❌ {table} not found (HTTP {response.status_code})")
        except Exception as e:
            print(f"⚠️  Could not verify {table}: {str(e)}")

    if len(found_tables) == len(tables_to_check):
        print("\n🎉 All tables exist! Database is ready to use.\n")
        return True
    elif len(found_tables) > 0:
        print(f"\n⚠️  Some tables exist ({len(found_tables)}/{len(tables_to_check)})")
        print("   Run the SQL manually to complete the setup.\n")
        return False
    else:
        print("\n❌ No tables found. Running the SQL setup is required.\n")
        return False

def main():
    """Main execution"""
    try:
        # Read SQL file
        sql = read_sql_file()
        print(f"📄 Loaded SQL schema file ({len(sql)} bytes)\n")

        # Check if tables already exist
        tables_exist = verify_tables()

        if not tables_exist:
            # Show manual setup instructions
            execute_sql_via_dashboard(sql)
            print("\n📖 For a guided walkthrough, visit:")
            print("   https://supabase.com/docs/guides/database/connecting-to-postgres\n")

    except FileNotFoundError:
        print("❌ Error: supabase_schema.sql not found")
        print("   Make sure you're in the wordhex directory")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
