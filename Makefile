# SneezyMUD Docker Compose Helper
#
# Usage:
#   make dev-up       - Start development environment
#   make prod-up      - Start production environment
#   make help         - Show all available targets

PROD := docker compose -f compose.yaml -f compose.prod.yaml
DEV := docker compose -f compose.yaml -f compose.dev.yaml

.PHONY: help
.PHONY: prod-up prod-down prod-restart prod-init-db prod-maintenance
.PHONY: dev-up dev-down dev-rebuild dev-debug dev-attach dev-clean-build
.PHONY: logs logs-crash shell db-shell status

# Default target
help:
	@echo "SneezyMUD Docker Compose Helper"
	@echo ""
	@echo "Production targets:"
	@echo "  prod-up          - Start all services in production mode"
	@echo "  prod-down        - Stop all production services"
	@echo "  prod-restart     - Restart sneezy container (applies updates)"
	@echo "  prod-init-db     - Initialize database (first-time setup only)"
	@echo "  prod-maintenance - Run container without game (for maintenance)"
	@echo ""
	@echo "Development targets:"
	@echo "  dev-up        - Start all services in development mode"
	@echo "  dev-down      - Stop all development services"
	@echo "  dev-rebuild   - Rebuild and restart sneezy container"
	@echo "  dev-debug     - Run sneezy in gdb (new container)"
	@echo "  dev-attach    - Attach gdb to running sneezy process"
	@echo "  dev-clean-build - Remove build directory (for root-owned files)"
	@echo ""
	@echo "Common targets:"
	@echo "  logs          - Follow sneezy container logs"
	@echo "  logs-crash    - Search logs for crash stack traces"
	@echo "  shell         - Open shell in sneezy container"
	@echo "  db-shell      - Open MariaDB shell in sneezy-db container"
	@echo "  status        - Show container status"
	@echo ""
	@echo "Examples:"
	@echo "  make dev-up                 # Start dev environment"
	@echo "  make dev-rebuild            # Recompile and restart"
	@echo "  make logs                   # Watch game output"

# Production targets

# Checks for new images and updates containers as needed before starting
prod-up:
	$(PROD) up -d --pull always

prod-down:
	$(PROD) down

# Restart only the sneezy container. Useful if a new image was pulled and you want to apply it without stopping other services.
prod-restart:
	$(PROD) up -d --force-recreate --no-deps sneezy

prod-init-db:
	@echo "Starting database container for initial setup..."
	@echo "Wait for 'Db setup done' message, then press Ctrl+C"
	$(PROD) up sneezy-db

# Useful for maintenance/troubleshooting tasks where you need the container running but don't want the game to start and people to log in, etc.
prod-maintenance:
	$(PROD) run --rm sneezy tail -f /dev/null

# Development targets

dev-up:
	$(DEV) up -d

dev-down:
	$(DEV) down

dev-rebuild:
	$(DEV) up --force-recreate --no-deps sneezy

dev-debug:
	$(DEV) run --rm --remove-orphans --service-ports sneezy sh -c 'cd code && gdb -ex run ./sneezy'

dev-attach:
	$(DEV) exec sneezy gdb -p $$($(DEV) exec sneezy pgrep -x sneezy)

# Remove build directory from inside container (to fix root-owned files, etc.)
# Alternatively, just use `sudo rm -rf ./services/sneezymud/build` on host machine.
dev-clean-build:
	$(DEV) run --rm --no-deps sneezy rm -rf /sneezymud-docker/services/sneezymud/build

# Common targets

logs:
	docker logs sneezy -f

logs-crash:
	docker logs sneezy 2>&1 | grep "ERROR: Address" -B 5 -A 50

shell:
	docker exec -it sneezy /bin/bash

db-shell:
	docker exec -it sneezy-db mariadb -u sneezy -ppassword

status:
	docker ps
