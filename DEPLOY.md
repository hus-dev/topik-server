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
- `GOOGLE_CLIENT_ID` (or `GOOGLE_CLIENT_IDS`) - Required for Google social login

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

## Serving Media from S3 + CloudFront (Production)

미디어(오디오/이미지/PDF)는 EC2 로컬 디스크가 아닌 **S3 + CloudFront**로 서빙한다.
API 컨테이너는 DB 응답만 담당하므로 오디오 스트리밍 부하가 Node.js 이벤트 루프에 도달하지 않는다.

### 1. S3 버킷 생성 (최초 1회)

```bash
aws s3api create-bucket --bucket topik-media-prod --region ap-northeast-2 \
  --create-bucket-configuration LocationConstraint=ap-northeast-2

# 퍼블릭 접근 완전 차단 (CloudFront OAC로만 접근)
aws s3api put-public-access-block --bucket topik-media-prod \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

### 2. CloudFront 배포 생성 (콘솔 권장)

- Origin: `topik-media-prod.s3.ap-northeast-2.amazonaws.com` (REST 엔드포인트)
- Origin access: **Origin access control settings**(OAC) 생성 후 연결
- Viewer protocol policy: **Redirect HTTP to HTTPS**
- Price class: **North America, Europe, Asia, Middle East and Africa** (아시아 엣지 포함)
- Cache policy: **CachingOptimized** / Response headers policy: **CORS-S3Origin**

OAC 연결 후 버킷 정책 부여:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "AllowCloudFrontOAC",
    "Effect": "Allow",
    "Principal": { "Service": "cloudfront.amazonaws.com" },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::topik-media-prod/*",
    "Condition": { "StringEquals": { "AWS:SourceArn": "arn:aws:cloudfront::<ACCOUNT_ID>:distribution/<DISTRIBUTION_ID>" } }
  }]
}
```

### 3. 미디어 업로드 (로컬 머신에서 실행)

EC2로 rsync 시 `*.wav`가 제외되므로 업로드는 파일이 완전한 **로컬에서 실행**한다.

```bash
S3_MEDIA_BUCKET=topik-media-prod npm run media:upload
# 대상 목록만 보기:    npm run media:upload -- --dry-run
# 업로드 없이 재검사:  npm run media:upload -- --check-only
```

### 4. EC2 환경설정 (`.env.ec2`)

```bash
MEDIA_CDN_BASE_URL=https://<distribution-domain>.cloudfront.net
SERVE_LOCAL_MEDIA=false
S3_MEDIA_BUCKET=topik-media-prod
AWS_REGION=ap-northeast-2
```

### 5. DB URL 마이그레이션 (EC2에서)

실행 전 DB 덤프(또는 RDS Snapshot)를 권장한다.

```bash
docker exec topik-api sh -c "npm run media:migrate-urls"             # dry-run
docker exec topik-api sh -c "npm run media:migrate-urls -- --apply"  # 적용 + Redis 캐시 무효화
```

### 6. 재배포 및 정리

```bash
./deploy/ec2-deploy.sh           # test/audio 마운트 제거 + 이미지 경량화 상태로 재배포
rm -rf test/audio test/photos    # EC2 로컬 파일 삭제(디스크 회수). 롤백 대비가 필요하면 보존
```

### 7. 검증

```bash
curl -sI "https://<distribution-domain>/test/audio/topik2-83/listening-q01.mp3" | head
# → HTTP/2 200, content-type: audio/mpeg (두 번째 요청은 x-cache: Hit)

curl -sI -H "Range: bytes=0-1023" \
  "https://<distribution-domain>/test/audio/topik2-83/listening-q01.mp3" | head -1
# → HTTP/2 206 (오디오 seek 지원)
```

### 8. 캐시 무효화 (시드가 같은 파일명을 재생성했을 때)

```bash
aws cloudfront create-invalidation --distribution-id <DISTRIBUTION_ID> \
  --paths "/test/audio/listening/*"
```

### 롤백

`.env.ec2`에서 `SERVE_LOCAL_MEDIA=true`로 되돌리고 `test/audio` 볼륨 마운트를 복구하면
기존 로컬 서빙 방식으로 즉시 복귀한다. DB URL은 덤프 복원 또는 CDN 접두어 제거로 되돌린다.

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