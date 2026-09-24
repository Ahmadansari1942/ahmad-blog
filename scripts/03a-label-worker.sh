#!/usr/bin/env bash
# Run on the MASTER after the worker has joined.
#   WORKER_NODE_NAME=<name from 'kubectl get nodes'> bash 03a-label-worker.sh
set -euo pipefail
: "${WORKER_NODE_NAME:?Set WORKER_NODE_NAME (see: kubectl get nodes)}"

# Traefik, MySQL volumes and cert-manager are pinned to this label.
kubectl label node "${WORKER_NODE_NAME}" role=worker --overwrite
kubectl get nodes -L role
