document.addEventListener("DOMContentLoaded",()=>{

  loadData();
  
  setInterval(
  loadData,
  60000
  );
  
  });
  
  
  
  const installed={
  
  carbune:2300,
  
  hidro:6700,
  
  nuclear:1400,
  
  eolian:3100,
  
  fotovolt:4400,
  
  biomasa:150
  
  };
  
  
  
  async function loadData(){
  
  try{
  
  const response=
  
  await fetch(
  "https://energy-api.lemnarukarol.workers.dev/"
  );
  
  if(!response.ok){
  
  throw new Error(
  "API unavailable"
  );
  
  }
  
  const raw=
  
  await response.json();
  
  
  const data=
  
  raw
  
  .filter(x=>x.date)
  
  .map(x=>({
  
  date:x.date,
  
  consum:Number(
  
  x.consum ??
  
  x["Putere cerută"] ??
  
  x["Putere ceruta"] ??
  
  x["Putere cerut&#259;"]
  
  )||0,
  
  
  productie:Number(
  
  x.productie ??
  
  x["Putere debitată"] ??
  
  x["Putere debitata"] ??
  
  x["Putere debitat&#259;"]
  
  )||0,
  
  
  carbune:Math.max(
  0,
  Number(
  x.carbune ??
  x["Carbune"]
  )||0
  ),
  
  hidro:Math.max(
  0,
  Number(
  x.hidro ??
  x["Hidro"]
  )||0
  ),
  
  nuclear:Math.max(
  0,
  Number(
  x.nuclear ??
  x["Nuclear"]
  )||0
  ),
  
  eolian:Math.max(
  0,
  Number(
  x.eolian ??
  x["Eolian"]
  )||0
  ),
  
  fotovolt:Math.max(
  0,
  Number(
  x.fotovolt ??
  x["Fotovoltaic"] ??
  x["Fotovolt"]
  )||0
  ),
  
  biomasa:Math.max(
  0,
  Number(
  x.biomasa ??
  x["Biomasa"]
  )||0
  
  )
  
  }))
  
  .sort(
  (a,b)=>
  
  new Date(a.date)
  -
  new Date(b.date)
  
  );
  
  
  updateAdvanced(
  data
  );
  
  }
  catch(err){
  
  console.error(
  err
  );
  
  }
  
  }
  
  
  
  
  function updateAdvanced(data){
  
  const latest=
  
  data[data.length-1];
  
  
  setCapacity(
  
  "carbune",
  
  latest.carbune,
  
  installed.carbune
  
  );
  
  
  setCapacity(
  
  "hidro",
  
  latest.hidro,
  
  installed.hidro
  
  );
  
  
  setCapacity(
  
  "nuclear",
  
  latest.nuclear,
  
  installed.nuclear
  
  );
  
  
  setCapacity(
  
  "eolian",
  
  latest.eolian,
  
  installed.eolian
  
  );
  
  
  setCapacity(
  
  "fotovolt",
  
  latest.fotovolt,
  
  installed.fotovolt
  
  );
  
  
  setCapacity(
  
  "biomasa",
  
  latest.biomasa,
  
  installed.biomasa
  
  );
  
  
  drawMixChart(
  latest
  );
  
  }
  
  
  
  function setCapacity(
  
  id,
  
  current,
  
  installedPower
  
  ){
  
  const percent=
  
  (
  
  current
  /
  installedPower
  *
  100
  
  )
  
  .toFixed(1);
  
  
  const el=
  
  document.getElementById(
  id
  );
  
  if(el){
  
  el.innerHTML=
  
  percent+
  
  `<br><small>
  
  ${Math.round(current)}
  
  MW / 
  
  ${installedPower}
  
  MW
  
  </small>`;
  
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
  
  "Biomasă"
  
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
  
  ],
  
  borderWidth:0
  
  }]
  
  },
  
  options:{
  
  responsive:true,
  
  maintainAspectRatio:false,
  
  plugins:{
  
  legend:{
  
  position:"bottom"
  
  }
  
  }
  
  }
  
  });
  
  }