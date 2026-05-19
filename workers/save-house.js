export default {

  async fetch(request, env) {
  
  const url =
  new URL(request.url);
  
  
  
  if(
  url.pathname !==
  "/api/save-house"
  ){
  
  return new Response(
  "Not found",
  {status:404}
  );
  
  }
  
  
  if(
  request.method==="OPTIONS"
  ){
  
  return new Response(
  null,
  {
  headers:{
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Access-Control-Allow-Headers":"Content-Type"
  }
  }
  );
  
  }
  
  
  if(
  request.method!=="POST"
  ){
  
  return Response.json(
  {
  success:false,
  error:"Method not allowed"
  },
  {
  status:405,
  headers:{
  "Access-Control-Allow-Origin":"*"
  }
  }
  );
  
  }
  
  
  const body=
  await request.json();
  
  
  await env.DB.prepare(`
  
  INSERT INTO houses(
  house_type,
  surface,
  rooms,
  year,
  city
  )
  
  VALUES(?,?,?,?,?)
  
  `)
  
  .bind(
  
  body.house_type,
  body.surface,
  body.rooms,
  body.year,
  body.city
  
  )
  
  .run();
  
  
  return Response.json(
  {
  success:true
  },
  {
  headers:{
  "Access-Control-Allow-Origin":"*"
  }
  }
  );
  
  }
  
  }