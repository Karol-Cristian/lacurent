document.addEventListener("DOMContentLoaded",()=>{

  const houseForm=
  document.getElementById("houseForm");
  
  if(!houseForm){
  
  console.log(
  "houseForm lipseste"
  );
  
  return;
  
  }
  
  
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
  
  
  if(
  
  !steps.length ||
  !nextBtn ||
  !prevBtn ||
  !finishBtn ||
  !progressBar ||
  !stepText
  
  ){
  
  console.log(
  "Lipsesc elemente"
  );
  
  return;
  
  }
  
  
  let current=0;
  
  
  
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
  
  window.scrollTo({
  
  top:0,
  
  behavior:"smooth"
  
  });
  
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
  
  
  
  /* NEXT */
  
  nextBtn.addEventListener(
  "click",
  ()=>{
  
  if(
  current<
  steps.length-1
  ){
  
  current++;
  
  showStep();
  
  }
  
  });
  
  
  /* BACK */
  
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
  
  
  
  /* SUBMIT + CLOUD DB */
  
  houseForm.addEventListener(
  
  "submit",
  
  async e=>{
  
  e.preventDefault();
  
  
  const data={
  
  house_type:
  
  document.querySelector(
  "#houseType"
  )?.value,
  
  
  surface:
  
  document.querySelector(
  "#surface"
  )?.value,
  
  
  rooms:
  
  document.querySelector(
  "#rooms"
  )?.value,
  
  
  year:
  
  document.querySelector(
  "#year"
  )?.value,
  
  
  city:
  
  document.querySelector(
  "#city"
  )?.value
  
  };
  
  
  console.log(
  "TRIMIT:",
  data
  );
  
  
  try{
  
  
  const response=
  
  try{

    const response=
    
    await fetch(
    
    "https://lacurent.lemnarukarol.workers.dev/api/save-house",
    
    {
    
    method:"POST",
    
    headers:{
    
    "Content-Type":"application/json"
    
    },
    
    body:JSON.stringify(data)
    
    }
    
    );
    
    
    console.log(
    "STATUS:",
    response.status
    );
    
    
    const result=
    await response.json();
    
    console.log(
    "RASPUNS:",
    result
    );
    
    
    if(
    response.ok &&
    result.success
    ){
    
    alert(
    "Locuință salvată cu succes ⚡"
    );
    
    }
    else{
    
    alert(
    "Eroare la salvare"
    
    );
    
    console.log(
    result
    );
    
    }
    
    }
    
    catch(err){
    
    console.log(
    "EROARE:",
    err
    );
    
    alert(
    "Conexiune eșuată"
    );
    
    }
  
  
  
  const result=
  
  await response.json();
  
  
  console.log(
  result
  );
  
  
  if(
  result.success
  ){
  
  alert(
  "Locuință salvată cu succes ⚡"
  );
  
  }
  else{
  
  alert(
  "Eroare la salvare"
  );
  
  console.log(
  result.error
  );
  
  }
  
  }
  
  catch(err){
  
  console.log(
  err
  );
  
  alert(
  "Conexiune eșuată"
  );
  
  }
  
  }
  
  
  );
  
  
  showStep();
  
  });