# CloudPerf Dashboard Deployment Guide

This guide explains how to deploy the CloudPerf dashboard in different environments.

## Production Build

The production build is located in the `dist` directory after running:
```bash
npm run build
cd src/web && rm -rf lambda/app/public/* && npm run build -- --mode production
```

## Deployment Options

### 1. Static Web Server

The simplest deployment method is to serve the built files using a static web server:

1. Copy the entire `dist` directory to your web server
2. Configure your web server (Apache/Nginx) to serve the files
3. Ensure all requests are redirected to index.html for client-side routing

Example Nginx configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 2. AWS S3 + CloudFront

For a scalable cloud deployment:

1. Create an S3 bucket:
   ```bash
   aws s3 mb s3://your-bucket-name
   ```

2. Upload the build files:
   ```bash
   aws s3 sync dist/ s3://your-bucket-name
   ```

3. Configure the S3 bucket for static website hosting:
   ```bash
   aws s3 website s3://your-bucket-name --index-document index.html --error-document index.html
   ```

4. Create a CloudFront distribution pointing to the S3 bucket
   - Origin: Your S3 bucket website endpoint
   - Behaviors: Redirect all to HTTPS
   - Error pages: 404 -> /index.html

### 3. Docker Container

You can also containerize the dashboard:

1. Create a Dockerfile:
```dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

2. Build and run the container:
```bash
docker build -t cloudperf-dashboard .
docker run -p 80:80 cloudperf-dashboard
```

## Environment Configuration

For different environments (development, staging, production), create corresponding environment files:

- `.env.development`
- `.env.staging`
- `.env.production`

Example environment file:
```env
VITE_API_URL=https://api.your-domain.com
VITE_ENV=production
```

## Post-Deployment Checklist

1. Verify all assets are loading correctly
2. Check if client-side routing works
3. Confirm API endpoints are correctly configured
4. Test browser caching and compression
5. Validate SSL/TLS configuration if using HTTPS
6. Monitor performance using browser dev tools

## Monitoring and Maintenance

1. Set up monitoring for:
   - Page load times
   - Error rates
   - API response times
   - Resource usage

2. Regular maintenance:
   - Update dependencies
   - Review and rotate logs
   - Check for security updates
   - Monitor performance metrics

## Troubleshooting

Common issues and solutions:

1. Routing issues:
   - Ensure server is configured to redirect all requests to index.html
   - Check base URL configuration in vite.config.js

2. Asset loading:
   - Verify correct paths in production build
   - Check CDN configuration if used

3. API connectivity:
   - Confirm API endpoints are accessible
   - Verify CORS settings

4. Performance issues:
   - Enable compression
   - Implement caching strategies
   - Use CDN for static assets
