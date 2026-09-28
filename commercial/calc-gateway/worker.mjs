export async function encodeLiveCalculationForm(request) {
  const contentType = String(request.headers.get("content-type") || "").toLowerCase();

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const params = new URLSearchParams();
    for (const [key, value] of form.entries()) {
      if (typeof value !== "string") {
        throw new TypeError("Home Lab live calculation does not accept file uploads.");
      }
      params.append(key, value);
    }
    return params.toString();
  }

  // application/x-www-form-urlencoded is already the canonical transport used
  // by the Python shard parser. Keep it byte-light and avoid reparsing it here.
  return await request.text();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return Response.json({
        status: "ok",
        service: "lacurent-home-lab-calc-gateway",
      });
    }

    if (
      request.method !== "POST" ||
      url.pathname !== "/api/home-lab-next/calculate"
    ) {
      return Response.json({error:"Not found"}, {status:404});
    }

    try {
      const encodedForm = await encodeLiveCalculationForm(request);
      const rawJson = await env.RBPE_ROUTER.calculate_home_lab_form_api_json(
        encodedForm,
      );
      return new Response(rawJson, {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
          "x-lacurent-calc": "private-rbpe-sharded",
        },
      });
    } catch (error) {
      return Response.json(
        {
          error: "Serviciul de calcul este temporar indisponibil.",
          errorType: error?.name || "Error",
        },
        {
          status: 503,
          headers: {
            "cache-control": "no-store",
            "retry-after": "1",
          },
        },
      );
    }
  },
};
