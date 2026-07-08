# Developer Playground — convenience targets. Run `make help` for the list.
# These wrap docker compose + pnpm so common flows are one word.

# Use bash and fail fast.
SHELL := /bin/bash
COMPOSE := docker compose

.DEFAULT_GOAL := help

.PHONY: help up down stop restart build logs ps \
        infra migrate migrate-dev seed reset dev install clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

## ----- Docker (full stack) -------------------------------------------------

up: ## Build (if needed) and start the whole stack in the background
	$(COMPOSE) up -d --build

down: ## Stop and remove containers, networks (keeps volumes/data)
	$(COMPOSE) down

stop: ## Stop containers without removing them
	$(COMPOSE) stop

restart: ## Restart the whole stack
	$(COMPOSE) restart

build: ## Build all images
	$(COMPOSE) build

logs: ## Tail logs from all services (Ctrl-C to exit)
	$(COMPOSE) logs -f

ps: ## Show service status
	$(COMPOSE) ps

## ----- Local development ---------------------------------------------------

infra: ## Start only Postgres + Redis (for running apps on the host)
	$(COMPOSE) up -d postgres redis

install: ## Install workspace dependencies
	pnpm install

dev: ## Run api, worker and web in watch mode (needs `make infra` first)
	pnpm dev

## ----- Database ------------------------------------------------------------

migrate: ## Apply committed migrations (production style)
	pnpm --filter @developer-playground/database migrate:deploy

migrate-dev: ## Create + apply a new migration in development
	pnpm --filter @developer-playground/database migrate

seed: ## Seed the database with demo data
	pnpm db:seed

reset: ## Drop, recreate and reseed the dev database (DESTRUCTIVE)
	pnpm --filter @developer-playground/database exec prisma migrate reset --force

## ----- Housekeeping --------------------------------------------------------

clean: ## Stop the stack and delete volumes (DESTRUCTIVE — wipes data)
	$(COMPOSE) down -v
