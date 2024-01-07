FROM ubuntu:focal AS build

# Set this first to ensure it applies to all commands
ENV DEBIAN_FRONTEND=noninteractive

ARG BRANCH="master"

# Combining commands reduces the number of layers, which reduces image size
# Removing cache after install reduces image size
RUN apt-get update && TZ=utc apt-get install --yes --no-install-recommends git ca-certificates && apt-get clean && rm -rf /var/lib/apt/lists/* && git clone --depth 1 --shallow-submodules --recurse-submodules --single-branch --branch "$BRANCH" --no-tags https://github.com/sneezymud/sneezymud /home/sneezy/sneezymud

FROM python:3.6 AS run

ARG UID=1000

WORKDIR /code

RUN useradd -ms /bin/bash -u "$UID" sneezy

COPY --chown=sneezy:sneezy . /code
COPY --from=build --chown=sneezy:sneezy /home/sneezy/sneezymud/lib/zonefiles ../sneezymud/lib/zonefiles

RUN pip install -r requirements.txt

USER sneezy
CMD python main.py