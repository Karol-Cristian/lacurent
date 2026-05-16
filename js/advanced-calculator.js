function drawMixChart(latest){

  console.log(
  "=== DRAW START ==="
  );
  
  const canvas=
  document.getElementById(
  "mixChart"
  );
  
  if(!canvas){
  
  console.error(
  "mixChart nu există"
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
  value:Math.max(
  0,
  Number(
  latest.carbune
  )||0
  ),
  color:"#ef476f"
  },
  
  {
  name:"Hidro",
  value:Math.max(
  0,
  Number(
  latest.hidro
  )||0
  ),
  color:"#3a86ff"
  },
  
  {
  name:"Nuclear",
  value:Math.max(
  0,
  Number(
  latest.nuclear
  )||0
  ),
  color:"#06d6a0"
  },
  
  {
  name:"Eolian",
  value:Math.max(
  0,
  Number(
  latest.eolian
  )||0
  ),
  color:"#8338ec"
  },
  
  {
  name:"Fotovoltaic",
  value:Math.max(
  0,
  Number(
  latest.fotovolt
  )||0
  ),
  color:"#ffbe0b"
  },
  
  {
  name:"Biomasă",
  value:Math.max(
  0,
  Number(
  latest.biomasa
  )||0
  ),
  color:"#90be6d"
  }
  
  ]
  
  .filter(
  x=>x.value>0
  );
  
  
  console.log(
  "Surse:",
  sources
  );
  
  
  const total=
  
  sources.reduce(
  
  (sum,item)=>
  
  sum+item.value,
  
  0
  
  );
  
  
  console.log(
  "Total:",
  total
  );
  
  
  if(total===0){
  
  console.error(
  "Total zero"
  );
  
  return;
  
  }
  
  
  const percentages=
  
  sources.map(x=>({
  
  name:x.name,
  
  value:x.value,
  
  color:x.color,
  
  percent:Number(
  
  (
  x.value
  /
  total
  *
  100
  )
  
  .toFixed(1)
  
  )
  
  }));
  
  
  console.log(
  "Procente:",
  percentages
  );
  
  
  
  try{
  
  if(
  
  window.mixChart &&
  
  typeof
  window.mixChart.destroy
  ===
  
  "function"
  
  ){
  
  window.mixChart.destroy();
  
  }
  
  }
  
  catch(e){
  
  console.log(
  "skip destroy"
  );
  
  }
  
  
  
  window.mixChart=
  
  new Chart(ctx,{
  
  type:"doughnut",
  
  data:{
  
  labels:
  
  percentages.map(
  x=>x.name
  ),
  
  datasets:[{
  
  data:
  
  percentages.map(
  x=>x.percent
  ),
  
  backgroundColor:
  
  percentages.map(
  x=>x.color
  ),
  
  borderColor:"#fff",
  
  borderWidth:3,
  
  hoverOffset:20
  
  }]
  
  },
  
  options:{
  
  responsive:true,
  
  maintainAspectRatio:false,
  
  cutout:"55%",
  
  plugins:{
  
  legend:{
  
  position:"right",
  
  labels:{
  
  padding:20,
  
  font:{
  
  size:14
  
  }
  
  }
  
  },
  
  tooltip:{
  
  callbacks:{
  
  label:function(context){
  
  const item=
  
  percentages[
  context.dataIndex
  ];
  
  
  return
  
  item.name+
  
  ": "+
  
  item.percent+
  
  "% ("+
  
  item.value+
  
  " MW)";
  
  }
  
  }
  
  }
  
  }
  
  }
  
  });
  
  console.log(
  "Grafic creat"
  );
  
  }