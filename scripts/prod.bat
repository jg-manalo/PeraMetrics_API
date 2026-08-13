@echo off

echo "================================================"
echo "Starting Perametrics API in Production Mode"
echo "================================================"

@REM check if .env.production file exists

if not exist ".env" (
    echo "ERROR: .env file not found. Please create it before running the script."
    exit /b 1
)

docker info >nul 2>&1

if %errorlevel% neq 0 (
    echo "ERROR: Docker is not running. Please start Docker Desktop and try again."
    exit /b 1
) else (
   echo "Starting Docker containers for Perametrics API..."
)


echo "================================================"

docker compose -f docker-compose.prod.yaml up --build -d

npx drizzle-kit migrate

echo "================================================"
echo "Database migrations completed successfully."