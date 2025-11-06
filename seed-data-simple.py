#!/usr/bin/env python3
"""
WordHex Database Seeding - Simple Version
Adds words matching the actual table schema
"""

import requests
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SUPABASE_URL = "https://ztrvimioqaphkbbvzupo.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0cnZpbWlvcWFwaGtiYnZ6dXBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0MDc2MTcsImV4cCI6MjA3Nzk4MzYxN30.5Z10QchQAOo53Nafjb2ewowgfOxSrp1Bv_KJ0vWpZtA"

headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json"
}

# Sample words - minimal columns
SAMPLE_WORDS = [
    {"value": "PYTHON", "hint": "A popular programming language or a large snake"},
    {"value": "DATABASE", "hint": "Organized collection of structured data"},
    {"value": "ALGORITHM", "hint": "Step-by-step procedure for solving a problem"},
    {"value": "JAVASCRIPT", "hint": "Programming language for web browsers"},
    {"value": "HEXAGON", "hint": "Six-sided polygon shape"},
    {"value": "ENCRYPTION", "hint": "Process of encoding data for security"},
    {"value": "VARIABLE", "hint": "Named storage location for data values"},
    {"value": "LOCALHOST", "hint": "Default network name for your own computer"},
    {"value": "DEBUGGING", "hint": "Process of finding and fixing code errors"},
    {"value": "FUNCTION", "hint": "Reusable block of code that performs a task"},
    {"value": "TYPESCRIPT", "hint": "JavaScript with static typing"},
    {"value": "FIREWALL", "hint": "Network security system"},
    {"value": "PROTOCOL", "hint": "Set of rules for communication"},
    {"value": "COMPILER", "hint": "Program that converts code to machine language"},
    {"value": "SUPABASE", "hint": "Open source Firebase alternative"},
]

def add_words():
    """Add sample words to the database"""
    print("Adding sample words to database...\n")

    added = 0
    failed = 0

    for word in SAMPLE_WORDS:
        try:
            response = requests.post(
                f"{SUPABASE_URL}/rest/v1/words",
                json=word,
                headers=headers,
                timeout=5
            )

            if response.status_code in [201, 200]:
                print(f"  [+] {word['value']:<15} - {word['hint'][:40]}")
                added += 1
            else:
                print(f"  [!] {word['value']:<15} - HTTP {response.status_code}")
                if response.status_code == 409:
                    print(f"      (Already exists)")
                failed += 1

        except Exception as e:
            print(f"  [x] {word['value']:<15} - Error: {str(e)[:30]}")
            failed += 1

    print(f"\nAdded {added} words successfully")
    if failed > 0:
        print(f"Skipped {failed} words")

    return added > 0

def verify():
    """Verify words were added"""
    print("\nVerifying database...")
    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/words?limit=5",
            headers=headers,
            timeout=5
        )
        words = response.json()
        if isinstance(words, list) and len(words) > 0:
            print(f"  [+] Database contains {len(words)} words")
            print(f"  [+] Sample: {words[0]['value']} - {words[0].get('hint', 'No hint')}")
            return True
        else:
            print(f"  [!] No words found in database")
            return False
    except Exception as e:
        print(f"  [x] Could not verify: {str(e)}")
        return False

def main():
    """Main execution"""
    print("=" * 70)
    print("WordHex Database Seeding (Simple)")
    print("=" * 70 + "\n")

    try:
        add_words()
        verify()
        print("\n[+] Database seeding complete!")
        print("[+] Your WordHex app is ready to use!")

    except Exception as e:
        print(f"[x] Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
