# sneezymud-docker
Docker container for easy deployment of SneezyMUD

Instructions
============

(probably slightly out of date)
1. Browse to https://www.docker.com/ and install Docker (works on Windows, Mac, Linux)
1. `git clone --config core.autocrlf=input https://github.com/sneezymud/sneezymud-docker`
1. `cd sneezymud-docker`
1. `docker-compose up -d`
  1. or `docker-compose up` if you want to shut down with ctrl-c
  1. in the `-d` case, you can view logs with `docker-compose logs -f sneezy`

If mysql_upgrade warnings are emitted run /db/mysql_update.sh - preferrably after backing up.

## To develop, using a clean database

1. Clone the repo, and submodules:
    `git clone --config core.autocrlf=input --recursive https://github.com/sneezymud/sneezymud-docker`
2. Hop in:
    `cd sneezymud-docker`
3. Compile and run the whole mess:
    `docker-compose -f docker-compose-compile.yml up`
4. Now edit the code, _outside the container_ - the source is mounted into the container, so the changes sync instantly.
5. To run Sneezy in debugger, run this: `docker-compose -f docker-compose-compile.yml run sneezy gdb -ex run ./sneezy`
