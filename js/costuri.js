document.addEventListener(
  'DOMContentLoaded',
  ()=>{
  
  
  const costuri={
  
  energie:0.45,
  
  transport:0.09,
  
  distributie:0.18,
  
  furnizare:0.03,
  
  acciza:0.01,
  
  TVA:0.17
  
  };
  
  
  
  const total=
  
  Object.values(
  costuri
  )
  
  .reduce(
  (a,b)=>a+b,
  0
  );
  
  
  
  
  set(
  
  'totalKwh',
  
  total.toFixed(2)+
  ' lei/kWh',
  
  'Cost final client'
  
  );
  
  
  
  set(
  
  'energie',
  
  costuri.energie.toFixed(2)+
  ' lei/kWh',
  
  'Energie cumpărată'
  
  );
  
  
  
  set(
  
  'transport',
  
  costuri.transport.toFixed(2)+
  ' lei/kWh',
  
  'Rețea națională'
  
  );
  
  
  
  set(
  
  'distributie',
  
  costuri.distributie.toFixed(2)+
  ' lei/kWh',
  
  'Operator regional'
  
  );
  
  
  
  set(
  
  'furnizare',
  
  costuri.furnizare.toFixed(2)+
  ' lei/kWh',
  
  'Serviciu furnizor'
  
  );
  
  
  
  set(
  
  'taxe',
  
  (
  costuri.acciza+
  costuri.TVA
  )
  
  .toFixed(2)+
  
  ' lei/kWh',
  
  'TVA + acciză'
  
  );
  
  
  
  
  const ctx=
  
  document
  .getElementById(
  'costChart'
  )
  .getContext(
  '2d'
  );
  
  
  
  new Chart(ctx,{
  
  type:'doughnut',
  
  data:{
  
  labels:[
  
  'Energie',
  
  'Transport',
  
  'Distribuție',
  
  'Furnizare',
  
  'Acciză',
  
  'TVA'
  
  ],
  
  datasets:[{
  
  data:[
  
  costuri.energie,
  
  costuri.transport,
  
  costuri.distributie,
  
  costuri.furnizare,
  
  costuri.acciza,
  
  costuri.TVA
  
  ],
  
  backgroundColor:[
  
  '#31c46c',
  
  '#3a86ff',
  
  '#8338ec',
  
  '#ff9f1c',
  
  '#ef476f',
  
  '#90be6d'
  
  ],
  
  borderWidth:2,
  
  hoverOffset:15
  
  }]
  
  },
  
  options:{
  
  responsive:true,
  
  maintainAspectRatio:false,
  
  cutout:"50%",
  
  plugins:{
  
  legend:{
  
  position:'right'
  
  },
  
  tooltip:{
  
  callbacks:{
  
  label:function(context){
  
  const value=
  context.raw;
  
  const percent=
  
  (
  value/
  total*
  100
  )
  
  .toFixed(1);
  
  
  return(
  
  context.label+
  
  ': '+
  
  value+
  
  ' lei ('+
  
  percent+
  
  '%)'
  
  );
  
  }
  
  }
  
  }
  
  }
  
  }
  
  });
  
  
  });
  
  
  
  function set(
  
  id,
  
  value,
  
  description
  
  ){
  
  const el=
  
  document.getElementById(
  id
  );
  
  if(!el)return;
  
  
  el.innerHTML=
  
  `
  
  <div style="
  font-size:36px;
  font-weight:700;
  ">
  
  ${value}
  
  </div>
  
  <div style="
  font-size:14px;
  color:#64748b;
  margin-top:6px;
  ">
  
  ${description}
  
  </div>
  
  `;
  
  }