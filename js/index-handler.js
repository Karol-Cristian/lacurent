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

      const response=
      await fetch(
      "https://energy-api.lemnarukarol.workers.dev/"
      );

      if(!response.ok){

          throw new Error(
          "API unavailable"
          );

      }

      const data=
      await response.json();

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

console.log(
"RAW API:"
);

console.log(
data[0]
);

const filtered=data

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
),

sold:Number(
x.sold ??
x["Sold"]
)||0

}))

.filter(x=>

x.consum>0 ||

x.productie>0

)

.sort((a,b)=>

new Date(a.date)
-
new Date(b.date)

);


updateDashboard(
filtered
);

}



function updateDashboard(data){

updateKPIs(data);

updateCharts(data);

updateTimestamp();

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

const latest=

data[data.length-1];

setValue(
"prodTotal",
Math.round(
latest.productie
)+" MW"
);

setValue(
"consumTotal",
Math.round(
latest.consum
)+" MW"
);

setValue(
"soldTotal",
Math.round(
latest.sold
)+" MW"
);

setValue(
"co2",

Math.round(

latest.carbune*900

)

+" kg"

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

document.getElementById(id);

if(el){

el.innerText=value;

}

}



function updateCharts(data){

try{

const sampled=

[...data]

.slice(-90)

.filter(
(_,i)=>i%3===0
);


const dates=

sampled.map(x=>

new Date(x.date)

.toLocaleTimeString(

'ro-RO',

{

hour:'2-digit',

minute:'2-digit'

})

);


createProductionChart(
dates,
sampled
);

createConsumptionChart(
dates,
sampled
);

}
catch(err){

console.error(
"Eroare grafice:",
err
);

}

}



function createProductionChart(dates,data){

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

labels:dates,

datasets:[

dataset(
'Nuclear',
data.map(x=>x.nuclear),
'#4cc9f0'
),

dataset(
'Hidro',
data.map(x=>x.hidro),
'#4361ee'
),

dataset(
'Eolian',
data.map(x=>x.eolian),
'#7209b7'
),

dataset(
'Fotovoltaic',
data.map(x=>x.fotovolt),
'#f9c74f'
),

dataset(
'Carbune',
data.map(x=>x.carbune),
'#ef476f'
),

dataset(
'Biomasă',
data.map(x=>x.biomasa),
'#90be6d'
)

]

},

options:chartOptions(
"Mix energetic național"
)

});

}



function createConsumptionChart(dates,data){

const ctx=

document
.getElementById(
'cosFiChart'
)
.getContext('2d');


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
data.map(x=>x.consum),
'#00a3ff'
),

dataset(
'Producție',
data.map(x=>x.productie),
'#31c46c'
),

dataset(
'Sold',
data.map(x=>x.sold),
'#ff5b5b'
)

]

},

options:chartOptions(
"Echilibru sistem"
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

borderWidth:2,

pointRadius:0,

fill:false,

tension:.25

};

}



function chartOptions(title){

return{

responsive:true,

maintainAspectRatio:false,

animation:false,

resizeDelay:300,

interaction:{

mode:'index',

intersect:false

},

elements:{

point:{

radius:0

}

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

maxTicksLimit:6,

maxRotation:0

}

},

y:{

beginAtZero:true

}

}

};

}