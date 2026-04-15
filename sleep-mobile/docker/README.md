# 🐳 Docker Setup for SleepAI System

## Quick Start

### 1. Copy files to correct locations

```bash
# Copy Dockerfile to backend
cp backend.Dockerfile ../sleep-backend/Dockerfile

# Copy application-docker.properties to backend resources
cp application-docker.properties ../sleep-backend/src/main/resources/
```

### 2. Move docker-compose.yml to parent folder

```bash
mv docker-compose.yml ../
```

### 3. Start all services

```bash
cd ..  # Go to SleepAI_System root
docker-compose up -d
```

### 4. Check status

```bash
docker-compose ps
docker-compose logs -f backend
```

### 5. Test API

```bash
curl http://localhost:8080/api/health
```

---

## Services

| Service | Port | Description         |
| ------- | ---- | ------------------- |
| db      | 5432 | PostgreSQL database |
| backend | 8080 | Spring Boot API     |

---

## Mobile App Configuration

Update `.env` in `sleep-mobile/`:

```bash
# For local Docker
EXPO_PUBLIC_API_BASE_URL=http://YOUR_IP:8080

# For same machine
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
```

---

## Useful Commands

```bash
# Stop all
docker-compose down

# Stop and remove volumes (clear database)
docker-compose down -v

# Rebuild backend after code changes
docker-compose up -d --build backend

# View logs
docker-compose logs -f

# Enter database
docker exec -it sleepai-db psql -U sleepuser -d sleepdb
```

---

## Production Deployment

1. Change passwords in `docker-compose.yml`
2. Change `JWT_SECRET` to a secure random string
3. Use proper SSL/TLS certificates
4. Consider using Docker secrets for sensitive data
