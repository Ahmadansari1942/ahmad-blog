# Production deployment guide — kubeadm on EC2 + ArgoCD (GitOps)

```
                       ┌──────────────────────── EC2 #2: WORKER ─────────────────────────┐
 Internet ──:80/443──▶ │  Traefik (hostPort)  ──▶  ahmad-blog (Node/Express) x2  ──▶  MySQL 8.4 (StatefulSet)
                       │   WEB tier                    APP tier                          DATA tier
                       └─────────────────────────────────────────────────────────────────┘
                       ┌──────────────────────── EC2 #1: MASTER ─────────────────────────┐
                       │  kube-apiserver / etcd / scheduler   (control plane only, tainted)
                       └─────────────────────────────────────────────────────────────────┘

 git push ─▶ GitHub Actions: test ─▶ build ─▶ Trivy scan ─▶ push image :<sha> ─▶ commit new tag into k8s/overlays/prod
                                                                                          │
                                                       ArgoCD (in cluster) watches git ◀──┘  ─▶ rolls out the new version
```

Everything after the one-time bootstrap is **git-driven**: you never run `kubectl apply` for the app again.

---

## 0. What you need

| Item | Recommendation |
|---|---|
| 2 × EC2, Ubuntu 22.04/24.04 | Master: **t3.medium** (t3.small is the minimum). Worker: **t3.medium** (4 GB) minimum, **t3.large** if you add monitoring. 30 GB gp3 disks. |
| Elastic IPs on both | Otherwise the public IPs change on every stop/start and the API-server certificate no longer matches. |
| Docker Hub repo `ahmadansari19/ahmad-blog` | Keep it **public** (or add an `imagePullSecret`). |
| GitHub repo secrets | `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` |
| GitHub → Settings → Actions → General → *Workflow permissions* | **Read and write** (CI commits the new image tag) |

### Security group (attach the same SG to both instances, or split master/worker)

| Port | Source | Why |
|---|---|---|
| 22/TCP | **your IP only** | SSH |
| 80, 443/TCP | 0.0.0.0/0 (worker only) | public web traffic (Traefik) |
| 6443/TCP | your IP only (optional) | run `kubectl` from your laptop |
| **All traffic** | **the SG itself** | node↔node: kubelet 10250, etcd, Calico VXLAN (UDP 4789), pod traffic |

Do **not** open 3000, 3306 or 30000-32767 to the internet.

---

## 1. Add this to the repo and push

Copy the new files over your repo, delete the obsolete ones (see `docs/CHANGES.md`), then:

```bash
git add -A && git commit -m "production: three-tier + kubernetes + argocd" && git push origin main
```

This triggers CI once: it builds the new image (with MySQL support + `/readyz`) and pushes `ahmadansari19/ahmad-blog:<sha>` and `:latest`. **Wait for the green check before step 9.**

---

## 2. Prepare BOTH nodes

```bash
git clone https://github.com/Ahmadansari1942/ahmad-blog.git && cd ahmad-blog
sudo bash scripts/01-node-prereqs.sh          # containerd + kubeadm/kubelet/kubectl (default v1.34)
```
Use a different minor version with `K8S_VERSION=v1.35 sudo -E bash scripts/01-node-prereqs.sh` — but the same on both nodes.

## 3. Master: create the cluster

```bash
MASTER_PUBLIC_IP=<master-elastic-ip> bash scripts/02-master-init.sh
```
This runs `kubeadm init`, installs Calico (CNI + NetworkPolicy) and prints a `kubeadm join …` command.

## 4. Worker: join

Paste the printed command on the worker with `sudo`. Then on the master:

```bash
kubectl get nodes          # both should be Ready
```

## 5. Label the worker + create storage directories

```bash
# master
WORKER_NODE_NAME=<name from kubectl get nodes> bash scripts/03a-label-worker.sh
# worker  (optional but recommended: mount a dedicated EBS volume on /mnt/mysql-data first)
sudo bash scripts/03b-worker-storage.sh
```

## 6. Install ArgoCD + create the DB secret (master)

```bash
bash scripts/04-install-argocd.sh     # prints the admin password
bash scripts/05-create-secrets.sh     # random MySQL passwords -> Secret "mysql-credentials" (never in git)
```
Save the printed passwords in a password manager.

*If the GitHub repo is private:* `argocd repo add https://github.com/Ahmadansari1942/ahmad-blog.git --username <user> --password <PAT>`.

## 7. Hand the cluster to GitOps

```bash
kubectl apply -f argocd/bootstrap/root-app.yaml
kubectl -n argocd get applications -w
```
The root app creates, in order: the AppProjects → **Traefik** + **metrics-server** → **ahmad-blog** (MySQL, app, ingress, HPA, NetworkPolicies, backup job).

## 8. Verify

```bash
kubectl -n ahmad-blog get pods,svc,ingress,pvc
kubectl -n traefik get pods -o wide            # must be on the worker
curl -i http://<WORKER_PUBLIC_IP>/             # 200, the blog
curl -i http://<WORKER_PUBLIC_IP>/readyz       # 200 {"status":"ready"}
kubectl top pods -A                            # metrics-server works
```

---

## Day-2 operations

**Deploy a new version** — just `git push` to `main`. CI builds `:<sha>`, commits it to `k8s/overlays/prod/kustomization.yaml`, ArgoCD rolls it out with zero downtime (`maxUnavailable: 0`, readiness gates).

**Roll back** — `git revert` the `deploy: ahmad-blog <sha>` commit and push. ArgoCD rolls back automatically.

**ArgoCD UI**
```bash
ssh -L 8080:localhost:8080 ubuntu@<MASTER_IP>
kubectl -n argocd port-forward svc/argocd-server 8080:443     # then open https://localhost:8080
```
After the first login change the admin password and delete `argocd-initial-admin-secret`.

**Backups** — a CronJob dumps the DB every night at 02:00 to `/mnt/mysql-backup` on the worker (last 7 kept).
```bash
kubectl -n ahmad-blog create job --from=cronjob/mysql-backup backup-now     # run one now
kubectl -n ahmad-blog logs job/backup-now
```
Restore:
```bash
# on the worker:   gunzip -c /mnt/mysql-backup/blog-<timestamp>.sql.gz > /tmp/restore.sql   (scp it to the master)
kubectl -n ahmad-blog exec -i mysql-0 -- sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" blog' < restore.sql
```

**Optional add-ons**
- Monitoring (Prometheus + Grafana): `kubectl apply -f argocd/optional/monitoring.yaml`, then `kubectl apply -f k8s/optional/servicemonitor.yaml`.
- HTTPS: needs a domain → `argocd/optional/cert-manager.yaml`, then `k8s/optional/tls/`.

---

## Honest limitations (what "production" means on 2 EC2s)

- **Single control-plane node** — if the master dies the *running* app keeps serving, but you can't deploy/scale until it's back. Take etcd snapshots (`sudo ETCDCTL_API=3 etcdctl snapshot save …`) or EBS snapshots of the master.
- **Single MySQL instance on one node's disk** — no replication. The nightly dump is on the *same* node; copy it off-node (e.g. `aws s3 sync /mnt/mysql-backup s3://<bucket>/`) and schedule EBS snapshots of `/mnt/mysql-data`.
- **One worker** — the 2 app replicas protect against pod crashes and deploys, not against the worker dying.
- **HTTP only** until you attach a domain and enable cert-manager.
- Pin GitHub Actions to commit SHAs and enable Dependabot/Renovate for images and charts.

Upgrade path when you outgrow this: managed MySQL (RDS), more workers, 3 control-plane nodes or EKS — the manifests stay the same, only the `DB_HOST`/storage change.

---

## Troubleshooting

| Symptom | Check |
|---|---|
| `mysql-0` Pending | Worker not labelled (`kubectl get nodes -L role`) or dirs missing (`03b`). `kubectl describe pod mysql-0` |
| `mysql-0` CrashLoop: *Permission denied* | `sudo chown 999:999 /mnt/mysql-data` on the worker; wipe `/mnt/mysql-data/*` if a failed first init left junk |
| App pods `0/1 Running` | Normal until MySQL is up (`/readyz` = DB). `kubectl -n ahmad-blog logs deploy/ahmad-blog` |
| `ImagePullBackOff` | CI hasn't finished / Docker Hub repo private / tag wrong in `kustomization.yaml` |
| Site not reachable on :80 | SG port 80? `kubectl -n traefik get pods -o wide` (on worker?). hostPort needs Calico's portmap — fallback: set Traefik `service.spec.type: NodePort`, use `ports.web.nodePort: 30080` and open 30080 |
| `kubectl top` fails | metrics-server app synced? `kubectl -n kube-system logs deploy/metrics-server` |
| App can't reach DB after adding pods/policies | NetworkPolicies in `k8s/base/networkpolicy.yaml` — `kubectl describe netpol -n ahmad-blog` |
| ArgoCD *OutOfSync* on PV | Expected once for `claimRef` defaults — sync again |
