# SneezyMUD Nginx Setup

Automatically sets up HTTPS for your SneezyMUD server and manages multiple domains.

## Do I Need This?

**No** - the game and related services will still work without this script. You'll simply access the web client and builder tools through unencrypted (HTTP) connections on their default ports:

- `http://your-domain.com:8080` - Web client
- `http://your-domain.com:5001` - Builder tools

Just be aware that many modern browsers will show warnings for and/or block unencrypted connections, which can be confusing for players or users of the builder tools.

## Why Use This?

This script gives you:

- **Better URLs with no ports**:
  - `https://your-domain.com/` - Web client
  - `https://your-domain.com/build/` - Builder tools

- **Security**: Encrypted connections (required for many modern browsers as mentioned above)
- **Trust**: Players see a secure site with proper SSL certificates
- **Ease**: Automatic SSL certificate renewal

## Script Requirements

- Ubuntu or Debian server
- Root access (sudo)
- Domain name pointing to your server's IP address (usually accomplished by creating an `A` record through your domain registrar's DNS management console)
- Internet connection

## How To Use

### Initial Setup

1. **Run the script**:

   ```bash
   sudo ./scripts/nginx/init-nginx.sh
   ```

2. **Enter when prompted**:
   - Your domain name (e.g., `sneezymud.com`)
     - If you have multiple domains, just pick one for now. You can add the rest later through the management menu.
   - Email address
     - Let's Encrypt uses this for renewal failure warnings - use a real email if possible, but `admin@yourdomain.com` works too if you don't care about renewal warnings or are planning to check renewal status manually

Once the required info is provided, the script will:

- Set up HTTP first (for SSL certificate validation)
- Get SSL certificates from Let's Encrypt
- Switch to HTTPS automatically

### Managing Multiple Domains

After initial setup, running the script again will show a management menu. This allows you to:

- **Add domains**: Add additional domains
- **Remove domains**: Remove domains you no longer need
- **Update services**: Apply changes from services.json
- **Reconfigure**: Start over with fresh setup
- **Remove setup**: Completely remove nginx configuration

### Managing Services

Services are configured through the `services.json` file in this directory. To add or modify services:

1. **Update the Docker Compose configuration** (add or remove a service definition)
2. **Update `services.json`** with the new service configuration
3. **Apply changes**: `sudo ./init-nginx.sh --update-services`

#### Example: Adding a service for a web application at port 3000

1. Add to `compose.yaml`:

   ```yaml
   webmap:
     container_name: sneezy-webapp
     image: your-webapp-image
     ports:
       - "3000:3000"
     restart: always
   ```

2. Add to `services.json`:

   ```json
   {
     "name": "webapp",
     "path": "/webapp/",
     "port": 3000,
     "type": "http",
     "description": "Example Web App"
   }
   ```

3. Apply: `sudo ./init-nginx.sh --update-services`

The service will automatically be available at `https://yourdomain.com/webapp/` on all configured domains.

### Command Line Options

```bash
sudo ./init-nginx.sh                        # Initial setup or management menu
sudo ./init-nginx.sh --add-domain DOMAIN    # Add domain directly
sudo ./init-nginx.sh --remove-domain DOMAIN # Remove domain directly
sudo ./init-nginx.sh --undo                 # Remove entire setup
sudo ./init-nginx.sh --help                 # Show help
```

**Examples:**

```bash
# Add a second domain to existing setup
sudo ./init-nginx.sh --add-domain <new-domain>

# Remove a domain
sudo ./init-nginx.sh --remove-domain <old-domain>
```

## Troubleshooting

**Nginx errors**: Check the configuration and logs

```bash
sudo nginx -t
sudo tail /var/log/nginx/error.log
```

**502 errors**: Make sure your SneezyMUD Docker containers are running
