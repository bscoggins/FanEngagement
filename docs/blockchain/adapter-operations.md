# Blockchain Adapter Operational Readiness Guide

> **Document Type:** Operational Guide  
> **Epic:** E-007 - Blockchain Adapter Platform  
> **Issue:** E-007-10 - Operational Readiness for Blockchain Adapters  
> **Status:** Complete  
> **Last Updated:** December 2024

## Executive Summary

This document provides comprehensive operational readiness guidance for deploying, monitoring, and maintaining blockchain adapters in production. It covers deployment architecture, monitoring and alerting configuration, runbooks for common failure scenarios, scaling strategies, and disaster recovery procedures.

**Target Audience:**
- Site Reliability Engineers (SREs)
- DevOps Engineers
- On-call Engineers
- Platform Operators

**Key Operational Requirements:**
- **Availability:** 99.9% uptime target
- **Latency:** P95 transaction latency < 3 seconds
- **Error Rate:** < 1% transaction failures under normal conditions
- **Recovery Time Objective (RTO):** < 30 minutes
- **Recovery Point Objective (RPO):** < 1 hour

---

## Table of Contents

1. [Deployment Architecture](#1-deployment-architecture)
2. [Monitoring Metrics](#2-monitoring-metrics)
3. [Grafana Dashboard Specification](#3-grafana-dashboard-specification)
4. [Alerting Rules](#4-alerting-rules)
5. [Runbooks](#5-runbooks)
6. [Scaling Strategy](#6-scaling-strategy)
7. [Backup and Disaster Recovery](#7-backup-and-disaster-recovery)
8. [Operational Readiness Checklist](#8-operational-readiness-checklist)
9. [Troubleshooting Guide](#9-troubleshooting-guide)
10. [References](#10-references)

---

## 1. Deployment Architecture

### 1.1 Architecture Overview

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

### 1.2 Network Topology

**Kubernetes Cluster Architecture:**

- **Namespace:** `fanengagement`
- **Network Policy:** Internal service mesh, no direct external access
- **Load Balancer:** ClusterIP services (internal only)
- **TLS:** mTLS via service mesh (Istio/Linkerd) or manual certificates

**Service Endpoints:**
- Solana Adapter: `http://solana-adapter.fanengagement.svc.cluster.local:80`
- Polygon Adapter: `http://polygon-adapter.fanengagement.svc.cluster.local:80`
- Backend API: `http://fanengagement-backend.fanengagement.svc.cluster.local:80`

### 1.3 Component Details

#### 1.3.1 Solana Adapter

**Container Image:** `ghcr.io/bscoggins/fanengagement-solana-adapter:latest`

**Replicas:** 2 (minimum for high availability)

**Resource Allocation:**
- **Requests:** CPU: 100m, Memory: 256Mi
- **Limits:** CPU: 500m, Memory: 512Mi

**Ports:**
- Container Port: 3001
- Service Port: 80

**Health Checks:**
- **Liveness:** `/v1/adapter/health` (initial delay: 15s, period: 30s)
- **Readiness:** `/v1/adapter/health` (initial delay: 5s, period: 10s)

#### 1.3.2 Polygon Adapter

**Container Image:** `ghcr.io/bscoggins/fanengagement-polygon-adapter:latest`

**Replicas:** 2 (minimum for high availability)

**Resource Allocation:**
- **Requests:** CPU: 100m, Memory: 256Mi
- **Limits:** CPU: 500m, Memory: 512Mi

**Ports:**
- Container Port: 3002
- Service Port: 80

**Health Checks:**
- **Liveness:** `/v1/adapter/health` (initial delay: 15s, period: 30s)
- **Readiness:** `/v1/adapter/health` (initial delay: 5s, period: 10s)

### 1.4 Environment Variables

#### Required Configuration

**Solana Adapter:**
```bash
NODE_ENV=production
PORT=3001
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com  # or your preferred RPC provider
LOG_LEVEL=info
SOLANA_NETWORK=mainnet-beta  # or devnet/testnet
```

**Polygon Adapter:**
```bash
NODE_ENV=production
PORT=3002
POLYGON_RPC_URL=https://polygon-rpc.com  # or your preferred RPC provider
LOG_LEVEL=info
POLYGON_NETWORK=mainnet  # or mumbai testnet
```

### 1.5 Secrets Management

**Critical:** Private keys and API keys must be stored securely.

**Kubernetes Secrets:**
```bash
# Create secrets for blockchain adapters
kubectl create secret generic blockchain-adapters \
  --namespace=fanengagement \
  --from-literal=solana-private-key='<base64-encoded-keypair>' \
  --from-literal=polygon-private-key='<hex-encoded-private-key>' \
  --from-literal=adapter-api-key='<secure-random-string>'
```

**Best Practices:**
- Use external secrets management (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault)
- Rotate keys regularly (quarterly minimum)
- Never commit secrets to git
- Use separate keys for dev/staging/production
- Encrypt secrets at rest

**Environment Variable References in Deployment:**
```yaml
env:
- name: SOLANA_PRIVATE_KEY
  valueFrom:
    secretKeyRef:
      name: blockchain-adapters
      key: solana-private-key
- name: API_KEY
  valueFrom:
    secretKeyRef:
      name: blockchain-adapters
      key: adapter-api-key
```

---

## 2. Monitoring Metrics

### 2.1 Prometheus Metrics

All blockchain adapters expose metrics at `/metrics` endpoint in Prometheus format.

#### 2.1.1 Transaction Metrics

**Counter: `blockchain_transactions_total`**

Tracks total number of blockchain transactions submitted.

**Labels:**
- `adapter`: Adapter name (solana, polygon)
- `operation`: Operation type (create_organization, create_share_type, vote, etc.)
- `status`: Transaction status (success, failed)

**Example:**
```prometheus
blockchain_transactions_total{adapter="solana", operation="vote", status="success"} 1523
blockchain_transactions_total{adapter="solana", operation="vote", status="failed"} 7
blockchain_transactions_total{adapter="polygon", operation="create_organization", status="success"} 42
```

**Histogram: `blockchain_transaction_duration_seconds`**

Tracks transaction duration as a histogram.

**Labels:**
- `adapter`: Adapter name
- `operation`: Operation type

**Buckets:** 0.1, 0.5, 1, 2, 3, 5, 10, 30 seconds

**Example:**
```prometheus
blockchain_transaction_duration_seconds_bucket{adapter="solana", operation="vote", le="1"} 1200
blockchain_transaction_duration_seconds_bucket{adapter="solana", operation="vote", le="2"} 1450
blockchain_transaction_duration_seconds_bucket{adapter="solana", operation="vote", le="3"} 1480
blockchain_transaction_duration_seconds_sum{adapter="solana", operation="vote"} 1834.5
blockchain_transaction_duration_seconds_count{adapter="solana", operation="vote"} 1530
```

#### 2.1.2 RPC Error Metrics

**Counter: `blockchain_rpc_errors_total`**

Tracks RPC errors from blockchain providers.

**Labels:**
- `adapter`: Adapter name
- `error_type`: Error classification (connection_timeout, rate_limited, invalid_params, network_error)

**Example:**
```prometheus
blockchain_rpc_errors_total{adapter="solana", error_type="connection_timeout"} 12
blockchain_rpc_errors_total{adapter="polygon", error_type="rate_limited"} 5
```

#### 2.1.3 Health Metrics

**Gauge: `blockchain_adapter_health`**

Indicates adapter health status.

**Labels:**
- `adapter`: Adapter name

**Values:**
- `1`: Healthy (RPC connected, can process transactions)
- `0`: Unhealthy (RPC disconnected or critical error)

**Example:**
```prometheus
blockchain_adapter_health{adapter="solana"} 1
blockchain_adapter_health{adapter="polygon"} 1
```

#### 2.1.4 Gas Metrics (Polygon Only)

**Counter: `blockchain_gas_used_total`**

Tracks total gas consumed by transactions (Polygon only).

**Labels:**
- `adapter`: Always "polygon"
- `operation`: Operation type

**Example:**
```prometheus
blockchain_gas_used_total{adapter="polygon", operation="vote"} 245000
blockchain_gas_used_total{adapter="polygon", operation="create_share_type"} 1200000
```

### 2.2 Standard Kubernetes Metrics

In addition to custom metrics, monitor standard Kubernetes metrics:

**Pod Metrics:**
- `container_cpu_usage_seconds_total`
- `container_memory_working_set_bytes`
- `container_network_receive_bytes_total`
- `container_network_transmit_bytes_total`

**Deployment Metrics:**
- `kube_deployment_status_replicas`
- `kube_deployment_status_replicas_available`
- `kube_deployment_status_replicas_unavailable`

**Service Metrics:**
- `kube_service_info`
- `kube_endpoint_address_available`

### 2.3 Metrics Collection

**Prometheus ServiceMonitor:**

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: blockchain-adapters
  namespace: fanengagement
  labels:
    app: blockchain-adapter
spec:
  selector:
    matchLabels:
      component: blockchain-adapter
  endpoints:
  - port: http
    path: /metrics
    interval: 30s
    scrapeTimeout: 10s
```

---

## 3. Grafana Dashboard Specification

### 3.1 Dashboard Overview

**Dashboard Name:** Blockchain Adapters - Operations

**Purpose:** Centralized view of adapter health, performance, and errors

**Refresh Rate:** 30 seconds

**Time Range:** Last 1 hour (adjustable)

### 3.2 Dashboard Panels

#### Panel 1: Transaction Success Rate (Gauge)

**Type:** Gauge

**Query:**
```promql
rate(blockchain_transactions_total{status="success"}[5m]) 
/ 
rate(blockchain_transactions_total[5m])
```

**Thresholds:**
- Green: > 99%
- Yellow: 95-99%
- Red: < 95%

**Unit:** Percent (0-100)

**Description:** Shows the percentage of successful transactions over the last 5 minutes.

---

#### Panel 2: Transaction Latency (Graph)

**Type:** Time series graph

**Queries:**
```promql
# P50 latency
histogram_quantile(0.50, rate(blockchain_transaction_duration_seconds_bucket[5m]))

# P95 latency
histogram_quantile(0.95, rate(blockchain_transaction_duration_seconds_bucket[5m]))

# P99 latency
histogram_quantile(0.99, rate(blockchain_transaction_duration_seconds_bucket[5m]))
```

**Legend:**
- P50 (blue)
- P95 (yellow)
- P99 (red)

**Unit:** Seconds

**Y-axis:** Log scale recommended for better visualization

---

#### Panel 3: Error Rate (Graph)

**Type:** Time series graph

**Query:**
```promql
rate(blockchain_transactions_total{status="failed"}[5m])
```

**Legend:** By adapter

**Unit:** Errors per second

**Alert Line:** Show horizontal line at 5% threshold

---

#### Panel 4: Adapter Health (Singlestat)

**Type:** Stat panel

**Query:**
```promql
blockchain_adapter_health
```

**Display:**
- 1 = "UP" (green)
- 0 = "DOWN" (red)

**One panel per adapter** (Solana, Polygon)

---

#### Panel 5: RPC Errors by Type (Table)

**Type:** Table

**Query:**
```promql
sum(increase(blockchain_rpc_errors_total[1h])) by (adapter, error_type)
```

**Columns:**
- Adapter
- Error Type
- Count (last hour)

**Sorting:** By count descending

---

#### Panel 6: Requests Per Second (Graph)

**Type:** Time series graph

**Query:**
```promql
sum(rate(blockchain_transactions_total[5m])) by (adapter)
```

**Legend:** By adapter

**Unit:** Requests per second

---

#### Panel 7: Pod CPU Usage (Graph)

**Type:** Time series graph

**Query:**
```promql
sum(rate(container_cpu_usage_seconds_total{namespace="fanengagement", pod=~".*-adapter.*"}[5m])) by (pod)
```

**Legend:** By pod

**Unit:** CPU cores

---

#### Panel 8: Pod Memory Usage (Graph)

**Type:** Time series graph

**Query:**
```promql
sum(container_memory_working_set_bytes{namespace="fanengagement", pod=~".*-adapter.*"}) by (pod)
```

**Legend:** By pod

**Unit:** Bytes (auto-scale to MB/GB)

---

#### Panel 9: Gas Used (Polygon Only) (Counter)

**Type:** Stat panel

**Query:**
```promql
sum(increase(blockchain_gas_used_total{adapter="polygon"}[1h]))
```

**Unit:** Gas

**Description:** Total gas consumed in the last hour

---

#### Panel 10: Active Replicas (Stat)

**Type:** Stat panel

**Query:**
```promql
kube_deployment_status_replicas_available{namespace="fanengagement", deployment=~".*-adapter"}
```

**Display:** By deployment

**Threshold:**
- Green: >= 2 replicas
- Yellow: 1 replica
- Red: 0 replicas

---

### 3.3 Dashboard JSON Template

A complete Grafana dashboard JSON template is provided in:
- **File:** `docs/blockchain/grafana-dashboard.json`

**Import Instructions:**
1. Log into Grafana
2. Navigate to Dashboards > Import
3. Upload `grafana-dashboard.json`
4. Select Prometheus data source
5. Click Import

---

## 4. Alerting Rules

### 4.1 Prometheus AlertManager Configuration

The following alerting rules should be configured in Prometheus AlertManager.

**File:** `docs/blockchain/prometheus-alerts.yaml`

### 4.2 Critical Alerts

#### Alert: AdapterDown

**Description:** Adapter health check has been failing for more than 2 minutes.

**Severity:** Critical

**Expression:**
```promql
blockchain_adapter_health == 0
```

**Duration:** 2 minutes

**Annotations:**
- **Summary:** "Blockchain adapter {{ $labels.adapter }} is down"
- **Description:** "Adapter has been unhealthy for more than 2 minutes. Check pod status and logs."

**Actions:**
- Page on-call engineer immediately
- Follow runbook: "Adapter Container Crashes"

---

#### Alert: HighTransactionErrorRate

**Description:** Transaction error rate exceeds 5% for more than 5 minutes.

**Severity:** Critical

**Expression:**
```promql
(
  rate(blockchain_transactions_total{status="failed"}[5m]) 
  / 
  rate(blockchain_transactions_total[5m])
) > 0.05
```

**Duration:** 5 minutes

**Annotations:**
- **Summary:** "High error rate for {{ $labels.adapter }}"
- **Description:** "Error rate is {{ $value | humanizePercentage }}. Check RPC provider status and blockchain network health."

**Actions:**
- Alert on-call engineer
- Follow runbook: "High Transaction Error Rate"

---

### 4.3 Warning Alerts

#### Alert: SlowTransactions

**Description:** P95 transaction latency exceeds 3 seconds for more than 5 minutes.

**Severity:** Warning

**Expression:**
```promql
histogram_quantile(0.95, rate(blockchain_transaction_duration_seconds_bucket[5m])) > 3
```

**Duration:** 5 minutes

**Annotations:**
- **Summary:** "Slow transactions on {{ $labels.adapter }}"
- **Description:** "P95 latency is {{ $value }}s. Check blockchain network congestion and RPC provider performance."

**Actions:**
- Alert on-call engineer (non-urgent)
- Monitor for escalation
- Follow runbook: "Blockchain Network Congestion"

---

#### Alert: ElevatedRPCErrorRate

**Description:** RPC error rate exceeds 1% for more than 5 minutes.

**Severity:** Warning

**Expression:**
```promql
(
  rate(blockchain_rpc_errors_total[5m]) 
  / 
  rate(blockchain_transactions_total[5m])
) > 0.01
```

**Duration:** 5 minutes

**Annotations:**
- **Summary:** "Elevated RPC error rate for {{ $labels.adapter }}"
- **Description:** "RPC error rate is {{ $value | humanizePercentage }}. Check RPC provider status page."

**Actions:**
- Monitor for escalation
- Check RPC provider status
- Consider failover to backup RPC provider

---

### 4.4 Alert Routing

**PagerDuty Integration:**

```yaml
route:
  receiver: 'default'
  group_by: ['alertname', 'adapter']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  routes:
  - match:
      severity: critical
    receiver: pagerduty-critical
    continue: true
  - match:
      severity: warning
    receiver: slack-warnings

receivers:
- name: 'default'
  slack_configs:
  - api_url: '<slack-webhook-url>'
    channel: '#fanengagement-alerts'
    
- name: 'pagerduty-critical'
  pagerduty_configs:
  - service_key: '<pagerduty-integration-key>'
    severity: 'critical'
    
- name: 'slack-warnings'
  slack_configs:
  - api_url: '<slack-webhook-url>'
    channel: '#fanengagement-warnings'
```


---

## 5. Runbooks

### 5.1 Runbook: Adapter Container Crashes

**Symptoms:**
- Health check failing
- 503 errors from backend API
- Alert: "AdapterDown"
- Pods in CrashLoopBackOff state

**Diagnosis:**

```bash
# 1. Check pod status
kubectl get pods -n fanengagement | grep adapter

# 2. View recent logs
kubectl logs -n fanengagement deployment/solana-adapter --tail=100

# 3. Check pod events
kubectl describe pod -n fanengagement <pod-name>

# 4. Check resource usage
kubectl top pods -n fanengagement

# 5. Check if OOMKilled
kubectl get pod -n fanengagement <pod-name> -o jsonpath='{.status.containerStatuses[0].lastState.terminated.reason}'
```

**Resolution Steps:**

1. **If OOMKilled (Out of Memory):**
   ```bash
   # Increase memory limits in deployment
   kubectl patch deployment solana-adapter -n fanengagement \
     --patch '{"spec":{"template":{"spec":{"containers":[{"name":"solana-adapter","resources":{"limits":{"memory":"1Gi"}}}]}}}}'
   ```

2. **If Application Error (panic, uncaught exception):**
   - Review logs for stack traces
   - Check if caused by recent deployment
   - Roll back to previous version:
     ```bash
     kubectl rollout undo deployment/solana-adapter -n fanengagement
     ```

3. **If Configuration Issue:**
   - Check environment variables
   - Verify secrets are mounted correctly
   - Update configuration and redeploy

4. **If RPC Provider Issue:**
   - Check RPC provider status page
   - Switch to backup RPC provider (update SOLANA_RPC_URL)
   - Restart deployment:
     ```bash
     kubectl rollout restart deployment/solana-adapter -n fanengagement
     ```

**Escalation:**
- If unable to resolve in 15 minutes, escalate to senior engineer
- If affects multiple customers, escalate to engineering manager

**Post-Resolution:**
- Document root cause
- Create follow-up task if code/config changes needed
- Update runbook if new scenario discovered

---

### 5.2 Runbook: Blockchain RPC Provider Outage

**Symptoms:**
- "RPC connection timeout" errors in logs
- High RPC error rate alert
- Transactions failing with network errors
- Increased transaction latency

**Diagnosis:**

```bash
# 1. Check RPC provider status page
curl https://status.alchemy.com  # or your provider's status page

# 2. Test RPC connectivity from adapter pod
kubectl exec -n fanengagement deployment/solana-adapter -- \
  curl -X POST $SOLANA_RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'

# 3. Check error logs
kubectl logs -n fanengagement deployment/solana-adapter | grep "RPC"

# 4. Check if errors are specific to one adapter
kubectl logs -n fanengagement deployment/polygon-adapter | grep "RPC"
```

**Resolution Steps:**

1. **If RPC Provider Confirmed Down:**
   
   a. Switch to backup RPC provider:
   ```bash
   # Update ConfigMap or Secret with backup URL
   kubectl set env deployment/solana-adapter -n fanengagement \
     SOLANA_RPC_URL=https://backup-rpc-provider.com
   
   # Deployment will automatically restart pods
   kubectl rollout status deployment/solana-adapter -n fanengagement
   ```

2. **If Provider Healthy but Connectivity Issues:**
   
   - Check network policies:
     ```bash
     kubectl get networkpolicies -n fanengagement
     ```
   
   - Check firewall rules (cloud provider specific)
   
   - Verify DNS resolution:
     ```bash
     kubectl exec -n fanengagement deployment/solana-adapter -- nslookup api.mainnet-beta.solana.com
     ```

3. **If Rate Limited:**
   
   - Upgrade RPC provider plan
   - Implement request throttling in adapter
   - Add caching layer for repeated requests

4. **Monitor Transaction Queue:**
   
   - Check if transactions are queuing up:
     ```bash
     kubectl logs -n fanengagement deployment/solana-adapter | grep "queued"
     ```
   
   - Consider temporarily pausing non-critical operations

**Prevention:**

- Configure multiple RPC providers with automatic failover
- Implement circuit breaker pattern
- Set up monitoring for RPC provider health
- Subscribe to RPC provider status notifications

**Post-Resolution:**
- Review failover procedures
- Test backup RPC provider regularly
- Document any issues with failover process

---

### 5.3 Runbook: High Transaction Error Rate

**Symptoms:**
- Alert: "HighTransactionErrorRate"
- Dashboard shows >5% transaction failures
- User reports of failed operations

**Diagnosis:**

```bash
# 1. Check error breakdown by operation type
kubectl logs -n fanengagement deployment/solana-adapter | grep "failed" | tail -50

# 2. Query Prometheus for error details
# Use Grafana "RPC Errors by Type" panel

# 3. Check specific transaction failures
# Review logs for transaction IDs and error messages

# 4. Check blockchain network status
# Solana: https://status.solana.com
# Polygon: https://polygonscan.com/
```

**Common Causes and Resolutions:**

1. **Insufficient Funds:**
   
   **Symptoms:** Errors like "insufficient funds for transaction"
   
   **Resolution:**
   ```bash
   # Check wallet balance
   kubectl exec -n fanengagement deployment/solana-adapter -- \
     solana balance <wallet-address>
   
   # Fund wallet if needed
   # (Process depends on your treasury management)
   
   # Alert finance team if low balance
   ```

2. **Invalid Transaction Parameters:**
   
   **Symptoms:** "invalid instruction" or "account not found" errors
   
   **Resolution:**
   - Review recent code changes
   - Check if transaction parameters changed
   - Verify account addresses are correct
   - Roll back if due to recent deployment

3. **Network Congestion:**
   
   **Symptoms:** "transaction timeout" or "blockhash not found"
   
   **Resolution:**
   - Increase transaction fees (if supported)
   - Increase retry attempts
   - Implement exponential backoff
   - See runbook: "Blockchain Network Congestion"

4. **Smart Contract/Program Errors:**
   
   **Symptoms:** "program error" or "revert" messages
   
   **Resolution:**
   - Check if blockchain program was upgraded
   - Verify adapter is using correct program ID
   - Check if program is paused or deprecated
   - Contact blockchain program developers

**Escalation:**
- If error rate doesn't decrease within 30 minutes, escalate
- If user-facing impact, notify customer support

---

### 5.4 Runbook: Blockchain Network Congestion

**Symptoms:**
- Alert: "SlowTransactions"
- P95 latency > 3 seconds
- Transactions pending for extended periods
- High gas prices (Polygon)
- Slow block confirmations

**Diagnosis:**

```bash
# 1. Check current network conditions
# Solana: https://solanabeach.io
# Polygon: https://polygonscan.com/gastracker

# 2. Check transaction latency metrics
# Use Grafana "Transaction Latency" panel

# 3. Review pending transactions
kubectl logs -n fanengagement deployment/solana-adapter | grep "pending"
```

**Resolution Steps:**

1. **Short-term Mitigations:**
   
   a. Increase transaction timeout:
   ```bash
   # Update adapter configuration
   kubectl set env deployment/solana-adapter -n fanengagement \
     TRANSACTION_TIMEOUT=60
   ```
   
   b. Reduce non-critical operations:
   - Temporarily pause background jobs
   - Prioritize user-facing transactions
   
   c. Increase retry attempts with backoff

2. **For Polygon - Adjust Gas Prices:**
   
   ```bash
   # Configure higher gas price multiplier
   kubectl set env deployment/polygon-adapter -n fanengagement \
     GAS_PRICE_MULTIPLIER=1.5
   ```

3. **Switch to Faster RPC Provider:**
   
   Some RPC providers have faster transaction submission:
   ```bash
   kubectl set env deployment/solana-adapter -n fanengagement \
     SOLANA_RPC_URL=https://premium-rpc-provider.com
   ```

4. **Communicate with Users:**
   
   - Post status update on status page
   - Send email to affected organizations
   - Set expectations for longer transaction times

**Long-term Solutions:**

- Implement transaction queueing with priority
- Add transaction batching where possible
- Use layer 2 solutions if available
- Consider alternative blockchain networks

**Monitoring:**

- Monitor network conditions regularly
- Set up alerts for network congestion
- Track historical congestion patterns

---

### 5.5 Runbook: Key Compromise or Rotation

**Symptoms:**
- Unauthorized transactions from adapter wallet
- Unexpected balance changes
- Security alert from monitoring tools
- Planned key rotation

**Immediate Actions (If Compromised):**

**⚠️ TIME CRITICAL: Act immediately to prevent further unauthorized transactions**

```bash
# 1. IMMEDIATELY rotate keys
# Generate new keypair (Solana)
solana-keygen new -o /tmp/new-solana-keypair.json

# Or generate new private key (Polygon)
# Use secure key generation tool

# 2. Update Kubernetes secret
kubectl create secret generic blockchain-adapters \
  --namespace=fanengagement \
  --from-file=solana-private-key=/tmp/new-solana-keypair.json \
  --dry-run=client -o yaml | kubectl apply -f -

# 3. Restart adapters to pick up new key
kubectl rollout restart deployment/solana-adapter -n fanengagement
kubectl rollout restart deployment/polygon-adapter -n fanengagement

# 4. Verify pods are using new key
kubectl logs -n fanengagement deployment/solana-adapter | grep "keypair loaded"

# 5. Securely delete temporary key file
shred -u /tmp/new-solana-keypair.json
```

**Post-Incident Actions:**

1. **Audit Recent Transactions:**
   ```bash
   # Query blockchain for recent transactions from old address
   # Solana:
   solana transaction-history <old-address>
   
   # Polygon:
   # Check Polygonscan for recent transactions
   ```

2. **Notify Security Team:**
   - File security incident report
   - Document timeline of compromise
   - Identify affected transactions

3. **Review Access Logs:**
   ```bash
   # Check who accessed secrets
   kubectl logs -n kube-system deployment/sealed-secrets-controller | grep "blockchain-adapters"
   
   # Review audit logs for secret access
   ```

4. **Transfer Remaining Funds (If Necessary):**
   - Transfer funds from compromised wallet to new wallet
   - Update wallet address in database if tracked

**Planned Key Rotation:**

**Schedule:** Quarterly (every 3 months)

**Process:**

1. **Generate New Keypair:**
   ```bash
   solana-keygen new -o new-keypair.json
   ```

2. **Backup Old Key:**
   ```bash
   # See section 7.3 for backup procedures
   kubectl get secret blockchain-adapters -n fanengagement -o yaml > old-key-backup.yaml
   ```

3. **Update Secret:**
   ```bash
   kubectl create secret generic blockchain-adapters \
     --namespace=fanengagement \
     --from-file=solana-private-key=new-keypair.json \
     --dry-run=client -o yaml | kubectl apply -f -
   ```

4. **Perform Rolling Update:**
   ```bash
   # Restart deployment one pod at a time
   kubectl rollout restart deployment/solana-adapter -n fanengagement
   kubectl rollout status deployment/solana-adapter -n fanengagement
   ```

5. **Verify Health:**
   ```bash
   # Check health endpoints
   kubectl exec -n fanengagement deployment/solana-adapter -- curl http://localhost:3001/v1/adapter/health
   ```

6. **Document Rotation:**
   - Update key rotation log
   - Store backup securely
   - Update monitoring if wallet address changed

---

### 5.6 Runbook: Pod Health Check Failures

**Symptoms:**
- Pods in "Not Ready" state
- Alert: "PodNotReady"
- Service endpoint shows no healthy backends
- Backend API getting connection refused errors

**Diagnosis:**

```bash
# 1. Check pod status
kubectl get pods -n fanengagement -o wide

# 2. Describe pod for events
kubectl describe pod -n fanengagement <pod-name>

# 3. Check readiness probe failures
kubectl logs -n fanengagement <pod-name> | grep "health"

# 4. Manually test health endpoint
kubectl exec -n fanengagement <pod-name> -- curl -v http://localhost:3001/v1/adapter/health
```

**Common Causes and Resolutions:**

1. **Application Not Fully Started:**
   
   **Symptoms:** Pod recently created, health check timing issue
   
   **Resolution:**
   ```bash
   # Increase initialDelaySeconds
   kubectl patch deployment solana-adapter -n fanengagement \
     --patch '{"spec":{"template":{"spec":{"containers":[{"name":"solana-adapter","readinessProbe":{"initialDelaySeconds":15}}]}}}}'
   ```

2. **Health Endpoint Not Responding:**
   
   **Symptoms:** curl to health endpoint times out
   
   **Resolution:**
   - Check application logs for errors
   - Verify health endpoint code is working
   - Check if application is listening on correct port

3. **RPC Connection Issues:**
   
   **Symptoms:** Health endpoint checks RPC, RPC is down
   
   **Resolution:**
   - See runbook: "Blockchain RPC Provider Outage"
   - Consider making health check independent of RPC status

4. **Resource Constraints:**
   
   **Symptoms:** Pod is resource throttled
   
   **Resolution:**
   ```bash
   # Check if CPU throttled
   kubectl top pod -n fanengagement <pod-name>
   
   # Increase resource requests
   kubectl patch deployment solana-adapter -n fanengagement \
     --patch '{"spec":{"template":{"spec":{"containers":[{"name":"solana-adapter","resources":{"requests":{"cpu":"200m"}}}]}}}}'
   ```


---

## 6. Scaling Strategy

### 6.1 Horizontal Scaling

**When to Scale Horizontally:**
- Add more pod replicas to handle increased load
- Distribute traffic across multiple instances
- Improve availability and fault tolerance

**Triggers for Horizontal Scaling:**

| Metric | Threshold | Action |
|--------|-----------|--------|
| CPU Usage | > 70% for 5 minutes | Scale up |
| Memory Usage | > 80% for 5 minutes | Scale up |
| Request Rate | > 100 req/s per pod | Scale up |
| CPU Usage | < 30% for 10 minutes | Scale down |
| Request Rate | < 20 req/s per pod | Scale down |

**Maximum Replicas:** 10 per adapter (configurable based on load)

**Minimum Replicas:** 2 per adapter (for high availability)

### 6.2 HorizontalPodAutoscaler (HPA) Configuration

**Solana Adapter HPA:**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: solana-adapter-hpa
  namespace: fanengagement
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
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # Wait 5 minutes before scaling down
      policies:
      - type: Percent
        value: 50  # Scale down by 50% at a time
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0  # Scale up immediately
      policies:
      - type: Percent
        value: 100  # Double capacity at a time
        periodSeconds: 60
      - type: Pods
        value: 2  # Or add 2 pods at a time
        periodSeconds: 60
      selectPolicy: Max  # Use the policy that adds more pods
```

**Apply HPA:**
```bash
kubectl apply -f solana-adapter-hpa.yaml
kubectl apply -f polygon-adapter-hpa.yaml

# Check HPA status
kubectl get hpa -n fanengagement
kubectl describe hpa solana-adapter-hpa -n fanengagement
```

### 6.3 Vertical Scaling

**When to Scale Vertically:**
- Increase resources for each pod
- Handle larger transaction sizes
- Improve performance per instance

**Triggers for Vertical Scaling:**

| Scenario | Action |
|----------|--------|
| Memory usage consistently > 80% | Increase memory limits |
| OOMKilled errors | Increase memory limits |
| CPU throttling | Increase CPU limits |
| Large transaction payloads | Increase memory limits |

**Vertical Scaling Procedure:**

```bash
# Increase memory limits
kubectl patch deployment solana-adapter -n fanengagement \
  --patch '{"spec":{"template":{"spec":{"containers":[{"name":"solana-adapter","resources":{"limits":{"memory":"1Gi"},"requests":{"memory":"512Mi"}}}]}}}}'

# Increase CPU limits
kubectl patch deployment solana-adapter -n fanengagement \
  --patch '{"spec":{"template":{"spec":{"containers":[{"name":"solana-adapter","resources":{"limits":{"cpu":"1000m"},"requests":{"cpu":"250m"}}}]}}}}'

# Monitor rollout
kubectl rollout status deployment/solana-adapter -n fanengagement
```

### 6.4 Load Testing

**Before scaling in production, perform load tests:**

```bash
# Install k6 (load testing tool)
# https://k6.io/docs/getting-started/installation/

# Run load test against adapter
k6 run --vus 10 --duration 60s load-test.js

# Example load-test.js
# import http from 'k6/http';
# export default function () {
#   http.post('http://solana-adapter.fanengagement.svc.cluster.local/v1/adapter/votes', 
#     JSON.stringify({...}), 
#     { headers: { 'Content-Type': 'application/json' } }
#   );
# }
```

**Load Test Targets:**

| Metric | Target |
|--------|--------|
| Throughput | 50 req/s per adapter instance |
| P95 Latency | < 3 seconds |
| Error Rate | < 1% |
| Resource Usage | CPU < 70%, Memory < 80% |

### 6.5 Scaling Best Practices

1. **Always scale horizontally first** (more pods) before vertical (bigger pods)
2. **Monitor metrics during scaling** to ensure improvement
3. **Test scaling policies** in staging before production
4. **Set PodDisruptionBudgets** to ensure availability during scaling:
   ```yaml
   apiVersion: policy/v1
   kind: PodDisruptionBudget
   metadata:
     name: solana-adapter-pdb
     namespace: fanengagement
   spec:
     minAvailable: 1
     selector:
       matchLabels:
         app: solana-adapter
   ```
5. **Document scaling decisions** and their outcomes

---

## 7. Backup and Disaster Recovery

### 7.1 Recovery Objectives

**Recovery Time Objective (RTO):** < 30 minutes

- Time to restore adapter service after complete failure

**Recovery Point Objective (RPO):** < 1 hour

- Maximum acceptable data loss (last key backup)

### 7.2 What to Backup

**Critical Assets:**
1. **Blockchain Private Keys** (most critical)
2. Kubernetes deployment manifests
3. Configuration files and secrets
4. Monitoring and alerting configurations
5. RPC provider configuration

**Note:** Blockchain state is on-chain and does not require backup. Only keys and configuration need backup.

### 7.3 Blockchain Key Backup Procedures

**⚠️ CRITICAL: Keys must be backed up securely and redundantly**

#### Step 1: Export Keys

```bash
# Export Solana keypair from Kubernetes secret
kubectl get secret blockchain-adapters -n fanengagement \
  -o jsonpath='{.data.solana-private-key}' | base64 -d > solana-keypair.json

# Export Polygon private key
kubectl get secret blockchain-adapters -n fanengagement \
  -o jsonpath='{.data.polygon-private-key}' | base64 -d > polygon-private-key.txt
```

#### Step 2: Encrypt Keys

```bash
# Encrypt with GPG (symmetric encryption)
gpg --symmetric --cipher-algo AES256 solana-keypair.json
# Enter strong passphrase when prompted

gpg --symmetric --cipher-algo AES256 polygon-private-key.txt
# Use same or different passphrase

# Encrypted files: solana-keypair.json.gpg, polygon-private-key.txt.gpg
```

#### Step 3: Store in Multiple Locations

**Primary Backup (Cloud Storage):**

```bash
# AWS S3 (with encryption at rest)
aws s3 cp solana-keypair.json.gpg \
  s3://fanengagement-backups/blockchain-keys/$(date +%Y%m%d)/solana-keypair.json.gpg \
  --storage-class STANDARD_IA \
  --server-side-encryption AES256

aws s3 cp polygon-private-key.txt.gpg \
  s3://fanengagement-backups/blockchain-keys/$(date +%Y%m%d)/polygon-private-key.txt.gpg \
  --storage-class STANDARD_IA \
  --server-side-encryption AES256
```

**Secondary Backup (Different Cloud):**

```bash
# Azure Blob Storage
az storage blob upload \
  --account-name fanengagementbackups \
  --container-name blockchain-keys \
  --name $(date +%Y%m%d)/solana-keypair.json.gpg \
  --file solana-keypair.json.gpg \
  --encryption-scope fanengagement-keys
```

**Tertiary Backup (Offline Storage):**

- Store encrypted keys on offline USB drive
- Keep USB drive in secure physical location (safe, bank vault)
- Label with date and description
- Update every quarter or after key rotation

#### Step 4: Secure Deletion

```bash
# Securely delete unencrypted keys from local machine
shred -u solana-keypair.json
shred -u polygon-private-key.txt

# Verify deletion
ls -la solana-keypair.json  # Should not exist
```

#### Step 5: Document Backup

**Maintain backup log:**

| Date | Keys Backed Up | Storage Locations | Encrypted | Verified |
|------|----------------|-------------------|-----------|----------|
| 2024-12-01 | Solana, Polygon | S3, Azure, USB | ✅ GPG/AES256 | ✅ |

**Store backup log securely** (encrypted note in password manager)

### 7.4 Key Recovery Procedures

**When to Recover:**
- Kubernetes cluster destroyed
- Secrets accidentally deleted
- Key rotation with backup needed
- Disaster recovery scenario

**Recovery Steps:**

```bash
# 1. Retrieve encrypted backup from cloud storage
aws s3 cp s3://fanengagement-backups/blockchain-keys/20241201/solana-keypair.json.gpg .

# 2. Decrypt with GPG
gpg --decrypt solana-keypair.json.gpg > solana-keypair.json
# Enter passphrase when prompted

# 3. Verify key integrity
# Solana: Check public key matches expected address
solana-keygen pubkey solana-keypair.json

# 4. Restore to Kubernetes secret
kubectl create secret generic blockchain-adapters \
  --namespace=fanengagement \
  --from-file=solana-private-key=solana-keypair.json \
  --from-literal=polygon-private-key="<decrypted-polygon-key>"

# 5. Restart adapters to pick up restored keys
kubectl rollout restart deployment/solana-adapter -n fanengagement
kubectl rollout restart deployment/polygon-adapter -n fanengagement

# 6. Verify adapters are functioning
kubectl logs -n fanengagement deployment/solana-adapter | grep "keypair loaded"

# 7. Test transaction submission
# Submit test transaction to blockchain

# 8. Securely delete recovered keys from local machine
shred -u solana-keypair.json
```

### 7.5 Configuration Backup

**Backup Kubernetes Manifests:**

```bash
# Export all adapter resources
kubectl get all,secrets,configmaps,pdb,hpa -n fanengagement -o yaml > fanengagement-adapters-backup-$(date +%Y%m%d).yaml

# Store in git repository (secrets should be sealed or external)
git add fanengagement-adapters-backup-$(date +%Y%m%d).yaml
git commit -m "Backup: Adapter configurations $(date +%Y%m%d)"
git push
```

**Backup Monitoring Configuration:**

```bash
# Export Prometheus rules
kubectl get prometheusrules -n monitoring -o yaml > prometheus-rules-backup.yaml

# Export Grafana dashboards (via API)
curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
  https://grafana.fanengagement.io/api/dashboards/uid/blockchain-adapters > grafana-dashboard-backup.json
```

### 7.6 Disaster Recovery Scenarios

#### Scenario 1: Complete Kubernetes Cluster Loss

**Impact:** All adapters down, no blockchain operations

**Recovery Steps:**

1. **Provision New Cluster** (30 minutes)
   ```bash
   # Use Infrastructure as Code (Terraform/CloudFormation)
   terraform apply -var-file=production.tfvars
   ```

2. **Restore Keys from Backup** (5 minutes)
   - Follow section 7.4 key recovery procedures

3. **Deploy Adapters** (10 minutes)
   ```bash
   kubectl apply -f deploy/kubernetes/blockchain-adapters-namespace.yaml
   kubectl apply -f deploy/kubernetes/solana-adapter-deployment.yaml
   kubectl apply -f deploy/kubernetes/polygon-adapter-deployment.yaml
   ```

4. **Verify Health** (5 minutes)
   ```bash
   kubectl get pods -n fanengagement
   kubectl logs -n fanengagement deployment/solana-adapter
   curl http://solana-adapter.fanengagement.svc.cluster.local/v1/adapter/health
   ```

**Total RTO:** < 30 minutes

#### Scenario 2: Key Compromise

**Impact:** Unauthorized transactions possible

**Recovery Steps:**

- Follow runbook: "Key Compromise or Rotation"
- Generate new keys immediately
- Transfer funds if necessary
- File security incident

**Total RTO:** < 15 minutes (critical)

#### Scenario 3: Data Center Failure

**Impact:** Adapters in one region unavailable

**Mitigation:** Multi-region deployment

```yaml
# Deploy adapters in multiple regions
# Use global load balancer to route traffic
# Replicate secrets across regions
```

### 7.7 Backup Testing

**Schedule:** Quarterly

**Test Procedures:**

1. **Restore Test:**
   - Retrieve backup from storage
   - Decrypt and verify
   - Deploy to test environment
   - Submit test transaction

2. **Key Rotation Test:**
   - Generate new keys
   - Update secrets
   - Verify adapter restart
   - Verify functionality

3. **Disaster Recovery Drill:**
   - Simulate cluster failure
   - Restore from backups
   - Measure RTO/RPO
   - Document lessons learned

**Document Test Results:**

| Date | Test Type | Result | RTO Achieved | Issues Found |
|------|-----------|--------|--------------|--------------|
| 2024-12-01 | Restore Test | ✅ Pass | 10 min | None |
| 2024-12-01 | Key Rotation | ✅ Pass | 5 min | None |


---

## 8. Operational Readiness Checklist

Use this checklist before deploying adapters to production:

### 8.1 Pre-Deployment

- [ ] **Infrastructure:**
  - [ ] Kubernetes cluster provisioned (v1.24+)
  - [ ] Namespace `fanengagement` created
  - [ ] Adequate cluster resources (CPU, memory)
  - [ ] Storage classes configured

- [ ] **Secrets Management:**
  - [ ] Blockchain keys generated
  - [ ] Keys backed up (3 locations: S3, Azure, offline)
  - [ ] Kubernetes secrets created
  - [ ] Encryption at rest enabled
  - [ ] Access controls configured (RBAC)

- [ ] **Deployment Configuration:**
  - [ ] Deployment manifests reviewed
  - [ ] Environment variables configured
  - [ ] Resource requests/limits set
  - [ ] Health checks configured
  - [ ] Security contexts applied
  - [ ] HPA configured (if using auto-scaling)

- [ ] **Networking:**
  - [ ] Services created (ClusterIP)
  - [ ] Backend can reach adapter services
  - [ ] Network policies reviewed (if applicable)
  - [ ] TLS/mTLS configured (if applicable)

### 8.2 Monitoring and Alerting

- [ ] **Metrics:**
  - [ ] Prometheus configured to scrape adapters
  - [ ] ServiceMonitor created
  - [ ] Metrics endpoint accessible at `/metrics`
  - [ ] Custom adapter metrics exporting correctly

- [ ] **Dashboards:**
  - [ ] Grafana dashboard imported
  - [ ] All panels displaying data
  - [ ] Dashboard shared with team
  - [ ] Dashboard bookmarked

- [ ] **Alerting:**
  - [ ] Prometheus alert rules configured
  - [ ] AlertManager routing configured
  - [ ] PagerDuty integration tested
  - [ ] Slack notifications tested
  - [ ] On-call schedule configured
  - [ ] Alert fatigue minimized (thresholds tuned)

### 8.3 Testing

- [ ] **Functional Testing:**
  - [ ] Health endpoint returns 200 OK
  - [ ] Metrics endpoint returns valid Prometheus format
  - [ ] Test transaction submitted successfully
  - [ ] Transaction confirmed on blockchain
  - [ ] Error handling tested (invalid params)

- [ ] **Performance Testing:**
  - [ ] Load test executed (target: 50 req/s per adapter)
  - [ ] P95 latency < 3 seconds
  - [ ] Error rate < 1%
  - [ ] Resource usage within limits (CPU < 70%, memory < 80%)

- [ ] **Failover Testing:**
  - [ ] Pod killed, automatically restarted
  - [ ] Deployment rolled back successfully
  - [ ] RPC provider switched (if backup configured)
  - [ ] Circuit breaker tested (if applicable)

- [ ] **Security Testing:**
  - [ ] Keys not exposed via API
  - [ ] Authentication required on endpoints
  - [ ] TLS/mTLS verified (if applicable)
  - [ ] Vulnerability scan passed (Trivy)

### 8.4 Documentation

- [ ] **Runbooks:**
  - [ ] All runbooks reviewed by team
  - [ ] On-call team trained on runbooks
  - [ ] Runbooks accessible (wiki, docs site)

- [ ] **Backup Procedures:**
  - [ ] Key backup procedures documented
  - [ ] Backup locations recorded
  - [ ] Recovery procedures tested
  - [ ] Backup schedule established (quarterly)

- [ ] **Architecture:**
  - [ ] Deployment architecture documented
  - [ ] Network topology documented
  - [ ] Secrets management documented

### 8.5 Go/No-Go Decision

**Final approval required from:**

- [ ] Engineering Lead: _______________
- [ ] SRE Lead: _______________
- [ ] Security Team: _______________
- [ ] Product Owner: _______________

**Go/No-Go Decision:** ☐ GO  ☐ NO-GO

**If NO-GO, blockers:**
1. _______________________________
2. _______________________________
3. _______________________________

**Date of Production Deployment:** _______________

---

## 9. Troubleshooting Guide

### 9.1 Common Issues

#### Issue: "Cannot pull image from ghcr.io"

**Symptoms:** ImagePullBackOff error

**Solution:**
```bash
# Create image pull secret
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=<github-username> \
  --docker-password=<github-token> \
  --namespace=fanengagement

# Add to deployment
kubectl patch serviceaccount default -n fanengagement \
  -p '{"imagePullSecrets":[{"name":"ghcr-secret"}]}'
```

---

#### Issue: "Metrics not showing in Grafana"

**Symptoms:** Dashboard panels show "No data"

**Solution:**
```bash
# 1. Check if Prometheus is scraping adapters
kubectl get servicemonitor -n fanengagement

# 2. Check Prometheus targets
# Navigate to Prometheus UI > Status > Targets
# Verify blockchain-adapters targets are UP

# 3. Test metrics endpoint directly
kubectl port-forward -n fanengagement svc/solana-adapter 3001:80
curl http://localhost:3001/metrics

# 4. Check ServiceMonitor selector matches service labels
kubectl get svc solana-adapter -n fanengagement -o yaml | grep labels
kubectl get servicemonitor blockchain-adapters -n fanengagement -o yaml | grep selector
```

---

#### Issue: "Adapter logs show 'insufficient funds'"

**Symptoms:** Transactions failing, balance low

**Solution:**
```bash
# Check wallet balance
# Solana:
solana balance <wallet-address> --url mainnet-beta

# Polygon:
# Use Polygonscan or RPC call

# Fund wallet
# (Follow your organization's treasury management process)
```

---

#### Issue: "High memory usage, pods being OOMKilled"

**Symptoms:** Pods restarting, OOMKilled in events

**Solution:**
```bash
# 1. Check current memory usage
kubectl top pod -n fanengagement

# 2. Increase memory limits
kubectl patch deployment solana-adapter -n fanengagement \
  --patch '{"spec":{"template":{"spec":{"containers":[{"name":"solana-adapter","resources":{"limits":{"memory":"1Gi"}}}]}}}}'

# 3. Investigate memory leak (if sustained high usage)
# Profile application with memory profiler
```

---

#### Issue: "Transactions timing out"

**Symptoms:** "transaction timeout" errors in logs

**Solution:**
1. Check blockchain network congestion (see runbook)
2. Increase transaction timeout setting
3. Switch to faster RPC provider
4. Implement retry logic with exponential backoff

---

### 9.2 Log Analysis

**Useful kubectl commands:**

```bash
# Follow logs for all adapter pods
kubectl logs -n fanengagement -l component=blockchain-adapter -f --all-containers

# Search logs for errors
kubectl logs -n fanengagement deployment/solana-adapter | grep -i error

# Get logs from crashed pod
kubectl logs -n fanengagement <pod-name> --previous

# Export logs for analysis
kubectl logs -n fanengagement deployment/solana-adapter --since=1h > adapter-logs.txt
```

**Log patterns to watch for:**

| Pattern | Meaning | Action |
|---------|---------|--------|
| `"RPC connection timeout"` | RPC provider unreachable | Check runbook: RPC Provider Outage |
| `"insufficient funds"` | Wallet balance low | Fund wallet |
| `"invalid instruction"` | Transaction parameter error | Review recent code changes |
| `"OOM"` | Out of memory | Increase memory limits |
| `"rate limited"` | Too many requests to RPC | Upgrade RPC plan or throttle |

---

### 9.3 Performance Tuning

**If latency is high:**

1. **Optimize RPC provider:**
   - Use premium RPC provider
   - Enable caching
   - Use WebSocket connections

2. **Tune transaction settings:**
   - Adjust commitment level (Solana)
   - Increase gas price (Polygon)
   - Batch transactions where possible

3. **Scale horizontally:**
   - Add more adapter replicas
   - Use HPA to auto-scale

4. **Optimize application:**
   - Profile for bottlenecks
   - Optimize transaction building
   - Cache frequently accessed data

---

## 10. References

### 10.1 Internal Documentation

- **Blockchain Adapter Architecture:** `docs/blockchain/adapter-platform-architecture.md`
- **Testing Strategy:** `docs/blockchain/adapter-testing.md`
- **CI/CD Pipeline:** `docs/blockchain/adapter-cicd.md`
- **Kubernetes Deployments:** `deploy/kubernetes/`
- **Grafana Dashboard:** `docs/blockchain/grafana-dashboard.json`
- **Prometheus Alerts:** `docs/blockchain/prometheus-alerts.yaml`

### 10.2 External Resources

**Monitoring and Alerting:**
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Dashboards](https://grafana.com/docs/grafana/latest/dashboards/)
- [Kubernetes Monitoring](https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/)

**Kubernetes:**
- [HorizontalPodAutoscaler](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [Health Checks](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Secrets Management](https://kubernetes.io/docs/concepts/configuration/secret/)

**Blockchain:**
- [Solana RPC API](https://docs.solana.com/developing/clients/jsonrpc-api)
- [Solana Status](https://status.solana.com/)
- [Polygon Network](https://polygonscan.com/)
- [Polygon Status](https://polygon.technology/status)

**Security:**
- [Key Management Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html)
- [Kubernetes Security](https://kubernetes.io/docs/concepts/security/)
- [GPG Encryption](https://gnupg.org/documentation/)

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-06 | Documentation Agent | Initial operational readiness guide created |

---

**End of Document**
