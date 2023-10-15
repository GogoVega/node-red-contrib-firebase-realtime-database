#!/usr/bin/env bash

usage() {
  cat << EOL
Usage: $0 [options]

Options:
  --help              display this help and exit
  --flow-file         the file containing the flows, default: 'flows.json'
  --user-dir          the user directory containing the flows, default: '~/.node-red'
  --no-remove-backup  do not remove the backup file after migration
EOL
}

REMOVE_BACKUP=true
if [ $# -gt 0 ]; then
  # Parsing parameters
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --help)
        usage && exit 0
        shift
        ;;
      --flow-file) # the file containing the flows
        if [ -n "$2" ] && [ ${2:0:1} != "-" ]; then
          FLOW_FILE=$2
          shift 2
        else
          echo "Error: Argument for $1 is missing" >&2
          exit 1
        fi
        ;;
      --user-dir) # the user directory containing the flows
        if [ -n "$2" ] && [ ${2:0:1} != "-" ]; then
          USER_DIR=$2
          shift 2
        else
          echo "Error: Argument for $1 is missing" >&2
          exit 1
        fi
        ;;
      --no-remove-backup) # do not remove the backup file after migration
        REMOVE_BACKUP=false
        shift
        ;;
      --) # end argument parsing
        shift
        break
        ;;
      -*|--*=) # unsupported flags
        echo "Error: Unsupported flag $1" >&2
        exit 1
        ;;
    esac
  done
fi

# helper function to test for existance of node and npm
function HAS_NODE {
  if [ -x "$(command -v node)" ]; then return 0; else return 1; fi
}

echo "Welcome to the Migration Wizard!"
echo " "
echo "This script will help you to resolve the 'missing type' error."
echo " "
echo "It will start by backing up your current flow file to a file called 'migration.flows.json.backup'."
echo "Then it will analyze your flow file and attempt to resolve missing type errors."
echo "Finally, it will delete the backup of your flow file if the migration was successful."
echo " "
echo "You can ignore the backup deletion by using the --no-remove-backup option"
echo " "
echo "You can also specify the flow file to analyze using the --flow-file option, default: 'flows.json'"
echo " "
echo "And you can also specify the user directory containing the flows using the --user-dir option, default: '~/.node-red'"
echo " "
echo "See the optional parameters by re-running this command with --help"
echo " "
echo " "

if HAS_NODE; then
  : # Node.js is installed
else
  echo "Node.js is not installed!"
  echo -e "Please install Node.js and run the script again to continue.\r\n\r\n"
  exit 2
fi

[[ $FLOW_FILE ]] && FILE_NAME="$FLOW_FILE" || FILE_NAME="flows.json"

echo "The flow file that the script will analyze is: '$FILE_NAME' in the user directory: '$USER_DIR'"
echo " "

yn="${CONFIRM_INSTALL}"
[ ! "${yn}" ] && read -p "Are you really sure you want to do this ? [y/N] ? " yn
case $yn in
  [Yy]* )
  ;;
  * )
    echo " "
    exit 1
  ;;
esac

FLOW_FILE=$FLOW_FILE USER_DIR=$USER_DIR REMOVE_BACKUP=$REMOVE_BACKUP node ./scripts/migration-wizard.js

exit 0
