let mediaRecorder=null;
let voiceChunks=[];
let voiceStartedAt=0;
let voiceTimer=null;
const personalityTraits = [
  { key:'openness', title:'Curiosity & openness', low:'Prefer familiar', high:'Love new experiences' },
  { key:'conscientiousness', title:'Structure & follow-through', low:'Flexible / go with it', high:'Organized / dependable' },
  { key:'extraversion', title:'Social energy', low:'Recharge alone', high:'Recharge with people' },
  { key:'agreeableness', title:'Cooperation style', low:'Direct / independent', high:'Warm / cooperative' },
  { key:'emotionalStability', title:'Emotional steadiness', low:'Feel things intensely', high:'Usually even-keeled' }
];

const interests = ['Family time','Racing / motorsports','Travel','Movies','Reading','Gaming','Fitness','Cooking','Music','Concerts','Outdoors','Camping','Hiking','Sports','Pets','Art / design','Technology','DIY projects','Coffee shops','Restaurants','Volunteering','Faith / spirituality','Board games','Photography'];

const demoProfiles = [
  {id:1,name:'Jordan',age:32,area:'Louisville area',distance:12,goal:'Long-term relationship',conflict:'Take some space, then talk',social:'Balanced',planning:'Plan the important things',children:'I have children',alcohol:'Occasionally',nicotine:'Never',vaping:'Never',cannabis:'Never',alcoholFree:'Sometimes',interests:['Family time','Racing / motorsports','Movies','Restaurants','Outdoors','Technology'],bio:'Parent, weekend adventurer, and the person who always knows a good hole-in-the-wall restaurant.',personality:{openness:72,conscientiousness:75,extraversion:52,agreeableness:78,emotionalStability:69}},
  {id:2,name:'Taylor',age:29,area:'Jeffersonville area',distance:18,goal:'Marriage-minded',conflict:'Talk it through quickly',social:'Mostly homebody',planning:'Plan almost everything',children:'I want children',alcohol:'Never',nicotine:'Never',vaping:'Never',cannabis:'Never',alcoholFree:'Yes',interests:['Reading','Coffee shops','Family time','Pets','Cooking','Board games'],bio:'Bookstore dates, Sunday brunch, dog walks, and calm conversations are my speed.',personality:{openness:65,conscientiousness:88,extraversion:35,agreeableness:85,emotionalStability:77}},
  {id:3,name:'Casey',age:35,area:'Oldham County area',distance:9,goal:'Dating and seeing where it goes',conflict:'Use humor, then talk',social:'Usually social',planning:'Mostly spontaneous',children:'I am open either way',alcohol:'Socially',nicotine:'Occasionally',vaping:'Occasionally',cannabis:'Occasionally',alcoholFree:'No preference',interests:['Concerts','Travel','Sports','Restaurants','Photography','Outdoors'],bio:'Always ready for a concert, road trip, or game — but also appreciates a quiet night in.',personality:{openness:84,conscientiousness:55,extraversion:78,agreeableness:70,emotionalStability:64}},
  {id:4,name:'Morgan',age:33,area:'Louisville area',distance:21,goal:'Long-term relationship',conflict:'Take some space, then talk',social:'Balanced',planning:'Plan the important things',children:'I have children',alcohol:'Sober / in recovery',nicotine:'Never',vaping:'Never',cannabis:'Never',alcoholFree:'Yes',interests:['Family time','Fitness','Movies','Volunteering','Coffee shops','Music'],bio:'Sober, grounded, family-first, and happiest when life has a little purpose and a lot of laughter.',personality:{openness:70,conscientiousness:81,extraversion:50,agreeableness:89,emotionalStability:73}},
  {id:5,name:'Riley',age:30,area:'New Albany area',distance:27,goal:'Long-term relationship',conflict:'Keep things calm and brief',social:'Mostly homebody',planning:'Plan the important things',children:'I may want children',alcohol:'Occasionally',nicotine:'Regularly',vaping:'Regularly',cannabis:'Never',alcoholFree:'Sometimes',interests:['Gaming','Technology','Movies','DIY projects','Cooking','Music'],bio:'Techie, homebody, amateur cook, and very serious about movie-night snacks.',personality:{openness:76,conscientiousness:67,extraversion:30,agreeableness:72,emotionalStability:70}}
];

let step = 1;
let selectedInterests = new Set();
let deferredPrompt = null;
let activeChatId = null;

function $(sel){return document.querySelector(sel)}
function $$(sel){return [...document.querySelectorAll(sel)]}

function init(){
  renderPersonality();
  renderInterests();
  restoreProfile();
  renderMatches();
  seedDemoConversations();
  renderConversations();
  bindNav();
  bindForm();
  registerPwa();
  bindChat();
}

function renderPersonality(){
  const wrap = $('#personalitySliders');
  wrap.innerHTML = personalityTraits.map(t=>`<div class="range-row"><div class="range-top"><strong>${t.title}</strong><span id="${t.key}Value">50</span></div><input type="range" min="0" max="100" value="50" name="${t.key}" data-range="${t.key}" /><div class="range-labels"><span>${t.low}</span><span>${t.high}</span></div></div>`).join('');
  $$('[data-range]').forEach(r=>r.addEventListener('input',e=>$(`#${e.target.dataset.range}Value`).textContent=e.target.value));
}

function renderInterests(){
  $('#interestGrid').innerHTML = interests.map(i=>`<button type="button" class="chip" data-interest="${i}">${i}</button>`).join('');
  $$('[data-interest]').forEach(btn=>btn.addEventListener('click',()=>{const i=btn.dataset.interest;selectedInterests.has(i)?selectedInterests.delete(i):selectedInterests.add(i);btn.classList.toggle('selected');}));
}

function bindNav(){
  $$('[data-nav]').forEach(btn=>btn.addEventListener('click',()=>showScreen(btn.dataset.nav)));
}
function showScreen(id){
  $$('.screen').forEach(s=>s.classList.remove('active'));
  $(`#${id}`).classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
  if(id==='matches') renderMatches();
  if(id==='messages') renderConversations();
}

function bindForm(){
  $('#nextBtn').addEventListener('click',()=>{
    if(step===1 && !validateBasics()) return;
    if(step===5 && selectedInterests.size<3){alert('Choose at least three interests so the matching has something meaningful to work with.');return;}
    if(step<6){step++;updateStep();}
  });
  $('#prevBtn').addEventListener('click',()=>{if(step>1){step--;updateStep();}});
  $('#profileForm').addEventListener('submit',e=>{e.preventDefault();saveProfile();renderMatches();showScreen('matches');});
}
function validateBasics(){
  const form=$('#profileForm');
  for(const el of ['name','age','area','minAge','maxAge']){if(!form.elements[el].value){form.elements[el].reportValidity();return false;}}
  if(Number(form.elements.age.value)<18){alert('Common Ground is for adults age 18 and older.');return false;}
  const minAge=Number(form.elements.minAge.value),maxAge=Number(form.elements.maxAge.value);
  if(minAge<18||maxAge<18){alert('Dating age preferences must be 18 or older.');return false;}
  if(minAge>maxAge){alert('Your youngest preferred age cannot be higher than your oldest preferred age.');return false;}
  return true;
}
function updateStep(){
  $$('.step').forEach(s=>s.classList.toggle('active',Number(s.dataset.step)===step));
  $('#progressBar').style.width=`${(step/6)*100}%`;
  $('#prevBtn').classList.toggle('hidden',step===1);
  $('#nextBtn').classList.toggle('hidden',step===6);
  $('#saveBtn').classList.toggle('hidden',step!==6);
  window.scrollTo({top:0,behavior:'smooth'});
}

function getProfileFromForm(){
  const fd = new FormData($('#profileForm'));
  const obj = Object.fromEntries(fd.entries());
  obj.age=Number(obj.age);obj.radius=Number(obj.radius);obj.minAge=Number(obj.minAge);obj.maxAge=Number(obj.maxAge);
  obj.personality={};personalityTraits.forEach(t=>obj.personality[t.key]=Number(obj[t.key]));
  obj.interests=[...selectedInterests];
  obj.deals={goal:fd.has('dealGoal'),smoking:fd.has('dealSmoking'),vaping:fd.has('dealVaping'),alcohol:fd.has('dealAlcohol'),cannabis:fd.has('dealCannabis')};
  return obj;
}
function saveProfile(){localStorage.setItem('cg_profile',JSON.stringify(getProfileFromForm()));}
function restoreProfile(){
  const raw=localStorage.getItem('cg_profile');if(!raw)return;
  const p=JSON.parse(raw),f=$('#profileForm');
  Object.entries(p).forEach(([k,v])=>{if(['personality','interests','deals'].includes(k))return;if(f.elements[k])f.elements[k].value=v});
  personalityTraits.forEach(t=>{if(p.personality?.[t.key]!==undefined){f.elements[t.key].value=p.personality[t.key];$(`#${t.key}Value`).textContent=p.personality[t.key];}});
  selectedInterests=new Set(p.interests||[]);$$('[data-interest]').forEach(b=>b.classList.toggle('selected',selectedInterests.has(b.dataset.interest)));
  if(p.deals){[['dealGoal','goal'],['dealSmoking','smoking'],['dealVaping','vaping'],['dealAlcohol','alcohol'],['dealCannabis','cannabis']].forEach(([el,key])=>{f.elements[el].checked=!!p.deals[key]});}
}

function getUserProfile(){
  const raw=localStorage.getItem('cg_profile');
  if(raw)return JSON.parse(raw);
  return {name:'You',age:30,area:'your area',radius:25,minAge:25,maxAge:40,goal:'Long-term relationship',conflict:'Take some space, then talk',social:'Balanced',planning:'Plan the important things',children:'I have children',alcohol:'Occasionally',nicotine:'Never',vaping:'Never',cannabis:'Never',dateDrinker:'Sometimes / depends',dateSmoker:'No',dateSober:'No preference',dateCannabis:'Sometimes / depends',interests:['Family time','Movies','Restaurants','Outdoors','Technology'],personality:{openness:70,conscientiousness:74,extraversion:50,agreeableness:78,emotionalStability:68},deals:{goal:true,smoking:false,vaping:false,alcohol:false,cannabis:false}};
}

function hardConflict(u,m){
  const minAge=Number(u.minAge??18),maxAge=Number(u.maxAge??99);
  if(Number(m.age)<minAge || Number(m.age)>maxAge) return `Outside your preferred age range (${minAge}–${maxAge})`;
  if(u.deals?.goal && !goalCompatible(u.goal,m.goal)) return 'Different relationship goals';
  if(u.deals?.smoking && m.nicotine==='Regularly') return 'Regular cigarette smoking is one of your deal-breakers';
  if(u.deals?.vaping && (m.vaping??'Never')==='Regularly') return 'Regular vaping is one of your deal-breakers';
  if(u.deals?.alcohol && m.alcohol==='Regularly') return 'Regular drinking is one of your deal-breakers';
  if(u.deals?.cannabis && m.cannabis==='Regularly') return 'Regular cannabis use is one of your deal-breakers';
  if(u.dateSmoker==='No' && m.nicotine==='Regularly') return 'You said you would not date a regular cigarette smoker';
  if(u.dateVaper==='No' && (m.vaping??'Never')==='Regularly') return 'You said you would not date someone who regularly vapes';
  if(u.dateDrinker==='No' && ['Regularly','Socially'].includes(m.alcohol)) return 'Alcohol preference conflict';
  if(u.dateCannabis==='No' && ['Regularly','Occasionally'].includes(m.cannabis)) return 'Cannabis preference conflict';
  if(u.dateSober==='Prefer not to' && m.alcohol==='Sober / in recovery') return 'Sobriety preference conflict';
  return null;
}
function goalCompatible(a,b){
  if(a===b)return true;
  const serious=['Long-term relationship','Marriage-minded'];
  return serious.includes(a)&&serious.includes(b) || (a==='Dating and seeing where it goes'&&b==='Long-term relationship') || (b==='Dating and seeing where it goes'&&a==='Long-term relationship');
}
function calcMatch(u,m){
  const conflict=hardConflict(u,m);if(conflict)return {blocked:true,conflict,score:0};
  const goal=goalCompatible(u.goal,m.goal)?100:45;
  const lifestyle=lifestyleScore(u,m);
  const personality=personalityScore(u,m);
  const hobby=interestScore(u,m);
  const distance=Math.max(0,100-(m.distance/Math.max(u.radius||25,10))*45);
  const total=Math.round(goal*.30+lifestyle*.25+personality*.20+hobby*.15+distance*.10);
  return {blocked:false,score:Math.min(99,total),parts:{Goals:Math.round(goal),Lifestyle:Math.round(lifestyle),Personality:Math.round(personality),Interests:Math.round(hobby),Distance:Math.round(distance)}};
}
function lifestyleScore(u,m){
  let points=0,max=7;
  points+=u.conflict===m.conflict?1:.6;
  points+=u.social===m.social?1:.6;
  points+=u.planning===m.planning?1:.65;
  points+=u.children===m.children?1:childrenCompatible(u.children,m.children);
  points+=substanceCompat(u.alcohol,m.alcohol,'alcohol');
  points+=substanceCompat(u.nicotine,m.nicotine,'nicotine');
  points+=substanceCompat(u.vaping??'Never',m.vaping??'Never','vaping');
  return (points/max)*100;
}
function childrenCompatible(a,b){if(a==='I am open either way'||b==='I am open either way')return .8;if(a.includes('have children')&&b.includes('have children'))return 1;if(a.includes('want children')&&b.includes('want children'))return .9;return .55}
function substanceCompat(a,b,type){if(a===b)return 1;if(a==='Never'&&b==='Sober / in recovery'&&type==='alcohol')return 1;if(a==='Sober / in recovery'&&b==='Never'&&type==='alcohol')return 1;if(['Never','Occasionally'].includes(a)&&['Never','Occasionally'].includes(b))return .9;if(a==='Regularly'||b==='Regularly')return .4;return .7}
function personalityScore(u,m){
  const diffs=personalityTraits.map(t=>Math.abs((u.personality?.[t.key]??50)-(m.personality?.[t.key]??50)));
  return Math.max(25,100-(diffs.reduce((a,b)=>a+b,0)/diffs.length));
}
function interestScore(u,m){const a=new Set(u.interests||[]),shared=m.interests.filter(i=>a.has(i)).length;return Math.min(100,35+shared*13)}
function reasons(u,m,result){
  const r=[];
  if(goalCompatible(u.goal,m.goal))r.push('Your relationship goals line up.');
  const shared=m.interests.filter(i=>(u.interests||[]).includes(i));if(shared.length)r.push(`${shared.length} shared interest${shared.length>1?'s':''}: ${shared.slice(0,3).join(', ')}${shared.length>3?'…':''}`);
  if(u.conflict===m.conflict)r.push('You prefer a similar conflict/communication pace.');
  if(u.social===m.social)r.push('Your social-energy preferences are similar.');
  if(u.children===m.children)r.push('You are in a similar place regarding children.');
  if(m.alcohol==='Sober / in recovery' && ['Never','Sober / in recovery'].includes(u.alcohol))r.push('Your alcohol-free lifestyles align.');
  if(m.distance<=(u.radius||25))r.push(`They are about ${m.distance} miles away — inside your preferred radius.`);
  if(r.length<3)r.push('Your overall personality profiles have a compatible balance.');
  return r.slice(0,5);
}

function renderMatches(){
  const u=getUserProfile();const personalized=!!localStorage.getItem('cg_profile');
  $('#matchIntro').textContent=personalized?`Matches for ${u.name}, ages ${u.minAge??18}–${u.maxAge??99}, ranked by compatibility — not popularity.`:'Complete your profile for personalized results. Until then, these use a balanced demo profile.';
  const scored=demoProfiles.map(m=>({m,r:calcMatch(u,m)})).filter(x=>!x.r.blocked).sort((a,b)=>b.r.score-a.r.score);
  const blocked=demoProfiles.length-scored.length;
  $('#matchList').innerHTML=scored.map(({m,r})=>`<article class="card match-card"><div class="match-score">${r.score}%</div><div class="avatar">${m.name[0]}</div><h3>${m.name}, ${m.age}</h3><div class="muted">${m.area} · about ${m.distance} mi</div><div class="tag-row"><span class="tag">${m.goal}</span><span class="tag">${m.social}</span><span class="tag">${m.alcohol}</span></div><ul class="why-list">${reasons(u,m,r).slice(0,3).map(x=>`<li>${x}</li>`).join('')}</ul><button class="primary" data-detail="${m.id}">Why you two?</button></article>`).join('') + (blocked?`<div class="card mini"><strong>${blocked} profile${blocked>1?'s were':' was'} filtered out</strong><p class="muted">Your deal-breakers are applied before scoring, so an otherwise high score cannot override them.</p></div>`:'');
  $$('[data-detail]').forEach(b=>b.addEventListener('click',()=>showDetail(Number(b.dataset.detail))));
}

function showDetail(id){
  const u=getUserProfile(),m=demoProfiles.find(x=>x.id===id),r=calcMatch(u,m);if(!m||r.blocked)return;
  const shared=m.interests.filter(i=>(u.interests||[]).includes(i));
  const date=suggestDate(u,m,shared);
  $('#matchDetailContent').innerHTML=`<div class="detail-grid"><article class="card detail-card"><span class="eyebrow">Compatibility</span><div class="score-big">${r.score}%</div><h2>${m.name}, ${m.age}</h2><p class="muted">${m.area} · about ${m.distance} miles away</p><p>${m.bio}</p><div class="tag-row">${m.interests.slice(0,6).map(i=>`<span class="tag">${i}</span>`).join('')}</div><div class="match-actions"><button class="primary" data-message-match="${m.id}">Message</button><button class="secondary" data-nav="matches">Back to matches</button></div></article><article class="card detail-card"><span class="eyebrow">Why you two?</span><h2>There’s real overlap here.</h2><ul class="why-list">${reasons(u,m,r).map(x=>`<li>${x}</li>`).join('')}</ul><div class="compat-bars">${Object.entries(r.parts).map(([k,v])=>`<div class="bar-row"><span>${k}</span><div class="bar"><span style="width:${v}%"></span></div><strong>${v}</strong></div>`).join('')}</div></article></div><div class="detail-grid" style="margin-top:18px"><article class="card detail-card"><span class="eyebrow">Lifestyle snapshot</span><h3>${m.alcohol}</h3><p>Alcohol · ${m.nicotine} cigarettes · ${(m.vaping??'Never')} vaping · ${m.cannabis} cannabis</p><p class="muted">Lifestyle answers are used for compatibility only. The app does not treat sobriety, abstinence, or substance use as a measure of character.</p></article><article class="date-box"><span class="eyebrow" style="color:#d7bf8c">Suggested first date</span><h2>${date.title}</h2><p>${date.text}</p><strong>${date.cost}</strong></article></div>`;
  showScreen('matchDetail');
  $$('[data-message-match]').forEach(b=>b.addEventListener('click',()=>openChat(Number(b.dataset.messageMatch))));
  $$('[data-nav]').forEach(btn=>btn.addEventListener('click',()=>showScreen(btn.dataset.nav)));
}

function escapeHTML(value){
  return String(value ?? '').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
}
function getConversations(){
  try{return JSON.parse(localStorage.getItem('cg_conversations')||'{}')}catch{return {}}
}
function saveConversations(data){localStorage.setItem('cg_conversations',JSON.stringify(data));}
function seedDemoConversations(){
  const data=getConversations();
  if(Object.keys(data).length)return;
  const now=Date.now();
  data['1']={profileId:1,unread:false,messages:[
    {from:'them',text:'Hey! Looks like we have a lot in common. Racing and good food is a pretty solid start 😄',time:now-1000*60*48},
    {from:'me',text:'Definitely. I like that the app actually explains why we matched.',time:now-1000*60*42}
  ]};
  data['4']={profileId:4,unread:true,messages:[
    {from:'them',text:'Hi! I saw we both put family time pretty high on our list. How is your week going?',time:now-1000*60*18}
  ]};
  saveConversations(data);
}
function ensureConversation(profileId){
  const data=getConversations();
  const key=String(profileId);
  if(!data[key])data[key]={profileId,unread:false,messages:[]};
  saveConversations(data);
  return data[key];
}
function renderConversations(){
  const wrap=$('#conversationList');if(!wrap)return;
  const data=getConversations();
  const rows=Object.values(data).map(c=>{
    const m=demoProfiles.find(x=>x.id===Number(c.profileId));
    const last=c.messages?.[c.messages.length-1];
    return {c,m,last};
  }).filter(x=>x.m).sort((a,b)=>(b.last?.time||0)-(a.last?.time||0));
  if(!rows.length){wrap.innerHTML='<div class="card empty-messages"><h3>No messages yet</h3><p class="muted">When you and someone mutually match, your conversation will appear here.</p><button class="primary" data-nav="matches">Browse matches</button></div>';$$('[data-nav]').forEach(btn=>btn.addEventListener('click',()=>showScreen(btn.dataset.nav)));return;}
  wrap.innerHTML=rows.map(({c,m,last})=>`<button class="conversation-row" data-chat-id="${m.id}"><div class="conversation-avatar">${escapeHTML(m.name[0])}</div><div class="conversation-copy"><div class="conversation-top"><span class="conversation-name">${escapeHTML(m.name)}</span><span class="conversation-time">${formatMessageTime(last?.time)}</span></div><div class="conversation-preview">${escapeHTML(last?.text||'You matched — say hello.')}</div></div>${c.unread?'<span class="unread-dot" aria-label="Unread"></span>':'<span></span>'}</button>`).join('');
  $$('[data-chat-id]').forEach(b=>b.addEventListener('click',()=>openChat(Number(b.dataset.chatId))));
}
function formatMessageTime(ts){
  if(!ts)return '';
  const d=new Date(ts),now=new Date();
  if(d.toDateString()===now.toDateString())return d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
  return d.toLocaleDateString([],{month:'short',day:'numeric'});
}
function openChat(profileId){
  const m=demoProfiles.find(x=>x.id===Number(profileId));if(!m)return;
  ensureConversation(profileId);activeChatId=Number(profileId);
  const data=getConversations();data[String(profileId)].unread=false;saveConversations(data);
  $('#chatHeader').innerHTML=`<div class="conversation-avatar">${escapeHTML(m.name[0])}</div><div><div class="chat-title">${escapeHTML(m.name)}</div><div class="chat-subtitle">Matched through Common Ground · ${escapeHTML(m.area)}</div></div>`;
  renderChatMessages();showScreen('chat');
}
function renderChatMessages(){
  if(activeChatId===null)return;
  const wrap=$('#chatMessages');const data=getConversations();const c=data[String(activeChatId)];
  const messages=c?.messages||[];
  wrap.innerHTML=messages.length?messages.map(msg=>{
    if(msg.type==='voice'&&msg.audio){
      const dur=msg.duration?formatDuration(msg.duration):'Voice memo';
      return `<div class="message-row ${msg.from==='me'?'mine':''}"><div class="message-bubble voice-bubble"><div class="voice-label">🎙 Voice memo <span>${escapeHTML(dur)}</span></div><audio controls preload="metadata" src="${msg.audio}"></audio><span class="message-meta">${formatMessageTime(msg.time)}</span></div></div>`;
    }
    return `<div class="message-row ${msg.from==='me'?'mine':''}"><div class="message-bubble">${escapeHTML(msg.text||'')}<span class="message-meta">${formatMessageTime(msg.time)}</span></div></div>`;
  }).join(''):'<div class="empty-messages"><p class="muted">You matched. Say hello when you’re ready.</p></div>';
  requestAnimationFrame(()=>{wrap.scrollTop=wrap.scrollHeight});
}
function formatDuration(seconds){
  const s=Math.max(0,Math.round(Number(seconds)||0));
  return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
}
function setVoiceStatus(text,show=true){
  const el=$('#voiceStatus');if(!el)return;
  el.textContent=text;
  el.classList.toggle('hidden',!show);
}
function updateVoiceTimer(){
  if(!voiceStartedAt)return;
  const seconds=Math.floor((Date.now()-voiceStartedAt)/1000);
  setVoiceStatus(`Recording voice memo… ${formatDuration(seconds)} · tap the microphone again to send`);
}
async function toggleVoiceRecording(){
  const btn=$('#voiceMemoBtn');
  if(mediaRecorder&&mediaRecorder.state==='recording'){
    mediaRecorder.stop();
    return;
  }
  if(!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder==='undefined'){
    setVoiceStatus('Voice recording is not supported in this browser. Try Safari or Chrome on a current phone.',true);
    setTimeout(()=>setVoiceStatus('',false),4500);
    return;
  }
  if(activeChatId===null)return;
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    voiceChunks=[];
    mediaRecorder=new MediaRecorder(stream);
    mediaRecorder.ondataavailable=e=>{if(e.data&&e.data.size)voiceChunks.push(e.data)};
    mediaRecorder.onstop=()=>{
      clearInterval(voiceTimer);voiceTimer=null;
      const duration=(Date.now()-voiceStartedAt)/1000;voiceStartedAt=0;
      btn?.classList.remove('recording');
      stream.getTracks().forEach(t=>t.stop());
      const blob=new Blob(voiceChunks,{type:mediaRecorder.mimeType||'audio/webm'});
      if(!blob.size){setVoiceStatus('No audio was recorded.',true);setTimeout(()=>setVoiceStatus('',false),2500);return;}
      const reader=new FileReader();
      reader.onload=()=>{
        const data=getConversations();const key=String(activeChatId);
        if(!data[key])data[key]={profileId:activeChatId,unread:false,messages:[]};
        data[key].messages.push({from:'me',type:'voice',audio:reader.result,duration,time:Date.now()});
        try{saveConversations(data);setVoiceStatus('Voice memo sent.',true);setTimeout(()=>setVoiceStatus('',false),1800);}
        catch(err){setVoiceStatus('That voice memo is too large to save in this prototype. Try a shorter memo.',true);setTimeout(()=>setVoiceStatus('',false),4500);}
        renderChatMessages();renderConversations();
      };
      reader.readAsDataURL(blob);
    };
    mediaRecorder.start();voiceStartedAt=Date.now();btn?.classList.add('recording');
    updateVoiceTimer();voiceTimer=setInterval(updateVoiceTimer,1000);
  }catch(err){
    setVoiceStatus('Microphone access is needed to record a voice memo.',true);
    setTimeout(()=>setVoiceStatus('',false),4000);
  }
}
function bindChat(){
  const form=$('#chatForm');if(!form)return;
  const voiceBtn=$('#voiceMemoBtn');if(voiceBtn)voiceBtn.addEventListener('click',toggleVoiceRecording);
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const input=$('#chatInput');const text=input.value.trim();if(!text||activeChatId===null)return;
    const data=getConversations();const key=String(activeChatId);if(!data[key])data[key]={profileId:activeChatId,unread:false,messages:[]};
    data[key].messages.push({from:'me',text,time:Date.now()});saveConversations(data);input.value='';renderChatMessages();
  });
}

function suggestDate(u,m,shared){
  const under21=Number(u.age)<21 || Number(m.age)<21;
  if(shared.includes('Coffee shops'))return {title:'Coffee + a walk',text:'Meet at a busy coffee shop, then take a short walk somewhere public if you both want to keep talking.',cost:'Estimated: $10–20'};
  if(shared.includes('Racing / motorsports'))return {title:'Local race night',text:'A casual public event gives you something to talk about without forcing constant conversation.',cost:'Estimated: $20–50'};
  if(shared.includes('Board games')||shared.includes('Gaming'))return {title:'Game café',text:'Choose a public game café or casual arcade and let a little friendly competition break the ice.',cost:'Estimated: $15–35'};
  if(shared.includes('Outdoors')||shared.includes('Hiking'))return {title:'Public park + snack',text:'Pick a busy public park during daylight and keep the first meeting short and low-pressure.',cost:'Estimated: $5–20'};
  return under21?{title:'Dessert + bookstore',text:'A casual alcohol-free option that gives you easy conversation starters and a natural end point.',cost:'Estimated: $15–30'}:{title:'Casual dinner or dessert',text:'Choose a public place with easy parking and keep the first meet simple. Alcohol is never required for the suggestion.',cost:'Estimated: $20–45'};
}

function registerPwa(){
  if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').classList.remove('hidden');});
  $('#installBtn').addEventListener('click',async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('#installBtn').classList.add('hidden');});
}

document.addEventListener('DOMContentLoaded',init);
