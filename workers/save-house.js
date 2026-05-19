export default {

  async fetch(request, env) {
  
  if(request.method!=="POST"){
  
  return new Response(
  "Method not allowed",
  {status:405}
  );
  
  }
  
  
  try{
  
  const body=
  
  await request.json();
  
  
  
  await env.DB
  .prepare(
  
  `
  
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
  
  `
  
  )
  
  .bind(
  
  body.house_type,
  
  body.surface,
  
  body.rooms,
  
  body.year,
  
  body.city
  
  )
  
  .run();
  
  
  
  return Response.json({
  
  success:true
  
  });
  
  }
  
  catch(e){
  
  return Response.json({
  
  success:false,
  
  error:e.toString()
  
  });
  
  }
  
  }
  
  }