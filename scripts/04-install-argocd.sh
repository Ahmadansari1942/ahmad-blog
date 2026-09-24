#!/usr/bin/env bash
# Run on the MASTER (kubectl configured).
set -euo pipefail
ARGOCD_VERSION="${ARGOCD_VERSION:-v3.4.9}"

kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -n argocd --server-side --force-conflicts \
  -f "https://raw.githubusercontent.com/argoproj/argo-cd/${ARGOCD_VERSION}/manifests/install.yaml"

echo ">>> Waiting for ArgoCD to be available"
kubectl -n argocd rollout status deploy/argocd-server --timeout=300s
kubectl -n argocd rollout status deploy/argocd-repo-server --timeout=300s
kubectl -n argocd rollout status statefulset/argocd-application-controller --timeout=300s

echo
echo "ArgoCD admin password:"
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d; echo
echo
echo "UI (from your laptop):"
echo "  ssh -L 8080:localhost:8080 ubuntu@<MASTER_IP>   # then on the master:"
echo "  kubectl -n argocd port-forward svc/argocd-server 8080:443"
echo "  open https://localhost:8080   (user: admin)"
echo
echo "Next: scripts/05-create-secrets.sh, then: kubectl apply -f argocd/bootstrap/root-app.yaml"
