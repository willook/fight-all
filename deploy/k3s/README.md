# GLADI k3s 운영

GLADI 웹은 프로덕션 정적 빌드(`dist`)를 Pod 시작 시 내부 볼륨으로 복사한 뒤 nginx로 서빙합니다. k3s `LoadBalancer` 서비스는 `5173` 포트를 노출합니다.

```bash
npm run build
KUBECONFIG=/home/willook/.kube/config kubectl apply -f deploy/k3s/gladi-web.yaml
KUBECONFIG=/home/willook/.kube/config kubectl -n gladi rollout restart deployment/gladi-web
KUBECONFIG=/home/willook/.kube/config kubectl -n gladi rollout status deployment/gladi-web
```

접속:

- Tailscale: `http://jindo:5173/`
- ngrok: `https://frantic-cognitive-outskirts.ngrok-free.dev/`

ngrok 터널을 k3s에서 유지하려면 `.env.local`의 `NGROK_TOKEN`을 Secret으로 등록한 뒤 배포합니다.

```bash
set -a
. ./.env.local
set +a
KUBECONFIG=/home/willook/.kube/config kubectl -n gladi create secret generic gladi-ngrok \
  --from-literal=NGROK_AUTHTOKEN="$NGROK_TOKEN" \
  --dry-run=client -o yaml | KUBECONFIG=/home/willook/.kube/config kubectl apply -f -
KUBECONFIG=/home/willook/.kube/config kubectl apply -f deploy/k3s/gladi-ngrok.yaml
KUBECONFIG=/home/willook/.kube/config kubectl -n gladi rollout status deployment/gladi-ngrok
```

상태 확인:

```bash
KUBECONFIG=/home/willook/.kube/config kubectl -n gladi get pods,svc
```
