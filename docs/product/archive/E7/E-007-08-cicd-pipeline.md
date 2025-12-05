---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-007-08: CI/CD Pipeline for Blockchain Adapter Containers"
labels: ["development", "copilot", "devops", "ci-cd", "docker", "T5"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent**.

---

## 1. Summary

Add CI/CD pipeline support for building, testing, and publishing blockchain adapter Docker containers (Solana and Polygon). Automate testing and deployment to ensure adapters can be built and deployed reliably.

---

## 2. Requirements

- Add Dockerfile build steps to CI pipeline for Solana adapter
- Add Dockerfile build steps to CI pipeline for Polygon adapter
- Configure automated tests for Solana adapter in CI
- Configure automated tests for Polygon adapter in CI
- Add Docker image publishing to container registry (GitHub Container Registry)
- Create Kubernetes deployment manifests (or Docker Compose for staging)
- Add health check monitoring in deployment
- Configure image vulnerability scanning (Trivy or Snyk)

---

## 3. Acceptance Criteria (Testable)

- [ ] GitHub Actions workflow created or updated: `.github/workflows/blockchain-adapters.yml`
- [ ] Workflow triggers on:
  - Push to `main` branch (changes in `adapters/` directory)
  - Pull requests (changes in `adapters/` directory)
  - Manual workflow dispatch
- [ ] Solana adapter build step:
  - `docker build` for Solana adapter
  - Run unit tests in Docker container
  - Run integration tests (if Solana test validator available in CI)
- [ ] Polygon adapter build step:
  - `docker build` for Polygon adapter
  - Run unit tests in Docker container
  - Run integration tests (if Mumbai testnet accessible)
- [ ] Docker image tagging:
  - Latest: `ghcr.io/bscoggins/fanengagement-solana-adapter:latest`
  - Commit SHA: `ghcr.io/bscoggins/fanengagement-solana-adapter:abc1234`
  - Semantic version (if tagged): `ghcr.io/bscoggins/fanengagement-solana-adapter:v1.0.0`
- [ ] Docker images published to GitHub Container Registry (ghcr.io)
- [ ] Image vulnerability scanning with Trivy:
  - Scan on every build
  - Fail build on HIGH or CRITICAL vulnerabilities
- [ ] Kubernetes deployment manifests created:
  - `deploy/kubernetes/solana-adapter-deployment.yaml`
  - `deploy/kubernetes/polygon-adapter-deployment.yaml`
  - Include: Deployment, Service, health checks, resource limits
- [ ] Health check endpoint tested in CI (`/health` returns 200)
- [ ] Documentation created at `docs/blockchain/adapter-cicd.md`
- [ ] CI pipeline runs successfully for both adapters

---

## 4. Constraints

- Use GitHub Actions (existing CI platform)
- Use GitHub Container Registry (ghcr.io) for image storage
- Multi-stage Docker builds for smaller images
- Layer caching to speed up builds
- Security: Scan images before publishing
- Secrets: Use GitHub Secrets for API keys and credentials

---

## 5. Technical Notes (Optional)

**GitHub Actions Workflow Structure:**

```yaml
name: Blockchain Adapters CI/CD

on:
  push:
    branches: [main]
    paths:
      - 'adapters/**'
  pull_request:
    paths:
      - 'adapters/**'
  workflow_dispatch:

jobs:
  build-solana-adapter:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Build Solana adapter
        run: |
          cd adapters/solana
          docker build -t solana-adapter:test .
      
      - name: Run unit tests
        run: |
          docker run --rm solana-adapter:test npm test
      
      - name: Run Trivy security scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'solana-adapter:test'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'
      
      - name: Login to GitHub Container Registry
        if: github.event_name != 'pull_request'
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Tag and push image
        if: github.event_name != 'pull_request'
        run: |
          docker tag solana-adapter:test ghcr.io/bscoggins/fanengagement-solana-adapter:latest
          docker tag solana-adapter:test ghcr.io/bscoggins/fanengagement-solana-adapter:${{ github.sha }}
          docker push ghcr.io/bscoggins/fanengagement-solana-adapter:latest
          docker push ghcr.io/bscoggins/fanengagement-solana-adapter:${{ github.sha }}
      
      - name: Test health endpoint
        run: |
          docker run -d --name adapter-test -p 3001:3001 solana-adapter:test
          sleep 5
          curl -f http://localhost:3001/health || exit 1
          docker stop adapter-test

  build-polygon-adapter:
    runs-on: ubuntu-latest
    steps:
      # Similar structure for Polygon adapter
```

**Kubernetes Deployment Manifest Example:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: solana-adapter
  namespace: fanengagement
spec:
  replicas: 2
  selector:
    matchLabels:
      app: solana-adapter
  template:
    metadata:
      labels:
        app: solana-adapter
    spec:
      containers:
      - name: solana-adapter
        image: ghcr.io/bscoggins/fanengagement-solana-adapter:latest
        ports:
        - containerPort: 3001
        env:
        - name: SOLANA_RPC_URL
          value: "https://api.devnet.solana.com"
        - name: API_KEY
          valueFrom:
            secretKeyRef:
              name: blockchain-adapters
              key: solana-api-key
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: solana-adapter
  namespace: fanengagement
spec:
  selector:
    app: solana-adapter
  ports:
  - port: 80
    targetPort: 3001
  type: ClusterIP
```

**Trivy Security Scanning:**
- Scans Docker images for known vulnerabilities
- Fails build on HIGH or CRITICAL severity
- Generates SARIF report for GitHub Security tab

**Image Optimization:**
- Use multi-stage builds (builder + runtime)
- Use Alpine Linux base images for smaller size
- Layer caching: Copy package files first, then source
- .dockerignore to exclude unnecessary files

---

## 6. Desired Agent

- [x] **Default Coding Agent**

---

## 7. Files Allowed to Change

**CI/CD:**
- `.github/workflows/blockchain-adapters.yml` (new)

**Kubernetes:**
- `deploy/kubernetes/solana-adapter-deployment.yaml` (new)
- `deploy/kubernetes/polygon-adapter-deployment.yaml` (new)
- `deploy/kubernetes/blockchain-adapters-namespace.yaml` (new)

**Docker:**
- `adapters/solana/.dockerignore` (if not exists)
- `adapters/polygon/.dockerignore` (if not exists)

**Documentation:**
- `docs/blockchain/adapter-cicd.md`

---

## 8. Completion Criteria

- GitHub Actions workflow successfully builds both adapters
- Docker images published to ghcr.io
- Trivy security scanning integrated
- Kubernetes manifests ready for deployment
- Health checks functional
- Documentation complete for CI/CD and deployment
