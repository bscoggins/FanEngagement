# Polygon Adapter Runbook

> Scope: Polygon adapter incidents (nonce conflicts, gas spikes, RPC rate limits)  
> Metrics: `blockchain_*` family with `adapter="polygon"` labels  
> Dashboards: `docs/blockchain/grafana-dashboard.json` (Polygon row)  
> Alerts: `docs/blockchain/prometheus-alerts.yaml` (`Polygon*` rules)

## 1. Quick Reference
- **Health / Metrics:** `GET /v1/adapter/health`, `GET /v1/adapter/metrics`
- **Critical Signals:**  
  - `PolygonHighErrorRate` (failed tx >3% over 5m)  
  - `PolygonPendingTxBacklog` (wallet pending tx backlog)  
  - `PolygonRPCLatencyHigh` (P95 RPC latency >1.5s)  
  - `AdapterDown` (shared rule)
- **Primary Labels:** `adapter="polygon"`, `network`, `chain_id`, `instance`

## 2. Common Failures & Recovery

### 2.1 Nonce Conflicts / Pending Backlog
- **Symptom:** `PolygonPendingTxBacklog` firing, `blockchain_pending_transactions{adapter="polygon"}` rising, RPC errors mentioning nonce.
- **Immediate Actions:**
  1. Check health: `curl -s $POD/v1/adapter/health` (verify `pendingTransactions`).
  2. Inspect recent tx: `eth_getTransactionCount` (pending vs latest) and last tx hashes.
  3. If backlog > 0, issue a replacement/speed-up tx with higher fee (same nonce) or cancel tx to self with 0 value. Example with ethers:
     ```ts
     const nonce = await provider.getTransactionCount(wallet.address, 'pending');
     const fee = await provider.getFeeData();
     const replace = await wallet.sendTransaction({
       to: wallet.address,
       value: 0,
       nonce,
       maxFeePerGas: fee.maxFeePerGas ? fee.maxFeePerGas * 2n : fee.gasPrice! * 2n,
       maxPriorityFeePerGas: fee.maxPriorityFeePerGas ? fee.maxPriorityFeePerGas * 2n : undefined,
     });
     await replace.wait(1);
     ```
  4. Confirm new tx mined; backlog gauge should return to 0.
  5. If multiple replicas racing nonces, scale down to 1 replica temporarily, drain queue, then scale back up.
- **Preventative:** Keep `RETRY_MAX_ATTEMPTS` modest, ensure only one signer key per adapter instance.

### 2.2 Gas Spikes / Execution Reverts
- **Symptom:** `Gas estimation or execution error`, rising `blockchain_gas_used_total`, high `blockchain_gas_price_gwei`.
- **Immediate Actions:**
  1. Check `blockchain_gas_price_gwei{adapter="polygon"}` and live gas feeds.
  2. Retry with higher `MAX_FEE_PER_GAS_GWEI`/`MAX_PRIORITY_FEE_PER_GAS_GWEI` (env) or wait for prices to normalize.
  3. Verify wallet balance covers new gas prices.
  4. If contract revert suspected, fetch receipt + logs for revert reason; halt retries for that operation until fixed.
- **Preventative:** Alerts when gas rises; keep hot wallet funded; avoid broadcasting during known spikes.

### 2.3 RPC Rate Limits / Latency
- **Symptom:** `PolygonRPCLatencyHigh` or `PolygonHighErrorRate`, `blockchain_rpc_errors_total` increasing, health `rpcStatus=error`.
- **Immediate Actions:**
  1. Check provider status page; inspect adapter logs for `rpc-error`.
  2. Throttle callers (temporarily reduce backend fan-out) and pause non-critical writes.
  3. Fail over to backup RPC URL if configured; bounce pod to pick up env override.
  4. Confirm recovery via health endpoint and latency metric drop.
- **Preventative:** Keep primary + backup RPC URLs, enforce exponential backoff (config.retry), and cap concurrent writes.

## 3. Logging & Secrets
- API keys and private keys are redacted at log format level. Avoid dumping full requests; never log `POLYGON_PRIVATE_KEY` or `API_KEY`.
- Use `LOG_LEVEL=info` in production; enable `debug` only for short-lived incident windows.

## 4. Escalation
- **SRE On-call:** escalate via PagerDuty (Blockchain Adapters service).
- **Engineering:** tag `#fanengagement-blockchain` Slack channel with alert details, chain id, and adapter instance.
- **Runbook Links:** reference alert `runbook_url` in Alertmanager; includes this document.
