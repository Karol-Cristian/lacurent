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
  
  console.log(
  "RAW:",
  raw[0]
  );
  
  
  const data=
  
  raw
  
  .filter(
  x=>x.date
  )
  
  .map(x=>({
  
  date:x.date,
  
  
  consum:Number(
  
  x.consum ??
  
  x["Putere cerută"] ??
  
  x["Putere ceruta"] ??
  
  0
  
  ),
  
  
  productie:Number(
  
  x.productie ??
  
  x["Putere debitată"] ??
  
  x["Putere debitata"] ??
  
  0
  
  ),
  
  
  carbune:Number(
  
  x.carbune ??
  
  x.Carbune ??
  
  x["Carbune"] ??
  
  0
  
  ),
  
  
  hidro:Number(
  
  x.hidro ??
  
  x.Hidro ??
  
  x["Hidro"] ??
  
  0
  
  ),
  
  
  nuclear:Number(
  
  x.nuclear ??
  
  x.Nuclear ??
  
  x["Nuclear"] ??
  
  0
  
  ),
  
  
  eolian:Number(
  
  x.eolian ??
  
  x.Eolian ??
  
  x["Eolian"] ??
  
  0
  
  ),
  
  
  fotovolt:Number(
  
  x.fotovolt ??
  
  x.fotovoltaic ??
  
  x.Fotovoltaic ??
  
  x["Fotovoltaic"] ??
  
  0
  
  ),
  
  
  biomasa:Number(
  
  x.biomasa ??
  
  x.Biomasa ??
  
  x["Biomasa"] ??
  
  0
  
  )
  
  }))
  
  .filter(x=>
  
  x.carbune ||
  
  x.hidro ||
  
  x.nuclear ||
  
  x.eolian ||
  
  x.fotovolt ||
  
  x.biomasa
  
  )
  
  .sort(
  
  (a,b)=>
  
  new Date(a.date)
  
  -
  
  new Date(b.date)
  
  );
  
  
  console.log(
  "Ultimul punct:",
  data[data.length-1]
  );
  
  
  updateAdvanced(
  data
  );
  
  }
  
  catch(err){
  
  console.error(
  "loadData:",
  err
  );
  
  }
  
  }
  
  
  
  
  function updateAdvanced(data){
  
  if(
  !data ||
  data.length===0
  ){
  
  console.error(
  "Nu există date"
  );
  
  return;
  
  }
  
  const latest=
  
  data[data.length-1];
  
  
  console.log(
  "Latest:",
  latest
  );
  
  
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
  
  current/
  
  installedPower
  
  *100
  
  )
  
  .toFixed(1);
  
  
  const el=
  
  document.getElementById(
  id
  );
  
  if(el){
  
  el.innerHTML=
  
  `
  
  <div style="
  font-size:42px;
  font-weight:700;
  ">
  
  ${percent}
  
  <span style="
  font-size:26px
  ">
  
  %
  
  </span>
  
  </div>
  
  
  <div style="
  font-size:13px;
  color:#64748b;
  margin-top:8px;
  line-height:1.5;
  ">
  
  ${Math.round(current)} MW acum
  
  <br>
  
  Instalat:
  ${installedPower} MW
  
  </div>
  
  `;
  
  }
  
  }
  
  
  
  
  function drawMixChart(latest){
  
  const canvas=
  
  document.getElementById(
  "mixChart"
  );
  
  
  if(!canvas){
  
  console.error(
  "mixChart lipsește"
  );
  
  return;
  
  }
  
  
  const ctx=
  
  canvas.getContext(
  "2d"
  );
  
  
  const mixData=[
  
  {
  name:"Carbune",
  value:Number(
  latest.carbune
  )||0,
  color:"#ef476f"
  },
  
  {
  name:"Hidro",
  value:Number(
  latest.hidro
  )||0,
  color:"#3a86ff"
  },
  
  {
  name:"Nuclear",
  value:Number(
  latest.nuclear
  )||0,
  color:"#06d6a0"
  },
  
  {
  name:"Eolian",
  value:Number(
  latest.eolian
  )||0,
  color:"#8338ec"
  },
  
  {
  name:"Fotovoltaic",
  value:Number(
  latest.fotovolt
  )||0,
  color:"#ffbe0b"
  },
  
  {
  name:"Biomasă",
  value:Number(
  latest.biomasa
  )||0,
  color:"#90be6d"
  }
  
  ]
  .filter(
  x=>x.value>0
  );
  
  
  console.log(
  "Mix final:",
  mixData
  );
  
  
  if(
  mixData.length===0
  ){
  
  console.error(
  "Nu există date pentru pie chart"
  );
  
  return;
  
  }
  
  
  if(window.mixChart){
  
  window.mixChart.destroy();
  
  }
  
  
  window.mixChart=
  
  new Chart(ctx,{
  
  type:"doughnut",
  
  data:{
  
  labels:
  mixData.map(
  x=>x.name
  ),
  
  datasets:[{
  
  data:
  mixData.map(
  x=>x.value
  ),
  
  backgroundColor:
  mixData.map(
  x=>x.color
  ),
  
  borderColor:"#fff",
  
  borderWidth:3,
  
  hoverOffset:15
  
  }]
  
  },
  
  options:{
  
  responsive:true,
  
  maintainAspectRatio:false,
  
  cutout:"50%",
  
  plugins:{
  
  legend:{
  
  position:"right"
  
  },
  
  tooltip:{
  
  callbacks:{
  
  label:function(context){
  
  const total=
  
  context.dataset.data
  .reduce(
  (a,b)=>a+b,
  0
  );
  
  const value=
  context.raw;
  
  const percent=
  
  (
  value/
  total*
  100
  )
  .toFixed(1);
  
  return `${context.label}: ${value} MW (${percent}%)`;
  
  }
  
  }
  
  }
  
  }
  
  }
  
  });
  
  }