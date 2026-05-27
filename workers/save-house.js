function value(body, key) {
  return body[key] === undefined || body[key] === "" ? null : body[key];
}

function numberValue(body, key) {
  const raw = value(body, key);
  if (raw === null) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function boolValue(body, key) {
  const raw = value(body, key);
  if (raw === null) {
    return null;
  }

  return raw === "Da" ? 1 : 0;
}

function jsonResponse(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...init.headers,
      "Content-Type": "application/json"
    }
  });
}

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders
      });
    }

    const url = new URL(request.url);

    if (url.pathname !== "/api/save-house") {
      return new Response("Not found", {
        status: 404,
        headers: corsHeaders
      });
    }

    if (request.method !== "POST") {
      return jsonResponse(
        {
          success: false,
          error: "Method not allowed"
        },
        {
          status: 405,
          headers: corsHeaders
        }
      );
    }

    try {
      const body = await request.json();

      const houseResult = await env.DB.prepare(`
        INSERT INTO houses(
          house_type,
          surface,
          rooms,
          year,
          city
        )
        VALUES(?, ?, ?, ?, ?)
      `)
        .bind(
          value(body, "house_type"),
          numberValue(body, "surface"),
          numberValue(body, "rooms"),
          numberValue(body, "year"),
          value(body, "city")
        )
        .run();

      const houseId = houseResult.meta?.last_row_id;

      if (!houseId) {
        throw new Error("House insert did not return an id");
      }

      await env.DB.batch([
        env.DB.prepare(`
          INSERT INTO household_profiles(
            house_id,
            consumer_type,
            people_count,
            children_count,
            senior_count,
            work_from_home,
            work_from_home_days,
            occupancy_pattern,
            frequent_travel
          )
          VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          houseId,
          value(body, "consumer_type"),
          numberValue(body, "people_count"),
          numberValue(body, "children_count"),
          numberValue(body, "senior_count"),
          value(body, "work_from_home"),
          numberValue(body, "work_from_home_days"),
          value(body, "occupancy_pattern"),
          value(body, "frequent_travel")
        ),

        env.DB.prepare(`
          INSERT INTO building_features(
            house_id,
            built_surface,
            floors,
            bathrooms,
            ceiling_height,
            basement,
            attic,
            mansard,
            garage
          )
          VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          houseId,
          numberValue(body, "built_surface"),
          numberValue(body, "floors"),
          numberValue(body, "bathrooms"),
          numberValue(body, "ceiling_height"),
          value(body, "basement"),
          value(body, "attic"),
          value(body, "mansard"),
          value(body, "garage")
        ),

        env.DB.prepare(`
          INSERT INTO envelope_profiles(
            house_id,
            wall_material,
            wall_thickness,
            wall_insulation,
            windows
          )
          VALUES(?, ?, ?, ?, ?)
        `).bind(
          houseId,
          value(body, "wall_material"),
          numberValue(body, "wall_thickness"),
          value(body, "wall_insulation"),
          value(body, "windows")
        ),

        env.DB.prepare(`
          INSERT INTO energy_profiles(
            house_id,
            heating,
            temperature_day,
            temperature_night,
            smart_thermostat,
            provider,
            monthly_bill,
            monthly_kwh
          )
          VALUES(?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          houseId,
          value(body, "heating"),
          numberValue(body, "temperature_day"),
          numberValue(body, "temperature_night"),
          value(body, "smart_thermostat"),
          value(body, "provider"),
          numberValue(body, "monthly_bill"),
          numberValue(body, "monthly_kwh")
        ),

        env.DB.prepare(`
          INSERT INTO appliances(
            house_id,
            fridge_class,
            washer_class,
            dryer,
            dishwasher
          )
          VALUES(?, ?, ?, ?, ?)
        `).bind(
          houseId,
          value(body, "fridge_class"),
          value(body, "washer_class"),
          boolValue(body, "dryer"),
          null
        ),

        env.DB.prepare(`
          INSERT INTO billing_documents(
            house_id,
            invoice_file_name
          )
          VALUES(?, ?)
        `).bind(
          houseId,
          value(body, "invoice_pdf")
        ),

        env.DB.prepare(`
          INSERT INTO green_mobility_profiles(
            house_id,
            solar_panels,
            installed_power,
            electric_car
          )
          VALUES(?, ?, ?, ?)
        `).bind(
          houseId,
          value(body, "solar_panels"),
          numberValue(body, "installed_power"),
          value(body, "electric_car")
        )
      ]);

      return jsonResponse(
        {
          success: true,
          house_id: houseId
        },
        {
          headers: corsHeaders
        }
      );
    } catch (e) {
      return jsonResponse(
        {
          success: false,
          error: e.toString()
        },
        {
          status: 500,
          headers: corsHeaders
        }
      );
    }
  }
};
