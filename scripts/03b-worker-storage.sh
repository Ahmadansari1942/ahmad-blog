#!/usr/bin/env bash
# Run on the WORKER node, as root:  sudo bash 03b-worker-storage.sh
# Creates the directories behind the local PersistentVolumes (k8s/base/mysql/storage.yaml).
# TIP: mount a separate EBS volume on /mnt/mysql-data BEFORE running this for safer data.
set -euo pipefail

mkdir -p /mnt/mysql-data /mnt/mysql-backup
chown 999:999 /mnt/mysql-data /mnt/mysql-backup   # uid/gid of the "mysql" user in the official image
chmod 750 /mnt/mysql-data /mnt/mysql-backup
ls -ld /mnt/mysql-data /mnt/mysql-backup
