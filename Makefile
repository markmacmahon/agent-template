# Makefile

# Variables
BACKEND_DIR=backend
FRONTEND_DIR=frontend
DOCKER_COMPOSE=docker compose

# Help
.PHONY: help
help:
	@echo "Available commands:"
	@awk '/^[a-zA-Z_-]+:/{split($$1, target, ":"); print "  " target[1] "\t" substr($$0, index($$0,$$2))}' $(MAKEFILE_LIST)

# Backend commands
.PHONY: start-backend test-backend

start-backend: ## Start the backend server with FastAPI and hot reload
	-@lsof -ti :8000 | xargs kill 2>/dev/null || true
	cd $(BACKEND_DIR) && ./start.sh

test-backend: ## Run backend tests using pytest (requires test database)
	@echo "Ensuring test database is running..."
	@$(DOCKER_COMPOSE) up -d db_test
	@sleep 2
	cd $(BACKEND_DIR) && uv run pytest


# Frontend commands
.PHONY: start-frontend test-frontend

start-frontend: ## Start the frontend server with pnpm and hot reload
	-@lsof -ti :3000 | xargs kill 2>/dev/null || true
	cd $(FRONTEND_DIR) && ./start.sh

test-frontend: ## Run frontend tests using npm
	cd $(FRONTEND_DIR) && pnpm run test

test-e2e: ## Run Playwright E2E tests (auto-starts backend + frontend)
	cd $(FRONTEND_DIR) && pnpm test:e2e

test-examples: ## Run webhook example smoke tests (Python + Node servers)
	python3 examples/test_webhook_examples.py


# Pre-commit commands
.PHONY: install-hooks precommit

install-hooks: ## Install pre-commit hooks
	cd $(BACKEND_DIR) && uv run pre-commit install

precommit: ## Run pre-commit checks on all files (run before committing)
	@if [ ! -d "$(FRONTEND_DIR)/node_modules" ]; then \
		echo "Installing frontend dependencies..."; \
		cd $(FRONTEND_DIR) && pnpm install; \
	fi
	cd $(BACKEND_DIR) && uv run pre-commit run --all-files


# Docker commands (databases and mailhog only)
.PHONY: docker-up-db docker-up-test-db docker-up-mailhog docker-down docker-migrate-db

docker-up-db: ## Start the development database
	$(DOCKER_COMPOSE) up -d db

docker-up-test-db: ## Start the test database
	$(DOCKER_COMPOSE) up -d db_test

docker-up-mailhog: ## Start mailhog email testing server
	$(DOCKER_COMPOSE) up -d mailhog

docker-migrate-db: ## Run database migrations
	cd $(BACKEND_DIR) && uv run alembic upgrade head

docker-down: ## Stop all Docker services
	$(DOCKER_COMPOSE) down