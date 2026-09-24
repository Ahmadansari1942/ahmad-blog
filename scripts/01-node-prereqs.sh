#!/usr/bin/env bash
# Run on BOTH EC2 instances (master + worker), as root:  sudo bash 01-node-prereqs.sh
# Ubuntu 22.04 / 24.04. Installs containerd + kubeadm/kubelet/kubectl.
set -euo pipefail

K8S_VERSION="${K8S_VERSION:-v1.34}"   # minor version, e.g. v1.34 — must be identical on both nodes

echo ">>> [1/6] Disable swap"
swapoff -a
sed -i '/\sswap\s/ s/^/#/' /etc/fstab

echo ">>> [2/6] Kernel modules + sysctl"
cat >/etc/modules-load.d/k8s.conf <<EOT
overlay
br_netfilter
EOT
modprobe overlay
modprobe br_netfilter
cat >/etc/sysctl.d/99-k8s.conf <<EOT
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOT
sysctl --system >/dev/null

echo ">>> [3/6] Install containerd"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y containerd apt-transport-https ca-certificates curl gpg
mkdir -p /etc/containerd
containerd config default >/etc/containerd/config.toml
sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
systemctl restart containerd
systemctl enable containerd

echo ">>> [4/6] Add Kubernetes apt repo (${K8S_VERSION})"
mkdir -p /etc/apt/keyrings
curl -fsSL "https://pkgs.k8s.io/core:/stable:/${K8S_VERSION}/deb/Release.key" \
  | gpg --dearmor --yes -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/${K8S_VERSION}/deb/ /" \
  >/etc/apt/sources.list.d/kubernetes.list

echo ">>> [5/6] Install kubeadm, kubelet, kubectl"
apt-get update -y
apt-get install -y kubelet kubeadm kubectl
apt-mark hold kubelet kubeadm kubectl
systemctl enable kubelet

echo ">>> [6/6] Done. Hostname: $(hostname)  (must be unique per node)"
echo "Next: on the MASTER run 02-master-init.sh, on the WORKER wait for the join command."
