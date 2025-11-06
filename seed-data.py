#!/usr/bin/env python3
"""
WordHex Database Seeding Script
Adds sample words and data to the database
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

# Sample words to add
SAMPLE_WORDS = [
    {"value": "PYTHON", "hint": "A popular programming language or a large snake", "difficulty": "easy", "category": "programming"},
    {"value": "DATABASE", "hint": "Organized collection of structured data", "difficulty": "medium", "category": "technology"},
    {"value": "ALGORITHM", "hint": "Step-by-step procedure for solving a problem", "difficulty": "hard", "category": "computer-science"},
    {"value": "JAVASCRIPT", "hint": "Programming language for web browsers", "difficulty": "medium", "category": "programming"},
    {"value": "HEXAGON", "hint": "Six-sided polygon shape", "difficulty": "easy", "category": "geometry"},
    {"value": "ENCRYPTION", "hint": "Process of encoding data for security", "difficulty": "hard", "category": "security"},
    {"value": "VARIABLE", "hint": "Named storage location for data values", "difficulty": "medium", "category": "programming"},
    {"value": "LOCALHOST", "hint": "Default network name for your own computer", "difficulty": "easy", "category": "networking"},
    {"value": "DEBUGGING", "hint": "Process of finding and fixing code errors", "difficulty": "hard", "category": "programming"},
    {"value": "FUNCTION", "hint": "Reusable block of code that performs a task", "difficulty": "medium", "category": "programming"},
    {"value": "TYPESCRIPT", "hint": "JavaScript with static typing", "difficulty": "medium", "category": "programming"},
    {"value": "FIREWALL", "hint": "Network security system", "difficulty": "medium", "category": "security"},
    {"value": "PROTOCOL", "hint": "Set of rules for communication", "difficulty": "hard", "category": "networking"},
    {"value": "COMPILER", "hint": "Program that converts code to machine language", "difficulty": "hard", "category": "programming"},
    {"value": "SUPABASE", "hint": "Open source Firebase alternative", "difficulty": "medium", "category": "backend"},
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
                print(f"  [+] {word['value']:<15} ({word['difficulty']:<6}) - {word['hint'][:40]}")
                added += 1
            else:
                print(f"  [!] {word['value']:<15} - HTTP {response.status_code}")
                failed += 1

        except Exception as e:
            print(f"  [x] {word['value']:<15} - Error: {str(e)[:30]}")
            failed += 1

    print(f"\nAdded {added} words successfully")
    if failed > 0:
        print(f"Failed to add {failed} words (may already exist)")

    return added > 0

def main():
    """Main execution"""
    print("=" * 70)
    print("WordHex Database Seeding")
    print("=" * 70 + "\n")

    try:
        add_words()
        print("\n[+] Database seeding complete!")
        print("[+] You can now start using the WordHex app!")

    except Exception as e:
        print(f"[x] Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
