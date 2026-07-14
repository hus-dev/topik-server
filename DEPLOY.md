# AWS EC2 Deployment Guide

## Prerequisites

1. **AWS Account** with EC2 access
2. **EC2 Instance** (t2.micro/t3.micro for free tier eligible)
3. **Security Groups** configured to allow ports 22 (SSH), 3000 (API), and 3306 (MySQL - only if external access needed)
4. **Security Group** with port 6379 open for Redis (or restrict to localhost only)

## Quick Deployment Steps

### 1. Launch EC2 Instance

- Go to AWS EC2 Console
- Launch instance with:
  - **AMI**: Amazon Linux 2 or Ubuntu Server 22.04 LTS (free tier eligible)
  - **Instance Type**: t2.micro or t3.micro (free tier)
  - **Storage**: At least 20GB (recommended 30GB for database)
  - **Security Group**: Allow ports 22, 3000, and (optionally) 3306

### 2. Connect to EC2

```bash
ssh -i your-key.pem ec2-user@your-ec2-public-ip
```

### 3. Install Prerequisites

```bash
# Update system
sudo yum update -y  # For Amazon Linux
# OR
sudo apt update -y  # For Ubuntu

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Log out and back in, or run:
newgrp docker
```

### 4. Upload Project

From your local machine (NOT on EC2):

```bash
# Using rsync (recommended)
rsync -avz -e "ssh -i your-key.pem" . ec2-user@your-ec2-public-ip:/home/ec2-user/topik-server --exclude node_modules --exclude dist --exclude .git --exclude "*.aiff" --exclude "*.wav"

# OR using scp
scp -i your-key.pem -r ./* ec2-user@your-ec2-public-ip:/home/ec2-user/topik-server/ --exclude "node_modules/*" --exclude "dist/*" --exclude ".git"
```

### 5. Configure Environment

On EC2:

```bash
cd /home/ec2-user/topik-server

# Copy environment template
cp .env.ec2.example .env.ec2

# Edit with your values
nano .env.ec2
```

**Important**: Update these values in `.env.ec2`:
- `MYSQL_ROOT_PASSWORD` - Use a strong password
- `MYSQL_PASSWORD` - Use a strong password  
- `JWT_SECRET` - Generate with: `openssl rand -base64 32`

### 6. Deploy

```bash
# Make deploy script executable
chmod +x deploy/ec2-deploy.sh

# Run deployment
./deploy/ec2-deploy.sh
```

## Alternative Method: Manual Docker Compose

If you prefer manual deployment:

```bash
# On EC2, after uploading project
docker compose -f docker-compose.ec2.yml up -d --build

# Check logs
docker compose -f docker-compose.ec2.yml logs -f
```

## Database Seeding

After deployment, seed the database:

```bash
# Enter the API container
docker exec -it topik-api sh

# Run seed
npm run db:seed

# OR run other seed scripts
npm run seed:dev
npm run import:reading-content
npm run import:listening-content
npm run import:writing-content
npm run import:vocabulary-content
npm run import:grammar-content
```

## Accessing the API

- **API**: `http://your-ec2-public-ip:3000`
- **Swagger Docs**: `http://your-ec2-public-ip:3000/api`

## Management Commands

```bash
# View all containers
docker compose -f docker-compose.ec2.yml ps

# View API logs
docker logs -f topik-api

# Restart API
docker compose -f docker-compose.ec2.yml restart api

# Stop all services
docker compose -f docker-compose.ec2.yml down

# Update and restart
docker compose -f docker-compose.ec2.yml down
docker compose -f docker-compose.ec2.yml pull  # if using remote images
docker compose -f docker-compose.ec2.yml up -d --build
```

## Using AWS RDS (Recommended for Production)

For better persistence and management, use AWS RDS instead of container MySQL:

1. **Create RDS MySQL instance**:
   - Engine: MySQL 8.0
   - Template: Free tier (t2.micro)
   - Username/Password: Set and note them down

2. **Update `.env.ec2`**:
   ```bash
   DATABASE_URL=mysql://your_username:your_password@your-rds-endpoint:3306/topik_smart_academy
   ```

3. **Update `docker-compose.ec2.yml`**:
   - Remove the `mysql` service
   - Keep `redis` and `api` services

## Security Considerations

1. **Restrict database ports** in Security Groups (3306, 6379)
2. **Use strong passwords** for MySQL and JWT secret
3. **Set up SSL/TLS** for production (consider nginx reverse proxy with Let's Encrypt)
4. **Configure backups** for your RDS instance or MySQL volume
5. **Use IAM roles** instead of storing AWS credentials on EC2

## Troubleshooting

### Container won't start
```bash
docker compose -f docker-compose.ec2.yml logs api
```

### Database connection issues
- Check that `.env.ec2` has correct database credentials
- Verify Security Group allows traffic on MySQL port
- Ensure MySQL container is healthy: `docker ps`

### Redis connection issues
- Verify `.env.ec2` has `REDIS_HOST=localhost`
- Check Redis container is running

### Clean restart
```bash
docker compose -f docker-compose.ec2.yml down -v  # Warning: deletes data
docker compose -f docker-compose.ec2.yml up -d --build
```