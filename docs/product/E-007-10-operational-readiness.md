---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-007-10: Operational Readiness for Blockchain Adapters"
labels: ["development", "copilot", "operations", "monitoring", "T5"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **docs-agent** (documentation only).

---

## 1. Summary

Document operational readiness requirements for blockchain adapters, including deployment architecture, monitoring, alerting, runbooks for common failures, scaling strategy, and disaster recovery procedures.

---

## 2. Requirements

- Document deployment architecture (how adapters connect to main application)
- Define monitoring metrics (transaction success rate, latency, error rate)
- Create Grafana dashboard specification (or equivalent monitoring tool)
- Define alerting thresholds (adapter down, high error rate, slow responses)
- Document runbook for common failure scenarios
- Document scaling strategy (when to scale adapters horizontally)
- Document backup and disaster recovery for adapter keys
- Create operational readiness checklist

---

## 3. Acceptance Criteria (Testable)

- [ ] Operational documentation created at `docs/blockchain/adapter-operations.md`
- [ ] Deployment architecture documented:
  - How adapters connect to FanEngagement backend
  - Network topology (internal service mesh, load balancer, etc.)
  - Environment variables and configuration
  - Secrets management (keys, API keys)
- [ ] Monitoring metrics defined:
  - `blockchain_transactions_total{adapter, operation, status}`
  - `blockchain_transaction_duration_seconds{adapter, operation}`
  - `blockchain_rpc_errors_total{adapter, error_type}`
  - `blockchain_adapter_health{adapter}`
  - `blockchain_gas_used_total{adapter}` (Polygon only)
- [ ] Grafana dashboard JSON specification provided
- [ ] Alerting rules defined:
  - Critical: Adapter health check failing for >2 minutes
  - Critical: Transaction error rate >5% for >5 minutes
  - Warning: Transaction latency p95 >3s for >5 minutes
  - Warning: RPC error rate >1% for >5 minutes
- [ ] Runbook documented for scenarios:
  - Adapter container crashes
  - Blockchain RPC provider outage
  - Transaction failures (insufficient funds, invalid parameters)
  - Blockchain network congestion (high gas prices, slow confirmations)
  - Key compromise or rotation
- [ ] Scaling strategy documented:
  - Horizontal scaling triggers (CPU >70%, high request rate)
  - Vertical scaling considerations (memory for large transactions)
  - Auto-scaling configuration examples
- [ ] Backup and disaster recovery documented:
  - Key backup procedures (encrypted backups, multi-region)
  - Key rotation process
  - Recovery time objectives (RTO) and recovery point objectives (RPO)
- [ ] Operational readiness checklist provided (pre-production validation)

---

## 4. Constraints

- NO production code changes (documentation only)
- Documentation must be actionable (clear steps, commands, examples)
- Follow industry best practices for SRE and operations
- Align with existing FanEngagement operational patterns

---

## 5. Technical Notes (Optional)

**Deployment Architecture Diagram:**

```
                       Internet
                          │
                          ▼
                    ┌──────────┐
                    │ Ingress  │
                    │ (HTTPS)  │
                    └─────┬────┘
                          │
              ┌───────────┼───────────┐
              │                       │
              ▼                       ▼
       ┌─────────────┐         ┌─────────────┐
       │ FanEngage   │         │ Monitoring  │
       │ Backend API │         │ (Prometheus)│
       └──────┬──────┘         └─────────────┘
              │
    ┌─────────┼─────────┐
    │                   │
    ▼                   ▼
┌────────┐          ┌────────┐
│ Solana │          │Polygon │
│Adapter │          │Adapter │
│Service │          │Service │
└────┬───┘          └────┬───┘
     │                   │
     ▼                   ▼
  Solana              Polygon
  Network             Network
```

**Prometheus Metrics Example:**

```yaml
# Metrics exposed by adapters at /metrics
blockchain_transactions_total{adapter="solana", operation="create_organization", status="success"} 1523
blockchain_transactions_total{adapter="solana", operation="create_organization", status="failed"} 7
blockchain_transaction_duration_seconds{adapter="solana", operation="create_organization", quantile="0.95"} 1.234
blockchain_rpc_errors_total{adapter="solana", error_type="connection_timeout"} 12
blockchain_adapter_health{adapter="solana"} 1  # 1=healthy, 0=unhealthy
```

**Grafana Dashboard Panels:**

1. **Transaction Success Rate** (Gauge)
   - Query: `rate(blockchain_transactions_total{status="success"}[5m]) / rate(blockchain_transactions_total[5m])`
   - Threshold: Green >99%, Yellow 95-99%, Red <95%

2. **Transaction Latency** (Graph)
   - Query: `histogram_quantile(0.95, blockchain_transaction_duration_seconds)`
   - Show p50, p95, p99

3. **Error Rate** (Graph)
   - Query: `rate(blockchain_transactions_total{status="failed"}[5m])`
   - Alert if >5% for 5 minutes

4. **Adapter Health** (Singlestat)
   - Query: `blockchain_adapter_health`
   - Show 1=up, 0=down

5. **RPC Errors** (Table)
   - Query: `sum(blockchain_rpc_errors_total) by (adapter, error_type)`

**Alerting Rules (Prometheus AlertManager):**

```yaml
groups:
  - name: blockchain_adapters
    rules:
      - alert: AdapterDown
        expr: blockchain_adapter_health == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Blockchain adapter {{ $labels.adapter }} is down"
          description: "Adapter has been unhealthy for more than 2 minutes"
      
      - alert: HighErrorRate
        expr: |
          (
            rate(blockchain_transactions_total{status="failed"}[5m]) 
            / 
            rate(blockchain_transactions_total[5m])
          ) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate for {{ $labels.adapter }}"
          description: "Error rate is {{ $value | humanizePercentage }}"
      
      - alert: SlowTransactions
        expr: |
          histogram_quantile(0.95, blockchain_transaction_duration_seconds) > 3
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow transactions on {{ $labels.adapter }}"
          description: "P95 latency is {{ $value }}s"
```

**Runbook Examples:**

### Scenario 1: Adapter Container Crashes

**Symptoms:**
- Health check failing
- 503 errors from backend
- Alert: "AdapterDown"

**Diagnosis:**
```bash
# Check pod status
kubectl get pods -n fanengagement | grep adapter

# View logs
kubectl logs -n fanengagement deployment/solana-adapter --tail=100

# Check recent events
kubectl describe pod -n fanengagement <pod-name>
```

**Resolution:**
1. Review logs for error messages (OOM, panic, uncaught exception)
2. If OOM: Increase memory limits in deployment
3. If crash loop: Roll back to previous version
4. If configuration issue: Fix and redeploy

**Escalation:** If unable to resolve in 15 minutes, page on-call engineer

---

### Scenario 2: Blockchain RPC Provider Outage

**Symptoms:**
- "RPC connection timeout" errors
- High RPC error rate
- Transactions failing with network errors

**Diagnosis:**
```bash
# Check RPC provider status
curl https://status.alchemy.com  # or provider status page

# Test RPC connectivity from adapter
kubectl exec -n fanengagement deployment/solana-adapter -- curl $SOLANA_RPC_URL
```

**Resolution:**
1. Confirm RPC provider outage on status page
2. If confirmed outage: Switch to backup RPC provider (update env var, restart pod)
3. If provider healthy: Check firewall rules, network policies
4. Monitor transaction queue buildup during outage

**Prevention:** Configure multiple RPC providers with automatic failover

---

### Scenario 3: Key Compromise

**Symptoms:**
- Unauthorized transactions from adapter wallet
- Unexpected balance changes
- Security alert

**Immediate Actions:**
1. **Rotate keys immediately**
   ```bash
   # Generate new keypair
   solana-keygen new -o new-keypair.json
   
   # Update Kubernetes secret
   kubectl create secret generic blockchain-keys \
     --from-file=solana-keypair=new-keypair.json \
     --dry-run=client -o yaml | kubectl apply -f -
   
   # Restart adapters to pick up new key
   kubectl rollout restart deployment/solana-adapter
   ```

2. **Audit recent transactions**
3. **Notify security team**
4. **Review access logs**

**Post-Incident:**
- Investigate how compromise occurred
- Update key management procedures
- Consider hardware security module (HSM)

---

**Scaling Strategy:**

**Horizontal Scaling (Add More Pods):**
- Trigger: CPU >70% for 5 minutes
- Trigger: Request rate >100 req/s per pod
- Max replicas: 10
- Configuration:
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: solana-adapter-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: solana-adapter
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

**Vertical Scaling (More Resources):**
- If memory usage >80%, increase memory limits
- If transaction size increases, adjust CPU limits

---

**Key Backup and Recovery:**

**Backup Procedure:**
```bash
# Encrypt keypair with GPG
gpg --symmetric --cipher-algo AES256 solana-keypair.json

# Store encrypted backup in multiple locations:
# 1. AWS S3 (encrypted bucket)
# 2. Azure Key Vault
# 3. Offline encrypted USB drive (secure location)
```

**Recovery Procedure:**
```bash
# Retrieve encrypted backup
aws s3 cp s3://fanengagement-backups/solana-keypair.json.gpg .

# Decrypt
gpg --decrypt solana-keypair.json.gpg > solana-keypair.json

# Update Kubernetes secret
kubectl create secret generic blockchain-keys \
  --from-file=solana-keypair=solana-keypair.json \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart adapters
kubectl rollout restart deployment/solana-adapter
```

**Disaster Recovery:**
- RTO (Recovery Time Objective): <30 minutes
- RPO (Recovery Point Objective): <1 hour (last backup)

---

**Operational Readiness Checklist:**

- [ ] Adapters deployed to staging environment
- [ ] Health checks returning 200 OK
- [ ] Metrics endpoint accessible at `/metrics`
- [ ] Grafana dashboard imported and functional
- [ ] Alerting rules configured in Prometheus
- [ ] PagerDuty (or equivalent) integration configured
- [ ] Runbooks reviewed by on-call team
- [ ] Key backups created and stored securely
- [ ] Load testing completed (target: 50 req/s per adapter)
- [ ] Failover testing completed (kill pod, verify recovery)
- [ ] RPC provider failover tested
- [ ] Security review completed (key management, API authentication)
- [ ] Documentation reviewed and approved
- [ ] Go/no-go decision made by engineering lead

---

## 6. Desired Agent

- [x] **docs-agent** (documentation only, operational guides)

---

## 7. Files Allowed to Change

**Documentation:**
- `docs/blockchain/adapter-operations.md` (primary deliverable)

**Optional (examples):**
- `docs/blockchain/grafana-dashboard.json` (example dashboard)
- `docs/blockchain/prometheus-alerts.yaml` (example alert rules)

---

## 8. Completion Criteria

- Comprehensive operational documentation created
- Deployment architecture clearly diagrammed
- Monitoring and alerting fully specified
- Runbooks actionable and tested
- Scaling strategy documented with examples
- Key backup and DR procedures defined
- Operational readiness checklist provided
- Ready for production deployment review
