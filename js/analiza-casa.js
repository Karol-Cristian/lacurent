document.addEventListener("DOMContentLoaded",async ()=>{

  const houseForm=document.getElementById("houseForm");
  const authRequired=document.getElementById("authRequired");
  const progressWrap=document.querySelector(".progress-wrap");
  
  if(!houseForm){
  console.log("houseForm lipseste");
  return;
  }

  async function hasValidSession(){
  if(
  !window.LaCurentAuth ||
  !window.LaCurentAuth.token()
  ){
  return false;
  }

  try{
  await window.LaCurentAuth.api(
  "/api/me"
  );
  return true;
  }
  catch(e){
  window.LaCurentAuth.clearAuth();
  return false;
  }
  }

  function initAuthGate(){
  const loginForm=document.getElementById("analysisLoginForm");
  const registerForm=document.getElementById("analysisRegisterForm");
  const forgotForm=document.getElementById("analysisForgotForm");
  const forgotLink=document.getElementById("analysisForgotLink");

  function formData(form){
  return Object.fromEntries(
  new FormData(form).entries()
  );
  }

  function message(id,text,isError=false){
  const el=document.getElementById(id);
  if(!el)return;
  el.textContent=text;
  el.classList.toggle(
  "error",
  isError
  );
  }

  function setTab(tab){
  document
  .querySelectorAll(
  "[data-auth-tab]"
  )
  .forEach(button=>{
  button.classList.toggle(
  "active",
  button.dataset.authTab===tab
  );
  });

  if(loginForm){
  loginForm.classList.toggle(
  "active",
  tab==="login"
  );
  }
  if(registerForm){
  registerForm.classList.toggle(
  "active",
  tab==="register"
  );
  }
  if(forgotForm){
  forgotForm.classList.remove(
  "active"
  );
  }
  }

  document
  .querySelectorAll(
  "[data-auth-tab]"
  )
  .forEach(button=>{
  button.addEventListener(
  "click",
  ()=>setTab(
  button.dataset.authTab
  )
  );
  });

  if(loginForm){
  loginForm.addEventListener(
  "submit",
  async event=>{
  event.preventDefault();
  message(
  "analysisLoginMessage",
  "Se autentifică..."
  );
  try{
  const result=await window.LaCurentAuth.api(
  "/api/login",
  formData(loginForm)
  );
  window.LaCurentAuth.saveAuth(
  result
  );
  location.reload();
  }
  catch(error){
  message(
  "analysisLoginMessage",
  error.message,
  true
  );
  }
  }
  );
  }

  if(registerForm){
  registerForm.addEventListener(
  "submit",
  async event=>{
  event.preventDefault();
  message(
  "analysisRegisterMessage",
  "Se creează contul..."
  );
  try{
  const result=await window.LaCurentAuth.api(
  "/api/register",
  formData(registerForm)
  );
  window.LaCurentAuth.saveAuth(
  result
  );
  location.reload();
  }
  catch(error){
  message(
  "analysisRegisterMessage",
  error.message,
  true
  );
  }
  }
  );
  }

  if(forgotLink&&forgotForm){
  forgotLink.addEventListener(
  "click",
  event=>{
  event.preventDefault();
  loginForm.classList.remove(
  "active"
  );
  registerForm.classList.remove(
  "active"
  );
  forgotForm.classList.add(
  "active"
  );
  document
  .querySelectorAll(
  "[data-auth-tab]"
  )
  .forEach(button=>button.classList.remove(
  "active"
  ));
  }
  );

  forgotForm.addEventListener(
  "submit",
  async event=>{
  event.preventDefault();
  message(
  "analysisForgotMessage",
  "Se generează linkul..."
  );
  document.getElementById(
  "analysisResetLinkMessage"
  ).textContent="";
  try{
  const result=await window.LaCurentAuth.api(
  "/api/forgot-password",
  formData(forgotForm)
  );
  message(
  "analysisForgotMessage",
  result.message
  );
  if(result.reset_url){
  document.getElementById(
  "analysisResetLinkMessage"
  ).innerHTML=
  `Link temporar: <a href="${result.reset_url}">${result.reset_url}</a>`;
  }
  }
  catch(error){
  message(
  "analysisForgotMessage",
  error.message,
  true
  );
  }
  }
  );
  }
  }

  if(!(await hasValidSession())){
  houseForm.hidden=true;
  if(progressWrap){
  progressWrap.hidden=true;
  }
  if(authRequired){
  authRequired.hidden=false;
  }
  initAuthGate();
  return;
  }

  houseForm.hidden=false;
  if(progressWrap){
  progressWrap.hidden=false;
  }
  if(authRequired){
  authRequired.hidden=true;
  }
  
  const allSteps=[...document.querySelectorAll(".step")];
  let steps=[...allSteps];
  
  const nextBtn=document.getElementById("nextBtn");
  const prevBtn=document.getElementById("prevBtn");
  const finishBtn=document.getElementById("finishBtn");
  
  const progressBar=document.getElementById("progressBar");
  const stepText=document.getElementById("stepText");
  
  if(
  !allSteps.length||
  !nextBtn||
  !prevBtn||
  !finishBtn||
  !progressBar||
  !stepText
  ){
  
  console.log("Lipsesc elemente");
  
  return;
  
  }
  
  let current=0;

  function selectedValue(name){
  return houseForm.elements[name]?.value || "";
  }

  function updateConditionalFields(){
  const userType=selectedValue("user_type");
  const houseType=selectedValue("house_type");
  const isApartment=houseType==="Apartament";
  const isResidential=userType==="residential";

  document.querySelectorAll(".business-flow").forEach(el=>{
  el.hidden=userType!=="business";
  });

  document.querySelectorAll(".institution-flow").forEach(el=>{
  el.hidden=userType!=="institution";
  });

  document.querySelectorAll(".apartment-only").forEach(el=>{
  el.hidden=!isResidential||!isApartment;
  });

  ["attic","basement","garage","mansard","floors"].forEach(name=>{
  const field=houseForm.elements[name];
  if(field){
  const wrapper=field.closest("div");
  if(wrapper){
  wrapper.hidden=!isResidential||isApartment;
  }
  }
  });

  steps=allSteps.filter(step=>!step.hidden);

  if(current>=steps.length){
  current=steps.length-1;
  }
  }

  function validateCurrentStep(){

    const currentInputs=
    
    steps[current]
    .querySelectorAll(
    
    "input,select,textarea"
    
    );
    
    
    for(const input of currentInputs){
    
    if(
    
    input.hasAttribute(
    "required"
    )
    
    ){
    
    if(
    
    !input.value.trim()
    
    ){
    
    alert(
    
    `Completează: ${
    
    input.previousElementSibling
    ?.innerText ||
    
    input.name ||
    
    "Câmp obligatoriu"
    
    }`
    
    );
    
    input.focus();
    
    return false;
    
    }
    
    }
    
    
    if(
    
    input.type==="number" &&
    
    input.value!=="" &&
    
    isNaN(input.value)
    
    ){
    
    alert(
    
    `${
    
    input.previousElementSibling
    ?.innerText
    
    } trebuie să fie număr`
    
    );
    
    input.focus();
    
    return false;
    
    }
    
    }
    
    
    return true;
    
    }
  
  
  function showStep(){

  updateConditionalFields();
  
  allSteps.forEach(step=>{
  
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
  
  nextBtn.style.display="none";
  
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

  houseForm.addEventListener(
  "change",
  event=>{
  if(
  event.target.name==="user_type"||
  event.target.name==="house_type"
  ){
  updateConditionalFields();
  showStep();
  }
  }
  );
  
  nextBtn.addEventListener(

    "click",
    
    ()=>{
    
    
    if(
    
    !validateCurrentStep()
    
    ){
    
    return;
    
    }
    
    
    if(
    
    current<steps.length-1
    
    ){
    
    current++;
    
    showStep();
    
    }
    
    }
    
    );
  
  
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
  
  }
  );
  
  
  /* SUBMIT */
  console.log(
    "FORM:",
    houseForm
    );
    
    console.log(
    
    "REQUIRED:",
    
    document.querySelectorAll(
    "[required]"
    )
    
    );
  
  houseForm.addEventListener(
  
  "submit",
  
  async e=>{
  
  e.preventDefault();
  console.log("SUBMIT PORNIT");

  if(
    !validateCurrentStep()
    ){
    
    return;
    
    }
  
  
    const formData =
    new FormData(houseForm);
    
    const data = {};

    for(const [key,entry] of formData.entries()){

    data[key]=
    entry instanceof File
    ?
    (
    entry.name || null
    )
    :
    entry;

    }
  
  
  console.log(
  "TRIMIT:",
  data
  );
  
  
  try{
  
  const response=
  
  await fetch(
  
  "https://lacurent.lemnarukarol.workers.dev/api/save-house",
  
  {
  
  method:"POST",
  
  headers:{
  
  "Content-Type":
  "application/json",

  ...(localStorage.getItem("lacurent_auth_token")
  ?
  {
  Authorization:
  `Bearer ${localStorage.getItem("lacurent_auth_token")}`
  }
  :
  {})
  
  },
  
  body:
  JSON.stringify(data)
  
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
  result.error ||
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
  
  }
  
  );
  
  
  showStep();
  
  });
