#!/usr/bin/env python3
"""
Asset Bridge Mock Data Seeder (Compatibility Stub)
Delegates to app.core.seeder.seed_persona and scripts.seed_mock_data.main
"""

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.seeder import seed_persona
from scripts.seed_mock_data import main

if __name__ == "__main__":
    main()
