#!/usr/bin/env python3
"""
Seed test data for E2E tests.

Standard Test Data Pattern:
- Domain: @nexo.xyz
- Password: NexoPass#99 (same for all test users)
- Pattern: {persona}@nexo.xyz

Current personas:
- tester@nexo.xyz: Primary test user for E2E tests

Future personas can be added easily:
- support@nexo.xyz: Support agent persona
- admin@nexo.xyz: Admin persona
- customer1@nexo.xyz, customer2@nexo.xyz: Different customer personas

Idempotent - safe to run multiple times.
"""

import asyncio
import sys
from pathlib import Path
from typing import List, Dict, Any

# Add backend directory to path so we can import app modules
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import select

from app.database import async_session_maker
from app.models import User, App
from app.users import UserManager
from app.database import get_user_db
from app.schemas import UserCreate


# Standard password for all test users
STANDARD_TEST_PASSWORD = "NexoPass#99"

# Test personas - easy to add more
TEST_PERSONAS = [
    {
        "email": "tester@nexo.xyz",
        "apps": [
            {
                "name": "Test App",
                "description": "Primary test application for E2E tests",
                "config_json": {
                    "integration_mode": "simulator",
                    "simulator_type": "echo",
                },
            }
        ],
    },
    # Add more personas here as needed:
    # {
    #     "email": "support@nexo.xyz",
    #     "apps": [
    #         {"name": "Support App", "description": "Customer support chatbot"}
    #     ],
    # },
]


async def seed_persona(session, persona: Dict[str, Any]) -> bool:
    """Seed a single persona (user + apps)."""
    email = persona["email"]
    apps = persona.get("apps", [])

    # Check if user already exists
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user:
        print(f"  ✓ User already exists: {email}")
    else:
        # Create user using UserManager (handles password hashing)
        user_db_dep = get_user_db(session)
        user_db = await user_db_dep.__anext__()

        user_manager = UserManager(user_db)

        user_create = UserCreate(
            email=email,
            password=STANDARD_TEST_PASSWORD,
            is_superuser=False,
            is_verified=True,  # Pre-verify for testing
        )

        try:
            user = await user_manager.create(user_create)
            print(f"  ✓ Created user: {email}")
        except Exception as e:
            print(f"  ✗ Failed to create user {email}: {e}")
            return False

    # Create apps for this user
    for app_data in apps:
        app_name = app_data["name"]

        # Check if app already exists
        result = await session.execute(
            select(App).where(App.user_id == user.id, App.name == app_name)
        )
        app = result.scalar_one_or_none()

        if app:
            print(f"    ✓ App already exists: {app_name}")
        else:
            # Create app
            app = App(
                name=app_name,
                description=app_data.get("description", ""),
                user_id=user.id,
                config_json=app_data.get("config_json", {}),
            )
            session.add(app)
            await session.commit()
            print(f"    ✓ Created app: {app_name}")

    return True


async def seed_test_data():
    """Seed all test personas and their apps."""
    print("🌱 Seeding test data...")
    print(f"   Password for all test users: {STANDARD_TEST_PASSWORD}\n")

    success = True
    async with async_session_maker() as session:
        for persona in TEST_PERSONAS:
            if not await seed_persona(session, persona):
                success = False

    if success:
        print("\n✅ Test data seeded successfully!")
        print(f"\n📧 Test users (all use password: {STANDARD_TEST_PASSWORD}):")
        for persona in TEST_PERSONAS:
            print(f"   - {persona['email']}")
    else:
        print("\n⚠️  Some test data failed to seed")

    return success


async def main():
    """Main entry point."""
    try:
        success = await seed_test_data()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Error seeding test data: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
