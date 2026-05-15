document.addEventListener('DOMContentLoaded',()=>{

  console.log("Pornire aplicație");

  loadLiveData();

  setInterval(
      loadLiveData,
      60000
  );

});


async function loadLiveData(){

  try{

      console.log(
      "Cerere API..."
      );

      const response=

      await fetch(
      "https://energy-api.lemnarukarol.workers.dev/"
      );

      console.log(
      "Status:",
      response.status
      );

      if(!response.ok){

          throw new Error(
          "API unavailable"
          );

      }

      const data=
      await response.json();

      console.log(
      "Date API:"
      );

      console.log(data);

      processData(data);

  }

  catch(error){

      console.error(
      "Live data error:",
      error
      );

  }

}



function processData(data){

  const filtered=data
  .filter(x=>x.date)
  .map(x=>({
  
  date:x.date,
  
  productie:Number(
  x["Putere cerut&#259;"]
  )||0,
  
  consum:Number(
  x["Putere debitat&#259;"]
  )||0,
  
  carbune:Math.max(
  0,
  Number(x["Carbune"])||0
  ),
  
  hidro:Math.max(
  0,
  Number(x["Hidro"])||0
  ),
  
  nuclear:Math.max(
  0,
  Number(x["Nuclear"])||0
  ),
  
  eolian:Math.max(
  0,
  Number(x["Eolian"])||0
  ),
  
  hidrocarburi:Math.max(
  0,
  Number(x["Hidrocarburi"])||0
  ),
  
  fotovolt:Math.max(
  0,
  Number(x["Fotovoltaic"])||0
  ),
  
  biomasa:Math.max(
  0,
  Number(x["Biomasa"])||0
  ),
  
  sold:Number(
  x["Sold"]
  )||0
  
  }));
  
  window.csvData=filtered;
  
  updateDashboard(filtered);
  
  }



function updateDashboard(data){

  try{

  updateKPIs(data);

  updateCharts(data);

  updateTimestamp();

  }

  catch(e){

      console.error(
      "Dashboard error:",
      e
      );

  }

}



function updateTimestamp(){

const el=

document.getElementById(
'lastUpdate'
);

if(el){

el.innerText=

"Actualizat: "+

new Date()

.toLocaleString(
'ro-RO'
);

}

}



function updateKPIs(data){

try{

const latest=data[0];

console.log(
"KPI:",
latest
);

setValue(
"prodTotal",
(latest.productie||0)+" MW"
);

setValue(
"consumTotal",
(latest.consum||0)+" MW"
);

setValue(
"soldTotal",
(latest.sold||0)+" MW"
);

setValue(
"co2",
((latest.carbune||0)*900)+" kg"
);

}
catch(e){

console.log(
"KPI error:",
e
);

}

}



function setValue(id,value){

const el=

document.getElementById(
id
);

if(el){

el.innerText=value;

}

}



function updateCharts(data){

try{

const dates=

data.map(
x=>x.date
);


if(

document.getElementById(
'phaseShiftChart'
)

){

createProductionChart(
dates,
data
);

}


if(

document.getElementById(
'cosFiChart'
)

){

createConsumptionChart(
dates,
data
);

}


if(

document.getElementById(
'lambdaChart'
)

){

createTotalChart(
dates,
data
);

}

}
catch(err){

console.error(
"Eroare grafice:",
err
);

}

}



function createProductionChart(dates,data){

  const sampled=
  data.filter(
  (_,i)=>i%10===0
  );
  
  const ctx=
  document
  .getElementById(
  'phaseShiftChart'
  )
  .getContext('2d');
  
  if(window.productionChart){
  
  window.productionChart.destroy();
  
  }
  
  window.productionChart=
  
  new Chart(ctx,{
  
  type:'line',
  
  data:{
  
  labels:
  
  sampled.map(x=>
  
  new Date(x.date)
  .toLocaleTimeString(
  'ro-RO',
  {
  hour:'2-digit',
  minute:'2-digit'
  })
  
  ),
  
  datasets:[
  
  dataset(
  'Nuclear',
  sampled.map(x=>x.nuclear),
  '#4cc9f0'
  ),
  
  dataset(
  'Hidro',
  sampled.map(x=>x.hidro),
  '#4361ee'
  ),
  
  dataset(
  'Eolian',
  sampled.map(x=>x.eolian),
  '#7209b7'
  ),
  
  dataset(
  'Fotovoltaic',
  sampled.map(x=>x.fotovolt),
  '#f9c74f'
  ),
  
  dataset(
  'Carbune',
  sampled.map(x=>x.carbune),
  '#ef476f'
  ),
  
  dataset(
  'Biomasa',
  sampled.map(x=>x.biomasa),
  '#90be6d'
  )
  
  ]
  
  },
  
  options:{
  
  responsive:true,
  
  plugins:{
  
  legend:{
  position:'right'
  }
  
  },
  
  scales:{
  
  x:{
  stacked:true
  },
  
  y:{
  stacked:true,
  beginAtZero:true
  }
  
  }
  
  }
  
  });
  
  }



function createConsumptionChart(

dates,

data

){

const canvas=

document.getElementById(
'cosFiChart'
);

if(!canvas)return;


const ctx=

canvas.getContext('2d');


if(window.consumptionChart){

window.consumptionChart.destroy();

}


window.consumptionChart=

new Chart(ctx,{

type:'line',

data:{

labels:dates,

datasets:[

dataset(
'Consum',
data.map(
x=>x.consum
),
'#00a3ff'
),

dataset(
'Sold',
data.map(
x=>x.sold
),
'#ff5b5b'
)

]

},

options:chartOptions(
"Echilibru sistem"
)

});

}



function createTotalChart(

dates,

data

){

const canvas=

document.getElementById(
'lambdaChart'
);

if(!canvas)return;


const ctx=

canvas.getContext('2d');


if(window.totalChart){

window.totalChart.destroy();

}


window.totalChart=

new Chart(ctx,{

type:'line',

data:{

labels:dates,

datasets:[

dataset(

'Producție',

data.map(
x=>x.productie
),

'#31c46c'

)

]

},

options:chartOptions(
"Producție totală"
)

});

}



function dataset(
  label,
  data,
  color
  ){
  
  return{
  
  label,
  
  data,
  
  borderColor:color,
  
  backgroundColor:color,
  
  fill:true,
  
  pointRadius:0,
  
  borderWidth:1,
  
  tension:0.4
  
  };
  
  }



function chartOptions(title){

return{

responsive:true,

interaction:{

mode:'index',

intersect:false

},

plugins:{

title:{

display:true,

text:title

},

legend:{

position:'top'

}

},

scales:{

x:{

ticks:{

maxTicksLimit:8

}

},

y:{

beginAtZero:true

}

}

};

}