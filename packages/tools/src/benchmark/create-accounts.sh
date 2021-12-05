#!/usr/bin/env bash

# Usage:
# sh create-batch-of-accounts.sh 2

# http://redsymbol.net/articles/unofficial-bash-strict-mode/
set -euo pipefail 

echo "$1 accounts will be created.\n"
for ((i = 0 ; i < $1 ; i++)); do
  LOCK_ARG=$(echo "\n\n" | ckb-cli --no-sync account new | grep "lock_arg:" | sed 's/lock_arg: //g')
  echo "\n" | ckb-cli account export --extended-privkey-path tmpKey --lock-arg $LOCK_ARG
  privKey=$(head -n1 tmpKey)
  echo "\"${privKey}\"," >> privKeys
  rm tmpKey
done
