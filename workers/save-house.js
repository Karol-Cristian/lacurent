export default {

  async fetch(request, env) {
  
  const corsHeaders={
  
  "Access-Control-Allow-Origin":"*",
  
  "Access-Control-Allow-Methods":
  "GET, POST, OPTIONS",
  
  "Access-Control-Allow-Headers":
  "Content-Type"
  
  };
  
  
  if(request.method==="OPTIONS"){
  
  return new Response(
  null,
  {
  headers:corsHeaders
  }
  );
  
  }
  
  
  const url=
  new URL(request.url);
  
  
  if(
  url.pathname!=="/api/save-house"
  ){
  
  return new Response(
  
  "Not found",
  
  {
  
  status:404,
  
  headers:corsHeaders
  
  }
  
  );
  
  }
  
  
  if(request.method!=="POST"){
  
  return new Response(
  
  JSON.stringify({
  
  success:false,
  
  error:"Method not allowed"
  
  }),
  
  {
  
  status:405,
  
  headers:{
  
  ...corsHeaders,
  
  "Content-Type":
  "application/json"
  
  }
  
  }
  
  );
  
  }
  
  
  try{
  
  
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
  
  VALUES(
  
  ?,
  ?,
  ?,
  ?,
  ?
  
  )
  
  `)
  
  .bind(
  
  body.house_type,
  body.surface,
  body.rooms,
  body.year,
  body.city
  
  )
  
  .run();
  
  
  
  return new Response(
  
  JSON.stringify({
  
  success:true
  
  }),
  
  {
  
  headers:{
  
  ...corsHeaders,
  
  "Content-Type":
  "application/json"
  
  }
  
  }
  
  );
  
  }
  
  catch(e){
  
  return new Response(
  
  JSON.stringify({
  
  success:false,
  
  error:e.toString()
  
  }),
  
  {
  
  status:500,
  
  headers:{
  
  ...corsHeaders,
  
  "Content-Type":
  "application/json"
  
  }
  
  }
  
  );
  
  }
  
  }
  
  }