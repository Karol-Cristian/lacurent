const steps =
document.querySelectorAll(".step");

const nextBtn =
document.getElementById("nextBtn");

const prevBtn =
document.getElementById("prevBtn");

const finishBtn =
document.getElementById("finishBtn");

const progressBar =
document.getElementById("progressBar");

const stepText =
document.getElementById("stepText");

const houseForm =
document.getElementById("houseForm");


let current = 0;


showStep();


function showStep(){

steps.forEach(step=>{

step.classList.remove(
"active"
);

});


steps[current]
.classList.add(
"active"
);


stepText.innerText =

`Pas ${current+1}/${steps.length}`;


progressBar.style.width =

((current+1)/steps.length)*100+"%";



prevBtn.style.display =

current===0
?
"none"
:
"block";



if(
current===steps.length-1
){

nextBtn.style.display=
"none";

finishBtn.style.display=
"block";

}
else{

nextBtn.style.display=
"block";

finishBtn.style.display=
"none";

}

}



/* CONTINUĂ */

nextBtn.onclick=()=>{

if(
current<
steps.length-1
){

current++;

showStep();

}

};



/* ÎNAPOI */

prevBtn.onclick=()=>{

if(
current>0
){

current--;

showStep();

}

};



/* SUBMIT */

houseForm.addEventListener(
"submit",
function(e){

e.preventDefault();


alert(
"Analiza începe ⚡"
);


/*
aici ulterior:

- trimite API
- salvează DB
- generează recomandări
- redirect dashboard
*/

});