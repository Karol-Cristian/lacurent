document.addEventListener("DOMContentLoaded",()=>{

  const houseForm=
  document.getElementById("houseForm");
  
  if(!houseForm) return;
  
  
  const steps=
  document.querySelectorAll(".step");
  
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
  
  
  let current=0;
  
  
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
  
  
  updateProgress();
  
  updateButtons();
  
  scrollToTop();
  
  }
  
  
  
  function updateProgress(){
  
  const progress=
  
  ((current+1)
  /steps.length)*100;
  
  
  progressBar.style.width=
  
  progress+"%";
  
  
  stepText.innerText=
  
  `Secțiune ${current+1} din ${steps.length}`;
  
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
  
  
  
  function validateCurrentStep(){
  
  const currentInputs=
  
  steps[current]
  .querySelectorAll(
  "input,select"
  );
  
  
  for(const input of currentInputs){
  
  if(
  
  input.hasAttribute(
  "required"
  )
  
  &&
  
  !input.value.trim()
  
  ){
  
  input.focus();
  
  input.style.borderColor=
  "#ef4444";
  
  
  setTimeout(()=>{
  
  input.style.borderColor="";
  
  },1500);
  
  
  return false;
  
  }
  
  }
  
  
  return true;
  
  }
  
  
  
  nextBtn.addEventListener(
  "click",
  ()=>{
  
  if(
  !validateCurrentStep()
  )
  return;
  
  
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
  
  
  if(
  !validateCurrentStep()
  )
  return;
  
  
  /*
  
  aici ulterior:
  
  1. colectezi date
  
  2. salvezi db
  
  3. AI recommendations
  
  4. redirect
  
  */
  
  
  console.log(
  "Trimite analiză"
  );
  
  
  alert(
  "Analiza a fost trimisă."
  );
  
  });
  
  
  
  function scrollToTop(){
  
  window.scrollTo({
  
  top:0,
  
  behavior:"smooth"
  
  });
  
  }
  
  });