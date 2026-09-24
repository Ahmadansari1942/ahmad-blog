#!/usr/bin/env bash
# Run on the MASTER. Creates the MySQL credentials Secret directly in the cluster —
# secrets are NEVER committed to git.
#
#   bash 05-create-secrets.sh                    # generates strong random passwords
#   MYSQL_ROOT_PASSWORD=... MYSQL_PASSWORD=... bash 05-create-secrets.sh
#
# Re-running with different values updates the Secret (then restart mysql + app pods).
set -euo pipefail

NAMESPACE="${NAMESPACE:-ahmad-blog}"
MYSQL_USER="${MYSQL_USER:-bloguser}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)}"

kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -

kubectl -n "${NAMESPACE}" create secret generic mysql-credentials \
  --from-literal=root-password="${MYSQL_ROOT_PASSWORD}" \
  --from-literal=username="${MYSQL_USER}" \
  --from-literal=password="${MYSQL_PASSWORD}" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Secret 'mysql-credentials' created in namespace '${NAMESPACE}'."
echo "Save these somewhere safe (password manager) — they are not stored in git:"
echo "  root password : ${MYSQL_ROOT_PASSWORD}"
echo "  ${MYSQL_USER} password : ${MYSQL_PASSWORD}"
echo
echo "IMPORTANT: MySQL only reads these on FIRST start (empty data dir)."
echo "Changing them later requires ALTER USER inside MySQL as well."
