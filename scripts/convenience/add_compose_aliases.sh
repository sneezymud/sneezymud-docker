#!/bin/bash

# Add some Docker Compose aliases to ~/.bash_aliases for convenience,
# since they're used often and are long/annoying to type

if ! [ -f ~/.bash_aliases ]; then
    touch ~/.bash_aliases
fi

echo "Adding Docker Compose-related aliases to ~/.bash_aliases..."

DCP="docker compose -f compose.yaml -f compose.prod.yaml"
DCD="docker compose -f compose.yaml -f compose.dev.yaml"

echo "# Docker Compose aliases" >> ~/.bash_aliases

echo "Adding alias 'dcp' for '${DCP}'"
echo "# Run production services" >> ~/.bash_aliases
echo "alias dcp='docker compose -f compose.yaml -f compose.prod.yaml'" >> ~/.bash_aliases

echo "Adding alias 'dcd' for '${DCD}'"
echo "# Run development services" >> ~/.bash_aliases
echo "alias dcd='docker compose -f compose.yaml -f compose.dev.yaml'" >> ~/.bash_aliases

echo "Adding alias 'rb' for 'dcd up --force-recreate --no-deps sneezy'"
echo "# Rebuild and restart sneezy container" >> ~/.bash_aliases
echo "alias rb='dcd up --force-recreate --no-deps sneezy'" >> ~/.bash_aliases

source ~/.bash_aliases
echo "Docker Compose aliases added"
