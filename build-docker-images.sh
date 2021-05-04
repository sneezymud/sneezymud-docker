#!/bin/sh
set -e

TAG="${1:-latest}"
BRANCH="${2:-master}"

docker build --build-arg=FORCE_REBUILD=$RANDOM --build-arg=BRANCH="$BRANCH" -t sneezymud/sneezymud:"$TAG" docker
docker build --build-arg=BRANCH="$BRANCH" -t sneezymud/sneezymud-buildertools:"$TAG" web
docker build --build-arg=BRANCH="$BRANCH" -t sneezymud/webclient:"$TAG" webclient
docker build --build-arg=BRANCH="$BRANCH" -t sneezymud/sneezy-db:"$TAG" db

docker push sneezymud/sneezymud:"$TAG"
docker push sneezymud/sneezymud-buildertools:"$TAG"
docker push sneezymud/webclient:"$TAG"
docker push sneezymud/sneezy-db:"$TAG"
