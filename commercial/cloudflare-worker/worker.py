from workers import Response, WorkerEntrypoint, asgi

from app.main import app


class Default(WorkerEntrypoint):
    async def fetch(self, request):
        try:
            return await asgi.fetch(app, request, self.env)
        except Exception as exc:
            # Keep ordinary ASGI/runtime exceptions from surfacing as a raw
            # Cloudflare 1101 page. Hard isolate termination (CPU/memory) can
            # still bypass this guard and must be diagnosed from Worker logs.
            print(f"[LaCurent Worker] unhandled request exception: {type(exc).__name__}")
            return Response(
                "Serviciul de calcul este temporar indisponibil.",
                status=503,
                headers={
                    "content-type": "text/plain; charset=utf-8",
                    "cache-control": "no-store",
                    "retry-after": "2",
                },
            )
