#!/usr/bin/env bash
# Run on the MASTER. Creates the Grafana admin login as a Secret (never stored in git).
#   bash 06-create-monitoring-secret.sh                      # random password
#   GRAFANA_ADMIN_PASSWORD='MyStrongPass' bash 06-create-monitoring-secret.sh
set -euo pipefail

GRAFANA_ADMIN_USER="${GRAFANA_ADMIN_USER:-admin}"
GRAFANA_ADMIN_PASSWORD="${GRAFANA_ADMIN_PASSWORD:-$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-20)}"

kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
kubectl -n monitoring create secret generic grafana-admin \
  --from-literal=admin-user="${GRAFANA_ADMIN_USER}" \
  --from-literal=admin-password="${GRAFANA_ADMIN_PASSWORD}" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Secret 'grafana-admin' created in namespace 'monitoring'."
echo "Grafana login  ->  user: ${GRAFANA_ADMIN_USER}   password: ${GRAFANA_ADMIN_PASSWORD}"
echo "(save it in a password manager — it is not stored in git)"
