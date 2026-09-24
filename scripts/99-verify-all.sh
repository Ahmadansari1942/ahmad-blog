#!/usr/bin/env bash
# One-shot health check of the WHOLE project. Run on the MASTER:
#     DOMAIN=ahmadansari.site bash scripts/99-verify-all.sh
# Prints PASS/FAIL per check and exits non-zero if anything failed. Read-only — changes nothing.
set -uo pipefail
DOMAIN="${DOMAIN:-}"
PASS=0; FAIL=0; WARN=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
warn() { echo "  ⚠️  $1"; WARN=$((WARN+1)); }
section() { echo; echo "── $1"; }

prom_query() { # $1 = url-encoded PromQL -> prints the first sample value (empty if none)
  kubectl get --raw "/api/v1/namespaces/monitoring/services/kube-prometheus-stack-prometheus:9090/proxy/api/v1/query?query=$1" 2>/dev/null \
    | sed -n 's/.*"value":\[[^,]*,"\([0-9.]*\)"\].*/\1/p' | head -1
}

section "1. Kubernetes cluster"
NODES=$(kubectl get nodes --no-headers 2>/dev/null | wc -l)
NOTREADY=$(kubectl get nodes --no-headers 2>/dev/null | awk '$2!="Ready"' | wc -l)
[ "$NODES" -ge 2 ] && [ "$NOTREADY" -eq 0 ] && ok "$NODES nodes, all Ready" || bad "nodes: $NODES found, $NOTREADY not Ready"

section "2. ArgoCD applications (GitOps)"
APPS=$(kubectl -n argocd get applications -o jsonpath='{range .items[*]}{.metadata.name}{" "}{.status.sync.status}{" "}{.status.health.status}{"\n"}{end}' 2>/dev/null)
if [ -z "$APPS" ]; then bad "no ArgoCD applications found"; else
  while read -r name sync health; do
    if [ "$sync" = "Synced" ] && [ "$health" = "Healthy" ]; then ok "$name: Synced / Healthy"
    else bad "$name: $sync / $health"; fi
  done <<< "$APPS"
fi

section "3. Application (app tier + data tier)"
READY=$(kubectl -n ahmad-blog get deploy ahmad-blog -o jsonpath='{.status.readyReplicas}' 2>/dev/null)
[ "${READY:-0}" -ge 2 ] && ok "ahmad-blog: ${READY} replicas Ready" || bad "ahmad-blog: only ${READY:-0} replicas Ready"
MY=$(kubectl -n ahmad-blog get pod mysql-0 -o jsonpath='{.status.containerStatuses[0].ready}' 2>/dev/null)
[ "$MY" = "true" ] && ok "mysql-0 Ready" || bad "mysql-0 not Ready"
IMG=$(kubectl -n ahmad-blog get deploy ahmad-blog -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null)
echo "  ℹ️  running image: ${IMG}"
POSTS=$(kubectl -n ahmad-blog exec mysql-0 -- sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -N -B blog -e "SELECT COUNT(*) FROM posts;"' 2>/dev/null | tail -1)
[ "${POSTS:-0}" -ge 1 ] 2>/dev/null && ok "database has ${POSTS} posts" || bad "could not read posts from MySQL"
kubectl -n ahmad-blog get cronjob mysql-backup >/dev/null 2>&1 && ok "nightly backup CronJob exists" || bad "backup CronJob missing"
kubectl -n ahmad-blog get pvc data-mysql-0 -o jsonpath='{.status.phase}' 2>/dev/null | grep -q Bound && ok "MySQL volume Bound" || bad "MySQL volume not Bound"
NP=$(kubectl -n ahmad-blog get networkpolicy --no-headers 2>/dev/null | wc -l)
[ "$NP" -ge 6 ] && ok "$NP NetworkPolicies active" || bad "expected >=6 NetworkPolicies, found $NP"

if [ -n "$DOMAIN" ]; then
  section "4. Domain + HTTPS ($DOMAIN)"
  CERT=$(kubectl -n ahmad-blog get certificate ahmad-blog-tls -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null)
  [ "$CERT" = "True" ] && ok "certificate ahmad-blog-tls Ready (expires: $(kubectl -n ahmad-blog get certificate ahmad-blog-tls -o jsonpath='{.status.notAfter}' 2>/dev/null))" || bad "certificate not Ready"
  C=$(curl -s -o /dev/null -m 10 -w '%{http_code}' "https://$DOMAIN/" 2>/dev/null); [ "$C" = "200" ] && ok "https://$DOMAIN/ -> 200" || bad "https://$DOMAIN/ -> ${C:-no response}"
  C=$(curl -s -o /dev/null -m 10 -w '%{http_code}' "https://$DOMAIN/readyz" 2>/dev/null); [ "$C" = "200" ] && ok "/readyz -> 200 (app + DB ready)" || bad "/readyz -> ${C:-no response}"
  C=$(curl -s -o /dev/null -m 10 -w '%{http_code}' "https://$DOMAIN/metrics" 2>/dev/null); [ "$C" = "404" ] && ok "/metrics is NOT public (404)" || warn "/metrics returned ${C:-none} (expected 404)"
  C=$(curl -s -o /dev/null -m 10 -w '%{http_code}' "http://$DOMAIN/" 2>/dev/null)
  case "$C" in 301|308) ok "http -> https redirect active ($C)";; 200) warn "http still served without redirect (optional step 5 of the SSL guide)";; *) warn "http returned ${C:-no response}";; esac
else
  section "4. Domain + HTTPS"; warn "skipped — run with DOMAIN=yourdomain to check"
fi

section "5. Monitoring (Prometheus + Grafana)"
BADPODS=$(kubectl -n monitoring get pods --no-headers 2>/dev/null | awk '$3!="Running" && $3!="Completed"' | wc -l)
TOTPODS=$(kubectl -n monitoring get pods --no-headers 2>/dev/null | wc -l)
if [ "$TOTPODS" -eq 0 ]; then warn "monitoring namespace has no pods (monitoring not installed?)"; else
  [ "$BADPODS" -eq 0 ] && ok "$TOTPODS monitoring pods Running" || bad "$BADPODS of $TOTPODS monitoring pods not Running"
  UP=$(prom_query 'count(up%3D%3D1)'); DOWN=$(prom_query 'count(up%3D%3D0)')
  [ -n "$UP" ] && ok "Prometheus: ${UP} targets UP" || bad "could not query Prometheus"
  [ -z "$DOWN" ] && ok "Prometheus: no targets DOWN" || bad "Prometheus: ${DOWN} targets DOWN (Prometheus UI -> Status -> Targets)"
  APP=$(prom_query 'sum(up%7Bjob%3D%22ahmad-blog%22%7D)'); [ "${APP:-0}" = "2" ] && ok "both ahmad-blog pods are scraped" || warn "ahmad-blog targets UP: ${APP:-0} (expected 2)"
  kubectl -n monitoring get pvc >/dev/null 2>&1 && kubectl -n monitoring get pvc --no-headers 2>/dev/null | grep -q Bound && ok "Prometheus volume Bound" || warn "Prometheus volume not Bound"
fi

section "6. Resources"
kubectl top nodes 2>/dev/null | sed 's/^/  /' || warn "kubectl top failed (metrics-server?)"
echo "$(kubectl top nodes --no-headers 2>/dev/null | awk '{gsub("%","",$5); if ($5+0>90) print "high"}')" | grep -q high && warn "a node is above 90% memory — consider a bigger instance"

echo
echo "════════════════════════════════════════════"
echo "  PASS: $PASS   FAIL: $FAIL   WARN: $WARN"
echo "════════════════════════════════════════════"
[ "$FAIL" -eq 0 ] && echo "  🎉 Everything is working." || echo "  Something needs attention — see ❌ lines above and docs/DEPLOY.md (Troubleshooting)."
exit "$FAIL"
