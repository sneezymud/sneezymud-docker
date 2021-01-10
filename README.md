# sneezymud-docker
Docker container for easy deployment of SneezyMUD

Instructions
============

(probably slightly out of date)
1. Browse to https://www.docker.com/ and install Docker (works on Windows, Mac, Linux)
1. `git clone --config core.autocrlf=input --recursive https://github.com/sneezymud/sneezymud-docker`
1. `cd sneezymud-docker`
1. `docker-compose up -d`
  1. or `docker-compose up` if you want to shut down with ctrl-c
  1. in the `-d` case, you can view logs with `docker-compose logs -f sneezy`
  1. to debug, run `docker-compose run sneezy` to start the container, then `gdb ./sneezy`. Ditto for core dumps.

If mysql_upgrade warnings are emitted run /db/mysql_update.sh - preferrably after backing up.

## To develop

1. Clone the repo, and submodules: `git clone --config core.autocrlf=input --recursive https://github.com/sneezymud/sneezymud-docker`
2. Hop in: `cd sneezymud-docker`
3. Set up a Docker dev container with compiler, libs and stuff: `docker build -t sneezy-dev -f docker/Dockerfile-dev docker/`
4. Launch the dev container, mounting the current source code into it: `docker run -it --rm -v $(pwd):/sneezymud-docker sneezy-dev /usr/bin/env bash`
5. Compile & run unittests: `scons -j`nproc` check sneezy` (`check` is the target for unittests)
6. Now edit the code, _outside the container_ - the source is mounted into the container, so the changes sync instantly.
