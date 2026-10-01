from workers import Response, WorkerEntrypoint, asgi

from app.teo_service import app


class Default(WorkerEntrypoint):
    async def fetch(self, request):
        try:
            return await asgi.fetch(app, request, self.env)
        except Exception as exc:
            print(
                "[LaCurent TEO Worker] unhandled request exception: "
                f"{type(exc).__name__}: {str(exc)[:240]}"
            )
            return Response(
                '{"error":"TEO este temporar indisponibil.","stage":"private-teo-worker"}',
                status=503,
                headers={
                    "content-type": "application/json; charset=utf-8",
                    "cache-control": "no-store",
                    "retry-after": "2",
                },
            )
