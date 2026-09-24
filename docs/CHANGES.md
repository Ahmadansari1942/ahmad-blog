# What was added / changed / removed

## Removed from the old repo (`git rm`)
| File | Why |
|---|---|
| `index.ejs`, `post.ejs`, `styles.css`, `posts.js` (repo root) | Duplicates of `views/`, `public/`, `data/posts.js` (root `posts.js` was an *older* copy) |
| `data/posts.json` | Unused copy of `posts.js` |
| `dockerignore`, `gitignore` | Missing the leading dot, so Docker/Git ignored them. Replaced by `.dockerignore` / `.gitignore` |
| `Dockerrun.aws` | Elastic Beanstalk config — conflicts with the Kubernetes deployment |
| `buildspec.yml` | CodeBuild/ECR pipeline — replaced by GitHub Actions + ArgoCD |
| `.github/workflows/deploy.yml` | Deployed to ECS with `:latest` — replaced by `ci-cd.yml` |

## Changed
- `server.js` split into `app.js` + `server.js` + `lib/`; MySQL data tier; `/healthz`, `/readyz`, Prometheus metrics on a private port (9100); graceful shutdown; helmet; JSON logs; real 404 page (`views/404.ejs` was referenced but missing).
- `package.json`: added `mysql2`, `helmet`, `prom-client`, tests, `engines`. Regenerate the lock file: `npm install`.
- `Dockerfile`: multi-stage, `npm ci`, Node 22, HEALTHCHECK, non-root.
- `README.md`: new architecture + deployment section.

## Added
- `k8s/` — Kustomize base + `overlays/prod` (Deployment, Service, Ingress, HPA, PDB, NetworkPolicies, MySQL StatefulSet, local storage, nightly backup CronJob)
- `argocd/` — app-of-apps bootstrap, 2 AppProjects, apps for Traefik, metrics-server, the blog; optional monitoring + cert-manager
- `scripts/` — kubeadm bootstrap for master/worker, Calico, ArgoCD, secrets
- `.github/workflows/ci-cd.yml` — test → build → Trivy → push `:<sha>` → GitOps tag bump
- `test/` — 9 tests

## Things I noticed but did NOT change
- `data/posts.js` post #1 title is "Building **ASADFG Assume** Scalable Node.js Applications" — looks like an accidental edit.
- The existing Docker Hub image name (`ahmadansari19/ahmad-blog`) is kept; change `IMAGE` in `ci-cd.yml` and `images.name` in `k8s/overlays/prod/kustomization.yaml` together if you rename it.
