#!/bin/bash

# Add Docker Compose aliases to ~/.bash_aliases for convenience,
# with interactive prompts for customization

if ! [ -f ~/.bash_aliases ]; then
    touch ~/.bash_aliases
fi

# Define aliases: "default_name|command|description"
# Commands can reference other aliases by their default name - they'll be
# substituted with the user's chosen name if customized
ALIASES=(
    "dcp|docker compose -f compose.yaml -f compose.prod.yaml|Run SneezyMUD Docker Compose services in production mode"
    "dcd|docker compose -f compose.yaml -f compose.dev.yaml|Run SneezyMUD Docker Compose services in development mode"
    "rb|{dcd} up --force-recreate --no-deps sneezy|Rebuild and restart sneezy container to apply code changes during development"
    "sdl|{dcd} run --remove-orphans --service-ports sneezy sh -c \"cd code && gdb -ex run ./sneezy\"|Run a new sneezy container inside gdb for debugging"
    "sda|{dcd} exec sneezy gdb -p \$({dcd} exec sneezy pgrep -x sneezy)|Attach gdb to running sneezy container for debugging"
)

# Track alias name mappings (default -> chosen)
declare -A alias_names

add_alias() {
    local name="$1"
    local command="$2"
    local description="$3"

    echo "# ${description}" >> ~/.bash_aliases
    echo "alias ${name}='${command}'" >> ~/.bash_aliases
    echo "  Added: ${name} -> ${command}"
}

# Substitute {alias_name} references with the user's chosen names
substitute_refs() {
    local command="$1"
    for default_name in "${!alias_names[@]}"; do
        command="${command//\{${default_name}\}/${alias_names[$default_name]}}"
    done
    echo "$command"
}

echo "SneezyMUD Docker Compose Alias Installer"
echo "========================================"
echo

added_count=0

for entry in "${ALIASES[@]}"; do
    IFS='|' read -r default_name command description <<< "$entry"

    # Substitute any alias references for display
    display_command=$(substitute_refs "$command")

    echo "Alias: ${default_name}"
    echo "  Command: ${display_command}"
    echo "  Description: ${description}"
    echo

    read -p "Install this alias? [Y/n] " install_choice
    install_choice=${install_choice:-Y}

    if [[ "${install_choice,,}" == "n" ]]; then
        echo "  Skipped."
        # Still track the default name so dependent aliases can reference it
        alias_names["$default_name"]="$default_name"
        echo
        continue
    fi

    read -p "Use default name '${default_name}'? [Y/n] " name_choice
    name_choice=${name_choice:-Y}

    if [[ "${name_choice,,}" == "n" ]]; then
        read -p "Enter custom alias name: " custom_name
        if [[ -z "$custom_name" ]]; then
            echo "  No name provided, using default: ${default_name}"
            custom_name="$default_name"
        fi
    else
        custom_name="$default_name"
    fi

    # Track the mapping
    alias_names["$default_name"]="$custom_name"

    # Check if alias already exists
    if grep -q "alias ${custom_name}=" ~/.bash_aliases 2>/dev/null; then
        read -p "  Alias '${custom_name}' already exists. Overwrite? [y/N] " overwrite
        overwrite=${overwrite:-N}
        if [[ "${overwrite,,}" != "y" ]]; then
            echo "  Skipped."
            echo
            continue
        fi
        # Remove existing alias
        sed -i "/alias ${custom_name}=/d" ~/.bash_aliases
    fi

    # Substitute alias references in the command
    final_command=$(substitute_refs "$command")

    add_alias "$custom_name" "$final_command" "$description"
    ((added_count++))
    echo
done

if [[ $added_count -gt 0 ]]; then
    echo "========================================"
    echo "Added ${added_count} alias(es) to ~/.bash_aliases"
    echo "Run 'source ~/.bash_aliases' or start a new shell to use them."
else
    echo "No aliases were added."
fi
