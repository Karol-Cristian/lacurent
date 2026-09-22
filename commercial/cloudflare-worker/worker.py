from workers import WorkerEntrypoint, asgi

from app.main import app
from app.simulation_facts import publish_next_simulation_fact


class Default(WorkerEntrypoint):
    async def fetch(self, request):
        return await asgi.fetch(app, request, self.env)

    async def scheduled(self, controller, env, ctx):
        await publish_next_simulation_fact(env)
