document.addEventListener('DOMContentLoaded', function () {

  window.csvData=[];

  const fileInput=document.getElementById('fileInput');

  if(fileInput){
      fileInput.addEventListener(
          'change',
          handleFileSelect
      );
  }

  const storedData=
      localStorage.getItem('csvData');

  if(storedData){

      window.csvData=
          JSON.parse(storedData);

      updateDashboard(
          window.csvData
      );

  }else{

      autoLoadCSV();

  }

});


function autoLoadCSV(){

  fetch('data/Ianuarie 2025.csv')

  .then(response=>{

      if(!response.ok){

          throw new Error(
              "CSV auto load failed"
          );

      }

      return response.text();

  })

  .then(csvText=>{

      parseCSV(csvText);

  })

  .catch(err=>{

      console.error(err);

  });

}


function handleFileSelect(event){

  const file=
      event.target.files[0];

  if(!file){

      return;

  }

  Papa.parse(file,{

      header:true,

      dynamicTyping:true,

      complete:function(results){

          processData(
              results.data
          );

      }

  });

}


function parseCSV(text){

  Papa.parse(text,{

      header:true,

      dynamicTyping:true,

      complete:function(results){

          processData(
              results.data
          );

      }

  });

}



function processData(data){

  const filtered=
  data.filter(row=>

      row.date &&

      row.productie

  );

  if(filtered.length===0){

      console.error(
          "No valid data"
      );

      return;

  }

  window.csvData=filtered;

  localStorage.setItem(

      'csvData',

      JSON.stringify(
          filtered
      )

  );

  updateDashboard(
      filtered
  );

}



function updateDashboard(data){

  updateKPIs(data);

  updateCharts(data);

}



function updateKPIs(data){

  const latest=
      data[data.length-1];

  const prod=
      Math.round(
          latest.productie ||0
      );

  const consum=
      Math.round(
          latest.consum||0
      );

  const sold=
      Math.round(
          latest.sold||0
      );

  const co2=
      Math.round(

      (latest.carbune||0)

      *900

      );



  setValue(
      "prodTotal",
      prod+" MW"
  );

  setValue(
      "consumTotal",
      consum+" MW"
  );

  setValue(
      "soldTotal",
      sold+" MW"
  );

  setValue(
      "co2",
      co2+" kg"
  );

}



function setValue(id,value){

  const el=
  document.getElementById(id);

  if(el){

      el.innerText=value;

  }

}



function updateCharts(data){

  const dates=
      data.map(
          row=>row.date
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


if(window.productionChart)

window.productionChart.destroy();



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

if(window.consumptionChart)

window.consumptionChart.destroy();

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


if(window.totalChart)

window.totalChart.destroy();


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

fill:false,

pointRadius:0,

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