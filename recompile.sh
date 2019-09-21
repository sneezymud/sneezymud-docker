#!/bin/sh

docker exec sneezy bash -c 'scons -j`grep -c ^processor /proc/cpuinfo` -Q debug=1 -Q sanitize=0 -Q olevel=1'
