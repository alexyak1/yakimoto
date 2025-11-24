# Database Migration to Docker Volumes

This guide explains how to migrate your existing database and uploads to Docker named volumes for persistent storage.

## Why This Change?

Previously, data was stored using bind mounts (`./backend/app:/app/app`), which meant:
- Data was tied to your local filesystem
- Rebuilding Docker would use your local database
- Git operations could affect production data

Now, data is stored in Docker named volumes, which:
- ✅ Persists across rebuilds
- ✅ Survives git resets
- ✅ Independent of local filesystem
- ✅ Production data stays in production

## Migration Steps

### 1. Backup Current Data (if needed)

If you have existing production data you want to preserve:

```bash
# Backup database
docker exec yakimoto_backend cp /app/app/database.db /app/app/database.db.backup

# Backup uploads
docker exec yakimoto_backend tar -czf /app/app/uploads_backup.tar.gz /app/app/uploads
```

### 2. Stop Current Containers

```bash
docker-compose -f docker-compose.prod.yml down
```

### 3. Migrate Existing Data (Optional)

If you have existing data in `./backend/app/database.db` that you want to migrate:

```bash
# Start containers with new volume setup
docker-compose -f docker-compose.prod.yml up -d

# Copy existing database to volume (if needed)
docker cp ./backend/app/database.db yakimoto_backend:/app/app/data/database.db

# Copy existing uploads to volume (if needed)
docker cp ./backend/app/uploads yakimoto_backend:/app/app/uploads/
```

### 4. Verify Migration

```bash
# Check if database exists in volume
docker exec yakimoto_backend ls -la /app/app/data/

# Check if uploads exist in volume
docker exec yakimoto_backend ls -la /app/app/uploads/
```

## Using Docker Volumes

### View Volumes

```bash
docker volume ls | grep yakimoto
```

### Backup Volume Data

```bash
# Backup database volume
docker run --rm -v yakimoto_database:/data -v $(pwd):/backup alpine tar czf /backup/database_backup.tar.gz -C /data .

# Backup uploads volume
docker run --rm -v yakimoto_uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads_backup.tar.gz -C /data .
```

### Restore Volume Data

```bash
# Restore database volume
docker run --rm -v yakimoto_database:/data -v $(pwd):/backup alpine tar xzf /backup/database_backup.tar.gz -C /data

# Restore uploads volume
docker run --rm -v yakimoto_uploads:/data -v $(pwd):/backup alpine tar xzf /backup/uploads_backup.tar.gz -C /data
```

### Remove Volumes (⚠️ Deletes all data!)

```bash
docker-compose -f docker-compose.prod.yml down -v
```

## Important Notes

- **Local Development**: The dev `docker-compose.yml` still uses bind mounts for easy development
- **Production**: The prod `docker-compose.prod.yml` uses named volumes for persistence
- **Data Location**: Production data is now in Docker volumes, not in `./backend/app/`
- **Backups**: Always backup volumes before major operations

## Troubleshooting

### Database not found after migration

Check if the volume is mounted correctly:
```bash
docker exec yakimoto_backend ls -la /app/app/data/
```

### Uploads not showing

Check if uploads volume is mounted:
```bash
docker exec yakimoto_backend ls -la /app/app/uploads/
```

### Reset everything

If you need to start fresh:
```bash
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d --build
```

