export function renderUi() {
  return `<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<meta name="theme-color" content="#07090b" />
<title>Solar Power — România</title>
<style>
:root{color-scheme:dark;--bg:#07090b;--panel:#0d1115;--line:#222a31;--muted:#8b969f;--text:#eef2f5;--sun:#ffd45a;--ok:#9be49b;--danger:#ff867f;--px:2px}*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}body{min-height:100vh}.shell{width:min(1180px,calc(100% - 28px));margin:0 auto;padding:24px 0 54px}.top{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);padding-bottom:14px}.brand{display:flex;gap:11px;align-items:center;font-weight:650;letter-spacing:.02em}.sun{width:16px;height:16px;border:2px solid var(--sun);box-shadow:0 0 24px rgba(255,212,90,.22)}.tag,.mono{font:11px/1.3 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;text-transform:uppercase;letter-spacing:.09em;color:var(--muted)}.hero{display:grid;grid-template-columns:1.3fr .7fr;gap:14px;margin-top:14px}.card{background:linear-gradient(180deg,rgba(255,255,255,.025),rgba(255,255,255,.012));border:1px solid var(--line);border-radius:2px;padding:20px}.hero-number{font-size:clamp(54px,9vw,112px);font-weight:600;letter-spacing:-.065em;line-height:.86;margin:18px 0 8px;font-variant-numeric:tabular-nums}.unit{font-size:.22em;letter-spacing:0;color:var(--muted);margin-left:8px}.sub{color:var(--muted);font-size:13px}.status-line{display:flex;gap:18px;flex-wrap:wrap;margin-top:20px}.status-line span{font:12px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.dot{display:inline-block;width:7px;height:7px;background:var(--ok);margin-right:7px;box-shadow:0 0 12px rgba(155,228,155,.3)}.controls{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:16px}.field{border:1px solid var(--line);padding:9px 10px;background:#090c0f}.field label{display:block;font:10px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;text-transform:uppercase;color:var(--muted);margin-bottom:5px}.field input{width:100%;border:0;outline:0;background:transparent;color:var(--text);font:16px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.button{margin-top:9px;width:100%;border:1px solid #3a444d;background:#11161b;color:var(--text);padding:11px 14px;font:11px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;text-transform:uppercase;letter-spacing:.08em;cursor:pointer}.button:hover{border-color:#687581}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--line);margin-top:14px;border:1px solid var(--line)}.metric{background:var(--panel);padding:15px}.metric b{display:block;font:24px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;margin-top:7px}.metric small{color:var(--muted);font-size:11px}.grid-wrap{margin-top:14px;display:grid;grid-template-columns:1.15fr .85fr;gap:14px}.map{position:relative;height:440px;overflow:hidden;background:radial-gradient(circle at 60% 45%,rgba(255,212,90,.04),transparent 38%),#090c0f}.map:before{content:"ROMANIA / LIVE SOLAR FIELD";position:absolute;top:15px;left:17px;font:10px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.09em;color:var(--muted)}.map:after{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.028) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.028) 1px,transparent 1px);background-size:24px 24px;pointer-events:none}.cell{position:absolute;width:14px;height:14px;border:1px solid rgba(255,255,255,.18);transform:translate(-50%,-50%);z-index:2;cursor:pointer}.cell:hover{width:18px;height:18px;border-color:#fff}.cell-label{position:absolute;z-index:3;display:none;background:#050708;border:1px solid var(--line);padding:7px 8px;font:10px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:nowrap;pointer-events:none}.cell:hover+.cell-label{display:block}.forecast{display:flex;align-items:flex-end;gap:4px;height:180px;margin-top:18px}.bar{flex:1;min-width:4px;background:#d7dde1;opacity:.75;position:relative}.bar:hover{opacity:1}.bar i{display:none;position:absolute;bottom:calc(100% + 5px);left:50%;transform:translateX(-50%);background:#050708;border:1px solid var(--line);padding:4px 6px;font:9px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-style:normal;white-space:nowrap}.bar:hover i{display:block}.api-line{display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid var(--line);font:11px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.api-line code{color:#dbe5eb}.footer{margin-top:18px;padding-top:14px;border-top:1px solid var(--line);display:flex;justify-content:space-between;gap:16px;color:var(--muted);font:10px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.loading{opacity:.55}@media(max-width:820px){.hero,.grid-wrap{grid-template-columns:1fr}.metrics{grid-template-columns:1fr 1fr}.map{height:390px}}@media(max-width:520px){.shell{width:min(100% - 16px,1180px);padding-top:12px}.top{align-items:flex-start}.hero-number{font-size:66px}.controls{grid-template-columns:1fr}.metrics{grid-template-columns:1fr 1fr}.metric b{font-size:19px}.footer{display:block}.footer span{display:block;margin-top:7px}}
</style>
</head>
<body>
<div class="shell">
  <header class="top"><div class="brand"><span class="sun"></span><span>SOLAR POWER / ROMANIA</span></div><div class="tag">experimental · live</div></header>
  <section class="hero">
    <div class="card" id="heroCard">
      <div class="mono">solar resource · planul panoului</div>
      <div class="hero-number"><span id="gti">—</span><span class="unit">W/m²</span></div>
      <div class="sub"><span id="locationLabel">București</span> · tilt <span id="tiltLabel">30°</span> · sud</div>
      <div class="status-line"><span><i class="dot"></i><span id="provider">model offline</span></span><span id="updated">—</span></div>
    </div>
    <div class="card">
      <div class="mono">producător / asset model</div>
      <div class="controls">
        <div class="field"><label>Capacitate</label><input id="capacity" inputmode="decimal" value="10" /><span class="mono">MWp</span></div>
        <div class="field"><label>Tilt</label><input id="tilt" inputmode="decimal" value="30" /><span class="mono">°</span></div>
        <div class="field"><label>Azimut</label><input id="azimuth" inputmode="decimal" value="0" /><span class="mono">0° = sud</span></div>
      </div>
      <button class="button" id="locate">Folosește locația</button>
    </div>
  </section>
  <section class="metrics">
    <div class="metric"><div class="mono">putere acum</div><b id="powerNow">—</b><small>MW AC estimat</small></div>
    <div class="metric"><div class="mono">+1 h</div><b id="power1h">—</b><small>MW AC estimat</small></div>
    <div class="metric"><div class="mono">energie azi</div><b id="energyToday">—</b><small>MWh modelat</small></div>
    <div class="metric"><div class="mono">ramp +1 h</div><b id="ramp">—</b><small>MW diferență</small></div>
  </section>
  <section class="grid-wrap">
    <div class="card map" id="map"></div>
    <div class="card">
      <div class="mono">următoarele 24 h · putere normalizată</div>
      <div class="forecast" id="forecast"></div>
      <div class="api-line"><span>GHI</span><code id="ghi">— W/m²</code></div>
      <div class="api-line"><span>DNI</span><code id="dni">— W/m²</code></div>
      <div class="api-line"><span>Nebulozitate</span><code id="cloud">— %</code></div>
      <div class="api-line"><span>Variabilitate azi</span><code id="variability">—</code></div>
      <div class="api-line"><span>Benchmark</span><code>ECMWF baseline · ground truth adapter next</code></div>
    </div>
  </section>
  <section class="card" style="margin-top:14px">
    <div class="mono">api / v1</div>
    <div class="api-line"><span>asset forecast</span><code>GET /api/v1/pv/forecast?lat=&amp;lon=&amp;capacity_mwp=&amp;tilt=&amp;azimuth=</code></div>
    <div class="api-line"><span>romania field</span><code>GET /api/v1/romania</code></div>
    <div class="api-line"><span>model registry</span><code>GET /api/v1/models</code></div>
  </section>
  <footer class="footer"><span>Forecast demonstrator. Not dispatch-grade yet.</span><span>Solar Power / LACURENT · Romania pilot</span></footer>
</div>
<script>
const state={lat:44.4268,lon:26.1025,name:'București'};
const $=id=>document.getElementById(id);
const fmt=(v,d=2)=>Number.isFinite(Number(v))?Number(v).toFixed(d):'—';
function xy(lat,lon){return{x:8+((lon-20.8)/(29.2-20.8))*84,y:89-((lat-43.7)/(48.2-43.7))*78}}
async function loadAsset(){
  const card=$('heroCard');card.classList.add('loading');
  const cap=Math.max(.001,Number($('capacity').value)||10),tilt=Number($('tilt').value)||30,az=Number($('azimuth').value)||0;
  try{
    const r=await fetch('/api/v1/pv/forecast?lat='+state.lat+'&lon='+state.lon+'&capacity_mwp='+cap+'&tilt='+tilt+'&azimuth='+az);const j=await r.json();if(!r.ok)throw new Error(j.error||'api');
    $('gti').textContent=Math.round(j.summary.current.gti_wm2);$('powerNow').textContent=fmt(j.summary.current.power_mw);$('power1h').textContent=fmt(j.summary.nextHour.power_mw);$('energyToday').textContent=fmt(j.summary.todayEnergyMwh,1);$('ramp').textContent=(j.summary.rampMw>=0?'+':'')+fmt(j.summary.rampMw);$('ghi').textContent=Math.round(j.summary.current.ghi_wm2)+' W/m²';$('dni').textContent=Math.round(j.summary.current.dni_wm2)+' W/m²';$('cloud').textContent=Math.round(j.summary.current.cloud_pct)+' %';$('variability').textContent=Math.round(j.summary.variability)+' / 100';$('provider').textContent=j.meta.provider;$('updated').textContent='run '+j.meta.generated_at.slice(11,16);$('locationLabel').textContent=state.name+' · '+state.lat.toFixed(2)+', '+state.lon.toFixed(2);$('tiltLabel').textContent=tilt+'°';
    const next=j.forecast.slice(j.current_index,j.current_index+24);const max=Math.max(...next.map(p=>p.power_mw),.001);$('forecast').innerHTML=next.map(p=>'<div class="bar" style="height:'+Math.max(2,(p.power_mw/max)*100)+'%"><i>'+p.time.slice(11,16)+' · '+fmt(p.power_mw)+' MW</i></div>').join('');
  }catch(e){$('provider').textContent='data unavailable';console.error(e)}finally{card.classList.remove('loading')}
}
async function loadMap(){try{const r=await fetch('/api/v1/romania');const j=await r.json();const map=$('map');map.querySelectorAll('.cell,.cell-label').forEach(n=>n.remove());j.cells.forEach(c=>{const p=xy(c.lat,c.lon),n=document.createElement('button'),l=document.createElement('span');n.className='cell';n.style.left=p.x+'%';n.style.top=p.y+'%';const a=Math.max(.08,Math.min(1,c.gti_wm2/850));n.style.background='rgba(255,212,90,'+a+')';n.setAttribute('aria-label',c.name+' '+Math.round(c.gti_wm2)+' W/m²');n.onclick=()=>{state.lat=c.lat;state.lon=c.lon;state.name=c.name;loadAsset()};l.className='cell-label';l.style.left='calc('+p.x+'% + 12px)';l.style.top='calc('+p.y+'% - 12px)';l.textContent=c.name+' · '+Math.round(c.gti_wm2)+' W/m²';map.append(n,l)})}catch(e){console.error(e)}}
['capacity','tilt','azimuth'].forEach(id=>$(id).addEventListener('change',loadAsset));$('locate').onclick=()=>navigator.geolocation&&navigator.geolocation.getCurrentPosition(p=>{state.lat=p.coords.latitude;state.lon=p.coords.longitude;state.name='Locația ta';loadAsset()},{enableHighAccuracy:false,timeout:5000});loadAsset();loadMap();setInterval(()=>{loadAsset();loadMap()},300000);
</script>
</body></html>`;
}
