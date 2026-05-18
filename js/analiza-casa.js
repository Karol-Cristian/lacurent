const steps=
document.querySelectorAll(".step")

const nextBtn=
document.getElementById("nextBtn")

const prevBtn=
document.getElementById("prevBtn")

const finishBtn=
document.getElementById("finishBtn")

let current=0

let xp=0

showStep()


function updateXP(){

xp=(current+1)*15

document
.getElementById(
"xpCounter"
)
.innerText=xp

}


function showStep(){

steps.forEach(
s=>s.classList.remove("active")
)

steps[current]
.classList.add("active")


document
.getElementById(
"stepText"
)
.innerText=

`Pas ${current+1}/${steps.length}`


document
.getElementById(
"progressBar"
)
.style.width=

((current+1)/steps.length)*100+"%"


updateXP()


prevBtn.style.display=

current===0
?
"none"
:
"block"



if(current===steps.length-1){

nextBtn.style.display="none"

finishBtn.style.display="block"

}

else{

nextBtn.style.display="block"

finishBtn.style.display="none"

}

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



houseForm
.addEventListener(
"submit",
e=>{

e.preventDefault()

alert(
"Analiza începe ⚡"
)

})
