# Blockchain Adapters CI/CD Pipeline

This document describes the CI/CD pipeline for building, testing, and deploying the Solana and Polygon blockchain adapters.

## Overview

The blockchain adapters CI/CD pipeline automates:
- Building Docker images with multi-stage builds
- Running unit tests inside containers
- Security vulnerability scanning with Trivy
- Publishing images to GitHub Container Registry (ghcr.io)
- Health check validation
- Kubernetes deployment manifests for production

## Pipeline Architecture

### Workflow Triggers

The GitHub Actions workflow (`.github/workflows/blockchain-adapters.yml`) triggers on:

1. **Push to `main` branch** - when changes are made to:
   - `adapters/**` (any adapter code changes)
   - The workflow file itself

2. **Pull Requests** - when changes target:
   - `adapters/**` (any adapter code changes)
   - The workflow file itself

3. **Manual Dispatch** - can be triggered manually from the Actions tab

### Jobs

The pipeline runs two parallel jobs:

#### 1. `build-solana-adapter`
- Builds the Solana adapter Docker image
- Runs unit tests in the container
- Performs Trivy security scanning
- Tests the health endpoint
- Publishes to ghcr.io (on push to main)

#### 2. `build-polygon-adapter`
- Builds the Polygon adapter Docker image
- Runs unit tests in the container
- Performs Trivy security scanning
- Tests the health endpoint
- Publishes to ghcr.io (on push to main)

## Multi-Stage Docker Builds

Both adapters use multi-stage Docker builds for:
- **Smaller image sizes** - production image doesn't include build tools or source code
- **Faster builds** - leverages layer caching
- **Security** - fewer dependencies in production images

### Build Stages

**Stage 1: Builder**
```dockerfile
FROM node:20-alpine AS builder
# Install all dependencies (including dev)
# Copy source code
# Build TypeScript → JavaScript
```

**Stage 2: Test**
```dockerfile
FROM builder AS test
# Run unit tests
# Fails build if tests fail
```

**Stage 3: Production**
```dockerfile
FROM node:20-alpine
# Install only production dependencies
# Copy compiled code from builder
# Run as non-root user
```

## Image Tagging Strategy

Images are tagged with multiple identifiers:

### On Pull Requests
- Images are built but **not pushed** to the registry
- Used only for testing and validation

### On Push to Main
- `latest` - Always points to the most recent build
- `<commit-sha>` - Immutable tag for specific commit (e.g., `abc123def456`)
- `v1.0.0` - Semantic version (if a git tag is pushed)

**Examples:**
```
ghcr.io/bscoggins/fanengagement-solana-adapter:latest
ghcr.io/bscoggins/fanengagement-solana-adapter:a1b2c3d4
ghcr.io/bscoggins/fanengagement-solana-adapter:v1.0.0
```

## Security Scanning

### Trivy Integration

The pipeline uses [Aqua Security Trivy](https://github.com/aquasecurity/trivy) for vulnerability scanning:

1. **SARIF Report Generation**
   - Scans for CRITICAL and HIGH vulnerabilities
   - Generates SARIF format report
   - Uploads to GitHub Security tab (always runs)

2. **Build Failure on Vulnerabilities**
   - Fails the build if CRITICAL or HIGH vulnerabilities found
   - Prevents insecure images from being published

### Viewing Security Results

Security scan results are available in:
- GitHub Security tab → Code scanning alerts
- Workflow run logs (table format)

## Testing

### Unit Tests

Unit tests run automatically during the Docker build in the test stage:
```bash
# Tests are executed during the build process
docker build --target test -t solana-adapter:test ./adapters/solana
```

This ensures tests run in the same environment as production and fail the build if tests fail.

### Health Check Testing

After building, the pipeline:
1. Starts the container with production settings
2. Waits for startup (15 seconds)
3. Makes HTTP requests to `/v1/adapter/health`
4. Retries up to 10 times with 3-second intervals
5. Fails the build if health check doesn't respond

**Note:** Health check tests are currently disabled pending test credentials.

## Docker Build Optimization

### Layer Caching

The pipeline uses GitHub Actions cache:
```yaml
cache-from: type=gha
cache-to: type=gha,mode=max
```

Benefits:
- Faster builds on subsequent runs
- Reuses unchanged layers
- Reduces bandwidth and build time

### .dockerignore Files

Both adapters have `.dockerignore` files to exclude:
- Build artifacts (node_modules, coverage)
- Development dependencies (handled by build stages)
- Documentation (*.md files)
- Git metadata
- IDE configurations

This reduces:
- Build context size
- Image size
- Build time

## Kubernetes Deployment

### Manifests

Kubernetes deployment manifests are in `deploy/kubernetes/`:

1. **blockchain-adapters-namespace.yaml**
   - Creates `fanengagement` namespace

2. **solana-adapter-deployment.yaml**
   - Deployment with 2 replicas
   - Service (ClusterIP on port 80)
   - Health checks (liveness and readiness probes)
   - Resource limits (CPU: 100m-500m, Memory: 256Mi-512Mi)

3. **polygon-adapter-deployment.yaml**
   - Same structure as Solana adapter
   - Different ports and environment variables

### Deployment

#### Prerequisites

1. Kubernetes cluster (v1.24+)
2. kubectl configured
3. Image pull access to ghcr.io (if private)

#### Deploy Namespace

```bash
kubectl apply -f deploy/kubernetes/blockchain-adapters-namespace.yaml
```

#### Deploy Adapters

```bash
# Deploy both adapters
kubectl apply -f deploy/kubernetes/solana-adapter-deployment.yaml
kubectl apply -f deploy/kubernetes/polygon-adapter-deployment.yaml

# Check deployment status
kubectl get deployments -n fanengagement
kubectl get pods -n fanengagement
kubectl get services -n fanengagement
```

#### Configure Secrets (Optional)

If private keys are needed:

```bash
kubectl create secret generic blockchain-adapters \
  --namespace=fanengagement \
  --from-literal=solana-private-key='YOUR_SOLANA_KEY' \
  --from-literal=polygon-private-key='YOUR_POLYGON_KEY'
```

Then uncomment the secret references in the deployment manifests.

### Health Checks

Both deployments include:

**Liveness Probe**
- Path: `/v1/adapter/health`
- Initial delay: 15 seconds
- Period: 30 seconds
- Restarts pod if failing

**Readiness Probe**
- Path: `/v1/adapter/health`
- Initial delay: 5 seconds
- Period: 10 seconds
- Removes pod from service if failing

### Resource Management

Each adapter has:
- **Requests**: Guaranteed resources (100m CPU, 256Mi memory)
- **Limits**: Maximum resources (500m CPU, 512Mi memory)

This ensures:
- Predictable scheduling
- No resource starvation
- Efficient cluster utilization

### Security

Security features in the deployments:
- Run as non-root user (UID 1000)
- No privilege escalation
- Drop all Linux capabilities
- Security context constraints

## Monitoring and Logging

### Viewing Logs

```bash
# All pods in namespace
kubectl logs -n fanengagement -l component=blockchain-adapter --all-containers

# Specific adapter
kubectl logs -n fanengagement -l app=solana-adapter -f

# Previous crashed container
kubectl logs -n fanengagement <pod-name> --previous
```

### Health Checks

```bash
# Port-forward and test locally
kubectl port-forward -n fanengagement svc/solana-adapter 3001:80
curl http://localhost:3001/v1/adapter/health

kubectl port-forward -n fanengagement svc/polygon-adapter 3002:80
curl http://localhost:3002/v1/adapter/health
```

### Metrics

Both adapters expose Prometheus metrics at `/metrics` endpoint:
```bash
kubectl port-forward -n fanengagement svc/solana-adapter 3001:80
curl http://localhost:3001/metrics
```

## Troubleshooting

### Build Failures

**Problem**: Docker build fails in CI
- Check Dockerfile syntax
- Verify all files are present (not in .dockerignore)
- Check layer caching issues

**Problem**: Tests fail in CI but pass locally
- Ensure tests don't depend on local state
- Check environment variables
- Verify container has all required dependencies

### Security Scan Failures

**Problem**: Trivy finds vulnerabilities
- Check the CVE details in the scan results
- Update base image: `FROM node:20-alpine`
- Update npm dependencies: `npm audit fix`
- If false positive, document and continue

### Deployment Issues

**Problem**: Pods are CrashLooping
```bash
kubectl describe pod -n fanengagement <pod-name>
kubectl logs -n fanengagement <pod-name>
```

Common causes:
- Environment variables not set
- Health check endpoint not responding
- Insufficient resources

**Problem**: Health checks failing
- Verify the `/v1/adapter/health` endpoint works
- Check liveness probe timing (may need longer initialDelaySeconds)
- Review logs for startup errors

## Manual Operations

### Building Locally

```bash
# Build Solana adapter
cd adapters/solana
docker build -t solana-adapter:local .

# Build Polygon adapter
cd adapters/polygon
docker build -t polygon-adapter:local .
```

### Running Locally

```bash
# Run Solana adapter
docker run -p 3001:3001 \
  -e SOLANA_RPC_URL=https://api.devnet.solana.com \
  solana-adapter:local

# Run Polygon adapter
docker run -p 3002:3002 \
  -e POLYGON_RPC_URL=https://rpc-mumbai.maticvigil.com \
  polygon-adapter:local
```

### Publishing Manually

```bash
# Login to GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_USERNAME --password-stdin

# Tag and push
docker tag solana-adapter:local ghcr.io/bscoggins/fanengagement-solana-adapter:manual
docker push ghcr.io/bscoggins/fanengagement-solana-adapter:manual
```

## Best Practices

1. **Always test locally** before pushing
2. **Review security scan results** - don't ignore vulnerabilities
3. **Use semantic versioning** for releases
4. **Monitor resource usage** in Kubernetes
5. **Keep images updated** - rebuild regularly for security patches
6. **Document configuration changes** in git commits
7. **Test health endpoints** after code changes

## CI/CD Workflow Diagram

```
┌─────────────────┐
│   Git Push      │
│   (main branch) │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  GitHub Actions Workflow Start  │
└────────┬───────────────┬────────┘
         │               │
         ▼               ▼
┌─────────────────┐ ┌─────────────────┐
│ Solana Adapter  │ │ Polygon Adapter │
│      Job        │ │       Job       │
└────────┬────────┘ └────────┬────────┘
         │                   │
         ▼                   ▼
┌─────────────────┐ ┌─────────────────┐
│ Build Docker    │ │ Build Docker    │
│ Image (multi-   │ │ Image (multi-   │
│ stage)          │ │ stage)          │
└────────┬────────┘ └────────┬────────┘
         │                   │
         ▼                   ▼
┌─────────────────┐ ┌─────────────────┐
│ Run Unit Tests  │ │ Run Unit Tests  │
│ in Container    │ │ in Container    │
└────────┬────────┘ └────────┬────────┘
         │                   │
         ▼                   ▼
┌─────────────────┐ ┌─────────────────┐
│ Trivy Security  │ │ Trivy Security  │
│ Scan (SARIF)    │ │ Scan (SARIF)    │
└────────┬────────┘ └────────┬────────┘
         │                   │
         ▼                   ▼
┌─────────────────┐ ┌─────────────────┐
│ Upload to       │ │ Upload to       │
│ GitHub Security │ │ GitHub Security │
└────────┬────────┘ └────────┬────────┘
         │                   │
         ▼                   ▼
┌─────────────────┐ ┌─────────────────┐
│ Fail on HIGH/   │ │ Fail on HIGH/   │
│ CRITICAL vulns  │ │ CRITICAL vulns  │
└────────┬────────┘ └────────┬────────┘
         │                   │
         ▼                   ▼
┌─────────────────┐ ┌─────────────────┐
│ Test Health     │ │ Test Health     │
│ Endpoint        │ │ Endpoint        │
└────────┬────────┘ └────────┬────────┘
         │                   │
         ▼                   ▼
┌─────────────────┐ ┌─────────────────┐
│ Push to GHCR    │ │ Push to GHCR    │
│ (if main)       │ │ (if main)       │
└─────────────────┘ └─────────────────┘
```

## Future Enhancements

- [ ] Add integration tests with test validators/testnets
- [ ] Implement blue-green deployments
- [ ] Add performance benchmarking in CI
- [ ] Configure auto-scaling based on load
- [ ] Add Prometheus/Grafana monitoring dashboards
- [ ] Implement canary deployments
- [ ] Add smoke tests after deployment

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
- [Trivy Security Scanner](https://github.com/aquasecurity/trivy)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
