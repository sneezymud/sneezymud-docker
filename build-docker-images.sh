#!/bin/sh
set -e

docker build -t sneezymud/sneezymud:latest docker
docker build -t sneezymud/sneezymud-buildertools:latest web

docker push sneezymud/sneezymud:latest
docker push sneezymud/sneezymud-buildertools:latest
