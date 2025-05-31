# sneezymud-docker

A Docker Compose configuration for easy, containerized deployment of SneezyMUD and its related services and/or developing against the SneezyMUD codebase.

## Creating/Managing A Production Server

### Server Requirements

When using Docker the host server can technically run any OS that Docker supports. That said, some flavor of Linux will likely provide the best results unless you have a specific reason to use something else. This README assumes you're using Linux.

Hosting on a physical server should work fine, but a cloud provider will probably be the easiest and most reliable method.

Most cloud server providers' lowest tiers will meet the requirements for running Sneezy decently these days, but some bare minimum specs to look for would be:

* 2+ CPU cores of 4 GHz or faster
* 8+ GB of RAM
* 20+ GB of disk space
* Static IP address

> [!TIP]
> Finding a provider that offers servers with solid-state hard drives is **highly recommended**. With a traditional platter drive you'll likely have noticeable game lag when periods of file I/O occur.

### Server Configuration

* Make sure the OS and packages are updated/upgraded
  * For example, on Debian/Ubuntu: `sudo apt update && sudo apt upgrade -y`

* Set up user accounts with SSH access and sudo permissions for anyone who will be involved in maintaining the server

* If you have a custom domain name (hopefully you do), create an `A` record through your domain registrar's DNS management console pointing the domain to your server's static IP

* Enable and configure a firewall of your choice (for example, `ufw` on Ubuntu)
  * You'll likely want allow all outgoing traffic, and block all incoming traffic.
  * Then explicitly allow incoming traffic to ports:
    * 22 (SSH)
    * 80 (HTTP)
    * 443 (HTTPS)
    * 7900 (SneezyMUD)
    * 7901 (Websocket)
    * 8080 (Webclient)
    * 5001 (Web builder tools interface)

* Install [Docker Engine](https://docs.docker.com/engine/install/)

> [!WARNING]
> Don't use the default docker package provided by your distro's package manager. It's often outdated and can cause issues. Follow the official Docker installation instructions linked above.

> [!IMPORTANT]
> Make sure to follow the [post-installation instructions](https://docs.docker.com/engine/install/linux-postinstall/)

* Install [git](https://git-scm.com/downloads)

> [!NOTE]
> If installed through your distro's package manager the version will potentially be quite a bit older than the latest version, but will most likely still work fine for these purposes.

* Clone this repo to your home directory:

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

> [!IMPORTANT]
> On the initial run on a freshly configured server, start only the `sneezy-db` container first to ensure the database is seeded:
>
> ```bash
> docker compose run sneezy-db
> ```
>
> Once it's done loading the SQL files, shut that run down (via `ctrl-c`) and start all the services together as described below.

Once the server is properly configured, run the game and other services by starting the containers:

```bash
docker compose up -d
```

#### Commonly Used Commands

View game logs live as they occur:

```bash
docker compose logs sneezy -f
```

Stop all containers:

```bash
docker compose down
```

Check container status:

```bash
docker ps
```

### Handling Code Updates

When code changes are merged to the `master` branch of the [main SneezyMUD repo](https://github.com/sneezymud/sneezymud) a new Docker image will automatically be built and pushed to Docker Hub.

> [!IMPORTANT]
> These changes won't be reflected in-game until the new image is pulled down to the server and the Sneezy container is restarted.

* Pull the latest image down from Docker Hub:

  ```bash
  docker pull sneezymud/sneezymud:latest
  ```

* Restart just the Sneezy container using the new image:

  ```bash
  docker compose up -d --force-recreate --no-deps sneezy
  ```

> [!WARNING]
> Restarting the container will immediately end the running Sneezy process without saving anything, so make sure all players are logged out and the game world is properly saved before doing so.

## Developing Using Docker

> [!TIP]
> For developing in WSL or Linux without using Docker, see [this guide](https://github.com/sneezymud/sneezymud/wiki/Setting-Up-A-Sneezy-Development-Environment-(non%E2%80%90Docker,-Linux-or-Windows-WSL)) in the SneezyMUD wiki

Developing against the main SneezyMUD codebase using Docker is a bit different than running a production instance, as you need to be able to make and test code changes immediately in a non-production environment.

This repo comes pre-configured to support this workflow, via:

1. Having the [main SneezyMUD repo](https://github.com/sneezymud/sneezymud) configured as a git submodule of this repo (the `sneezymud` subdirectory)
2. Defining a separate Docker Compose file (`docker-compose-compile.yml`) for use during development, which does the following:
   * Bind mounts the `sneezymud` subdirectory into the `sneezy` container
   * Uses the Dockerfile located at `docker/Dockerfile-dev` to build the `sneezy` container locally
   * Configures the `sneezy` container to compile the code contained in the bind mounted `sneezymud` directory and then run the resulting binary

This ensures that any changes made to the code on the host machine are immediately reflected in the container, and will be re-compiled and re-run automatically when the container is restarted.

### Setup

> [!NOTE]
> You'll want to do this on your own, local machine (not the server), and it should work on any OS that Docker supports.

> [!IMPORTANT]
> You'll need Docker Engine or Docker Desktop and git installed on your local machine (see instructions for the production server above)

* Clone the repo and required submodules:

  ```bash
  git clone --config core.autocrlf=input --recursive https://github.com/sneezymud/sneezymud-docker
  ```

* Update the `sneezymud` submodule to pull down any new commits and ensure you're developing against the most recent changes:

  ```bash
  git submodule update --remote
  ```

### Workflow

Now simply open the `sneezymud` subdirectory in your IDE of choice and develop as you normally would.

When ready to compile and test changes, start the containers using Docker Compose, targeting the `docker-compose-compile.yml` file:

  ```bash
  docker compose -f docker-compose-compile.yml up -d
  ```

If the containers are already running and you want to re-compile the code, simply restart the `sneezy` container:

  ```bash
  docker compose -f docker-compose-compile.yml up --force-recreate --no-deps sneezy
  ```

Then connect to the game via whatever client you normally use at `localhost:7900`.

> [!TIP]
> The only two containers *required* for the game to successfully run are `sneezy` and `sneezy-db`. If you don't need to test or develop against the others, you can simply comment those container definitions out in the `docker-compose-compile.yml` file to simplify and speed things up a bit.

### Debugging

To debug using `gdb` inside the `sneezy` container, run the container with the following command:

  ```bash
  docker compose -f docker-compose-compile.yml run sneezy gdb -ex run ./sneezy
  ```

This will run the most recently compiled binary inside `gdb`, allowing you to set breakpoints, step through code, etc.
