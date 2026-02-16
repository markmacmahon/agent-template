#!/usr/bin/env python3
"""
Seed test data for E2E tests.

Creates:
- Test user: tester1@example.com / Password#99
- Test app: "Test App" for the user

Idempotent - safe to run multiple times.
"""

import asyncio
import sys
from pathlib import Path

# Add backend directory to path so we can import app modules
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_maker, engine
from app.models import User, App
from app.users import UserManager
from app.database import get_user_db
from app.schemas import UserCreate


TEST_USER_EMAIL = "tester1@example.com"
TEST_USER_PASSWORD = "Password#99"
TEST_APP_NAME = "Test App"
TEST_APP_DESCRIPTION = "Test application for E2E tests"


async def seed_test_data():
    """Seed test user and app for E2E tests."""
    print("🌱 Seeding test data...")

    async with async_session_maker() as session:
        # Check if test user already exists
        result = await session.execute(
            select(User).where(User.email == TEST_USER_EMAIL)
        )
        user = result.scalar_one_or_none()

        if user:
            print(f"✓ Test user already exists: {TEST_USER_EMAIL}")
        else:
            # Create test user using UserManager (handles password hashing)
            user_db_dep = get_user_db(session)
            user_db = await user_db_dep.__anext__()

            user_manager = UserManager(user_db)

            user_create = UserCreate(
                email=TEST_USER_EMAIL,
                password=TEST_USER_PASSWORD,
                is_superuser=False,
                is_verified=True,  # Pre-verify for testing
            )

            try:
                user = await user_manager.create(user_create)
                print(f"✓ Created test user: {TEST_USER_EMAIL}")
            except Exception as e:
                print(f"✗ Failed to create user: {e}")
                return False

        # Check if test app already exists
        result = await session.execute(
            select(App).where(App.user_id == user.id, App.name == TEST_APP_NAME)
        )
        app = result.scalar_one_or_none()

        if app:
            print(f"✓ Test app already exists: {TEST_APP_NAME}")
        else:
            # Create test app
            app = App(
                name=TEST_APP_NAME,
                description=TEST_APP_DESCRIPTION,
                user_id=user.id,
                config_json={
                    "integration_mode": "simulator",
                    "simulator_type": "echo",
                },
            )
            session.add(app)
            await session.commit()
            print(f"✓ Created test app: {TEST_APP_NAME}")

    print("\n✅ Test data seeded successfully!")
    print(f"   User: {TEST_USER_EMAIL} / {TEST_USER_PASSWORD}")
    print(f"   App: {TEST_APP_NAME}")
    return True


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
