document.addEventListener('DOMContentLoaded',()=>{

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
' lei/kWh'

);

set('energie',costuri.energie+' lei/kWh');
set('transport',costuri.transport+' lei/kWh');
set('distributie',costuri.distributie+' lei/kWh');
set('taxe',(costuri.acciza+costuri.TVA).toFixed(2)+' lei/kWh');

const ctx=document.getElementById('costChart').getContext('2d');

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
data:Object.values(costuri)
}]
},
options:{
responsive:true,
maintainAspectRatio:false
}
});

});

function set(id,value){
const el=document.getElementById(id);
if(el)el.innerHTML='<div style="font-size:36px;font-weight:700">'+value+'</div>';
}
