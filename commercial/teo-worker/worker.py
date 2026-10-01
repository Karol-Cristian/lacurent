from workers import Response, WorkerEntrypoint, asgi

from app.teo_app import app


class Default(WorkerEntrypoint):
    async def fetch(self, request):
        try:
            return await asgi.fetch(app, request, self.env)
        except Exception as exc:
            print(f"[LaCurent TEO] unhandled request exception: {type(exc).__name__}")
            return Response(
                '{"error":"TEO este temporar indisponibil.","stage":"private-teo-worker"}',
                status=503,
                headers={
                    "content-type": "application/json; charset=utf-8",
                    "cache-control": "no-store",
                    "retry-after": "2",
                },
            )
