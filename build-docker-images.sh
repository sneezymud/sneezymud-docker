#!/bin/sh
set -e

TAG="${1:-latest}"
BRANCH="${2:-master}"

docker build --build-arg=BRANCH="$BRANCH" -t sneezymud/sneezymud:"$TAG" docker
docker build --build-arg=BRANCH="$BRANCH" -t sneezymud/sneezymud-buildertools:"$TAG" web
docker build --build-arg=BRANCH="$BRANCH" -t sneezymud/webclient:"$TAG" webclient

docker push sneezymud/sneezymud:"$TAG"
docker push sneezymud/sneezymud-buildertools:"$TAG"
docker push sneezymud/webclient:"$TAG"
