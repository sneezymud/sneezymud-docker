# sneezymud-docker
Docker container for easy deployment of SneezyMUD

Instructions
============

1. Browse to https://www.docker.com/ and install Docker (works on Windows, Mac, Linux)
1. `git clone --config core.autocrlf=input --recursive https://github.com/sneezymud/sneezymud-docker`
1. `cd sneezymud-docker`
1. `docker-compose up -d`
  1. or `docker-compose up` if you want to shut down with ctrl-c
  1. in the `-d` case, you can view logs with `docker-compose logs -f sneezy`
  1. to debug, run `docker-compose run sneezy` to start the container, then `gdb ./sneezy`. Ditto for core dumps.

If mysql_upgrade warnings are emitted run /db/mysql_update.sh - preferrably after backing up.
