console.info('Common Ground build v41 verified click handlers');
const SUPABASE_URL = 'https://rungxwkdmhsuizgzrmss.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_dSQAmBPDMFiN7alJVWbagA_NH114i-D';
let supabaseClient = null;
let currentSession = null;
let currentUser = null;

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

const interests = ['Family time','Racing / motorsports','Travel','Movies','Reading','Gaming','Fitness','Exercise / gym','Running','Homebody','Cooking','Music','Concerts','Outdoors','Camping','Hiking','Sports','Pets','Art / design','Technology','DIY projects','Coffee shops','Restaurants','Volunteering','Faith / spirituality','Board games','Photography'];

const demoProfiles = [
  {id:1,name:'Jordan',age:32,verifiedNameAge:true,area:'Louisville area',distance:12,goal:'Long-term relationship',conflict:'Take some space, then talk',social:'Balanced',planning:'Plan the important things',children:'I have children',alcohol:'Occasionally',nicotine:'Never',vaping:'Never',cannabis:'Never',alcoholFree:'Sometimes',interests:['Family time','Racing / motorsports','Movies','Restaurants','Outdoors','Technology'],bio:'Parent, weekend adventurer, and the person who always knows a good hole-in-the-wall restaurant.',personality:{openness:72,conscientiousness:75,extraversion:52,agreeableness:78,emotionalStability:69}},
  {id:2,name:'Taylor',age:29,verifiedNameAge:true,area:'Jeffersonville area',distance:18,goal:'Marriage-minded',conflict:'Talk it through quickly',social:'Mostly homebody',planning:'Plan almost everything',children:'I want children',alcohol:'Never',nicotine:'Never',vaping:'Never',cannabis:'Never',alcoholFree:'Yes',interests:['Reading','Coffee shops','Family time','Pets','Cooking','Board games'],bio:'Bookstore dates, Sunday brunch, dog walks, and calm conversations are my speed.',personality:{openness:65,conscientiousness:88,extraversion:35,agreeableness:85,emotionalStability:77}},
  {id:3,name:'Casey',age:35,verifiedNameAge:false,area:'Oldham County area',distance:9,goal:'Dating and seeing where it goes',conflict:'Use humor, then talk',social:'Usually social',planning:'Mostly spontaneous',children:'I am open either way',alcohol:'Socially',nicotine:'Occasionally',vaping:'Occasionally',cannabis:'Occasionally',alcoholFree:'No preference',interests:['Concerts','Travel','Sports','Restaurants','Photography','Outdoors'],bio:'Always ready for a concert, road trip, or game — but also appreciates a quiet night in.',personality:{openness:84,conscientiousness:55,extraversion:78,agreeableness:70,emotionalStability:64}},
  {id:4,name:'Morgan',age:33,verifiedNameAge:true,area:'Louisville area',distance:21,goal:'Long-term relationship',conflict:'Take some space, then talk',social:'Balanced',planning:'Plan the important things',children:'I have children',alcohol:'Sober / in recovery',nicotine:'Never',vaping:'Never',cannabis:'Never',alcoholFree:'Yes',interests:['Family time','Fitness','Movies','Volunteering','Coffee shops','Music'],bio:'Sober, grounded, family-first, and happiest when life has a little purpose and a lot of laughter.',personality:{openness:70,conscientiousness:81,extraversion:50,agreeableness:89,emotionalStability:73}},
  {id:5,name:'Riley',age:30,verifiedNameAge:false,area:'New Albany area',distance:27,goal:'Long-term relationship',conflict:'Keep things calm and brief',social:'Mostly homebody',planning:'Plan the important things',children:'I may want children',alcohol:'Occasionally',nicotine:'Regularly',vaping:'Regularly',cannabis:'Never',alcoholFree:'Sometimes',interests:['Gaming','Technology','Movies','DIY projects','Cooking','Music'],bio:'Techie, homebody, amateur cook, and very serious about movie-night snacks.',personality:{openness:76,conscientiousness:67,extraversion:30,agreeableness:72,emotionalStability:70}}
];

let step = 1;
let selectedInterests = new Set();
let deferredPrompt = null;
let activeChatId = null;

function $(sel){return document.querySelector(sel)}
function $$(sel){return [...document.querySelectorAll(sel)]}

async function init(){
  renderPersonality();
  renderInterests();
  restoreProfile();
  seedDemoConversations();
  bindNav();
  bindForm();
  // Service worker caching disabled during active development to avoid stale builds.
  bindChat();
  bindAuth();
  await initSupabase();
  initVerificationUI();
  renderMatches();
  renderConversations();
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
  if(id==='accountSettings' && !currentUser) id='auth';
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
  $('#profileForm').addEventListener('submit',async e=>{e.preventDefault();await saveProfile();renderMatches();showScreen('matches');});
}
function validateBasics(){
  const form=$('#profileForm');
  for(const el of ['name','age','area','gender','religion','minAge','maxAge']){if(!form.elements[el].value){form.elements[el].reportValidity();return false;}}
  if(!form.querySelector('[name="seekingGender"]:checked')){alert('Choose at least one gender you are interested in.');return false;}
  if(!form.querySelector('[name="relationshipGoal"]:checked')){alert('Choose at least one thing you are looking for.');return false;}
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


function profileStorageKey(userId=currentUser?.id){
  return userId ? `cg_profile_${userId}` : 'cg_profile_demo';
}
function readStoredProfile(){
  const raw=localStorage.getItem(profileStorageKey());
  if(raw)return raw;
  // Backward compatibility: signed-out demo may use legacy key. Never reuse legacy data for a signed-in account.
  if(!currentUser)return localStorage.getItem('cg_profile');
  return null;
}
function hasStoredProfile(){ return !!readStoredProfile(); }
function writeStoredProfile(profile){
  const serialized=JSON.stringify(profile);
  localStorage.setItem(profileStorageKey(),serialized);
  if(!currentUser)localStorage.setItem('cg_profile',serialized);
}
function clearCurrentProfileCache(){ localStorage.removeItem(profileStorageKey()); }

function getProfileFromForm(){
  const fd = new FormData($('#profileForm'));
  const obj = Object.fromEntries(fd.entries());
  obj.age=Number(obj.age);obj.radius=Number(obj.radius);obj.minAge=Number(obj.minAge);obj.maxAge=Number(obj.maxAge);
  obj.seekingGenders=fd.getAll('seekingGender');
  obj.goals=fd.getAll('relationshipGoal');
  obj.goal=obj.goals[0]||'Long-term relationship';
  delete obj.seekingGender;
  delete obj.relationshipGoal;
  obj.personality={};personalityTraits.forEach(t=>obj.personality[t.key]=Number(obj[t.key]));
  obj.interests=[...selectedInterests];
  obj.deals={goal:fd.has('dealGoal'),smoking:fd.has('dealSmoking'),vaping:fd.has('dealVaping'),alcohol:fd.has('dealAlcohol'),cannabis:fd.has('dealCannabis')};
  return obj;
}
async function saveProfile(){
  const profile=getProfileFromForm();
  writeStoredProfile(profile);
  if(!supabaseClient || !currentUser){
    showToast('Profile saved on this device. Sign in to save it online.');
    return;
  }
  const row=profileToDb(profile,currentUser.id);
  const {error}=await supabaseClient.from('profiles').upsert(row,{onConflict:'id'});
  if(error){
    console.error(error);
    showToast(`Saved on this device, but online save failed: ${error.message}`);
    return;
  }
  showToast('Profile saved to your Common Ground account.');
}
function restoreProfile(){
  const raw=readStoredProfile();if(!raw)return;
  const p=JSON.parse(raw),f=$('#profileForm');
  Object.entries(p).forEach(([k,v])=>{if(['personality','interests','deals','goals','seekingGenders'].includes(k))return;if(f.elements[k]&&typeof v!=='object')f.elements[k].value=v});
  const savedGoals=(Array.isArray(p.goals)&&p.goals.length)?p.goals:[p.goal].filter(Boolean);
  $('[name="relationshipGoal"]').forEach(el=>el.checked=savedGoals.includes(el.value));
  const savedSeeking=Array.isArray(p.seekingGenders)?p.seekingGenders:[];
  $('[name="seekingGender"]').forEach(el=>el.checked=savedSeeking.includes(el.value));
  personalityTraits.forEach(t=>{if(p.personality?.[t.key]!==undefined){f.elements[t.key].value=p.personality[t.key];$(`#${t.key}Value`).textContent=p.personality[t.key];}});
  selectedInterests=new Set(p.interests||[]);$$('[data-interest]').forEach(b=>b.classList.toggle('selected',selectedInterests.has(b.dataset.interest)));
  if(p.deals){[['dealGoal','goal'],['dealSmoking','smoking'],['dealVaping','vaping'],['dealAlcohol','alcohol'],['dealCannabis','cannabis']].forEach(([el,key])=>{f.elements[el].checked=!!p.deals[key]});}
}

function showToast(message){
  const existing=document.querySelector('.cg-toast');if(existing)existing.remove();
  const el=document.createElement('div');el.className='cg-toast';el.textContent=message;document.body.appendChild(el);
  setTimeout(()=>el.classList.add('show'),10);setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),250)},3400);
}
function setAuthMessage(message,type=''){
  const el=$('#authMessage');if(!el)return;el.textContent=message;el.className=`auth-message ${type}`.trim();
}
function bindAuth(){
  const form=$('#authForm'),signUp=$('#signUpBtn'),account=$('#accountBtn'),signOut=$('#signOutBtn'),accountSignOut=$('#accountSignOutBtn');
  if(form)form.addEventListener('submit',async e=>{e.preventDefault();await signInUser();});
  if(signUp)signUp.addEventListener('click',signUpUser);
  if(account)account.addEventListener('click',()=>showScreen(currentUser?'accountSettings':'auth'));
  if(accountSignOut)accountSignOut.addEventListener('click',signOutUser);
  if(signOut)signOut.addEventListener('click',signOutUser);
}
async function initSupabase(){
  if(!window.supabase){setAuthMessage('Supabase could not load. Check your internet connection.','error');return;}
  supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const {data,error}=await supabaseClient.auth.getSession();
  if(error)console.error(error);
  currentSession=data?.session||null;currentUser=currentSession?.user||null;
  updateAuthUI();
  if(currentUser){await loadProfileFromSupabase();updateAuthUI();}
  setTimeout(updateAuthUI,150);
  setTimeout(updateAuthUI,800);
  supabaseClient.auth.onAuthStateChange(async(_event,session)=>{
    currentSession=session||null;currentUser=session?.user||null;updateAuthUI();
    if(currentUser){await loadProfileFromSupabase();updateAuthUI();}
  });
}
function updateAuthUI(){
  const status=$('#authStatus'),account=$('#accountBtn'),signOut=$('#signOutBtn');
  const loggedOut=$('#homeLoggedOutActions'),loggedIn=$('#homeLoggedInActions');
  const accountEmail=$('#accountEmail');
  const verificationText=$('#accountVerificationText');
  if(currentUser){
    if(status)status.textContent=currentUser.email||'Signed in';
    if(account){account.textContent='Account';account.classList.add('signed-in');}
    // Keep the top bar clean: Sign out lives inside Account settings.
    if(signOut)signOut.classList.add('hidden');
    if(loggedOut)loggedOut.classList.add('hidden');
    if(loggedIn)loggedIn.classList.remove('hidden');
    if(accountEmail)accountEmail.textContent=currentUser.email||'Signed in';
    const p=readStoredProfile();
    if(verificationText && p){
      try{verificationText.textContent=JSON.parse(p).verifiedNameAge?'Name & age verified.':'Optional. Your name and age are not verified yet.';}catch(_e){}
    }
  }else{
    if(status)status.textContent='Demo mode';
    if(account){account.textContent='Sign in';account.classList.remove('signed-in');}
    if(signOut)signOut.classList.add('hidden');
    if(loggedOut)loggedOut.classList.remove('hidden');
    if(loggedIn)loggedIn.classList.add('hidden');
    if(accountEmail)accountEmail.textContent='Not signed in';
  }
}
async function signUpUser(){
  if(!supabaseClient){setAuthMessage('Supabase is still loading. Try again in a moment.','error');return;}
  const email=$('#authEmail').value.trim(),password=$('#authPassword').value;
  if(!email||password.length<6){setAuthMessage('Enter a valid email and a password with at least 6 characters.','error');return;}
  const redirectTo=window.location.origin+window.location.pathname.replace(/index\.html$/,'');
  setAuthMessage('Creating your account…');
  const {data,error}=await supabaseClient.auth.signUp({email,password,options:{emailRedirectTo:redirectTo}});
  if(error){setAuthMessage(error.message,'error');return;}
  if(data.session){setAuthMessage('Account created and signed in.','success');showToast('Welcome to Common Ground.');showScreen('onboarding');}
  else setAuthMessage('Account created. Check your email to confirm your address, then sign in.','success');
}
async function signInUser(){
  if(!supabaseClient){setAuthMessage('Supabase is still loading. Try again in a moment.','error');return;}
  const email=$('#authEmail').value.trim(),password=$('#authPassword').value;
  setAuthMessage('Signing in…');
  const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});
  if(error){setAuthMessage(error.message,'error');return;}
  currentSession=data?.session||null;
  currentUser=currentSession?.user||data?.user||null;
  updateAuthUI();
  if(currentUser){
    try{await loadProfileFromSupabase();}catch(err){console.error('Profile load after sign in failed',err);}
    updateAuthUI();
  }
  setAuthMessage('Signed in.','success');
  showToast('Signed in to Common Ground.');
  showScreen(hasStoredProfile()?'matches':'onboarding');
}
async function signOutUser(){
  if(!supabaseClient)return;
  await supabaseClient.auth.signOut();currentSession=null;currentUser=null;updateAuthUI();showToast('Signed out. Demo mode is still available on this device.');showScreen('home');
}
function profileToDb(p,userId){
  return {
    id:userId,
    first_name:p.name,
    age:Number(p.age),
    area:p.area||null,
    dating_radius:Number(p.radius)||25,
    min_age:Number(p.minAge)||18,
    max_age:Number(p.maxAge)||99,
    gender:p.gender||null,
    seeking_genders:p.seekingGenders||[],
    religion:p.religion||null,
    relationship_goals:(p.goals&&p.goals.length)?p.goals:[p.goal].filter(Boolean),
    relationship_goal:(p.goals&&p.goals.length?p.goals[0]:p.goal)||null,
    bio:p.bio||null,
    conflict_style:p.conflict||null,
    social_energy:p.social||null,
    planning_style:p.planning||null,
    children_preference:p.children||null,
    alcohol:p.alcohol||null,
    smoking:p.nicotine||null,
    vaping:p.vaping||null,
    cannabis:p.cannabis||null,
    alcohol_free:p.alcoholFree||null,
    deal_goal:!!p.deals?.goal,
    deal_smoking:!!p.deals?.smoking,
    deal_vaping:!!p.deals?.vaping,
    deal_alcohol:!!p.deals?.alcohol,
    deal_cannabis:!!p.deals?.cannabis,
    date_drinker:p.dateDrinker||null,
    date_smoker:p.dateSmoker||null,
    date_vaper:p.dateVaper||null,
    date_cannabis:p.dateCannabis||null,
    date_sober:p.dateSober||null,
    interests:p.interests||[],
    openness:p.personality?.openness??50,
    conscientiousness:p.personality?.conscientiousness??50,
    extraversion:p.personality?.extraversion??50,
    agreeableness:p.personality?.agreeableness??50,
    emotional_stability:p.personality?.emotionalStability??50,
    updated_at:new Date().toISOString()
  };
}
function dbToProfile(r){
  return {
    name:r.first_name||'',age:r.age||18,area:r.area||'',radius:r.dating_radius||25,minAge:r.min_age||18,maxAge:r.max_age||99,
    gender:r.gender||'',seekingGenders:r.seeking_genders||[],religion:r.religion||'Prefer not to say',
    goals:(r.relationship_goals&&r.relationship_goals.length)?r.relationship_goals:[r.relationship_goal||'Long-term relationship'],
    goal:(r.relationship_goals&&r.relationship_goals.length?r.relationship_goals[0]:r.relationship_goal)||'Long-term relationship',bio:r.bio||'',conflict:r.conflict_style||'Take some space, then talk',social:r.social_energy||'Balanced',planning:r.planning_style||'Plan the important things',children:r.children_preference||'I am open either way',
    alcohol:r.alcohol||'Never',nicotine:r.smoking||'Never',vaping:r.vaping||'Never',cannabis:r.cannabis||'Never',alcoholFree:r.alcohol_free||'No preference',dateDrinker:r.date_drinker||'Sometimes / depends',dateSmoker:r.date_smoker||'Sometimes / depends',dateVaper:r.date_vaper||'Sometimes / depends',dateCannabis:r.date_cannabis||'Sometimes / depends',dateSober:r.date_sober||'No preference',
    interests:r.interests||[],verifiedNameAge:!!r.name_age_verified,
    personality:{openness:r.openness??50,conscientiousness:r.conscientiousness??50,extraversion:r.extraversion??50,agreeableness:r.agreeableness??50,emotionalStability:r.emotional_stability??50},
    deals:{goal:r.deal_goal??true,smoking:!!r.deal_smoking,vaping:!!r.deal_vaping,alcohol:!!r.deal_alcohol,cannabis:!!r.deal_cannabis}
  };
}
async function loadProfileFromSupabase(){
  if(!supabaseClient||!currentUser)return;
  const {data,error}=await supabaseClient.from('profiles').select('*').eq('id',currentUser.id).maybeSingle();
  if(error){console.error(error);return;}
  if(!data){ clearCurrentProfileCache(); return; }
  const p=dbToProfile(data);writeStoredProfile(p);restoreProfile();renderMatches();initVerificationUI();
  showToast('Your saved Common Ground profile was loaded.');
}

function getUserProfile(){
  const raw=readStoredProfile();
  if(raw)return JSON.parse(raw);
  return {name:'You',age:30,area:'your area',radius:25,minAge:25,maxAge:40,goal:'Long-term relationship',conflict:'Take some space, then talk',social:'Balanced',planning:'Plan the important things',children:'I have children',alcohol:'Occasionally',nicotine:'Never',vaping:'Never',cannabis:'Never',dateDrinker:'Sometimes / depends',dateSmoker:'No',dateSober:'No preference',dateCannabis:'Sometimes / depends',interests:['Family time','Movies','Restaurants','Outdoors','Technology'],personality:{openness:70,conscientiousness:74,extraversion:50,agreeableness:78,emotionalStability:68},deals:{goal:true,smoking:false,vaping:false,alcohol:false,cannabis:false}};
}

function goalList(p){
  if(Array.isArray(p?.goals)&&p.goals.length)return p.goals;
  if(Array.isArray(p))return p;
  if(typeof p==='string')return [p];
  return p?.goal?[p.goal]:[];
}
function genderPreferenceAllows(person,candidate){
  const wanted=Array.isArray(person?.seekingGenders)?person.seekingGenders:[];
  if(!wanted.length||wanted.includes('Any gender')||!candidate?.gender)return true;
  const label=candidate.gender==='Woman'?'Women':candidate.gender==='Man'?'Men':candidate.gender==='Nonbinary'?'Nonbinary':candidate.gender;
  return wanted.includes(label);
}
function hardConflict(u,m){
  const minAge=Number(u.minAge??18),maxAge=Number(u.maxAge??99);
  if(Number(m.age)<minAge || Number(m.age)>maxAge) return `Outside your preferred age range (${minAge}–${maxAge})`;
  if(m.realUser && Number(u.age) && (Number(u.age)<Number(m.minAge??18) || Number(u.age)>Number(m.maxAge??99))) return 'You are outside this person’s preferred age range';
  if(m.realUser && (!genderPreferenceAllows(u,m) || !genderPreferenceAllows(m,u))) return 'Gender preferences do not line up';
  if(u.deals?.goal && !goalCompatible(goalList(u),goalList(m))) return 'Different relationship goals';
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
  const aa=goalList(a),bb=goalList(b);
  if(aa.some(x=>bb.includes(x)))return true;
  const serious=['Long-term relationship','Marriage-minded'];
  if(aa.some(x=>serious.includes(x))&&bb.some(x=>serious.includes(x)))return true;
  return (aa.includes('Dating and seeing where it goes')&&bb.includes('Long-term relationship')) || (bb.includes('Dating and seeing where it goes')&&aa.includes('Long-term relationship'));
}
function calcMatch(u,m){
  const conflict=hardConflict(u,m);if(conflict)return {blocked:true,conflict,score:0};
  const goal=goalCompatible(goalList(u),goalList(m))?100:45;
  const lifestyle=lifestyleScore(u,m);
  const personality=personalityScore(u,m);
  const hobby=interestScore(u,m);
  const distance=Number.isFinite(Number(m.distance)) && m.distance!==null ? Math.max(0,100-(Number(m.distance)/Math.max(u.radius||25,10))*45) : ((u.area&&m.area&&u.area.trim().toLowerCase()===m.area.trim().toLowerCase())?100:70);
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
  if(goalCompatible(goalList(u),goalList(m)))r.push('Your relationship goals line up.');
  const shared=m.interests.filter(i=>(u.interests||[]).includes(i));if(shared.length)r.push(`${shared.length} shared interest${shared.length>1?'s':''}: ${shared.slice(0,3).join(', ')}${shared.length>3?'…':''}`);
  if(u.conflict===m.conflict)r.push('You prefer a similar conflict/communication pace.');
  if(u.social===m.social)r.push('Your social-energy preferences are similar.');
  if(u.children===m.children)r.push('You are in a similar place regarding children.');
  if(m.alcohol==='Sober / in recovery' && ['Never','Sober / in recovery'].includes(u.alcohol))r.push('Your alcohol-free lifestyles align.');
  if(Number.isFinite(Number(m.distance)) && m.distance!==null && Number(m.distance)<=(u.radius||25))r.push(`They are about ${m.distance} miles away — inside your preferred radius.`);
  else if(u.area&&m.area&&u.area.trim().toLowerCase()===m.area.trim().toLowerCase())r.push('You listed the same general area.');
  if(r.length<3)r.push('Your overall personality profiles have a compatible balance.');
  return r.slice(0,5);
}

function renderMatches(){
  const u=getUserProfile();const personalized=hasStoredProfile();
  $('#matchIntro').textContent=personalized?`Matches for ${u.name}, ages ${u.minAge??18}–${u.maxAge??99}, ranked by compatibility — not popularity.`:'Complete your profile for personalized results. Until then, these use a balanced demo profile.';
  const scored=demoProfiles.map(m=>({m,r:calcMatch(u,m)})).filter(x=>!x.r.blocked).sort((a,b)=>b.r.score-a.r.score);
  const blocked=demoProfiles.length-scored.length;
  $('#matchList').innerHTML=scored.map(({m,r})=>`<article class="card match-card"><div class="match-score">${r.score}%</div><div class="avatar">${m.name[0]}</div><h3>${m.name}${verificationBadge(m,true)}, ${m.age}</h3>${verificationLine(m)}<div class="muted">${m.area} · about ${m.distance} mi</div><div class="tag-row"><span class="tag">${m.goal}</span><span class="tag">${m.social}</span><span class="tag">${m.alcohol}</span></div><ul class="why-list">${reasons(u,m,r).slice(0,3).map(x=>`<li>${x}</li>`).join('')}</ul><button class="primary" data-detail="${m.id}">Why you two?</button></article>`).join('') + (blocked?`<div class="card mini"><strong>${blocked} profile${blocked>1?'s were':' was'} filtered out</strong><p class="muted">Your deal-breakers are applied before scoring, so an otherwise high score cannot override them.</p></div>`:'');
  $$('[data-detail]').forEach(b=>b.addEventListener('click',()=>showDetail(Number(b.dataset.detail))));
}

function showDetail(id){
  const u=getUserProfile(),m=demoProfiles.find(x=>x.id===id),r=calcMatch(u,m);if(!m||r.blocked)return;
  const shared=m.interests.filter(i=>(u.interests||[]).includes(i));
  const date=suggestDate(u,m,shared);
  $('#matchDetailContent').innerHTML=`<div class="detail-grid"><article class="card detail-card"><span class="eyebrow">Compatibility</span><div class="score-big">${r.score}%</div><h2>${m.name}${verificationBadge(m)}, ${m.age}</h2>${verificationLine(m)}<p class="muted">${m.area} · about ${m.distance} miles away</p><p>${m.bio}</p><div class="tag-row">${m.interests.slice(0,6).map(i=>`<span class="tag">${i}</span>`).join('')}</div><div class="match-actions"><button class="primary" data-message-match="${m.id}">Message</button><button class="secondary" data-nav="matches">Back to matches</button></div></article><article class="card detail-card"><span class="eyebrow">Why you two?</span><h2>There’s real overlap here.</h2><ul class="why-list">${reasons(u,m,r).map(x=>`<li>${x}</li>`).join('')}</ul><div class="compat-bars">${Object.entries(r.parts).map(([k,v])=>`<div class="bar-row"><span>${k}</span><div class="bar"><span style="width:${v}%"></span></div><strong>${v}</strong></div>`).join('')}</div></article></div><div class="detail-grid" style="margin-top:18px"><article class="card detail-card"><span class="eyebrow">Lifestyle snapshot</span><h3>${m.alcohol}</h3><p>Alcohol · ${m.nicotine} cigarettes · ${(m.vaping??'Never')} vaping · ${m.cannabis} cannabis</p><p class="muted">Lifestyle answers are used for compatibility only. The app does not treat sobriety, abstinence, or substance use as a measure of character.</p></article><article class="date-box"><span class="eyebrow" style="color:#d7bf8c">Suggested first date</span><h2>${date.title}</h2><p>${date.text}</p><strong>${date.cost}</strong></article></div>`;
  showScreen('matchDetail');
  $$('[data-message-match]').forEach(b=>b.addEventListener('click',()=>openChat(Number(b.dataset.messageMatch))));
  $$('[data-nav]').forEach(btn=>btn.addEventListener('click',()=>showScreen(btn.dataset.nav)));
}

function escapeHTML(value){
  return String(value ?? '').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
}
function verificationBadge(profile,compact=false){
  if(!profile?.verifiedNameAge)return '';
  return `<span class="verified-badge ${compact?'compact':''}" title="Name & age verified" aria-label="Name and age verified">✓</span>`;
}
function verificationLine(profile){
  return profile?.verifiedNameAge?'<div class="verified-line"><span class="verified-badge compact">✓</span> Name &amp; age verified</div>':'';
}
function initVerificationUI(){
  const btn=$('#verifyIdentityBtn'),status=$('#verificationStatus');
  if(!btn||!status)return;
  const profile=getUserProfile();
  if(profile?.verifiedNameAge){status.textContent='Name & age verified';status.classList.add('verified');btn.textContent='Verified';btn.disabled=true;return;}
  const pending=localStorage.getItem('cg_verification_pending')==='1';
  if(pending){status.textContent='Verification pending';status.classList.add('pending');btn.textContent='Verification submitted';btn.disabled=true;}
  btn.addEventListener('click',()=>{
    localStorage.setItem('cg_verification_pending','1');
    status.textContent='Verification pending';status.classList.add('pending');
    btn.textContent='Verification submitted';btn.disabled=true;
    alert('Prototype: this records a verification request only. The production app will use a secure identity provider to confirm legal name and date of birth before the verified badge appears.');
  });
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
function renderDemoConversations(){
  const wrap=$('#conversationList');if(!wrap)return;
  const data=getConversations();
  const rows=Object.values(data).map(c=>{
    const m=demoProfiles.find(x=>x.id===Number(c.profileId));
    const last=c.messages?.[c.messages.length-1];
    return {c,m,last};
  }).filter(x=>x.m).sort((a,b)=>(b.last?.time||0)-(a.last?.time||0));
  if(!rows.length){wrap.innerHTML='<div class="card empty-messages"><h3>No messages yet</h3><p class="muted">When you and someone mutually match, your conversation will appear here.</p><button class="primary" data-nav="matches">Browse matches</button></div>';$$('[data-nav]').forEach(btn=>btn.addEventListener('click',()=>showScreen(btn.dataset.nav)));return;}
  wrap.innerHTML=rows.map(({c,m,last})=>`<button class="conversation-row" data-chat-id="${m.id}"><div class="conversation-avatar">${escapeHTML(m.name[0])}</div><div class="conversation-copy"><div class="conversation-top"><span class="conversation-name">${escapeHTML(m.name)}${verificationBadge(m,true)}</span><span class="conversation-time">${formatMessageTime(last?.time)}</span></div><div class="conversation-preview">${escapeHTML(last?.text||'You matched — say hello.')}</div></div>${c.unread?'<span class="unread-dot" aria-label="Unread"></span>':'<span></span>'}</button>`).join('');
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
  $('#chatHeader').innerHTML=`<div class="conversation-avatar">${escapeHTML(m.name[0])}</div><div><div class="chat-title">${escapeHTML(m.name)}${verificationBadge(m,true)}</div><div class="chat-subtitle">${m.verifiedNameAge?'Name & age verified · ':''}Matched through Common Ground · ${escapeHTML(m.area)}</div></div>`;
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
    setVoiceStatus('Recording… tap the microphone again to send',true);
    updateVoiceTimer();voiceTimer=setInterval(()=>{updateVoiceTimer();if(voiceStartedAt && Date.now()-voiceStartedAt>60000 && mediaRecorder?.state==='recording'){mediaRecorder.stop();}},1000);
  }catch(err){
    setVoiceStatus('Microphone access is needed to record a voice memo.',true);
    setTimeout(()=>setVoiceStatus('',false),4000);
  }
}
function bindDemoChat(){
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
  if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js?v=33').catch(()=>{}));
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').classList.remove('hidden');});
  $('#installBtn').addEventListener('click',async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('#installBtn').classList.add('hidden');});
}

document.addEventListener('DOMContentLoaded',init);


// ===== v26: real Supabase matching =====
let realCandidateProfiles=[];
let realLikes=new Set();
let realPasses=new Set();
let realMatchPartnerIds=new Set();
let realMatchRows=[];
let blockedUserIds=new Set();
let matchingLoadPromise=null;

function dbRowToCandidate(r){
  const p=dbToProfile(r);
  return {...p,id:r.id,name:r.first_name||'Member',realUser:true,distance:null,verifiedNameAge:!!r.name_age_verified};
}

async function loadRealMatchingData(force=false){
  if(!supabaseClient||!currentUser)return;
  if(matchingLoadPromise&&!force)return matchingLoadPromise;
  matchingLoadPromise=(async()=>{
    const [profilesRes,likesRes,passesRes,matchesRes,blocksRes]=await Promise.all([
      supabaseClient.from('profiles').select('*').neq('id',currentUser.id),
      supabaseClient.from('likes').select('to_user').eq('from_user',currentUser.id),
      supabaseClient.from('passes').select('to_user').eq('from_user',currentUser.id),
      supabaseClient.from('matches').select('*').or(`user_one.eq.${currentUser.id},user_two.eq.${currentUser.id}`),
      supabaseClient.from('blocks').select('blocker_id,blocked_id').or(`blocker_id.eq.${currentUser.id},blocked_id.eq.${currentUser.id}`)
    ]);
    const firstErr=profilesRes.error||likesRes.error||passesRes.error||matchesRes.error||blocksRes.error;
    if(firstErr){
      console.error('Real matching load failed',firstErr);
      throw firstErr;
    }
    blockedUserIds=new Set((blocksRes.data||[]).map(b=>b.blocker_id===currentUser.id?b.blocked_id:b.blocker_id));
    realCandidateProfiles=(profilesRes.data||[]).map(dbRowToCandidate).filter(p=>!blockedUserIds.has(p.id));
    realLikes=new Set((likesRes.data||[]).map(x=>x.to_user).filter(id=>!blockedUserIds.has(id)));
    realPasses=new Set((passesRes.data||[]).map(x=>x.to_user));
    realMatchRows=(matchesRes.data||[]).filter(m=>{const partner=m.user_one===currentUser.id?m.user_two:m.user_one;return !blockedUserIds.has(partner);});
    realMatchPartnerIds=new Set(realMatchRows.map(m=>m.user_one===currentUser.id?m.user_two:m.user_one));
  })().finally(()=>{matchingLoadPromise=null;});
  return matchingLoadPromise;
}

function candidateAreaText(m){return m.area?escapeHTML(m.area):'General area not listed'}

function matchingDiagnostic(u){
  const rows=realCandidateProfiles.map(m=>({
    name:m.name||'Member',
    reason: realPasses.has(m.id) ? 'Previously passed' : (hardConflict(u,m)||'Eligible')
  }));
  const counts={total:rows.length,eligible:rows.filter(x=>x.reason==='Eligible').length,passed:rows.filter(x=>x.reason==='Previously passed').length};
  return {rows,counts};
}

async function renderMatches(){
  const list=$('#matchList');
  if(!list)return;
  const u=getUserProfile();
  const personalized=hasStoredProfile();

  if(!currentUser){
    $('#matchIntro').textContent=personalized?`Demo matches for ${u.name}, ages ${u.minAge??18}–${u.maxAge??99}. Sign in to see real members.`:'Complete your profile for personalized demo results, then sign in to see real members.';
    const scored=demoProfiles.map(m=>({m,r:calcMatch(u,m)})).filter(x=>!x.r.blocked).sort((a,b)=>b.r.score-a.r.score);
    list.innerHTML=scored.map(({m,r})=>`<article class="card match-card"><div class="match-score">${r.score}%</div><div class="avatar">${m.name[0]}</div><h3>${m.name}${verificationBadge(m,true)}, ${m.age}</h3>${verificationLine(m)}<div class="muted">${m.area} · demo profile</div><div class="tag-row"><span class="tag">${m.goal}</span><span class="tag">${m.social}</span></div><button class="primary" data-demo-detail="${m.id}">Why you two?</button></article>`).join('');
    $$('[data-demo-detail]').forEach(b=>b.addEventListener('click',()=>showDemoDetail(Number(b.dataset.demoDetail))));
    return;
  }

  if(!personalized){
    $('#matchIntro').textContent='Finish your profile first so Common Ground can calculate meaningful compatibility.';
    list.innerHTML='<div class="card mini"><h3>Finish your profile</h3><p class="muted">Your age preferences, relationship goal, lifestyle, personality and interests are used before real profiles are shown.</p><button class="primary" data-nav="onboarding">Build my profile</button></div>';
    $$('[data-nav]').forEach(btn=>btn.addEventListener('click',()=>showScreen(btn.dataset.nav)));
    return;
  }

  $('#matchIntro').textContent=`Real members for ${u.name}, ages ${u.minAge??18}–${u.maxAge??99}, ranked by compatibility.`;
  list.innerHTML='<div class="card mini"><strong>Finding real members…</strong><p class="muted">Applying your age range and lifestyle preferences.</p></div>';
  try{await loadRealMatchingData(true)}catch(err){
    list.innerHTML=`<div class="card mini"><h3>Real matching needs one Supabase update</h3><p class="muted">${escapeHTML(err.message||'Could not load matching data.')}</p><p class="muted">Run the <strong>SUPABASE-v26.sql</strong> file included in this build, then refresh.</p></div>`;
    return;
  }

  const eligible=realCandidateProfiles
    .filter(m=>!realPasses.has(m.id))
    .map(m=>({m,r:calcMatch(u,m)}))
    .filter(x=>!x.r.blocked)
    .sort((a,b)=>b.r.score-a.r.score);

  if(!eligible.length){
    const d=matchingDiagnostic(u);
    const detail=d.rows.length ? `<div class="filter-debug"><strong>What Common Ground found:</strong>${d.rows.map(x=>`<p class="muted"><strong>${escapeHTML(x.name)}:</strong> ${escapeHTML(x.reason)}</p>`).join('')}</div>` : '';
    list.innerHTML=`<div class="card mini"><h3>${d.counts.total?'No compatible profiles are showing yet':'You’re ready for your first tester.'}</h3><p class="muted">${d.counts.total?'Another real profile exists, but it is currently being filtered. The reason is shown below so we can test safely.':'Another person needs to create an account and click Save & find matches so their profile is stored in Supabase.'}</p>${detail}</div>`;
    return;
  }

  list.innerHTML=eligible.map(({m,r})=>{
    const isMatched=realMatchPartnerIds.has(m.id), liked=realLikes.has(m.id);
    return `<article class="card match-card"><div class="match-score">${r.score}%</div><div class="avatar">${escapeHTML((m.name||'?')[0])}</div><h3>${escapeHTML(m.name)}${verificationBadge(m,true)}, ${m.age}</h3>${verificationLine(m)}<div class="muted">${candidateAreaText(m)}</div><div class="tag-row"><span class="tag">${escapeHTML(m.goal)}</span><span class="tag">${escapeHTML(m.social)}</span><span class="tag">${escapeHTML(m.alcohol)}</span></div><ul class="why-list">${reasons(u,m,r).slice(0,3).map(x=>`<li>${escapeHTML(x)}</li>`).join('')}</ul><div class="match-actions"><button class="primary" data-real-detail="${m.id}">${isMatched?'Mutual match ✓':liked?'Liked ✓':'Why you two?'}</button>${isMatched?`<button class="secondary" data-message-user="${m.id}">Message</button>`:''}</div></article>`;
  }).join('');
  $('[data-real-detail]').forEach(b=>b.addEventListener('click',()=>showDetail(b.dataset.realDetail)));
  $('[data-message-user]').forEach(b=>b.addEventListener('click',()=>openRealChat(b.dataset.messageUser)));
}

function showDemoDetail(id){
  const u=getUserProfile(),m=demoProfiles.find(x=>x.id===id),r=calcMatch(u,m);if(!m||r.blocked)return;
  const shared=m.interests.filter(i=>(u.interests||[]).includes(i));
  const date=suggestDate(u,m,shared);
  $('#matchDetailContent').innerHTML=`<div class="detail-grid"><article class="card detail-card"><span class="eyebrow">Demo compatibility</span><div class="score-big">${r.score}%</div><h2>${m.name}, ${m.age}</h2><p class="muted">${m.area}</p><p>${m.bio}</p><div class="match-actions"><button class="primary" data-nav="auth">Sign in for real matching</button><button class="secondary" data-nav="matches">Back</button></div></article><article class="card detail-card"><span class="eyebrow">Why you two?</span><ul class="why-list">${reasons(u,m,r).map(x=>`<li>${x}</li>`).join('')}</ul></article></div><article class="date-box" style="margin-top:18px"><span class="eyebrow" style="color:#d7bf8c">Suggested first date</span><h2>${date.title}</h2><p>${date.text}</p><strong>${date.cost}</strong></article>`;
  showScreen('matchDetail');
  $$('[data-nav]').forEach(btn=>btn.addEventListener('click',()=>showScreen(btn.dataset.nav)));
}

async function showDetail(id){
  if(!currentUser){showDemoDetail(Number(id));return;}
  if(!realCandidateProfiles.length)await loadRealMatchingData();
  const u=getUserProfile(),m=realCandidateProfiles.find(x=>x.id===id);if(!m)return;
  const r=calcMatch(u,m);if(r.blocked)return;
  const shared=m.interests.filter(i=>(u.interests||[]).includes(i));
  const date=suggestDate(u,m,shared);
  const isMatched=realMatchPartnerIds.has(m.id),liked=realLikes.has(m.id);
  const actionHtml=isMatched
    ? `<div class="match-success"><strong>Mutual match ✓</strong><p>You both liked each other. Say hello when you’re ready.</p></div><button class="primary" data-message-user="${m.id}">Message</button>`
    : liked
      ? `<div class="match-success"><strong>Like sent ✓</strong><p>If ${escapeHTML(m.name)} likes you too, Common Ground will create a mutual match.</p></div><button class="secondary" data-pass-user="${m.id}">Pass instead</button>`
      : `<button class="primary" data-like-user="${m.id}">♡ Like</button><button class="secondary" data-pass-user="${m.id}">Pass</button>`;
  $('#matchDetailContent').innerHTML=`<div class="detail-grid"><article class="card detail-card"><span class="eyebrow">Real compatibility</span><div class="score-big">${r.score}%</div><h2>${escapeHTML(m.name)}${verificationBadge(m)}, ${m.age}</h2>${verificationLine(m)}<p class="muted">${candidateAreaText(m)}</p><p>${escapeHTML(m.bio||'')}</p><div class="tag-row">${(m.interests||[]).slice(0,6).map(i=>`<span class="tag">${escapeHTML(i)}</span>`).join('')}</div><div class="match-actions">${actionHtml}<button class="ghost" data-nav="matches">Back to matches</button></div></article><article class="card detail-card"><span class="eyebrow">Why you two?</span><h2>There’s real overlap here.</h2><ul class="why-list">${reasons(u,m,r).map(x=>`<li>${escapeHTML(x)}</li>`).join('')}</ul><div class="compat-bars">${Object.entries(r.parts).map(([k,v])=>`<div class="bar-row"><span>${k}</span><div class="bar"><span style="width:${v}%"></span></div><strong>${v}</strong></div>`).join('')}</div></article></div><div class="detail-grid" style="margin-top:18px"><article class="card detail-card"><span class="eyebrow">Lifestyle snapshot</span><h3>${escapeHTML(m.alcohol)}</h3><p>${escapeHTML(m.alcohol)} alcohol · ${escapeHTML(m.nicotine)} cigarettes · ${escapeHTML(m.vaping??'Never')} vaping · ${escapeHTML(m.cannabis)} cannabis</p></article><article class="date-box"><span class="eyebrow" style="color:#d7bf8c">Suggested first date</span><h2>${date.title}</h2><p>${date.text}</p><strong>${date.cost}</strong></article></div>`;
  showScreen('matchDetail');
  $('[data-like-user]').forEach(b=>b.addEventListener('click',()=>likeRealUser(b.dataset.likeUser)));
  $('[data-pass-user]').forEach(b=>b.addEventListener('click',()=>passRealUser(b.dataset.passUser)));
  $('[data-message-user]').forEach(b=>b.addEventListener('click',()=>openRealChat(b.dataset.messageUser)));
  $$('[data-nav]').forEach(btn=>btn.addEventListener('click',()=>showScreen(btn.dataset.nav)));
}

async function likeRealUser(targetId){
  if(!supabaseClient||!currentUser)return showScreen('auth');
  const {data,error}=await supabaseClient.rpc('like_user',{target_user:targetId});
  if(error){console.error(error);showToast(`Like failed: ${error.message}. Run SUPABASE-v26.sql if you have not yet.`);return;}
  const result=Array.isArray(data)?data[0]:data;
  await loadRealMatchingData(true);
  if(result?.matched)showToast('It’s a mutual match! ✓');else showToast('Like sent.');
  await showDetail(targetId);
}

async function passRealUser(targetId){
  if(!supabaseClient||!currentUser)return showScreen('auth');
  const {error}=await supabaseClient.rpc('pass_user',{target_user:targetId});
  if(error){console.error(error);showToast(`Pass failed: ${error.message}. Run SUPABASE-v26.sql if you have not yet.`);return;}
  showToast('Passed. That profile will be hidden.');
  await loadRealMatchingData(true);
  showScreen('matches');
}


// ===== v29: real Supabase text chat =====
let activeRealChatMatchId=null;
let activeRealChatPartnerId=null;
let realChatPollTimer=null;
const realVoiceUrlCache=new Map();

function findMatchForPartner(partnerId){
  return realMatchRows.find(m=>m.user_one===partnerId||m.user_two===partnerId)||null;
}

async function fetchMessagesForMatch(matchId){
  if(!supabaseClient||!currentUser||!matchId)return [];
  const {data,error}=await supabaseClient
    .from('messages')
    .select('id,match_id,sender_id,message_text,voice_url,voice_duration_seconds,created_at')
    .eq('match_id',matchId)
    .order('created_at',{ascending:true});
  if(error){console.error('Message load failed',error);throw error;}
  return data||[];
}

function realMessagePreview(msg){
  if(!msg)return 'You matched — say hello.';
  if(msg.message_text)return msg.message_text;
  if(msg.voice_url)return 'Voice memo';
  return 'New message';
}

async function renderConversations(){
  const wrap=$('#conversationList');if(!wrap)return;
  if(!currentUser){
    wrap.innerHTML='<div class="card empty-messages"><h3>Sign in for real messages</h3><p class="muted">Real conversations unlock after a mutual match.</p><button class="primary" data-nav="auth">Sign in</button></div>';
    $$('[data-nav]').forEach(btn=>btn.addEventListener('click',()=>showScreen(btn.dataset.nav)));return;
  }
  try{await loadRealMatchingData(true)}catch(e){wrap.innerHTML='<div class="card empty-messages"><h3>Matching setup needed</h3><p class="muted">Common Ground could not load your matches.</p></div>';return;}
  if(!realMatchRows.length){
    wrap.innerHTML='<div class="card empty-messages"><h3>No mutual matches yet</h3><p class="muted">When you and another member like each other, your conversation will appear here.</p><button class="primary" data-nav="matches">Browse real matches</button></div>';
    $$('[data-nav]').forEach(btn=>btn.addEventListener('click',()=>showScreen(btn.dataset.nav)));return;
  }
  const matchIds=realMatchRows.map(m=>m.id);
  let messages=[];
  const {data,error}=await supabaseClient.from('messages').select('id,match_id,sender_id,message_text,voice_url,voice_duration_seconds,created_at').in('match_id',matchIds).order('created_at',{ascending:false});
  if(!error)messages=data||[];
  const lastByMatch=new Map();
  for(const msg of messages){if(!lastByMatch.has(msg.match_id))lastByMatch.set(msg.match_id,msg);}
  const rows=realMatchRows.map(match=>{
    const partnerId=match.user_one===currentUser.id?match.user_two:match.user_one;
    const partner=realCandidateProfiles.find(p=>p.id===partnerId);
    return {match,partner,last:lastByMatch.get(match.id)};
  }).filter(x=>x.partner).sort((a,b)=>new Date(b.last?.created_at||b.match.created_at||0)-new Date(a.last?.created_at||a.match.created_at||0));
  wrap.innerHTML=rows.map(({match,partner,last})=>`<button class="conversation-row" data-real-chat-partner="${partner.id}"><div class="conversation-avatar">${escapeHTML((partner.name||'?')[0])}</div><div class="conversation-copy"><div class="conversation-top"><span class="conversation-name">${escapeHTML(partner.name)}${verificationBadge(partner,true)}</span><span class="conversation-time">${formatMessageTime(last?.created_at||match.created_at)}</span></div><div class="conversation-preview">${escapeHTML(realMessagePreview(last))}</div></div><span></span></button>`).join('');
  $$('[data-real-chat-partner]').forEach(b=>b.addEventListener('click',()=>openRealChat(b.dataset.realChatPartner)));
}

function conversationStarter(u,m){
  const shared=(m.interests||[]).filter(i=>(u.interests||[]).includes(i));
  if(shared.includes('Family time'))return 'You both value family time. What does a perfect family day look like to you?';
  if(shared.includes('Homebody'))return 'You both enjoy being homebodies. What is your ideal night in?';
  if(shared.includes('Exercise / gym'))return 'You both enjoy the gym. What kind of workouts do you like most?';
  if(shared.includes('Running'))return 'You both enjoy running. Are you more into casual runs, races, or just getting outside?';
  if(shared.length)return `You both like ${shared[0]}. What do you enjoy most about it?`;
  if((u.religion&&m.religion)&&u.religion===m.religion&&u.religion!=='Prefer not to say')return `What does ${u.religion} mean in your everyday life?`;
  if(goalList(u).includes('Friends only / platonic friendship')||goalList(m).includes('Friends only / platonic friendship'))return 'What is something you always enjoy doing with friends?';
  return 'What is something you are looking forward to this week?';
}

async function openRealChat(partnerId){
  if(!currentUser||!supabaseClient)return showScreen('auth');
  await loadRealMatchingData(true);
  const match=findMatchForPartner(partnerId);
  const partner=realCandidateProfiles.find(p=>p.id===partnerId);
  if(!match||!partner||blockedUserIds.has(partnerId)){showToast('This conversation is not available.');return;}
  activeRealChatMatchId=match.id;
  activeRealChatPartnerId=partnerId;
  activeChatId=null;
  const starter=conversationStarter(getUserProfile(),partner);
  $('#chatHeader').innerHTML=`<div class="conversation-avatar">${escapeHTML((partner.name||'?')[0])}</div><div class="chat-person"><div class="chat-title">${escapeHTML(partner.name)}${verificationBadge(partner,true)}</div><div class="chat-subtitle">Mutual match through Common Ground${partner.area?' · '+escapeHTML(partner.area):''}</div><div class="chat-starter"><strong>Need an opener?</strong> ${escapeHTML(starter)}</div><button class="secondary starter-use-btn" id="useStarterBtn" type="button">Use this question</button><div class="chat-safety-actions"><button class="ghost danger-lite" id="reportUserBtn" type="button">Report</button><button class="ghost danger-lite" id="blockUserBtn" type="button">Block</button></div></div>`;
  $('#useStarterBtn')?.addEventListener('click',()=>{const input=$('#chatInput');if(input){input.value=starter;input.focus();}});
  $('#reportUserBtn')?.addEventListener('click',()=>reportRealUser(partnerId,partner.name));
  $('#blockUserBtn')?.addEventListener('click',()=>blockRealUser(partnerId,partner.name));
  const voiceBtn=$('#voiceMemoBtn');
  if(voiceBtn){voiceBtn.disabled=false;voiceBtn.title='Record voice memo';voiceBtn.classList.remove('recording');}
  setVoiceStatus('',false);
  await renderRealChatMessages();
  showScreen('chat');
  startRealChatPolling();
}


async function getRealVoicePlaybackUrl(path){
  if(!path||!supabaseClient)return '';
  if(/^https?:\/\//i.test(path))return path;
  const cached=realVoiceUrlCache.get(path);
  if(cached&&cached.expires>Date.now()+30000)return cached.url;
  const {data,error}=await supabaseClient.storage.from('voice-memos').createSignedUrl(path,3600);
  if(error){console.error('Voice URL failed',error);return '';}
  const url=data?.signedUrl||'';
  if(url)realVoiceUrlCache.set(path,{url,expires:Date.now()+55*60*1000});
  return url;
}

async function uploadRealVoiceMemo(blob,durationSeconds){
  if(!activeRealChatMatchId||!currentUser||!supabaseClient)throw new Error('No active mutual match.');
  const rawMime=blob.type||'audio/webm';
  const mime=(rawMime.split(';')[0]||'audio/webm').trim().toLowerCase();
  let ext='webm';
  if(mime.includes('mp4')||mime.includes('m4a'))ext='m4a';
  else if(mime.includes('ogg'))ext='ogg';
  else if(mime.includes('wav'))ext='wav';
  const fileName=`${Date.now()}-${crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)}.${ext}`;
  const path=`${activeRealChatMatchId}/${currentUser.id}/${fileName}`;
  const {error:uploadError}=await supabaseClient.storage.from('voice-memos').upload(path,blob,{contentType:mime,upsert:false,cacheControl:'3600'});
  if(uploadError)throw uploadError;
  const {error:messageError}=await supabaseClient.from('messages').insert({
    match_id:activeRealChatMatchId,
    sender_id:currentUser.id,
    voice_url:path,
    voice_duration_seconds:Math.max(1,Math.round(durationSeconds||1))
  });
  if(messageError){
    await supabaseClient.storage.from('voice-memos').remove([path]).catch(()=>{});
    throw messageError;
  }
  return path;
}

async function toggleRealVoiceRecording(){
  const btn=$('#voiceMemoBtn');
  if(!activeRealChatMatchId||!currentUser)return;
  if(mediaRecorder&&mediaRecorder.state==='recording'){
    mediaRecorder.stop();
    btn?.classList.remove('recording');
    return;
  }
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){
    setVoiceStatus('Voice recording is not supported in this browser. Try current Safari or Chrome.',true);
    setTimeout(()=>setVoiceStatus('',false),4500);
    return;
  }
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    voiceChunks=[];
    let options={};
    if(MediaRecorder.isTypeSupported?.('audio/webm;codecs=opus'))options={mimeType:'audio/webm;codecs=opus'};
    else if(MediaRecorder.isTypeSupported?.('audio/mp4'))options={mimeType:'audio/mp4'};
    mediaRecorder=new MediaRecorder(stream,options);
    mediaRecorder.ondataavailable=e=>{if(e.data&&e.data.size)voiceChunks.push(e.data)};
    mediaRecorder.onstop=async()=>{
      clearInterval(voiceTimer);voiceTimer=null;
      const duration=(Date.now()-voiceStartedAt)/1000;voiceStartedAt=0;
      stream.getTracks().forEach(t=>t.stop());
      const blob=new Blob(voiceChunks,{type:mediaRecorder.mimeType||'audio/webm'});
      if(!blob.size){setVoiceStatus('No audio was recorded.',true);setTimeout(()=>setVoiceStatus('',false),2500);return;}
      try{
        setVoiceStatus('Sending voice memo…',true);
        await uploadRealVoiceMemo(blob,duration);
        setVoiceStatus('Voice memo sent.',true);
        await renderRealChatMessages();
        await renderConversations();
        setTimeout(()=>setVoiceStatus('',false),1600);
      }catch(err){
        console.error('Voice memo send failed',err);
        setVoiceStatus(`Voice memo failed: ${err.message||'try again.'}`,true);
      }
    };
    mediaRecorder.start();voiceStartedAt=Date.now();btn?.classList.add('recording');
    setVoiceStatus('Recording… tap the microphone again to send',true);
    updateVoiceTimer();voiceTimer=setInterval(()=>{updateVoiceTimer();if(voiceStartedAt && Date.now()-voiceStartedAt>60000 && mediaRecorder?.state==='recording'){mediaRecorder.stop();}},1000);
  }catch(err){
    console.error(err);
    setVoiceStatus('Microphone access is needed to record a voice memo.',true);
    setTimeout(()=>setVoiceStatus('',false),4000);
  }
}


async function blockRealUser(targetId,targetName='this member'){
  if(!currentUser||!supabaseClient)return;
  if(!confirm(`Block ${targetName}? They will disappear from your matches and messages, and neither of you will be able to message the other.`))return;
  const {error}=await supabaseClient.from('blocks').upsert({blocker_id:currentUser.id,blocked_id:targetId},{onConflict:'blocker_id,blocked_id'});
  if(error){console.error('Block failed',error);showToast(`Block failed: ${error.message}`);return;}
  blockedUserIds.add(targetId);
  activeRealChatMatchId=null;activeRealChatPartnerId=null;
  showToast(`${targetName} blocked.`);
  await loadRealMatchingData(true).catch(()=>{});
  await renderConversations();
  showScreen('messages');
}

async function reportRealUser(targetId,targetName='this member'){
  if(!currentUser||!supabaseClient)return;
  const reason=prompt(`Report ${targetName}

Briefly tell us the reason (harassment, fake identity, inappropriate content, safety concern, spam, other):`);
  if(!reason||!reason.trim())return;
  const details=prompt('Optional: add any details that would help review this report.')||'';
  const {error}=await supabaseClient.from('reports').insert({
    reporter_id:currentUser.id,
    reported_id:targetId,
    reason:reason.trim().slice(0,200),
    details:details.trim().slice(0,2000)
  });
  if(error){console.error('Report failed',error);showToast(`Report failed: ${error.message}`);return;}
  showToast('Report submitted. Thank you for helping keep Common Ground safer.');
}

async function renderRealChatMessages(){
  if(!activeRealChatMatchId||!currentUser)return;
  const wrap=$('#chatMessages');
  try{
    const messages=await fetchMessagesForMatch(activeRealChatMatchId);
    const rows=[];
    for(const msg of messages){
      const mine=msg.sender_id===currentUser.id;
      if(msg.voice_url){
        const playback=await getRealVoicePlaybackUrl(msg.voice_url);
        const dur=msg.voice_duration_seconds?formatDuration(msg.voice_duration_seconds):'Voice memo';
        rows.push(`<div class="message-row ${mine?'mine':''}"><div class="message-bubble voice-bubble"><div class="voice-label">🎙 Voice memo <span>${escapeHTML(dur)}</span></div>${playback?`<audio controls preload="metadata" src="${escapeHTML(playback)}"></audio>`:'<div class="muted">Audio unavailable</div>'}<span class="message-meta">${formatMessageTime(msg.created_at)}</span></div></div>`);
      }else{
        rows.push(`<div class="message-row ${mine?'mine':''}"><div class="message-bubble">${escapeHTML(msg.message_text||'')}<span class="message-meta">${formatMessageTime(msg.created_at)}</span></div></div>`);
      }
    }
    wrap.innerHTML=rows.length?rows.join(''):'<div class="empty-messages"><p class="muted">You matched. Say hello when you’re ready.</p></div>';
    requestAnimationFrame(()=>{wrap.scrollTop=wrap.scrollHeight});
  }catch(err){wrap.innerHTML='<div class="empty-messages"><p class="muted">Could not load messages. Refresh and try again.</p></div>';}
}

function startRealChatPolling(){
  clearInterval(realChatPollTimer);
  realChatPollTimer=setInterval(async()=>{
    const chat=$('#chat');
    if(!chat?.classList.contains('active')||!activeRealChatMatchId){clearInterval(realChatPollTimer);realChatPollTimer=null;return;}
    await renderRealChatMessages();
  },3000);
}

async function sendRealTextMessage(text){
  if(!activeRealChatMatchId||!currentUser||!supabaseClient)return;
  if(activeRealChatPartnerId&&blockedUserIds.has(activeRealChatPartnerId)){showToast('Messaging is unavailable for this user.');return false;}
  const {error}=await supabaseClient.from('messages').insert({
    match_id:activeRealChatMatchId,
    sender_id:currentUser.id,
    message_text:text
  });
  if(error){console.error('Message send failed',error);showToast(`Message failed: ${error.message}`);return false;}
  return true;
}

function bindChat(){
  const form=$('#chatForm');if(!form)return;
  const voiceBtn=$('#voiceMemoBtn');
  if(voiceBtn)voiceBtn.addEventListener('click',()=>{
    if(activeRealChatMatchId){toggleRealVoiceRecording();return;}
    toggleVoiceRecording();
  });
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const input=$('#chatInput');const text=input.value.trim();if(!text)return;
    if(activeRealChatMatchId){
      input.disabled=true;
      const ok=await sendRealTextMessage(text);
      input.disabled=false;input.focus();
      if(ok){input.value='';await renderRealChatMessages();await renderConversations();}
      return;
    }
    if(activeChatId===null)return;
    const data=getConversations();const key=String(activeChatId);if(!data[key])data[key]={profileId:activeChatId,unread:false,messages:[]};
    data[key].messages.push({from:'me',text,time:Date.now()});saveConversations(data);input.value='';renderChatMessages();
  });
}
