# SneezyMUD Nginx Setup

Automatically sets up HTTPS for your SneezyMUD server.

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

1. **Run the script**:

   ```bash
   cd /path/to/sneezymud-docker/scripts/nginx
   sudo ./init-nginx.sh
   ```

2. **Enter when prompted**:
   - Your domain name (e.g., `sneezymud.com`)
   - Email address (Let's Encrypt uses this for renewal failure warnings - use a real email if possible, but `admin@yourdomain.com` works too)

3. **Done!** The script will:
   - Set up HTTP first (for SSL certificate validation)
   - Get SSL certificates from Let's Encrypt
   - Switch to HTTPS automatically

### Options

```bash
sudo ./init-nginx.sh          # Set up HTTPS
sudo ./init-nginx.sh --undo   # Remove setup
sudo ./init-nginx.sh --help   # Show help
```

## Troubleshooting

**Nginx errors**: Check the configuration and logs

```bash
sudo nginx -t
sudo tail /var/log/nginx/error.log
```

**502 errors**: Make sure your SneezyMUD Docker containers are running
