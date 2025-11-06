# Proxy Single

A Node.js AWS Lambda function that acts as a proxy endpoint for HTTP/HTTPS requests. This project is designed to work in conjunction with [proxy-manager](https://github.com/rafaelsg-01/proxy-manager) to provide IP rotation capabilities.

## Overview

This project allows you to deploy multiple proxy endpoints across different AWS regions, enabling IP rotation for your requests. Each AWS region provides a unique IP address, allowing up to 33 different IPs for rotation.

## Setup Instructions

### 1. AWS Lambda Function Configuration

Create a new Lambda function with these settings:

```plaintext
General Configuration:
- Runtime: Node.js
- Timeout: 5 minutes
- Response Stream: Enabled
- CORS: Enabled (Allow all methods (*) and credentials)

Environment Variables:
- TOKEN_PROXY_SELF: Your secret token (must match the token used in proxy-manager)
```

### 2. GitHub Actions Deployment

This project includes a GitHub Actions workflow that automatically deploys your code to multiple AWS regions. To set it up:

1. Fork this repository

2. Create an IAM Role in AWS:
   - Create a new role for GitHub Actions (OIDC)
   - Add permissions for Lambda function deployment
   - Copy the role ARN

3. Configure GitHub Repository Secrets:
   - Update the role ARN in `.github/workflows/deploy.yml` with your IAM role:
     ```yaml
     role-to-assume: arn:aws:iam::YOUR_ACCOUNT_ID:role/YOUR_ROLE_NAME
     ```

4. The workflow will automatically deploy to these regions on each push to main:
   - us-east-1 (N. Virginia)
   - us-east-2 (Ohio)
   - us-west-1 (N. California)
   - us-west-2 (Oregon)

You can modify the regions list in `.github/workflows/deploy.yml` to add or remove regions as needed.

## Usage

The proxy endpoint accepts GET and POST requests with the following parameters:

```
https://your-lambda-url/?token=YOUR_TOKEN&url=TARGET_URL
```

Parameters:
- `token`: Your authentication token (must match TOKEN_PROXY_SELF)
- `url`: The target URL you want to request through the proxy

## Integration with Proxy Manager

After deploying your proxy endpoints, collect all Lambda function URLs and add them to the `EnvSecret_listProxy` environment variable in your proxy-manager Cloudflare Worker.

Example:
```
EnvSecret_listProxy=https://lambda-url-1/,https://lambda-url-2/,https://lambda-url-3/
```

## Supported HTTP Methods
- GET
- POST

Each proxy endpoint will maintain its own unique IP address based on the AWS region it's deployed in.
