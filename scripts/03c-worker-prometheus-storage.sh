#!/usr/bin/env bash
# Run on the WORKER node, as root:  sudo bash 03c-worker-prometheus-storage.sh
# Creates the directory behind the Prometheus PersistentVolume (k8s/platform/monitoring/storage.yaml).
set -euo pipefail
mkdir -p /mnt/prometheus-data
chown 1000:2000 /mnt/prometheus-data   # uid/gid the Prometheus pod runs as
chmod 775 /mnt/prometheus-data
ls -ld /mnt/prometheus-data
