# sneezymud-docker
Docker container for easy deployment of SneezyMUD

Instructions
============

1. Browse to https://www.docker.com/ and install Docker (works on Windows, Mac, Linux)
1. `git clone --config core.autocrlf=input --recursive https://github.com/sneezymud/sneezymud-docker`
1. `cd sneezymud-docker`
1. Edit /sneezymud/code/sneezy.cfg database servers section to read
  >     + \#\# Database servers
  >
  >     + sneezy_host         = db
  >     + immortal_host       = db
1. 1. `docker-compose down`
   1. `docker-compose build (optionally --no-cache if editing build system files)`
   1. `docker-compose up`

If mysql_upgrade warnings are emitted run /db/mysql_update.sh - preferrably after backing up.
