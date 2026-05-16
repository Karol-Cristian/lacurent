document.addEventListener(
  'DOMContentLoaded',
  ()=>{
  
  loadData();
  
  setInterval(
  loadData,
  60000
  );
  
  }
  );
  
  
  const installed={
  
  carbune:1320,
  hidro:6444,
  nuclear:1400,
  eolian:3029,
  fotovolt:1822,
  biomasa:142
  
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
  
  normalizeData(raw);
  
  if(!data.length){
  
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
  
  updateAdvanced(
  latest
  );
  
  }
  catch(err){
  
  console.error(
  "loadData:",
  err
  );
  
  }
  
  }
  
  
  
  function normalizeData(raw){
  
  return raw.map(row=>({
  
  date:
  row.date||"",
  
  consum:
  
  Number(
  row.consum ||
  row["Putere cerută [MW]"]||
  0
  ),
  
  productie:
  
  Number(
  row.productie||
  row["Putere debitată [MW]"]||
  0
  ),
  
  carbune:
  
  Number(
  row.carbune||
  row["Carbune"]||
  0
  ),
  
  hidro:
  
  Number(
  row.hidro||
  row["Hidro"]||
  0
  ),
  
  nuclear:
  
  Number(
  row.nuclear||
  row["Nuclear"]||
  0
  ),
  
  eolian:
  
  Number(
  row.eolian||
  row["Eolian"]||
  0
  ),
  
  fotovolt:
  
  Math.max(
  0,
  Number(
  row.fotovolt||
  row["Fotovolt"]||
  0
  )
  ),
  
  biomasa:
  
  Number(
  row.biomasa||
  row["Biomasa"]||
  0
  )
  
  }));
  
  }
  
  
  
  function updateAdvanced(latest){
  
  updateCapacityCards(
  latest
  );
  
  drawMixChart(
  latest
  );
  
  }
  
  
  
  function updateCapacityCards(latest){
  
  updateOne(
  "carbune",
  latest.carbune,
  installed.carbune
  );
  
  updateOne(
  "hidro",
  latest.hidro,
  installed.hidro
  );
  
  updateOne(
  "nuclear",
  latest.nuclear,
  installed.nuclear
  );
  
  updateOne(
  "eolian",
  latest.eolian,
  installed.eolian
  );
  
  updateOne(
  "fotovolt",
  latest.fotovolt,
  installed.fotovolt
  );
  
  updateOne(
  "biomasa",
  latest.biomasa,
  installed.biomasa
  );
  
  }
  
  
  
  function updateOne(
  
  id,
  current,
  max
  
  ){
  
  const el=
  
  document.getElementById(
  id
  );
  
  if(!el)return;
  
  const percent=
  
  (
  current/
  max*
  100
  )
  .toFixed(1);
  
  el.innerHTML=
  
  percent+
  
  "%<br><small>"+
  
  current+
  
  " MW / "+
  
  max+
  
  " MW instalați</small>";
  
  }
  
  
  
  function drawMixChart(latest){
  
  const canvas=
  
  document.getElementById(
  "mixChart"
  );
  
  if(!canvas){
  
  console.log(
  "Nu există canvas"
  );
  
  return;
  
  }
  
  const ctx=
  canvas.getContext(
  "2d"
  );
  
  
  const sources=[
  
  {
  name:"Carbune",
  value:latest.carbune,
  color:"#ef476f"
  },
  
  {
  name:"Hidro",
  value:latest.hidro,
  color:"#3a86ff"
  },
  
  {
  name:"Nuclear",
  value:latest.nuclear,
  color:"#06d6a0"
  },
  
  {
  name:"Eolian",
  value:latest.eolian,
  color:"#8338ec"
  },
  
  {
  name:"Fotovoltaic",
  value:latest.fotovolt,
  color:"#ffbe0b"
  },
  
  {
  name:"Biomasă",
  value:latest.biomasa,
  color:"#90be6d"
  }
  
  ]
  
  .filter(
  x=>x.value>0
  );
  
  
  const total=
  
  sources.reduce(
  (a,b)=>
  a+b.value,
  0
  );
  
  
  if(total===0){
  
  console.log(
  "Total zero"
  );
  
  return;
  
  }
  
  
  const percentages=
  
  sources.map(
  x=>
  
  (
  x.value/
  total*
  100
  ).toFixed(1)
  
  );
  
  
  
  try{
  
  if(
  
  window.mixChart &&
  
  typeof
  window.mixChart.destroy
  ==="function"
  
  ){
  
  window.mixChart.destroy();
  
  }
  
  }catch(e){}
  
  
  
  window.mixChart=
  
  new Chart(ctx,{
  
  type:"doughnut",
  
  data:{
  
  labels:
  
  sources.map(
  x=>x.name
  ),
  
  datasets:[{
  
  data:percentages,
  
  backgroundColor:
  
  sources.map(
  x=>x.color
  ),
  
  borderWidth:2
  
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
  
  const i=
  context.dataIndex;
  
  return
  
  sources[i].name+
  
  ": "+
  
  percentages[i]+
  
  "% ("+
  
  sources[i].value+
  
  " MW)";
  
  }
  
  }
  
  }
  
  }
  
  }
  
  });
  
  }