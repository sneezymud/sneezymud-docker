# sneezymud-docker

A Docker Compose configuration for easy, containerized deployment of SneezyMUD and its related services and/or developing against the SneezyMUD codebase.

## Quick Start

### Production Server

1. Install Docker & git, ensure they're available via CLI

2. Configure firewall
    - Allow all outgoing traffic
    - Block all incoming traffic
    - Open incoming ports 22, 80, 443, 7900, 7901, 8080, and 5001

3. Clone and navigate to repo:

   ```bash
   git clone --config core.autocrlf=input https://github.com/sneezymud/sneezymud-docker
   cd sneezymud-docker
   ```

4. Init database container (first time only):

   ```bash
   docker compose -f compose.yaml -f compose.prod.yaml up sneezy-db
   # Wait for database to finish loading data, then Ctrl+C to stop container
   ```

5. Start all services in background:

   ```bash
   docker compose -f compose.yaml -f compose.prod.yaml up -d
   ```

6. Connect to the game

   - Telnet/MUD client: `<server_IP>:7900`
   - Web client: Navigate to `http://<server_IP>:8080` in a browser

### Development

1. Install Docker & git on your local machine, ensure they're available via CLI

2. Clone repo to local machine:

    ```bash
    git clone --config core.autocrlf=input --recursive https://github.com/sneezymud/sneezymud-docker
    ```

3. Open `sneezymud-docker/services/sneezymud` directory in IDE of choice and develop as normal

4. When ready to compile and test changes, run the following command from the `sneezymud-docker` directory:

    ```bash
    docker compose -f compose.yaml -f compose.dev.yaml up -d
    ```

5. Connect and test in-game:

   - Telnet/MUD client: `localhost:7900`
   - Web browser: Navigate to `http://localhost:8080`

For detailed instructions, see sections below.

## Project Structure

The repository is organized as follows:

- `compose.yaml` - Base Docker Compose configuration shared between environments
- `compose.prod.yaml` - Production environment overrides and image specifications
- `compose.dev.yaml` - Development environment overrides with local builds
- `/services` - All service implementations and configurations
  - `/db` - Database service
    - `init.sql` - Database initialization script
    - `my.cnf` - MySQL configuration
    - `setup_mysql.sh` - Database setup script
  - `/sneezymud` - Git submodule containing the main Sneezy codebase
    - `Dockerfile` - Production build configuration
    - `dev.Dockerfile` - Development build configuration
  - `/monitor` - Container monitoring service for automatic updates
  - `/buildertools` - Builder tools web interface (Flask application)
  - `/webclient` - Web client service
    - `/connectificator` - Git submodule containing the Connectificator web client
- `/scripts` - Helper scripts and utilities
  - `/backups` - Automated backup system setup and management
    - `init-backups.sh` - Initialize, remove, or reconfigure backup system
  - `/nginx` - nginx configuration helpers
    - `init-nginx.sh` - Initialize or remove a fully-featured HTTPS configuration for nginx
  - `/tintin++` - TinTin++-related configuration files

### Service Components

- **sneezy-db**: MySQL database storing game world data, player information, and builder content
- **sneezy**: Main game server accepting direct telnet connections on port 7900
- **sneezy-monitor**: Service that monitors the game container, applying updates when available and ensuring it restarts after crashes/in-game shutdowns (production only)
- **websockify**: Proxy service converting WebSocket connections to TCP for web client compatibility
- **webclient**: Browser-based MUD client (Connectificator) served via nginx
- **buildertools**: Flask-based web interface for area, mob, and object creation/editing

All services communicate through the shared database, with the web client connecting through the websockify proxy to maintain compatibility with traditional MUD protocols.

## Creating/Managing A Production Server

### Server Requirements

When using Docker the host server can run any OS that Docker supports. That said, some flavor of Linux will likely provide the best results unless you have a specific reason to use something else. This README assumes you're using Linux.

Hosting on a physical server should work fine, but a cloud provider will probably be the easiest and most reliable method.

Most cloud server providers' lowest tiers will meet the requirements for running Sneezy decently these days, but some bare minimum specs to look for would be:

- 2+ CPU cores of 4 GHz or faster
- 8+ GB of RAM
- 20+ GB of disk space
- Static IP address

> [!TIP]
> Finding a provider that offers servers with solid-state hard drives is **highly recommended**. Without, you'll likely have noticeable game lag when periods of file I/O occur.

### Server Configuration

- Connect to your server as a user with `sudo` privileges

- Make sure the OS and packages are updated/upgraded
  - For example, on Debian/Ubuntu: `sudo apt update && sudo apt upgrade -y`

- Set up additional user accounts with SSH access and sudo permissions for anyone who will be involved in maintaining the server

- If you have a custom domain name (hopefully you do), create an `A` record through your domain registrar's DNS management console pointing the domain to your server's static IP

- Enable and configure a firewall of your choice (for example, `ufw` on Ubuntu)
  - A good starting point is to allow all outgoing traffic, block all incoming traffic, then then explicitly allow incoming traffic to ports:
    - 22 (SSH)
    - 80 (HTTP)
    - 443 (HTTPS)
    - 7900 (Sneezy telnet port)
    - 7901 (Websocket)
    - 8080 (Webclient)
    - 5001 (Web builder tools interface)

> [!WARNING]
> Don't use the default `docker` package provided by your distro's package manager. It's often outdated and can cause issues. Follow the official Docker installation instructions linked below.

> [!IMPORTANT]
> Make sure to follow Docker's [post-installation instructions](https://docs.docker.com/engine/install/linux-postinstall/)

- Install [Docker Engine](https://docs.docker.com/engine/install/)

- Install [git](https://git-scm.com/downloads/linux)

- Clone this repo to your home directory:

  ```bash
  cd ~
  git clone --config core.autocrlf=input https://github.com/sneezymud/sneezymud-docker
  ```

> [!TIP]
> Each server user should clone the repo to their own home directory and run any necessary Docker commands from there.

### Managing The Game/Service Containers

> [!NOTE]
> All Docker Compose commands should be executed from the `~/sneezymud-docker` directory:
>
> ```bash
> cd ~/sneezymud-docker
> ```

> [!TIP]
> (Optional but recommended)
> Run the `add_compose_aliases.sh` script to add some Docker Compose aliases to your `~/.bash_aliases` file for convenience:
>
> ```bash
> ./scripts/convenience/add_compose_aliases.sh
> # Example usage
> # Start all services in production mode
> dcp up -d
> # Start all services in development mode
> dcd up -d
> ```
>
> See the script contents for full list of aliases and what they do

- **First-time setup only:** On a fresh server, initialize the database before starting all services:

  ```bash
  docker compose -f compose.yaml -f compose.prod.yaml up sneezy-db
  # Wait for database to finish loading data, then Ctrl+C to stop container
  ```

- Run the game and other services by starting all containers in the background:

  ```bash
  docker compose -f compose.yaml -f compose.prod.yaml up -d
  ```

> [!IMPORTANT]
> In production mode, after the initial startup of the containers, the `sneezy-monitor` service automatically manages the game container by monitoring its status and restarting it after crashes or in-game shutdowns. Before starting the `sneezy` container the monitor service will check for new Docker images and apply them, with rollback protection on failure.

## Accessing Services

> [!TIP]
> If you set up the optional nginx HTTPS configuration, you can use URL version instead of the port numbers below and get the benefits of HTTPS connections.
> See the [HTTPS Setup with Nginx](#https-setup-with-nginx) section below for more information.

### Game

- **Telnet**: `your-server:7900` (any MUD client: MUSHclient, Mudlet, TinTin++)
- **Web Browser**: `http://your-server:8080` or `https://your-server` with nginx (Connectificator web client)

### Builder Tools Web Interface

- **Web Browser**: `http://your-server:5001` or `https://your-server/build` with nginx

## Helpful Commands

> [!NOTE]
> All `docker compose` commands must be executed from the `~/sneezymud-docker` directory

```bash
# View live game logs as they happen
docker logs sneezy -f

# Find crash stack traces
# Adjust `-B` and `-A` values to increase/decrease context as needed
docker logs sneezy 2>&1 | grep "ERROR: Address" -B 5 -A 50

# Start interactive shell inside a container
docker exec -it <container> /bin/bash

# Access the mariaDb shell in the `sneezy-db` container to query the live databases
docker exec -it sneezy-db /bin/bash mariadb -u sneezy -p<password>

# Run `sneezy` container with overridden command to keep container running without game
# starting. This is useful for accessing the Docker volume contents or examining the
# container filesystem in certain situations - for instance, when game is in a crash
# loop, or if you need to make sure no one can log in and modify the mutable files
# while you back up or restore them.
docker compose -f compose.yaml -f compose.prod.yaml run sneezy "tail -f /dev/null"

# Stop all containers
docker compose -f compose.yaml -f compose.prod.yaml down

# Check container status
docker ps

# Pull latest code changes and re-start game container
# In production mode, when the monitor service is running, you can accomplish this by simply using the in-game `shutdown` command as an imm.
docker pull sneezymud/sneezymud:latest
docker compose -f compose.yaml -f compose.prod.yaml up -d --force-recreate --no-deps sneezy
```

> [!WARNING]
> Restarting containers immediately ends the running game process. Ensure all players are logged out and the game world is saved before updating.

### Code Updates

New Docker images are automatically built and pushed to Docker Hub when code changes are merged to the [main Sneezy repo](https://github.com/sneezymud/sneezymud). See "Updates & Maintenance" above for update commands.

## Automatic Updates

Using the production `compose.prod.yaml` file enables automatic Docker image updates that trigger when the game server shuts down via the `sneezy-monitor` container.

A Discord webhook can optionally be configured via `.env` file to receive notifications when the game is updated.

See [services/monitor/README.md](services/monitor/README.md) for more info.

## Discord Integration

Sneezy supports Discord webhook integration for in-game events like player deaths, achievements, and system messages.

To enable Discord integration:

1. **Create Discord webhooks** for the channels you want to receive notifications

2. **Create a `discord.cfg` file** in the project root:

   ```bash
   cp services/sneezymud/code/discord-example.cfg discord.cfg
   ```

3. **Edit `discord.cfg`** and add your webhook URLs. See the file contents for details.

4. **Restart the game container** to load the new configuration

The game will automatically use the configuration file when it starts. If no `discord.cfg` file is present, Discord features are disabled.

## Automated Backup System

For production servers it's highly recommended to set up automated backups of your important game data. This repo includes a script to help with this. See [`scripts/backups/README.md`](scripts/backups/README.md) for more information.

> [!IMPORTANT]
> The backup script only saves the backups to the server itself, which is much better than nothing but could still result in data loss in the event of a server failure. It's recommended to configure a secondary backup service that copies the backups to another location as well, but that's outside the scope of the script.

## HTTPS Setup with Nginx

For production servers, you may want to set up HTTPS to provide secure, encrypted connections and cleaner URLs for your web services. This repo includes a script that automatically configures Nginx as a reverse proxy with SSL certificates from Let's Encrypt. The script will prompt for your domain name and email, then automatically set up HTTPS with certificate auto-renewal.

> [!TIP]
> This is optional - the game and web services work fine without HTTPS, but many modern browsers show warnings for unencrypted connections.

See [`scripts/nginx/README.md`](scripts/nginx/README.md) for more information.

## Developing Using Docker

> [!TIP]
> For developing in WSL or Linux without using Docker, see [this guide](https://github.com/sneezymud/sneezymud/wiki/Setting-Up-A-Sneezy-Development-Environment-(non%E2%80%90Docker,-Linux-or-Windows-WSL)) in the Sneezy wiki

Developing against the main Sneezy codebase using Docker is a bit different than running a production instance, as you need to be able to make and test code changes immediately in a non-production environment.

> [!NOTE]
> Development mode uses `compose.dev.yaml` which excludes the automatic update monitor service. You'll need to manually restart containers to test changes.

This repo comes pre-configured to support this workflow, via:

1. Having the [main Sneezy repo](https://github.com/sneezymud/sneezymud) configured as a git submodule of this repo (the `services/sneezymud` subdirectory)
2. Defining a separate Docker Compose file (`compose.dev.yaml`) for use during development, which does the following:
   - Bind mounts the `services/sneezymud` subdirectory into the `sneezy` container
   - Uses the Dockerfile located at `services/sneezymud/Dockerfile` to build the `sneezy` container locally
   - Configures the `sneezy` container to compile the code contained in the bind mounted `services/sneezymud` directory and then run the resulting binary

This ensures that any changes made to the code on the host machine are immediately reflected in the container, and will be re-compiled and re-run automatically when the container is restarted.

### Development Setup

> [!NOTE]
> You'll want to do this on your own, local machine (not the server), and it should work on any OS that Docker supports.

> [!IMPORTANT]
> You'll need Docker Engine or Docker Desktop and git installed on your local machine (see instructions for the production server above)

- Clone the repo and required submodules:

  ```bash
  git clone --config core.autocrlf=input --recursive https://github.com/sneezymud/sneezymud-docker
  ```

- Update the `services/sneezymud` submodule to pull down any new commits and ensure you're developing against the most recent changes:

  ```bash
  git submodule update --remote
  ```

### Workflow

Open the `services/sneezymud` subdirectory in your IDE of choice. Modify code and use git as you normally would.

When ready to compile and test changes, start the containers using Docker Compose:

```bash
docker compose -f compose.yaml -f compose.dev.yaml up -d
```

If the containers are already running and you want to re-compile the code, simply restart the `sneezy` container:

  ```bash
  docker compose -f compose.yaml -f compose.dev.yaml up --force-recreate --no-deps sneezy
  # Consider adding an alias for this command to your ~/.bash_aliases file
  ```

Then connect to the game via whatever client you normally use at `localhost:7900`.

> [!TIP]
> The only two containers *required* for the game to successfully run are `sneezy` and `sneezy-db`. If you don't need to test or develop against the others, you can simply comment those container definitions out in the `compose.dev.yaml` file to simplify and speed things up a bit.

### Debugging

To debug using `gdb` inside the `sneezy` container, run the container with the following command:

  ```bash
  docker compose -f compose.yaml -f compose.dev.yaml run sneezy gdb -ex run ./sneezy
  ```

This will run the most recently compiled binary inside `gdb`, allowing you to set breakpoints, step through code, etc.
