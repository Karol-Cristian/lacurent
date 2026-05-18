const steps =
document.querySelectorAll(".step")

let current=0

showStep()

function showStep(){

steps.forEach(
s=>s.classList.remove("active")
)

steps[current]
.classList.add("active")

document
.getElementById("stepText")
.innerText=
`Pas ${current+1}/${steps.length}`

document
.getElementById("progressBar")
.style.width=
((current+1)/steps.length)*100+"%"

}

nextBtn.onclick=()=>{

if(current<steps.length-1){

current++

showStep()

}

}

prevBtn.onclick=()=>{

if(current>0){

current--

showStep()

}

}