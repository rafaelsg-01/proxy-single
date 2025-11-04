# Proxy Single (Beta)

A simple proxy service built with Google Cloud Functions that forwards HTTP requests while providing a unique IP address for each deployment region.

## Setup

1. Deploy to Google Cloud Functions
2. Set environment variable:
   - `TOKEN_PROXY_SELF`: Your authentication token

## Usage

```
GET/POST /?token=YOUR_TOKEN&url=TARGET_URL
```

### Parameters

- `token`: Authentication token (must match TOKEN_PROXY_SELF)
- `url`: Target URL to proxy the request to

### Supported
- Methods: GET, POST
- Headers: Authorization, Content-Type

## Deployment

Deploy multiple instances in different Google Cloud regions to provide various IP addresses.