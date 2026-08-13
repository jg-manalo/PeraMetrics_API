@echo off

echo "================================================"
echo "Starting Perametrics API in Development Mode"
echo "================================================"

@REM check if .env.development file exists

if not exist ".env.development" (
    echo "ERROR: .env.development file not found. Please create it before running the script."
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

docker compose -f docker-compose.dev.yaml up --build