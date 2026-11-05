#!/usr/bin/env python3
"""
CLI runner for Asset Bridge Mock Data Seeder
"""

import sys
import argparse
from pathlib import Path

# Add fastapi-backend root to sys.path
BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.db import init_db
from app.aggregation.personas import PERSONAS
from app.core.seeder import seed_persona
from scripts.poll_regulations import poll_all_regulators

def main():
    parser = argparse.ArgumentParser(description="Asset Bridge Mock Data Seeder CLI")
    parser.add_argument("--persona", default="all", choices=list(PERSONAS.keys()) + ["all"], help="Persona to seed")
    parser.add_argument("--reset", action="store_true", help="Truncate tables before seeding")
    args = parser.parse_args()

    init_db()
    seed_persona(args.persona, reset=args.reset)

if __name__ == "__main__":
    main()
