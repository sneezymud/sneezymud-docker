#!/usr/bin/env bash

set -e

pushd ~/sneezymud-docker/sneezymud

git fetch
if [ `git rev-parse HEAD` != `git rev-parse FETCH_HEAD` ]; then
  pushd ~/sneezymud-docker
  docker exec sneezy bash -c 'scons -j`grep -c ^processor /proc/cpuinfo` -Q debug=1 -Q sanitize=0 -Q olevel=1'
  popd
fi
popd
