document.addEventListener('DOMContentLoaded', async ()=>{

  const resultDiv=
  document.getElementById(
  'advancedResults'
  );
  
  try{
  
  const response=
  
  await fetch(
  'https://energy-api.lemnarukarol.workers.dev'
  );
  
  const data=
  await response.json();
  
  if(!data || !data.length){
  
  resultDiv.innerHTML=
  
  `<div class="alert alert-warning">
  
  Nu există date live.
  
  </div>`;
  
  return;
  
  }
  
  renderAnalysis(
  data,
  resultDiv
  );
  
  }
  
  catch(err){
  
  console.error(err);
  
  resultDiv.innerHTML=
  
  `<div class="alert alert-danger">
  
  Eroare API live
  
  </div>`;
  
  }
  
  });
  
  
  
  function renderAnalysis(
  
  data,
  
  resultDiv
  
  ){
  
  const sources=[
  
  'carbune',
  
  'hidro',
  
  'nuclear',
  
  'eolian',
  
  'fotovolt',
  
  'biomasa'
  
  ];
  
  
  
  const installed={
  
  carbune:4000,
  
  hidro:5000,
  
  nuclear:1300,
  
  eolian:1500,
  
  fotovolt:2000,
  
  biomasa:200
  
  };
  
  
  
  const totals={};
  
  let totalProduction=0;
  
  
  
  sources.forEach(src=>{
  
  totals[src]=
  
  data
  
  .map(x=>x[src]||0)
  
  .reduce(
  
  (a,b)=>a+b,
  
  0
  
  );
  
  totalProduction+=
  
  totals[src];
  
  });
  
  
  
  let html=`
  
  <div class="row">
  
  `;
  
  
  
  sources.forEach(src=>{
  
  const avg=
  
  totals[src]
  
  /
  
  data.length;
  
  
  
  const factor=
  
  (
  
  avg
  
  /
  
  installed[src]
  
  )
  
  *100;
  
  
  
  html+=`
  
  <div class="col-md-4 mb-4">
  
  <div class="kpi-card">
  
  <h3>
  
  ${factor.toFixed(1)}%
  
  </h3>
  
  <p>
  
  ${src}
  
  </p>
  
  <small>
  
  Factor capacitate
  
  </small>
  
  </div>
  
  </div>
  
  `;
  
  });
  
  
  
  html+=`
  
  </div>
  
  
  
  <div class="graph-card">
  
  <h3>
  
  Mix energetic %
  
  </h3>
  
  <canvas id="mixChart">
  
  </canvas>
  
  </div>
  
  
  
  <div class="graph-card">
  
  <h3>
  
  Impact estimat CO₂
  
  </h3>
  
  <canvas id="emissionChart">
  
  </canvas>
  
  </div>
  
  `;
  
  
  
  resultDiv.innerHTML=html;
  
  
  
  new Chart(
  
  document
  .getElementById(
  'mixChart'
  ),
  
  {
  
  type:'doughnut',
  
  data:{
  
  labels:sources,
  
  datasets:[{
  
  data:
  
  sources.map(
  
  x=>
  
  (
  
  totals[x]
  
  /
  
  totalProduction
  
  )
  
  *100
  
  )
  
  }]
  
  }
  
  }
  
  );
  
  
  
  new Chart(
  
  document
  .getElementById(
  'emissionChart'
  ),
  
  {
  
  type:'bar',
  
  data:{
  
  labels:sources,
  
  datasets:[{
  
  label:'kg CO₂',
  
  data:[
  
  totals.carbune*900,
  
  totals.hidro*50,
  
  totals.nuclear*12,
  
  totals.eolian*10,
  
  totals.fotovolt*20,
  
  totals.biomasa*150
  
  ]
  
  }]
  
  }
  
  }
  
  );
  
  }