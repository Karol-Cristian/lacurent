document.addEventListener('DOMContentLoaded', () => {

  loadLiveData();

  // refresh automat la 60 secunde
  setInterval(loadLiveData,60000);

});


async function loadLiveData(){

  try{

      console.log("Încarc API...");

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

      console.log(
      "JSON primit:"
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

  console.log(
  "Intru processData"
  );

  const filtered=

  data.filter(row=>

  row.date!==undefined &&

  row.productie!==undefined

  );

  console.log(
  "Rows:",
  filtered.length
  );

  if(filtered.length===0){

      console.error(
      "Nu există date valide"
      );

      return;

  }

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

const latest=data[0];

console.log(
"Date KPI:",
latest
);

setValue(

"prodTotal",

Math.round(
latest.productie||0
)

+" MW"

);


setValue(

"consumTotal",

Math.round(
latest.consum||0
)

+" MW"

);


setValue(

"soldTotal",

Math.round(
latest.sold||0
)

+" MW"

);


setValue(

"co2",

Math.round(

(latest.carbune||0)

*900

)

+" kg"

);

}



function setValue(

id,

value

){

const el=

document.getElementById(id);

if(el){

el.innerText=value;

}

}



function updateCharts(data){

const dates=

data.map(
x=>x.date
);

createProductionChart(
dates,
data
);

createConsumptionChart(
dates,
data
);

createTotalChart(
dates,
data
);

}



function createProductionChart(

dates,

data

){

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
'Carbune',
data.map(x=>x.carbune),
'#ff5b7f'
),

dataset(
'Hidro',
data.map(x=>x.hidro),
'#3aa0ff'
),

dataset(
'Nuclear',
data.map(x=>x.nuclear),
'#49dcb1'
),

dataset(
'Eolian',
data.map(x=>x.eolian),
'#a774ff'
),

dataset(
'Fotovoltaic',
data.map(x=>x.fotovolt),
'#ffb347'
),

dataset(
'Biomasă',
data.map(x=>x.biomasa),
'#d4b14c'
)

]

},

options:chartOptions(
"Mix energetic național"
)

});

}



function createConsumptionChart(

dates,

data

){

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

const ctx=

document
.getElementById(
'lambdaChart'
)
.getContext('2d');


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

borderWidth:2,

pointRadius:0,

fill:false,

tension:0.3

};

}



function chartOptions(

title

){

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