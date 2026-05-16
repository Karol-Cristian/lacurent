document.addEventListener("DOMContentLoaded",()=>{

  loadData();
  
  setInterval(
  loadData,
  60000
  );
  
  });
  
  
  async function loadData(){
  
  try{
  
  const response=
  await fetch(
  "https://energy-api.lemnarukarol.workers.dev/"
  );
  
  const raw=
  await response.json();
  
  const data=raw
  
  .filter(x=>x.date)
  
  .map(x=>({
  
  date:x.date,
  
  consum:Number(
  x.consum ??
  x["Putere cerută"] ??
  0
  ),
  
  productie:Number(
  x.productie ??
  x["Putere debitată"] ??
  0
  ),
  
  carbune:Number(
  x.carbune ??
  x["Carbune"] ??
  0
  ),
  
  hidro:Number(
  x.hidro ??
  x["Hidro"] ??
  0
  ),
  
  nuclear:Number(
  x.nuclear ??
  x["Nuclear"] ??
  0
  ),
  
  eolian:Number(
  x.eolian ??
  x["Eolian"] ??
  0
  ),
  
  fotovolt:Number(
  x.fotovolt ??
  x["Fotovoltaic"] ??
  0
  ),
  
  biomasa:Number(
  x.biomasa ??
  x["Biomasa"] ??
  0
  )
  
  }));
  
  updateAdvanced(data);
  
  }
  catch(err){
  
  console.log(err);
  
  }
  
  }
  
  
  
  function updateAdvanced(data){
  
  const latest=
  data[data.length-1];
  
  const total=
  
  latest.carbune+
  latest.hidro+
  latest.nuclear+
  latest.eolian+
  latest.fotovolt+
  latest.biomasa;
  
  
  setPercent(
  "carbune",
  latest.carbune,
  total
  );
  
  setPercent(
  "hidro",
  latest.hidro,
  total
  );
  
  setPercent(
  "nuclear",
  latest.nuclear,
  total
  );
  
  setPercent(
  "eolian",
  latest.eolian,
  total
  );
  
  setPercent(
  "fotovolt",
  latest.fotovolt,
  total
  );
  
  setPercent(
  "biomasa",
  latest.biomasa,
  total
  );
  
  
  drawMixChart(latest);
  
  }
  
  
  
  function setPercent(
  
  id,
  value,
  total
  
  ){
  
  const percent=
  
  ((value/total)*100)
  .toFixed(1);
  
  const el=
  
  document.getElementById(id);
  
  if(el){
  
  el.innerText=
  percent+"%";
  
  }
  
  }
  
  
  
  function drawMixChart(latest){
  
  const ctx=
  
  document
  .getElementById(
  "mixChart"
  )
  .getContext("2d");
  
  
  if(window.mixChart){
  
  window.mixChart.destroy();
  
  }
  
  
  window.mixChart=
  
  new Chart(ctx,{
  
  type:"doughnut",
  
  data:{
  
  labels:[
  
  "Carbune",
  "Hidro",
  "Nuclear",
  "Eolian",
  "Fotovoltaic",
  "Biomasa"
  
  ],
  
  datasets:[{
  
  data:[
  
  latest.carbune,
  latest.hidro,
  latest.nuclear,
  latest.eolian,
  latest.fotovolt,
  latest.biomasa
  
  ],
  
  backgroundColor:[
  
  "#ef476f",
  "#3a86ff",
  "#06d6a0",
  "#8338ec",
  "#ffbe0b",
  "#90be6d"
  
  ]
  
  }]
  
  },
  
  options:{
  
  responsive:true,
  
  maintainAspectRatio:false
  
  }
  
  });
  
  }