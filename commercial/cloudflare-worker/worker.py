from workers import WorkerEntrypoint, asgi

from app.main import app


class Default(WorkerEntrypoint):
    async def fetch(self, request):
        return await asgi.fetch(app, request, self.env)
