document.addEventListener("DOMContentLoaded",()=>{

  const houseForm=
  document.getElementById("houseForm");
  
  if(!houseForm){
  
  console.log("houseForm lipseste");
  
  return;
  
  }
  
  
  const steps=
  document.querySelectorAll(".step");
  
  console.log("Steps:",steps.length);
  
  
  const nextBtn=
  document.getElementById("nextBtn");
  
  const prevBtn=
  document.getElementById("prevBtn");
  
  const finishBtn=
  document.getElementById("finishBtn");
  
  const progressBar=
  document.getElementById("progressBar");
  
  const stepText=
  document.getElementById("stepText");
  
  
  if(
  
  !nextBtn ||
  !prevBtn ||
  !finishBtn ||
  !progressBar ||
  !stepText
  
  ){
  
  console.log("Lipsesc elemente");
  
  return;
  
  }
  
  
  let current=0;
  
  
  function showStep(){
  
  steps.forEach(step=>{
  
  step.classList.remove(
  "active"
  );
  
  });
  
  
  if(steps[current]){
  
  steps[current]
  .classList.add(
  "active"
  );
  
  }
  
  
  updateProgress();
  
  updateButtons();
  
  }
  
  
  
  function updateProgress(){
  
  const progress=
  
  ((current+1)
  /steps.length)
  *100;
  
  
  progressBar.style.width=
  
  progress+"%";
  
  
  stepText.innerText=
  
  `Pas ${current+1} din ${steps.length}`;
  
  }
  
  
  
  function updateButtons(){
  
  prevBtn.style.display=
  
  current===0
  ?
  "none"
  :
  "inline-flex";
  
  
  if(
  current===steps.length-1
  ){
  
  nextBtn.style.display=
  "none";
  
  finishBtn.style.display=
  "inline-flex";
  
  }
  
  else{
  
  nextBtn.style.display=
  "inline-flex";
  
  finishBtn.style.display=
  "none";
  
  }
  
  }
  
  
  
  nextBtn.addEventListener(
  "click",
  ()=>{
  
  console.log(
  "NEXT",
  current
  );
  
  
  if(
  current<
  steps.length-1
  ){
  
  current++;
  
  showStep();
  
  }
  
  });
  
  
  prevBtn.addEventListener(
  "click",
  ()=>{
  
  if(
  current>0
  ){
  
  current--;
  
  showStep();
  
  }
  
  });
  
  
  houseForm.addEventListener(
  "submit",
  e=>{
  
  e.preventDefault();
  
  alert(
  "Analiza trimisă"
  );
  
  });
  
  
  showStep();
  
  });