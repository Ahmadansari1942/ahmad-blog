#!/usr/bin/env bash
# Run ONLY on the MASTER (control-plane) node, as your normal user with sudo.
#   MASTER_PUBLIC_IP=<master elastic ip> bash 02-master-init.sh
set -euo pipefail

: "${MASTER_PUBLIC_IP:?Set MASTER_PUBLIC_IP=<public IP of the master>}"
POD_CIDR="${POD_CIDR:-10.244.0.0/16}"          # must match scripts/calico-installation.yaml
CALICO_VERSION="${CALICO_VERSION:-v3.32.2}"
MASTER_PRIVATE_IP="$(hostname -I | awk '{print $1}')"
HERE="$(cd "$(dirname "$0")" && pwd)"

echo ">>> kubeadm init (API server advertised on private IP ${MASTER_PRIVATE_IP}, cert valid for ${MASTER_PUBLIC_IP})"
sudo kubeadm init \
  --apiserver-advertise-address="${MASTER_PRIVATE_IP}" \
  --apiserver-cert-extra-sans="${MASTER_PUBLIC_IP}" \
  --pod-network-cidr="${POD_CIDR}"

echo ">>> kubectl config for $USER"
mkdir -p "$HOME/.kube"
sudo cp -f /etc/kubernetes/admin.conf "$HOME/.kube/config"
sudo chown "$(id -u):$(id -g)" "$HOME/.kube/config"

echo ">>> Installing Calico ${CALICO_VERSION}"
kubectl create -f "https://raw.githubusercontent.com/projectcalico/calico/${CALICO_VERSION}/manifests/tigera-operator.yaml"
kubectl wait --for=condition=Established crd/installations.operator.tigera.io --timeout=120s
kubectl create -f "${HERE}/calico-installation.yaml"

echo ">>> Waiting for the master node to become Ready (Calico pulling images, ~2-3 min)"
kubectl wait --for=condition=Ready node --all --timeout=600s

echo
echo "=============================================================="
echo " Master is ready. Run this on the WORKER node (as root/sudo):"
echo "=============================================================="
kubeadm token create --print-join-command
echo
echo "After the worker has joined (kubectl get nodes shows 2 nodes), continue with scripts/03a-label-worker.sh"
