const app=document.querySelector('#app');
const s={view:'landing',student:'home',admin:'dashboard',tvReturn:'landing',now:0,studentQueue:0,joined:false,status:'Ready for Claim',modal:false,alerts:1};
const pad=n=>String(n).padStart(3,'0');
const I={user:'â™™',grid:'â–¦',tv:'â–£',home:'âŒ‚',queue:'â‰¡',status:'â–¥',bell:'â™§',apps:'â–¤',transactions:'â†”',reports:'â–¥',settings:'âš™',logout:'â†ª'};
const queueData=[];
const transactionData=[];
const applicationData=[];
const createdIdStorageKey='nu-smart-id-created-ids';
const createIdDraftKey='nu-smart-id-create-draft';
const createdIdData=JSON.parse(localStorage.getItem(createdIdStorageKey)||'[]');
const auditData=JSON.parse(localStorage.getItem('nu-smart-id-wait-audit')||'[]');
const defaultWaitMinutes=15;
const activeServing=()=>queueData.find(row=>row.status==='Serving');
const waitingQueue=()=>queueData.filter(row=>row.status==='Waiting').sort((a,b)=>a.number-b.number);
const orderedQueue=()=>queueData.filter(row=>['Waiting','Serving'].includes(row.status)).sort((a,b)=>a.number-b.number);
const nextQueueNumber=()=>{const active=orderedQueue();return active.length?Math.max(...active.map(row=>Number(row.number||0)))+1:1};
const queuePositionFor=(number)=>{const order=orderedQueue();const index=order.findIndex(row=>row.number===number);return index<0?0:index+1};
const peopleAheadFor=(number)=>{const order=orderedQueue();const row=order.find(item=>item.number===number);if(!row)return 0;return order.filter(item=>item.number < row.number).length;};
const recalculateWaitTimes=()=>{const order=orderedQueue();if(!activeServing()&&order.length){order[0].status='Serving';}const refreshedOrder=orderedQueue();queueData.forEach(row=>{const position=refreshedOrder.findIndex(item=>item.number===row.number);row.waitMinutes=position<0?0:(position+1)*defaultWaitMinutes;});const current=activeServing();s.now=current?current.number:0;if(!current&&!refreshedOrder.length){s.studentQueue=0;s.joined=false;}};
const defaultProfile={name:'Juan Dela Cruz',studentNo:'2021-00123',program:'Student',email:'juan.delacruz@nu-baliwag.edu.ph',contactInfo:''};
const studentProfile={...defaultProfile};
const trackerKey='nu-smart-id-application-status';
const trackerOrder=['Submitted','Processing','Ready for Claim','Claimed'];
const trackerStorageKey=studentNo=>`${trackerKey}:${studentNo||studentProfile.studentNo}`;
const studentNotificationKey=studentNo=>`nu-smart-id-notifications:${studentNo||studentProfile.studentNo}`;
const studentNotifications=studentNo=>{try{const value=JSON.parse(localStorage.getItem(studentNotificationKey(studentNo))||'[]');return Array.isArray(value)?value:[]}catch{return[]}};
const refreshStudentAlertCount=()=>{s.alerts=studentNotifications(studentProfile.studentNo).filter(notification=>!notification.read).length};
const markStudentNotificationsRead=studentNo=>{const notifications=studentNotifications(studentNo);if(notifications.some(notification=>!notification.read)){localStorage.setItem(studentNotificationKey(studentNo),JSON.stringify(notifications.map(notification=>({...notification,read:true}))));refreshStudentAlertCount()}};
const trackerState=studentNo=>{const key=trackerStorageKey(studentNo);const stored=localStorage.getItem(key);if(stored)return JSON.parse(stored);const application=applicationData.find(row=>row[1]===studentNo)||applicationData.find(row=>row[1]===studentProfile.studentNo);return {status:application?.[4]||'Not Started',updatedAt:new Date().toISOString()};};
const saveTrackerFor=(studentNo,nextStatus)=>{const application=applicationData.find(row=>row[1]===studentNo);const stored=JSON.parse(localStorage.getItem(trackerStorageKey(studentNo))||'null');const previousStatus=stored?.status||application?.[4]||'Not Started';const next={status:nextStatus,updatedAt:new Date().toISOString()};if(application)application[4]=nextStatus;localStorage.setItem(trackerStorageKey(studentNo),JSON.stringify(next));if(studentNo===studentProfile.studentNo){s.status=nextStatus;localStorage.setItem(trackerKey,JSON.stringify(next));}if(nextStatus==='Ready for Claim'&&previousStatus!=='Ready for Claim'){const notifications=studentNotifications(studentNo);notifications.unshift({id:`${studentNo}-${Date.now()}`,type:'ready',title:'Your ID is ready to claim',message:'Your student ID is ready for pickup. Please bring your OR/receipt to the ID Office.',createdAt:next.updatedAt,read:false});localStorage.setItem(studentNotificationKey(studentNo),JSON.stringify(notifications));if(studentNo===studentProfile.studentNo)refreshStudentAlertCount();}localStorage.setItem('nu-smart-id-applications',JSON.stringify(applicationData));return next};
const saveTracker=nextStatus=>saveTrackerFor(studentProfile.studentNo,nextStatus);
const trackerClass=index=>{const state=trackerState().status;if(state==='Rejected')return 'pending';const current=trackerOrder.indexOf(state);if(state==='Claimed'&&index<=current)return 'complete';return index<current?'complete':index===current?'active':'pending'};
const trackerIcon=index=>trackerClass(index)==='complete'?'✓':trackerClass(index)==='active'?'●':index+1;
const brand=light=>`<div class="brand ${light?'light':''}"><span><b>Queue Operations</b><small>Service Management</small></span></div>`;
const go=v=>{if(v==='tv'){s.tvReturn='landing';window.tvReturnTarget='landing'}if(v==='landing'&&s.view==='tv'&&window.tvReturnTarget==='queue'){s.view='admin';goAdmin('queue');return}s.view=v;render()}; const openTv=returnView=>{s.tvReturn=returnView;window.tvReturnTarget=returnView;s.view='tv';render();const backButton=document.querySelector('.tv-back');if(backButton){backButton.setAttribute('onclick',"window.go('landing')");backButton.onclick=null}}; const goTvBack=()=>s.tvReturn==='queue'?(s.view='admin',goAdmin('queue')):go('landing'); const toast=m=>{document.querySelector('.toast')?.remove();document.body.insertAdjacentHTML('beforeend',`<div class="toast">${m}</div>`);setTimeout(()=>document.querySelector('.toast')?.remove(),2400)};
window.go=v=>{if(v==='tv'){s.tvReturn='landing';window.tvReturnTarget='landing'}if(v==='landing'&&window.tvReturnTarget==='queue'){s.view='admin';goAdmin('queue');return}s.view=v;render()};
document.addEventListener('click',event=>{const backButton=event.target.closest('.tv-back');if(!backButton)return;event.preventDefault();event.stopImmediatePropagation();if(['dashboard','queue','applications','reports','settings'].includes(s.tvReturn)){s.view='admin';goAdmin(s.tvReturn);return}s.view='landing';render()},true);
function landing(){return `<main class="landing"><div class="campus-photo" aria-hidden="true"></div><div class="campus-building" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div class="tree-grove" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><div class="landing-arc arc-top"></div><div class="landing-arc arc-bottom"></div><div class="landing-dots dots-left"></div><div class="landing-dots dots-right"></div><div class="landing-content"><header class="landing-brand"><span class="landing-wordmark"><i></i><b>NATIONAL<br>UNIVERSITY</b><small>Education that works.</small></span><span class="landing-date">â—· &nbsp; Friday, November 15, 2024<br><em>â—· &nbsp; 10:24 AM</em></span></header><h1><strong>NU</strong> SMART ID QUEUE</h1><div class="landing-rule"><i></i><span>ID APPLICATION &amp; CLAIMING<br>QUEUE MANAGEMENT SYSTEM</span><i></i></div><section class="welcome-panel"><h2>Welcome to NU!</h2><p>Faster <b>â€¢</b> Smarter <b>â€¢</b> Better Service</p><div class="entry-list"><button class="portal-card student-card" onclick="go('studentLogin')"><span class="portal-icon" aria-hidden="true"><svg viewBox="0 0 64 64" focusable="false"><path d="M10 25 32 14l22 11-22 11L10 25Z"/><path d="M18 30v13c7 7 21 7 28 0V30M54 26v14"/><path d="M21 51c2-7 20-7 22 0"/></svg></span><b>STUDENT<br>PORTAL</b><small>Apply / Claim ID</small><i>â†’</i></button><button class="portal-card admin-card" onclick="go('adminLogin')"><span class="portal-icon" aria-hidden="true"><svg viewBox="0 0 64 64" focusable="false"><path d="M25 8h14l2 8a17 17 0 0 1 5 3l8-2 7 12-6 5a18 18 0 0 1 0 7l6 5-7 12-8-2a17 17 0 0 1-5 3l-2 8H25l-2-8a17 17 0 0 1-5-3l-8 2-7-12 6-5a18 18 0 0 1 0-7l-6-5 7-12 8 2a17 17 0 0 1 5-3l2-8Z"/><circle cx="32" cy="37" r="9"/></svg></span><b>ADMIN<br>DASHBOARD</b><small>Manage Queue</small><i>â†’</i></button><button class="portal-card tv-card" onclick="go('tv')"><span class="portal-icon" aria-hidden="true"><svg viewBox="0 0 64 64" focusable="false"><rect x="8" y="12" width="48" height="34" rx="2"/><path d="M25 54h14M32 46v8"/></svg></span><b>TV QUEUE<br>DISPLAY</b><small>Live Queue</small><i>â†’</i></button></div></section><div class="landing-slogan">â€œBuilding Better Futures Togetherâ€</div></div><footer class="landing-footer"><span>â— &nbsp; National University</span><span>â—Ž &nbsp; www.national-u.edu.ph</span><span>âœ‰ &nbsp; registrar@national-u.edu.ph</span><span>Â© 2024 National University. All rights reserved.</span></footer></main>`}
function auth(staff){return `<main class="auth"><div class="center">${brand(true)}<h1>${staff?'Admin Dashboard':'NU Smart ID Queue'}</h1><p>National University â€“ Baliwag</p><small>${staff?'NU Smart ID Queue Management Â· Authorized Personnel Only':'Student Portal'}</small><section class="auth-card"><h2>${staff?'ðŸ”’ Staff Login':'Sign in to your account'}</h2><label>${staff?'Staff Username':'NU Account / Email'}</label><input placeholder="${staff?'Enter staff username':'juan.delacruz@nu-baliwag.edu.ph'}" value="${staff?'':'juan.delacruz@nu-baliwag.edu.ph'}"><label>Password</label><input type="password" placeholder="Enter your password"><button class="primary" onclick="login(${staff})">${staff?'LOGIN':'Login'}</button>${staff?'<div class="demo staff">Demo: admin / admin123</div>':'<button class="forgot" onclick="toast(\'Reset instructions sent\')">Forgot Password?</button><div class="demo">Demo: juan.delacruz@nu-baliwag.edu.ph / password123</div>'}</section><button class="back" onclick="go('landing')">â† Back to portal selection</button></div></main>`}
function login(staff){s.view=staff?'admin':'student';toast('Welcome to NU Smart ID Queue');render()}
function topbar(){return `<header class="top">${brand()}<div><button onclick="goStudent('alerts')">â™§<em>${s.alerts}</em></button><button class="avatar" onclick="goStudent('profile')">JD</button><button class="logout-mini" onclick="go('landing')" title="Log out">â†ª</button></div></header>`}
function snav(){return `<nav class="snav">${[['home','home','Home'],['queue','queue','My Queue'],['status','status','ID Status'],['alerts','bell','Alerts']].map(x=>`<button class="${s.student===x[0]?'on':''}" onclick="goStudent('${x[0]}')"><b>${I[x[1]]}</b><small>${x[2]}</small></button>`).join('')}</nav>`}
function student(){return `${topbar()}<main class="student">${s.student==='home'?home():s.student==='status'?status():s.student==='queue'?queue():s.student==='profile'?profile():alerts()}</main>${snav()}${modal()}`}
function home(){return `<div class="welcome"><small>Good morning,</small><h1>Juan Dela Cruz! ðŸ‘‹</h1><p>2021-00123 Â· BS Computer Science</p></div><section class="status"><small>ID APPLICATION STATUS</small><b>New Student ID Â· 2026â€“2027</b><span>â— READY FOR CLAIM</span><div>${['Submitted','Processing','Ready','Claimed'].map((x,i)=>`<i class="${i===3?'pending':''}"><small>${x}</small></i>`).join('')}</div></section><button class="join" onclick="openJoin()">â–£ &nbsp; JOIN QUEUE</button><div class="metrics"><div><small>Now Serving</small><b>A-${pad(s.now)}</b></div><div><small>Avg. Wait Time</small><b>~18 min</b></div></div><div class="note">ðŸ“ <b>ID Office hours:</b> Mondayâ€“Friday, 8:00 AM â€“ 5:00 PM. Please bring your OR/receipt when claiming your ID.</div>`}
function status(){return `<div class="heading"><h1>ID Application Status</h1><p>Track the progress of your school ID</p></div><section class="status-detail"><div class="detail-head"><span>Student<b>Juan Dela Cruz</b></span><em>âœ“ READY FOR CLAIM</em></div><div class="timeline">${[['Application Submitted','July 28, 2026','Your ID application has been received.'],['Processing','Aug 1, 2026','Your ID is being printed and prepared.'],['Ready for Claim','Aug 8, 2026','Your ID is ready. Join the queue to claim it.'],['Claimed','','ID has been successfully claimed.']].map((x,i)=>`<div class="${i===3?'pending':''}"><i>${i<3?'âœ“':4}</i><b>${x[0]} ${i===2?'â—':''}</b><small>${x[1]}<br>${x[2]}</small></div>`).join('')}</div></section><div class="ready">â— &nbsp;<b>Your ID is ready for claiming!</b><small>Join the queue now to get your queue number. Bring your OR/receipt.</small></div><button class="join" onclick="openJoin()">â–£ &nbsp; JOIN QUEUE NOW</button>`}
function queue(){const row=queueData.find(item=>item.number===s.studentQueue)||queueData.find(item=>item.name===studentProfile.name&&['Waiting','Serving'].includes(item.status));const currentNumber=activeServing()?.number||0;const waitMinutes=row?.waitMinutes ?? defaultWaitMinutes;const position=row?queuePositionFor(row.number):0;const ahead=row?peopleAheadFor(row.number):0;const totalQueue=queueData.filter(item=>['Waiting','Serving'].includes(item.status)).length;return `<section class="ticket"><small>YOUR QUEUE NUMBER</small><strong>A-${pad(s.studentQueue || row?.number || 0)}</strong><em>â— ${row?.status||'WAITING'}</em><div><span>Now Serving<b>${currentNumber?`A-${pad(currentNumber)}`:'--'}</b></span><span>Queue Position<b>${position || '--'}</b></span><span>People Ahead<b>${ahead}</b></span><span>Total Queue<b>${totalQueue}</b></span><span>Est. Wait<b>${waitMinutes} min</b></span></div></section><section class="wait"><b>Est. Waiting Time<br><strong>${waitMinutes} min</strong></b><span>â—· Live</span><div><i style="width:${Math.max(20,100-(ahead*15))}%"></i></div><small>Queue estimate <em>Updated by ID Office</em></small></section><div class="note warn">ðŸ“ Please stay within the ID Office area when your queue number is approaching. Bring your OR/receipt and a valid ID.</div><button class="leave" onclick="leave()">Leave Queue</button>`}
function alerts(){return `<div class="heading"><h1>Notifications</h1><p>Stay updated about your ID queue</p></div><section class="alerts"><article>âœ“<div><b>ID READY FOR CLAIM</b><p>Your school ID is now ready for claiming.</p><small>Today, 8:45 AM</small></div><button onclick="openJoin()">JOIN QUEUE</button></article><article>â—<div><b>QUEUE CONFIRMED</b><p>You have successfully joined the queue. Your queue number is A-${pad(s.studentQueue)}.</p><small>Today, 9:02 AM</small></div></article><article>!<div><b>TURN APPROACHING</b><p>Your queue number A-${pad(s.studentQueue)} will be served soon. ${Math.max(0,s.studentQueue-s.now)} people are ahead of you.</p><small>Today, 9:15 AM</small></div><button onclick="goStudent('queue')">VIEW QUEUE</button></article></section>`}
function profile(){return `<div class="heading"><h1>Profile</h1><p>Your NU Smart ID account</p></div><section class="status-detail"><div class="detail-head"><span>Student<b>Juan Dela Cruz</b></span><em>ACTIVE</em></div><p class="note">2021-00123 Â· BS Computer Science<br>juan.delacruz@nu-baliwag.edu.ph</p><button class="join" onclick="toast('Profile editing opened')">EDIT PROFILE</button></section>`}
function side(){let nav=[['dashboard','grid','Dashboard'],['queue','queue','Queue Management'],['applications','apps','ID Applications'],['reports','reports','Reports']];return `<aside class="side">${brand(true)}${nav.map(x=>`<button class="${s.admin===x[0]?'on':''}" onclick="goAdmin('${x[0]}')">${I[x[1]]} ${x[2]}</button>`).join('')}<span></span><button class="home-nav" onclick="go('landing')" title="Back to Home">← Back to Home</button><button onclick="goAdmin('settings')">${I.settings} Settings</button><button onclick="go('landing')">${I.logout} Logout</button></aside>`}
function atop(){return `<header class="atop"><b>${s.admin==='dashboard'?'Dashboard':s.admin==='queue'?'Queue Management':s.admin==='applications'?'ID Applications':'Reports'}</b><div><button onclick="openTv(s.admin)">â–£ TV Display</button><i>SA</i><b>Staff Admin<small>ID Office</small></b></div></header>`}
function admin(){return `${side()}<main class="admin">${atop()}${s.admin==='dashboard'?dash():s.admin==='queue'?manage():s.admin==='applications'?applications():s.admin==='settings'?settings():reports()}</main>`}
function settings(){return `<main class="admin-page"><section class="table settings-card"><h2>Settings</h2><p>Manage ID Office preferences and staff access.</p><button onclick="toast('Settings saved')">SAVE SETTINGS</button></section></main>`}
function dash(){return `<div class="stats">${[['â–£','156','Total Queues'],['âŒ›','67','Waiting'],['âœ“','20','Served Today'],['â—´','18 min','Avg. Wait Time']].map((x,i)=>`<div><span>${x[0]}</span><b class="c${i}">${x[1]}</b><small>${x[2]}</small></div>`).join('')}</div><div class="dash-grid"><section class="serving"><small>NOW SERVING</small><strong>A-${pad(s.now)}</strong><span>Window 3</span><b>â— Live</b></section><section class="recent"><h2>Recent Activity</h2>${[['A-018','Patricia Sy','ID Claimed'],['A-019','Dennis Ocampo','Skipped'],['A-020','Roberto Garcia','Now Serving']].map(x=>`<div><b>${x[0]}</b><span>${x[1]}<small>Window 3 Â· 9:42 AM</small></span><em>${x[2]}</em></div>`).join('')}</section></div><section class="chart"><h2>Queue Activity â€” Today (Hourly)</h2><div>${[35,52,68,83,74,62,40,29,20].map((h,i)=>`<i style="height:${h}px"><small>${i+8}h</small></i>`).join('')}</div></section>`}
function manage(){const current=queueData.find(row=>row.status==='Serving');const waiting=queueData.filter(row=>row.status==='Waiting');return `<div class="manage-grid"><section class="current"><small>CURRENTLY SERVING</small><strong>${current?`A-${pad(current.number)}`:'--'}</strong><p>${current?`${current.window.replace('Window ','')} · Staff Santos`:'No active queue'}</p><button onclick="next()">CALL NEXT</button><div><button onclick="skip(${current?.number||0})">SKIP</button><button onclick="complete(${current?.number||0})">COMPLETE</button></div></section><section class="upnext"><h2>Up Next</h2>${waiting.map((row,i)=>`<div><i>${i+1}</i><b>A-${pad(row.number)}</b><span>${row.name}<small>${row.time} · ${row.waitMinutes??4} min wait</small></span><em>${row.window.replace('Window ','Win. ')}</em></div>`).join('')||'<p class="empty-state">No students waiting</p>'}</section></div><section class="table"><div class="table-heading"><h2>Full Queue List <small>${queueData.length} in queue</small></h2><button class="danger-action" onclick="clearQueueData()">CLEAR QUEUE</button></div><table><thead><tr><th>QUEUE #</th><th>STUDENT NAME</th><th>TIME JOINED</th><th>WAIT TIME</th><th>WINDOW</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>${queueData.map(row=>`<tr><td>A-${pad(row.number)}</td><td>${row.name}</td><td>${row.time}</td><td><div class="wait-control"><button onclick="adjustWait(${row.number},-1)" aria-label="Decrease wait time">−</button><b>${row.waitMinutes??4} min</b><button onclick="adjustWait(${row.number},1)" aria-label="Increase wait time">+</button></div></td><td>${row.window}</td><td><em class="${row.status==='Serving'?'green':row.status==='Waiting'?'gold':'red'}">${row.status}</em></td><td>${row.status==='Waiting'?`<button onclick="skip(${row.number})">Skip</button>`:row.status==='Serving'?`<button onclick="complete(${row.number})">Complete</button>`:'-'}</td></tr>`).join('')}</tbody></table></section><section class="table adjustment-log"><div class="table-heading"><h2>Wait-Time Adjustment Log</h2><button class="danger-action" onclick="clearWaitAudit()">CLEAR LOG</button></div>${auditData.length?`<table><thead><tr><th>TIME</th><th>QUEUE</th><th>STUDENT</th><th>CHANGE</th><th>NEW ESTIMATE</th></tr></thead><tbody>${auditData.slice().reverse().map(entry=>`<tr><td>${entry.time}</td><td>A-${pad(entry.number)}</td><td>${entry.name}</td><td>${entry.change>0?'+':''}${entry.change} min</td><td>${entry.waitMinutes} min</td></tr>`).join('')}</tbody></table>`:'<p class="empty-state">No wait-time adjustments yet.</p>'}</section>`}
function applications(){return `<div class="tabs"><button class="active" onclick="toast('Showing all applications')">All (${applicationData.length})</button><button onclick="toast('Showing processing applications')">Processing</button><button onclick="toast('Showing ready applications')">Ready for Claim</button><button onclick="toast('Showing claimed applications')">Claimed</button></div><section class="table"><h2>ID Application Records</h2><table><thead><tr><th>STUDENT NAME</th><th>STUDENT NO.</th><th>APPLICATION TYPE</th><th>DATE APPLIED</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>${applicationData.map((r,i)=>`<tr>${r.slice(0,4).map(x=>`<td>${x}</td>`).join('')}<td><em class="${r[4]==='Claimed'?'purple':r[4]==='Processing'?'gold':'green'}">${r[4]}</em></td><td><button onclick="toast('Viewing ${r[0]}')">â—‰ View</button> <button onclick="advanceApplication(${i})">âœŽ Update</button></td></tr>`).join('')}</tbody></table></section>`}
function transactions(){return `<section class="table"><h2>Transaction Records <small>Live updates</small></h2><table><thead><tr><th>QUEUE #</th><th>STUDENT NAME</th><th>TRANSACTION</th><th>WINDOW</th><th>DATE</th><th>TIME</th><th>STAFF</th><th>STATUS</th></tr></thead><tbody>${transactionData.map(r=>`<tr>${r.slice(0,7).map(x=>`<td>${x}</td>`).join('')}<td><em class="${r[7]==='Skipped'?'red':'green'}">${r[7]}</em></td></tr>`).join('')}</tbody></table></section>`}
function reports(){return `<div class="report-head"><div><h1>Daily Queue Summary</h1><p>August 8, 2026 Â· ID Office</p></div><div><button onclick="toast('PDF report exported')">â‡© Export PDF</button><button onclick="toast('Excel report exported')">â‡© Export Excel</button></div></div><div class="stats report-stats">${[['156','Total Students'],['89','Students Served'],['67','Students Waiting'],['18 min','Avg. Wait Time'],['12','Skipped Queues']].map((x,i)=>`<div><b class="c${i}">${x[0]}</b><small>${x[1]}</small></div>`).join('')}</div><div class="report-grid"><section class="chart"><h2>Weekly Queue Volume</h2><p>Students served vs. waiting per day</p><div>${[58,76,84,92,110,45,18].map((h,i)=>`<i style="height:${h}px"><small>${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]}</small></i>`).join('')}</div></section><section class="chart pie"><h2>Transaction Types</h2><div class="donut"></div><p>â— New ID &nbsp;68%<br>â— Replacement &nbsp;21%<br>â— Skipped &nbsp;11%</p></section></div><section class="chart line"><h2>Hourly Queue Trend</h2><div>â•±â•±â•±â•²â•²â•²â•²â•²â•²</div></section>`}
function openJoin(){s.modal=true;render()}function closeJoin(){s.modal=false;render()}function confirmJoin(){s.joined=true;s.modal=false;s.alerts=2;toast(`Successfully joined the queue Â· A-${pad(s.studentQueue)}`);render()}function leave(){s.joined=false;toast('You left the queue');render()}function next(){const current=queueData.find(row=>row.status==='Serving');const nextRow=queueData.find(row=>row.status==='Waiting');if(current)current.status='Completed';if(nextRow){nextRow.status='Serving';s.now=nextRow.number}else{const number=queueData.length+1;queueData.push({number,name:'New Student',time:'10:00 AM',window:'Window 3',status:'Serving'});s.now=number}transactionData.unshift([`A-${pad(current?.number||s.now-1)}`,current?.name||'Student','New ID',current?.window||'Window 3','Today',new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),'Staff Santos','Completed']);toast(`Queue updated Â· Now serving A-${pad(s.now)}`);render()}function skip(number){const row=queueData.find(item=>item.number===number&&['Waiting','Serving'].includes(item.status));if(!row)return;const wasServing=row.status==='Serving';row.status='Skipped';transactionData.unshift([`A-${pad(row.number)}`,row.name,'New ID',row.window,'Today',new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),'Staff Santos','Skipped']);if(wasServing){const nextRow=queueData.find(item=>item.status==='Waiting');if(nextRow){nextRow.status='Serving';s.now=nextRow.number}}toast(`Queue A-${pad(number)} skipped`);render()}function complete(number){const row=queueData.find(item=>item.number===number&&item.status==='Serving');if(row)row.status='Completed';applicationData[0][4]='Claimed';s.status='Claimed';s.joined=false;if(row)transactionData.unshift([`A-${pad(row.number)}`,row.name,'New ID',row.window,'Today',new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),'Staff Santos','Completed']);toast('Transaction completed Â· ID marked as claimed');render()}function advanceApplication(index){const row=applicationData[index];row[4]=row[4]==='Processing'?'Ready for Claim':row[4]==='Ready for Claim'?'Claimed':'Claimed';if(index===0&&row[4]==='Claimed')s.status='Claimed';toast(`${row[0]} status updated to ${row[4]}`);render()}function goStudent(p){s.student=p;render()}function goAdmin(p){s.admin=p;render()}
function modal(){return s.modal?`<div class="backdrop"><section class="join-modal"><div class="doc">â–¤</div><h2>Join ID Claiming Queue?</h2><p>Confirm your queue slot for today</p><div class="info"><span>Student Name <b>Juan Dela Cruz</b></span><span>Student No. <b>2021-00123</b></span><span>ID Status <b class="green-text">âœ“ Ready for Claim</b></span><span>Now Serving <b>A-${pad(s.now)}</b></span><span>Your Number <b>A-${pad(s.studentQueue)}</b></span><span>Est. Wait <b>~4 minutes</b></span></div><button class="primary" onclick="confirmJoin()">CONFIRM JOIN</button><button class="cancel" onclick="closeJoin()">CANCEL</button></section></div>`:''}
function tv(){return `<main class="tv"><header>${brand(true)}<div><b>10:58:10 AM</b><small>Friday, September 4, 2026</small></div></header><div class="tvbody"><section><small>NOW SERVING</small><strong>A-${pad(s.now)}</strong><b>â— &nbsp;WINDOW 3&nbsp; â—</b></section><aside><h2>UP NEXT</h2>${[1,2,3].map((x,i)=>`<div><small>#${x}</small><b>A-${pad(s.now+x)}</b><em>Win. ${i+2}</em></div>`).join('')}<hr><h3>QUEUE STATS</h3><p>Waiting <b>67</b><br>Served Today <b>20</b><br>Avg. Wait <b>18 min</b></p></aside></div><footer>Please prepare your ID and payment receipt and proceed to the assigned window when your number is called. <b>Scan your NU QR to check your queue status on your phone.</b></footer></main>`}
function render(){app.innerHTML=s.view==='landing'?landing():s.view==='studentLogin'?auth(false):s.view==='adminLogin'?auth(true):s.view==='student'?student():s.view==='admin'?admin():tv();}
function trackerMarkup(){return `<div class="status-tracker">${trackerOrder.map((label,index)=>`<div class="tracker-step ${trackerClass(index)}"><i>${trackerIcon(index)}</i><span>${label}</span></div>`).join('')}</div>`}
function status(){const current=trackerState().status;const ready=current==='Ready for Claim';return `<div class="heading"><h1>ID Application Status</h1><p>Track the progress of your school ID</p></div><section class="status-detail"><div class="detail-head"><span>Student<b>Juan Dela Cruz</b></span><em class="status-badge ${ready?'ready-badge':''}">${current.toUpperCase()}</em></div>${trackerMarkup()}<p class="note">Application status updates are synchronized with the Admin Dashboard.</p>${ready?'<button class="join" onclick="claimId()">CLAIM ID</button>':''}</section>`}
function home(){const current=trackerState().status;const ready=current==='Ready for Claim';return `<div class="welcome"><small>Good morning,</small><h1>Juan Dela Cruz! 👋</h1><p>2021-00123 · BS Computer Science</p></div><section class="status"><small>ID APPLICATION STATUS</small><b>New Student ID · 2026–2027</b><span class="status-badge ${ready?'ready-badge':''}">● ${current.toUpperCase()}</span>${trackerMarkup()}</section><button class="join" onclick="openJoin()">▣ &nbsp; JOIN QUEUE</button><div class="metrics"><div><small>Now Serving</small><b>A-${pad(s.now)}</b></div><div><small>Avg. Wait Time</small><b>~18 min</b></div></div><div class="note">📍 <b>ID Office hours:</b> Monday–Friday, 8:00 AM – 5:00 PM. Please bring your OR/receipt when claiming your ID.</div>`}
function claimId(){saveTracker('Claimed');toast('ID marked as claimed');render()}
function advanceApplication(index){const current=applicationData[index][4];const nextIndex=Math.min(Math.max(trackerOrder.indexOf(current),0)+1,trackerOrder.length-1);const nextStatus=trackerOrder[nextIndex];applicationData[index][4]=nextStatus;if(index===0)saveTracker(nextStatus);toast(`Application status updated to ${nextStatus}`);render()}
function applications(){return `<div class="tabs"><button class="active">All (${applicationData.length})</button></div><section class="table"><h2>ID Application Records</h2><table><thead><tr><th>STUDENT NAME</th><th>STUDENT NO.</th><th>APPLICATION TYPE</th><th>DATE APPLIED</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>${applicationData.map((row,index)=>`<tr><td>${row[0]}</td><td>${row[1]}</td><td>${row[2]}</td><td>${row[3]}</td><td><em class="${row[4]==='Claimed'?'purple':row[4]==='Processing'?'gold':'green'}">${row[4]}</em></td><td><button onclick="advanceApplication(${index})">${row[4]==='Submitted'?'START REVIEW':row[4]==='Processing'?'APPROVE':row[4]==='Ready for Claim'?'MARK CLAIMED':'COMPLETED'}</button></td></tr>`).join('')}</tbody></table></section>`}
const originalRender=render;
const repairDisplayedEncoding=()=>{const replacements=[['â€“','–'],['Â·','·'],['â—·','◷'],['â€¢','•'],['â†’','→'],['â†','←'],['â†ª','↪'],['â™§','♧'],['â™™','♙'],['â–¦','▦'],['â–£','▣'],['âŒ‚','⌂'],['â‰¡','≡'],['â–¥','▥'],['â–¤','▤'],['â†”','↔'],['âš™','⚙'],['ðŸ‘‹','👋'],['ðŸ”’','🔒'],['âœ“','✓'],['â—','●'],['â—´','◴'],['â‡©','⇩'],['âœŽ','✎'],['â†¶','▶'],['â—‰','◉'],['âœ‰','✉'],['Â©','©'],['â€œ','“'],['â€','”']];const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode()){for(const [broken,fixed] of replacements)node.nodeValue=node.nodeValue.split(broken).join(fixed)}};
const updateLandingClock=()=>{const date=new Date();const dateText=new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'}).format(date);const timeText=new Intl.DateTimeFormat(undefined,{hour:'2-digit',minute:'2-digit',hour12:true}).format(date);const clock=document.querySelector('.landing-date');if(clock)clock.innerHTML=`&#128197;&nbsp; ${dateText}<br><em>&#128336;&nbsp; ${timeText}</em>`};
const updateTvClock=()=>{const date=new Date();const clock=document.querySelector('.tv-clock');const day=document.querySelector('.tv-date');if(clock)clock.textContent=new Intl.DateTimeFormat(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true}).format(date);if(day)day.textContent=new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'}).format(date)};
const updateLandingCopy=()=>{if(s.view!=='landing')return;const title=document.querySelector('.landing h1');if(title)title.innerHTML='<strong>NU</strong><span class="landing-title-rest"> SMART ID QUEUE</span>';const wordmark=document.querySelector('.landing-wordmark');if(wordmark)wordmark.innerHTML='<i></i><b>NATIONAL<br>UNIVERSITY</b><small>Education that works.</small>';const welcome=document.querySelector('.welcome-panel h2');if(welcome)welcome.textContent='Welcome to NU!';const slogan=document.querySelector('.landing-slogan');if(slogan)slogan.innerHTML='&#8220;Building Better Futures Together&#8221;';const footer=document.querySelectorAll('.landing-footer span');if(footer.length>=4){footer[0].textContent='National University';footer[1].textContent='www.national-u.edu.ph';footer[2].textContent='registrar@national-u.edu.ph';footer[3].textContent='© 2024 National University. All rights reserved.'}};
status=()=>`<div class="heading"><h1>ID Application Status</h1><p>Track the progress of your school ID</p></div>`;
home=()=>{const current=trackerState().status;const ready=['Ready for Claim','Claimed'].includes(current);const rejected=current==='Rejected';const claimControl=rejected?'<span class="status-badge rejected-badge">● REJECTED</span>':current==='Ready for Claim'?'<button class="status-badge claim-control" onclick="claimId()">● CLAIMED</button>':`<span class="status-badge ${ready?'ready-badge':''}">● ${current.toUpperCase()}</span>`;return `<div class="welcome"><small>Good morning,</small><h1>Juan Dela Cruz! 👋</h1><p>2021-00123 · BS Computer Science</p></div><section class="status"><small>ID APPLICATION STATUS</small><b>New Student ID · 2026–2027</b>${claimControl}${trackerMarkup()}</section><button class="join" onclick="openJoin()" ${rejected?'disabled':''}>▣ &nbsp; JOIN QUEUE</button><div class="metrics"><div><small>Now Serving</small><b>A-${pad(s.now)}</b></div><div><small>Avg. Wait Time</small><b>~18 min</b></div></div><div class="note">📍 <b>ID Office hours:</b> Monday–Friday, 8:00 AM – 5:00 PM. Please bring your OR/receipt when claiming your ID.</div>`};
applications=()=>{return `<div class="tabs"><button class="active">All (${applicationData.length})</button></div><section class="table"><h2>ID Application Records</h2><table><thead><tr><th>STUDENT NAME</th><th>STUDENT NO.</th><th>APPLICATION TYPE</th><th>DATE APPLIED</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>${applicationData.map((row,index)=>`<tr><td>${row[0]}</td><td>${row[1]}</td><td>${row[2]}</td><td>${row[3]}</td><td><em class="${row[4]==='Claimed'?'purple':row[4]==='Rejected'?'red':row[4]==='Processing'?'gold':'green'}">${row[4]}</em></td><td><button onclick="advanceApplication(${index})" ${row[4]==='Not Started'?'disabled':''}>${row[4]==='Not Started'?'WAITING FOR QUEUE':row[4]==='Submitted'?'START REVIEW':row[4]==='Processing'?'APPROVE':row[4]==='Ready for Claim'?'MARK CLAIMED':row[4]==='Rejected'?'REJECTED':'COMPLETED'}</button><button class="reject-application" onclick="rejectApplication(${index})" ${['Rejected','Not Started'].includes(row[4])?'disabled':''}>REJECT</button></td></tr>`).join('')}</tbody></table></section>`};
advanceApplication=async index=>{const application=applicationData[index];if(!application)return;if(application[4]==='Not Started'){toast('Student must join the queue first');return}const current=application[4]||trackerState(application[1]).status;const nextIndex=Math.min(Math.max(trackerOrder.indexOf(current),0)+1,trackerOrder.length-1);const nextStatus=trackerOrder[nextIndex];saveTrackerFor(application[1],nextStatus);if(nextStatus==='Claimed'){const queueEntry=queueData.find(row=>row.studentNo===application[1]||row.name===application[0]);if(queueEntry&&['Waiting','Serving'].includes(queueEntry.status))queueEntry.status='Completed';recalculateWaitTimes();}await pushRealtimeAction('application.update',{studentNo:application[1],status:nextStatus});localStorage.setItem('nu-smart-id-queue',JSON.stringify(queueData));toast(`Application status updated to ${nextStatus}`);render()};
rejectApplication=async index=>{const application=applicationData[index];if(!application)return;saveTrackerFor(application[1],'Rejected');const queueEntry=queueData.find(row=>row.studentNo===application[1]||row.name===application[0]);if(queueEntry&&['Waiting','Serving'].includes(queueEntry.status))queueEntry.status='Skipped';recalculateWaitTimes();await pushRealtimeAction('application.update',{studentNo:application[1],status:'Rejected'});localStorage.setItem('nu-smart-id-queue',JSON.stringify(queueData));toast(`${application[0]} was rejected`);render()};
claimId=async()=>{saveTracker('Claimed');s.joined=false;await pushRealtimeAction('application.update',{studentNo:studentProfile.studentNo,status:'Claimed'});toast('ID marked as claimed');render()};
markIdReceived=()=>{localStorage.setItem('nu-smart-id-received','true');toast('ID receipt confirmed');render()};
profile=()=>{const current=trackerState().status;const canClaim=current==='Ready for Claim';const received=localStorage.getItem('nu-smart-id-received')==='true';return `<div class="heading"><h1>Profile</h1><p>Your NU Smart ID account</p></div><section class="status-detail"><div class="detail-head"><span>Student<b>${studentProfile.name}</b></span><em class="status-badge ${received?'ready-badge':''}">${current.toUpperCase()}</em></div>${s.profileEditing?`<form class="profile-form" onsubmit="saveProfile(event)"><label>Name<input name="name" value="${studentProfile.name}" required></label><label>Student ID<input name="studentNo" value="${studentProfile.studentNo}" required></label><label>Email<input type="email" name="email" value="${studentProfile.email}" required></label><label>Contact Info<input name="contactInfo" value="${studentProfile.contactInfo}" placeholder="Phone number or other contact info"></label><div class="profile-actions"><button type="submit" class="join">SAVE CHANGES</button><button type="button" class="cancel" onclick="cancelProfileEdit()">CANCEL</button></div></form>`:`<p class="note">Student ID: ${studentProfile.studentNo}<br>${studentProfile.email}${studentProfile.contactInfo?`<br>${studentProfile.contactInfo}`:''}</p><button class="join" onclick="startProfileEdit()">EDIT PROFILE</button>`}${trackerMarkup()}${canClaim?'<button class="join" onclick="claimId()">MARK ID AS CLAIMED</button>':current==='Claimed'&&!received?'<button class="join receive-button" onclick="markIdReceived()">ID RECEIVED</button>':received?'<div class="ready"><b>✓ ID received. Claimed status confirmed.</b></div>':''}</section>`};
startProfileEdit=()=>{s.profileEditing=true;render()};
cancelProfileEdit=()=>{s.profileEditing=false;render()};
saveProfile=event=>{event.preventDefault();const values=Object.fromEntries(new FormData(event.currentTarget));const previousName=studentProfile.name;const previousStudentNo=studentProfile.studentNo;Object.assign(studentProfile,values);queueData.forEach(row=>{if(row.name===previousName)row.name=studentProfile.name});applicationData.forEach(row=>{if(row[0]===previousName||row[1]===previousStudentNo){row[0]=studentProfile.name;row[1]=studentProfile.studentNo}});localStorage.setItem('nu-smart-id-queue',JSON.stringify(queueData));localStorage.setItem('nu-smart-id-applications',JSON.stringify(applicationData));s.profileEditing=false;toast('Profile updated successfully');render()};
confirmJoin=async()=>{const existingQueue=queueData.find(row=>['Waiting','Serving'].includes(row.status)&&(row.name===studentProfile.name||row.studentNo===studentProfile.studentNo));if(existingQueue){s.studentQueue=existingQueue.number;s.joined=true;s.modal=false;toast(`You are already in the queue · A-${pad(existingQueue.number)}`);render();return}const joinedAt=new Date();const queueNumber=queueData.length?Math.max(...queueData.map(item=>Number(item.number||0)))+1:1;const studentName=studentProfile.name;const studentNo=studentProfile.studentNo;const isFirst=!queueData.some(row=>['Waiting','Serving'].includes(row.status));const application=[studentName,studentNo,'New ID',joinedAt.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}),'Submitted'];queueData.push({number:queueNumber,name:studentName,studentNo,time:joinedAt.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),window:'Window 3',status:isFirst?'Serving':'Waiting',waitMinutes:defaultWaitMinutes});applicationData.push(application);recalculateWaitTimes();await pushRealtimeAction('queue.join',{studentNo, name:studentName, program:studentProfile.program});localStorage.setItem('nu-smart-id-applications',JSON.stringify(applicationData));localStorage.setItem('nu-smart-id-queue',JSON.stringify(queueData));saveTracker('Submitted');s.studentQueue=queueNumber;s.joined=true;s.modal=false;s.alerts=2;toast(`Successfully joined the queue · A-${pad(queueNumber)} · ${queueData.find(row=>row.number===queueNumber)?.waitMinutes||0} min wait`);render()};
const freshStateKey='nu-smart-id-fresh-state-v1';if(!localStorage.getItem(freshStateKey)){['nu-smart-id-applications','nu-smart-id-queue','nu-smart-id-application-status','nu-smart-id-received'].forEach(key=>localStorage.removeItem(key));localStorage.setItem(freshStateKey,'true')}
const storedApplications=JSON.parse(localStorage.getItem('nu-smart-id-applications')||'[]');if(storedApplications.length){applicationData.push(...storedApplications)}
const storedQueue=JSON.parse(localStorage.getItem('nu-smart-id-queue')||'[]');if(storedQueue.length){queueData.push(...storedQueue);recalculateWaitTimes();localStorage.setItem('nu-smart-id-queue',JSON.stringify(queueData))}
const adjustWait=async(number,change)=>{const row=queueData.find(item=>item.number===number);if(!row)return;const current=row.waitMinutes??defaultWaitMinutes;const next=Math.max(0,current+change);if(next===current)return;row.waitMinutes=next;const entry={number:row.number,name:row.name,change,waitMinutes:next,time:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})};auditData.push(entry);await pushRealtimeAction('queue.update',{queueNumber:number,status:row.status,waitMinutes:next});localStorage.setItem('nu-smart-id-queue',JSON.stringify(queueData));localStorage.setItem('nu-smart-id-wait-audit',JSON.stringify(auditData));toast(`A-${pad(number)} wait updated to ${next} min`);render()};
const resetStudentProcess=queueRow=>{const application=applicationData.find(item=>item[1]===queueRow.studentNo||item[0]===queueRow.name);const studentNo=queueRow.studentNo||application?.[1];if(!studentNo)return;saveTrackerFor(studentNo,'Not Started');const notifications=studentNotifications(studentNo).filter(notification=>notification.type!=='ready');localStorage.setItem(studentNotificationKey(studentNo),JSON.stringify(notifications));if(studentNo===studentProfile.studentNo)refreshStudentAlertCount()};
leave=async()=>{const row=queueEntryForStudent();if(!row){s.student='home';toast('You are not currently in the queue');render();return}const index=queueData.indexOf(row);if(index>=0)queueData.splice(index,1);resetStudentProcess(row);recalculateWaitTimes();await pushRealtimeAction('queue.leave',{studentNo:studentProfile.studentNo});localStorage.setItem('nu-smart-id-queue',JSON.stringify(queueData));localStorage.setItem('nu-smart-id-applications',JSON.stringify(applicationData));s.joined=false;s.studentQueue=0;s.student='home';toast('You left the queue; process reset');render()};
const clearQueueData=async()=>{if(!queueData.length)return;const synced=await pushRealtimeAction('queue.clear');if(!synced)return;localStorage.removeItem('nu-smart-id-queue');s.joined=false;s.studentQueue=0;s.now=0;toast('Full queue list cleared and student processes reset');render()};
const clearWaitAudit=()=>{if(!auditData.length)return;auditData.splice(0,auditData.length);localStorage.removeItem('nu-smart-id-wait-audit');toast('Wait-time adjustment log cleared');render()};
const removeStudent=async number=>{const removed=queueData.find(row=>row.number===number);if(!removed)return;const synced=await pushRealtimeAction('queue.remove',{queueNumber:number});if(!synced)return;resetStudentProcess(removed);recalculateWaitTimes();localStorage.setItem('nu-smart-id-queue',JSON.stringify(queueData));if(s.studentQueue===number||removed.studentNo===studentProfile.studentNo||removed.name===studentProfile.name){s.joined=false;s.studentQueue=0}localStorage.setItem('nu-smart-id-applications',JSON.stringify(applicationData));toast(`${removed.name} removed from queue; process reset`);render()};
const originalNextAction=next;next=async()=>{if(!queueData.some(row=>row.status==='Waiting')){toast('No students are waiting in the queue');return}const current=activeServing();if(current){current.status='Completed';await pushRealtimeAction('queue.update',{queueNumber:current.number,status:'Completed'});}const nextRow=waitingQueue()[0];if(nextRow){nextRow.status='Serving';s.now=nextRow.number;await pushRealtimeAction('queue.update',{queueNumber:nextRow.number,status:'Serving'});}recalculateWaitTimes();localStorage.setItem('nu-smart-id-queue',JSON.stringify(queueData));render()};
const originalCompleteAction=complete;complete=async number=>{const row=queueData.find(item=>item.number===number&&item.status==='Serving');if(row){row.status='Completed';if(row.name===studentProfile.name){s.joined=false;s.studentQueue=0;}}recalculateWaitTimes();await pushRealtimeAction('queue.update',{queueNumber:number,status:'Completed'});localStorage.setItem('nu-smart-id-queue',JSON.stringify(queueData));render()};
const originalSkipAction=skip;skip=async number=>{const row=queueData.find(item=>item.number===number&&['Waiting','Serving'].includes(item.status));if(!row)return;row.status='Skipped';if(row.studentNo||applicationData.some(application=>application[0]===row.name)){const application=applicationData.find(item=>item[1]===row.studentNo||item[0]===row.name);if(application)saveTrackerFor(application[1],'Not Started');}if(row.name===studentProfile.name||row.studentNo===studentProfile.studentNo){s.joined=false;s.studentQueue=0;}recalculateWaitTimes();await pushRealtimeAction('queue.update',{queueNumber:number,status:'Skipped'});localStorage.setItem('nu-smart-id-queue',JSON.stringify(queueData));localStorage.setItem('nu-smart-id-applications',JSON.stringify(applicationData));toast(`Queue A-${pad(number)} skipped; rejoin to submit again`);render()};
const removeApplication=async index=>{const application=applicationData[index];if(!application)return;const studentNo=application[1];const synced=await pushRealtimeAction('application.remove',{studentNo});if(!synced)return;resetStudentProcess({name:application[0],studentNo});recalculateWaitTimes();localStorage.setItem('nu-smart-id-queue',JSON.stringify(queueData));localStorage.setItem('nu-smart-id-applications',JSON.stringify(applicationData));if(studentNo===studentProfile.studentNo){s.joined=false;s.studentQueue=0}toast(`${application[0]} account removed and process reset`);render()};
const addRemoveControls=()=>{if(s.view!=='admin')return;document.querySelectorAll('.admin .table table tbody tr').forEach((row,index)=>{const queueCell=row.cells[0];const actionCell=row.cells[row.cells.length-1];if(!queueCell||!actionCell)return;if(s.admin==='queue'&&/^A-\d+/.test(queueCell.textContent.trim())){const number=Number(queueCell.textContent.trim().replace(/^A-/,'').replace(/^0+/,''))||0;const queueRow=queueData.find(item=>item.number===number);const applicationIndex=queueRow?applicationData.findIndex(item=>item[0]===queueRow.name||item[1]===queueRow.studentNo):-1;if(applicationIndex>=0&&!row.querySelector('.application-action')){const application=applicationData[applicationIndex];const label=application[4]==='Submitted'?'START REVIEW':application[4]==='Processing'?'APPROVE':application[4]==='Ready for Claim'?'MARK COMPLETED':'COMPLETED';actionCell.insertAdjacentHTML('afterbegin',`<button class="application-action" onclick="advanceApplication(${applicationIndex})">${label}</button> `)}if(!row.querySelector('.remove-student'))actionCell.insertAdjacentHTML('beforeend',` <button class="remove-student" onclick="removeStudent(${number})" aria-label="Remove student" title="Remove student">×</button>`)}if(s.admin==='applications'){const oldUpdate=Array.from(actionCell.querySelectorAll('button')).find(button=>['START REVIEW','APPROVE','MARK CLAIMED','COMPLETED'].includes(button.textContent.trim()));if(oldUpdate)oldUpdate.style.display='none';if(!row.querySelector('.remove-student'))actionCell.insertAdjacentHTML('beforeend',` <button class="remove-student" onclick="removeApplication(${index})" aria-label="Remove application" title="Remove application">×</button>`)}})};
window.addEventListener('storage',event=>{if(event.key==='nu-smart-id-applications'){applicationData.splice(0,applicationData.length,...JSON.parse(event.newValue||'[]'))}if(event.key==='nu-smart-id-queue'){queueData.splice(0,queueData.length,...JSON.parse(event.newValue||'[]'));s.now=queueData.find(row=>row.status==='Serving')?.number||0;if(!queueData.some(row=>['Waiting','Serving'].includes(row.status))){s.now=0;s.studentQueue=0;s.joined=false}else{s.studentQueue=queueData.find(row=>row.studentNo===studentProfile.studentNo||row.name===studentProfile.name)?.number||s.studentQueue}}if(event.key==='nu-smart-id-wait-audit'){auditData.splice(0,auditData.length,...JSON.parse(event.newValue||'[]'))}if(event.key==='nu-smart-id-applications'||event.key==='nu-smart-id-queue'||event.key==='nu-smart-id-wait-audit'||event.key===trackerKey||event.key?.startsWith(`${trackerKey}:`)){const currentApplication=applicationData.find(row=>row[1]===studentProfile.studentNo);if(currentApplication)currentApplication[4]=trackerState().status;render()}});
render=()=>{originalRender();repairDisplayedEncoding();updateLandingCopy();updateLandingClock()};
const originalTvView=tv;
tv=()=>originalTvView().replace('go(\'landing\')','goTvBack()').replace('Back to Home',`Back to ${s.tvReturn==='queue'?'Queue Management':s.tvReturn==='dashboard'?'Dashboard':s.tvReturn==='applications'?'ID Applications':s.tvReturn==='reports'?'Reports':'Home'}`);
render();
const finalTvView=tv;
tv=()=>finalTvView().replace('go(\'landing\')','goTvBack()').replace('Back to Home',`Back to ${s.tvReturn==='queue'?'Queue Management':s.tvReturn==='dashboard'?'Dashboard':s.tvReturn==='applications'?'ID Applications':s.tvReturn==='reports'?'Reports':'Home'}`);
reports=()=>{const active=queueData.filter(row=>['Waiting','Serving'].includes(row.status));const served=queueData.filter(row=>['Completed','Claimed'].includes(row.status));const skipped=queueData.filter(row=>row.status==='Skipped').length+transactionData.filter(row=>row[7]==='Skipped').length;const average=active.length?Math.round(active.reduce((sum,row)=>sum+(row.waitMinutes??0),0)/active.length):0;const total=queueData.length;const applications=applicationData.length;const newIds=applicationData.filter(row=>row[2]==='New ID').length;const replacements=applicationData.filter(row=>row[2]!=='New ID').length;const typeTotal=newIds+replacements+skipped||1;const newPercent=Math.round(newIds/typeTotal*100);const replacementPercent=Math.round(replacements/typeTotal*100);const skippedPercent=Math.max(0,100-newPercent-replacementPercent);const values=[[total,'Total Students'],[served.length,'Students Served'],[active.filter(row=>row.status==='Waiting').length,'Students Waiting'],[`${average} min`,'Avg. Wait Time'],[skipped,'Skipped Queues']];return `<div class="report-head"><div><h1>Daily Queue Summary</h1><p>Live data · ID Office</p></div><div><button onclick="toast('PDF report exported')">⇩ Export PDF</button><button onclick="toast('Excel report exported')">⇩ Export Excel</button></div></div><div class="stats report-stats">${values.map((x,i)=>`<div><b class="c${i}">${x[0]}</b><small>${x[1]}</small></div>`).join('')}</div><div class="report-grid"><section class="chart"><h2>Current Queue Volume</h2><p>Accounts by current status</p><div>${[['Waiting',active.filter(row=>row.status==='Waiting').length,'#718ba8'],['Serving',active.filter(row=>row.status==='Serving').length,'#f0c735'],['Completed',served.length,'#25a866'],['Skipped',skipped,'#ef5b5b']].map(([label,value,color])=>`<i style="height:${Math.max(8,value*18)}px;background:${color}"><small>${label}</small></i>`).join('')}</div></section><section class="chart pie"><h2>Transaction Types</h2><div class="donut"></div><p>● New ID &nbsp;${newPercent}%<br>● Replacement &nbsp;${replacementPercent}%<br>● Skipped &nbsp;${skippedPercent}%</p></section></div><section class="chart line"><h2>Live Queue Trend</h2><div>${active.map(row=>`<span>A-${pad(row.number)} · ${row.waitMinutes??0} min</span>`).join(' · ')||'No active queue records'}</div></section>`};
const syncAccountWaitMetric=()=>{const row=queueEntryForStudent();const metric=document.querySelector('.metrics div:nth-child(2) b');if(metric)metric.textContent=`~${row?(row.waitMinutes??defaultWaitMinutes):averageWait()}`;const tvCurrent=document.querySelector('.tvbody>section>b');const current=activeServing();if(tvCurrent&&current)tvCurrent.textContent=`● ${current.window.toUpperCase()} · ${current.waitMinutes??0} MIN WAIT ●`;};
window.addEventListener('storage',event=>{if(event.key==='nu-smart-id-queue')setTimeout(syncAccountWaitMetric,0)});
setInterval(()=>{updateLandingClock();updateTvClock();syncAccountWaitMetric()},1000);

let installPrompt;
window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();
  installPrompt=event;
  if(document.querySelector('.install-app'))return;
  const button=document.createElement('button');
  button.className='install-app';
  button.type='button';
  button.textContent='Install app';
  button.addEventListener('click',async()=>{
    if(!installPrompt)return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt=null;
    button.remove();
  });
  document.body.append(button);
});

window.addEventListener('appinstalled',()=>{
  document.querySelector('.install-app')?.remove();
  installPrompt=null;
});

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('/service-worker.js'));
}

let authUser=null;
const adminStudentData=[];
const apiRequest=async (url, options={})=>{const response=await fetch(url,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options});const responseText=await response.text();let body;try{body=responseText?JSON.parse(responseText):null}catch{throw new Error(`Server returned HTTP ${response.status} with non-JSON content (${response.headers.get('content-type')||'unknown type'}). Check the Cloudflare tunnel target.`)}if(!responseText.trim())throw new Error(`Server returned an empty response (HTTP ${response.status}). Check the Cloudflare tunnel target.`);if(!response.ok)throw new Error(body?.error||`Request failed (HTTP ${response.status}).`);return body};
const applyRealtimeState=(state)=>{if(!state)return;const nextQueue=Array.isArray(state.queue)?state.queue:[];const nextApps=Array.isArray(state.applications)?state.applications:[];queueData.splice(0,queueData.length,...nextQueue.map(item=>({number:Number(item.number||0),name:item.name||'',studentNo:item.studentNo||'',time:item.time||'',window:item.window||'Window 3',status:item.status||'Waiting',waitMinutes:Number(item.waitMinutes||0),studentId:item.studentId||null})));applicationData.splice(0,applicationData.length,...nextApps.map(item=>[item.name||'',item.studentNo||'',item.applicationType||'New ID',item.dateApplied||'',item.status||'Submitted']));if(state.user){setAuthenticatedUser(state.user);}s.now=queueData.find(row=>row.status==='Serving')?.number||0;if(!queueData.some(row=>['Waiting','Serving'].includes(row.status))){s.now=0;s.studentQueue=0;s.joined=false;}else if(studentProfile.studentNo){const myQueue=queueData.find(row=>row.studentNo===studentProfile.studentNo||row.name===studentProfile.name);if(myQueue){s.studentQueue=myQueue.number;s.joined=true;}}};
const syncStudentTrackerFromRealtime=state=>{if(!state?.user||!Array.isArray(state.applications))return;const application=state.applications.find(row=>row.studentNo===state.user.studentNo);const tracker={status:application?.status||'Not Started',updatedAt:application?.updatedAt||new Date().toISOString()};localStorage.setItem(trackerStorageKey(state.user.studentNo),JSON.stringify(tracker));localStorage.setItem(trackerKey,JSON.stringify(tracker));};
const syncSharedState=async()=>{try{const response=await apiRequest('/api/shared-state');applyRealtimeState(response);syncStudentTrackerFromRealtime(response);render();}catch(error){if(error.message!=='Authentication required.')console.warn('Realtime sync unavailable:',error.message);}};
const subscribeRealtime=()=>{if(window.__nuRealtimeSource)return;const source=new EventSource('/api/events');window.__nuRealtimeSource=source;source.addEventListener('connected',()=>{syncSharedState();});source.addEventListener('state.updated',event=>{try{const payload=JSON.parse(event.data);if(payload?.state){applyRealtimeState(payload.state);syncStudentTrackerFromRealtime(payload.state);}render();}catch(error){console.warn('Realtime update failed:',error.message);}});source.onerror=()=>{if(source.readyState===EventSource.CLOSED){window.__nuRealtimeSource=null;setTimeout(subscribeRealtime,1500);}};};
const pushRealtimeAction=async (action,payload={})=>{try{const response=await apiRequest('/api/realtime/sync',{method:'POST',body:JSON.stringify({action,...payload})});if(response?.state){applyRealtimeState(response.state);}return true;}catch(error){console.warn('Realtime action failed:',error.message);return false;}};
const setAuthenticatedUser=user=>{authUser=user;Object.assign(studentProfile,{name:user.name,email:user.email,studentNo:user.studentNo,program:user.program||'Student',contactInfo:user.contactInfo||''});};
let authMode='login';
const courseOptions=[['Computer Engineering','Bachelor of Science in Computer Engineering','CE'],['Civil Engineering','Bachelor of Science in Civil Engineering','CV'],['Information Technology','Bachelor of Science in Information Technology','IT'],['Tourism Management','Bachelor of Science in Tourism Management','TM'],['Hospitality Management','Bachelor of Science in Hospitality Management','HM'],['Psychology','Bachelor of Science in Psychology','PS'],['Architecture','Bachelor of Science in Architecture','AR']];
const selectCourse=course=>{const input=document.querySelector('#auth-program');if(!input)return;input.value=course;document.querySelectorAll('.course-option').forEach(option=>{const selected=option.dataset.value===course;option.classList.toggle('selected',selected);option.setAttribute('aria-pressed',String(selected));});};

const authForm=()=>{
  const isRegister=authMode==='register';

  return `
  <main class="auth">
    <div class="center">
      <h1>NU Smart ID Queue</h1>
      <p>National University – Baliwag</p>
      <small>Student Portal</small>

      <section class="auth-card">
        <h2>${isRegister?'Create your account':'Sign in to your account'}</h2>

        ${isRegister?`
          <label>Full Name</label>
          <input
            id="auth-name"
            type="text"
            autocomplete="name"
            placeholder="Enter your full name"
          >

          <label>NU Email</label>
          <input
            id="auth-email"
            type="email"
            autocomplete="email"
            placeholder="name@nu-baliwag.edu.ph or name@national-u.edu.ph"
          >

          <label>Student ID Number</label>
          <input
            id="auth-student-no"
            type="text"
            autocomplete="off"
            placeholder="Enter your student ID number"
            maxlength="50"
          >

          <label>Program</label>
          <input id="auth-program" type="hidden" value="">
          <div class="course-picker" role="radiogroup" aria-label="Select your program">
            ${courseOptions.map(([label,value,code])=>`<button type="button" class="course-option" data-value="${value}" aria-pressed="false" onclick="selectCourse('${value}')"><span>${code}</span><b>${label}</b><i>+</i></button>`).join('')}
          </div>
          <small class="course-hint">Choose the program you are currently enrolled in.</small>
        `:`
          <label>NU Email</label>
          <input
            id="auth-email"
            type="email"
            autocomplete="email"
            placeholder="name@nu-baliwag.edu.ph or name@national-u.edu.ph"
          >
        `}

        <label>Password</label>
        <input
          id="auth-password"
          type="password"
          autocomplete="${isRegister?'new-password':'current-password'}"
          placeholder="Enter your password"
        >

        ${isRegister?`
          <label>Confirm Password</label>
          <input
            id="auth-confirm-password"
            type="password"
            autocomplete="new-password"
            placeholder="Confirm your password"
          >

          <button class="primary" onclick="submitAuth('register')">
            REGISTER
          </button>

          <div class="auth-switch">
            Already have an account?
            <button class="forgot" onclick="showLogin()">Login</button>
          </div>
        `:`
          <button class="primary" onclick="submitAuth('login')">
            LOGIN
          </button>

          <div class="auth-switch">
            Don't have an account?
            <button class="forgot" onclick="showRegister()">Register</button>
          </div>
        `}
      </section>

      <button class="back" onclick="go('landing')">
        ← Back to portal selection
      </button>
    </div>
  </main>`;
};

const showRegister=()=>{
  authMode='register';
  render();
};

const showLogin=()=>{
  authMode='login';
  render();
};

const legacyAuth=auth;

auth=staff=>{
  if(staff){
    return legacyAuth(true);
  }

  return authForm();
};

const submitAuth=async mode=>{
  const email=document.querySelector('#auth-email')?.value.trim();
  const password=document.querySelector('#auth-password')?.value;
  const name=document.querySelector('#auth-name')?.value.trim();
  const studentNo=document.querySelector('#auth-student-no')?.value.trim();
  const program=document.querySelector('#auth-program')?.value;
  const confirmPassword=document.querySelector('#auth-confirm-password')?.value;

  if(mode==='register'){
    if(!name){
      toast('Please enter your full name');
      return;
    }

    if(!email){
      toast('Please enter your NU email');
      return;
    }

    if(!studentNo){
      toast('Please enter your student ID number');
      return;
    }

    if(!program){
      toast('Please select your program');
      return;
    }

    if(!password){
      toast('Please enter a password');
      return;
    }

    if(password.length<8){
      toast('Password must be at least 8 characters');
      return;
    }

    if(password!==confirmPassword){
      toast('Passwords do not match');
      return;
    }
  }

  try{
    const result=await apiRequest(
      `/api/${mode==='register'?'register':'login'}`,
      {
        method:'POST',
        body:JSON.stringify({
          name,
          email,
          studentNo,
          password,
          program
        })
      }
    );

    setAuthenticatedUser(result.user);
    subscribeRealtime();

    s.view='student';

    toast(
      mode==='register'
        ? 'Account created successfully'
        : 'Welcome to NU Smart ID Queue'
    );

    render();

  }catch(error){
    toast(error.message);
  }
};

login=async staff=>{
  if(staff){
    const fields=document.querySelectorAll('.auth-card input');

    try{
      await apiRequest('/api/admin/login',{
        method:'POST',
        body:JSON.stringify({
          username:fields[0]?.value.trim(),
          password:fields[1]?.value
        })
      });

      const result=await apiRequest('/api/admin/students');
      adminStudentData.splice(0,adminStudentData.length,...result.students);
      subscribeRealtime();
      s.view='admin';
      toast('Welcome to NU Smart ID Queue');
      render();
    }catch(error){
      toast(error.message);
    }
    return;
  }

  submitAuth('login');
};
home=()=>{const current=trackerState().status;const ready=['Ready for Claim','Claimed'].includes(current);return `<div class="welcome"><small>Good morning,</small><h1>${studentProfile.name}!</h1><p>${studentProfile.studentNo} · ${studentProfile.program}</p></div><section class="status"><small>ID APPLICATION STATUS</small><b>New Student ID · 2026–2027</b><span class="status-badge ${ready?'ready-badge':''}">● ${current.toUpperCase()}</span>${trackerMarkup()}</section><button class="join" onclick="openJoin()">▣ &nbsp; JOIN QUEUE</button><div class="metrics"><div><small>Now Serving</small><b>A-${pad(s.now)}</b></div><div><small>Avg. Wait Time</small><b>~18 min</b></div></div><div class="note">📍 <b>ID Office hours:</b> Monday–Friday, 8:00 AM – 5:00 PM. Please bring your OR/receipt when claiming your ID.</div>`};
render=()=>{if(s.view==='student'&&!authUser){s.view='studentLogin';}app.innerHTML=s.view==='landing'?landing():s.view==='studentLogin'?auth(false):s.view==='adminLogin'?auth(true):s.view==='student'?student():s.view==='admin'?admin():tv();repairDisplayedEncoding();updateLandingCopy();updateLandingClock();addRemoveControls();syncWaitDisplays()};
const logout=async()=>{try{await apiRequest('/api/logout',{method:'POST'})}finally{window.__nuRealtimeSource?.close();window.__nuRealtimeSource=null;authUser=null;s.view='landing';render()}};
topbar=()=>`<header class="top">${brand()}<div><button onclick="goStudent('alerts')">♧<em>${s.alerts}</em></button><button class="avatar" onclick="goStudent('profile')">${(studentProfile.name||'ST').split(' ').map(part=>part[0]).join('').slice(0,2).toUpperCase()}</button><button class="logout-mini" onclick="logout()" title="Log out">↪</button></div></header>`;
modal=()=>s.modal?`<div class="backdrop"><section class="join-modal"><div class="doc">▤</div><h2>Join ID Claiming Queue?</h2><p>Confirm your queue slot for today</p><div class="info"><span>Student Name <b>${studentProfile.name}</b></span><span>Student ID <b>${studentProfile.studentNo}</b></span><span>ID Status <b class="green-text">✓ Ready for Claim</b></span><span>Now Serving <b>${activeServing()?`A-${pad(activeServing().number)}`:'--'}</b></span><span>Your Number <b>A-${pad(s.studentQueue || queueEntryForStudent()?.number || nextQueueNumber())}</b></span><span>Est. Wait <b>~${queueEntryForStudent()?.waitMinutes ?? (activeServing()?Math.max(0,nextQueueNumber()-1)*defaultWaitMinutes:0)} minutes</b></span></div><button class="primary" onclick="confirmJoin()">CONFIRM JOIN</button><button class="cancel" onclick="closeJoin()">CANCEL</button></section></div>`:'';
const queueEntryForStudent=()=>queueData.find(item=>item.studentNo===studentProfile.studentNo && ['Waiting','Serving'].includes(item.status)) || queueData.find(item=>item.name===studentProfile.name && ['Waiting','Serving'].includes(item.status)) || queueData.find(item=>item.number===s.studentQueue && ['Waiting','Serving'].includes(item.status));
const activeQueueView=queue;
queue=()=>queueEntryForStudent()?activeQueueView():`<div class="portal-subpage"><h1>My Queue</h1><p class="student-notifications-empty">You are not currently in the queue.</p><button class="portal-join" onclick="openJoin()"><span aria-hidden="true">♟</span><b>JOIN QUEUE</b><span aria-hidden="true">→</span></button></div>`;
const waitMinutesForQueueItem=(item)=>{if(!item || !['Waiting','Serving'].includes(item.status))return 0;return queuePositionFor(item.number)*defaultWaitMinutes;};
confirmJoin=async()=>{const synced=await pushRealtimeAction('queue.join',{studentNo:studentProfile.studentNo,name:studentProfile.name,program:studentProfile.program});if(!synced){toast('Unable to join the queue. Please try again.');return}const row=queueData.find(item=>item.studentNo===studentProfile.studentNo||item.name===studentProfile.name);if(!row){toast('Queue update was not returned. Please try again.');return}saveTracker('Submitted');s.studentQueue=row.number;s.joined=true;s.modal=false;s.alerts=2;localStorage.setItem('nu-smart-id-applications',JSON.stringify(applicationData));localStorage.setItem('nu-smart-id-queue',JSON.stringify(queueData));toast(`Successfully joined the queue · A-${pad(row.number)}`);render()};
const servedQueue=()=>queueData.filter(row=>['Completed','Claimed'].includes(row.status));
const averageWait=()=>{const waiting=waitingQueue();if(!waiting.length)return '0 min';const total=waiting.reduce((sum,row)=>sum + (row.waitMinutes ?? defaultWaitMinutes),0);return `${Math.round(total / waiting.length)} min`;};
const syncWaitDisplays=()=>{const average=averageWait();const row=queueEntryForStudent();const liveWait = row ? (row.waitMinutes ?? defaultWaitMinutes) : defaultWaitMinutes;const metricNodes=[...document.querySelectorAll('.metrics b')];metricNodes.forEach((item,index)=>{if(index===1)item.textContent=`~${average}`;});document.querySelectorAll('.stats b').forEach(item=>{if(item.textContent.includes('18 min') || item.textContent.includes('0 min') || item.textContent.includes('Avg. Wait Time'))item.textContent=average;});const tvStats=document.querySelector('.tvbody aside p b:last-child');if(tvStats)tvStats.textContent=average;const queueWait=document.querySelector('.wait strong');if(queueWait)queueWait.textContent=`${liveWait} min`;const modalWait=document.querySelector('.join-modal .info span:last-child b');if(modalWait)modalWait.textContent=`~${liveWait} minutes`;const valueNodes=[...document.querySelectorAll('.metrics b')];if(valueNodes.length>=2 && valueNodes[0] && valueNodes[0].textContent.includes('A-'))valueNodes[0].textContent = activeServing()?`A-${pad(activeServing().number)}`:'--';if(document.querySelector('.join-modal .info span:nth-child(5) b'))document.querySelector('.join-modal .info span:nth-child(5) b').textContent = `A-${pad(s.studentQueue || queueEntryForStudent()?.number || nextQueueNumber())}`;};
dash=()=>{const current=activeServing();const waiting=waitingQueue();const served=servedQueue();const average=averageWait();const recentQueue=queueData.slice().sort((first,second)=>Number(second.number)-Number(first.number)).slice(0,5);return `<div class="stats">${[['▣',queueData.length,'Total Queues'],['⌛',waiting.length,'Waiting'],['✓',served.length,'Served Today'],['◴',average,'Avg. Wait Time']].map((x,i)=>`<div><span>${x[0]}</span><b class="c${i}">${x[1]}</b><small>${x[2]}</small></div>`).join('')}</div><div class="dash-grid"><section class="serving"><small>NOW SERVING</small><strong>${current?`A-${pad(current.number)}`:'--'}</strong><span>${current?current.window:'No active queue'}</span><b>${current?'● Live':'○ Waiting for queue'}</b></section><section class="recent"><h2>Recent Activity</h2>${recentQueue.length?recentQueue.map(row=>`<div><b>A-${pad(row.number)}</b><span>${row.name}<small>${row.window} · ${row.time}</small></span><em>${row.status}</em></div>`).join(''):transactionData.length?transactionData.slice(0,5).map(row=>`<div><b>${row[0]}</b><span>${row[1]}<small>${row[3]} · ${row[5]}</small></span><em>${row[7]}</em></div>`).join(''):'<p class="empty-state">No queue activity yet.</p>'}</section></div><section class="chart"><h2>Queue Activity — Today</h2><div>${[0,0,0,0,0,0,0,0,0].map((height,index)=>`<i style="height:${Math.max(4,height)}px"><small>${index+8}h</small></i>`).join('')}</div></section>`};
home=()=>{const current=trackerState().status;const ready=['Ready for Claim','Claimed'].includes(current);const active=activeServing();const row=queueEntryForStudent();const userWait = row ? (row.waitMinutes ?? defaultWaitMinutes) : defaultWaitMinutes;return `<div class="welcome"><small>Good morning,</small><h1>${studentProfile.name}!</h1><p>${studentProfile.studentNo} · ${studentProfile.program}</p></div><section class="status"><small>ID APPLICATION STATUS</small><b>New Student ID · 2026–2027</b><span class="status-badge ${ready?'ready-badge':''}">● ${current.toUpperCase()}</span>${trackerMarkup()}</section><button class="join" onclick="openJoin()">▣ &nbsp; JOIN QUEUE</button><div class="metrics"><div><small>Now Serving</small><b>${active?`A-${pad(active.number)}`:'--'}</b></div><div><small>Avg. Wait Time</small><b>~${averageWait()}</b></div></div><div class="note">📍 <b>ID Office hours:</b> Monday–Friday, 8:00 AM – 5:00 PM. Please bring your OR/receipt when claiming your ID.</div>`};
tv=()=>{const current=activeServing();const waiting=waitingQueue();const served=servedQueue();return `<main class="tv"><header>${brand(true)}<button class="tv-back" onclick="go('landing')">← Back to Home</button><div><b class="tv-clock">${new Date().toLocaleTimeString()}</b><small class="tv-date">${new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</small></div></header><div class="tvbody"><section><small>NOW SERVING</small><strong>${current?`A-${pad(current.number)}`:'--'}</strong><b>${current?`● &nbsp;${current.window.toUpperCase()}&nbsp; ●`:'○ &nbsp;WAITING FOR QUEUE&nbsp; ○'}</b></section><aside><h2>UP NEXT</h2>${waiting.length?waiting.slice(0,3).map((row,index)=>`<div><small>#${index+1}</small><b>A-${pad(row.number)}</b><em>${row.window.replace('Window ','Win. ')} · ${row.waitMinutes ?? defaultWaitMinutes} min</em></div>`).join(''):'<p class="empty-state">No students waiting</p>'}<hr><h3>QUEUE STATS</h3><p>Waiting <b>${waiting.length}</b><br>Served Today <b>${served.length}</b><br>Avg. Wait <b>${averageWait()}</b></p></aside></div><footer>Please prepare your ID and payment receipt and proceed to the assigned window when your number is called. <b>Scan your NU QR to check your queue status on your phone.</b></footer></main>`};
render();

const adminHtmlSafe=value=>String(value??'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const refreshAdminStudents=async()=>{
  try{
    const result=await apiRequest('/api/admin/students');
    adminStudentData.splice(0,adminStudentData.length,...result.students);
    render();
  }catch(error){
    toast(error.message);
  }
};
const adminStudentDirectory=()=>`<section class="table"><div class="table-heading"><h2>Registered Students <small>${adminStudentData.length} accounts</small></h2><button onclick="refreshAdminStudents()">REFRESH</button></div><table><thead><tr><th>STUDENT NAME</th><th>ID NUMBER</th><th>NU EMAIL</th><th>PROGRAM</th><th>REGISTERED</th></tr></thead><tbody>${adminStudentData.length?adminStudentData.map(student=>`<tr><td>${adminHtmlSafe(student.name)}</td><td>${adminHtmlSafe(student.studentNo)}</td><td>${adminHtmlSafe(student.email)}</td><td>${adminHtmlSafe(student.program)}</td><td>${adminHtmlSafe(student.createdAt)}</td></tr>`).join(''):'<tr><td colspan="5">No student accounts registered yet.</td></tr>'}</tbody></table></section>`;
const updateCreatedIdStatus=async(index,nextStatus)=>{
  const record=createdIdData[index];
  if(!record||record.status==='Claimed'||!['Ready for Claim','Claimed'].includes(nextStatus))return;
  if(nextStatus==='Ready for Claim'&&record.status!=='Processing')return;
  if(nextStatus==='Claimed'&&record.status!=='Ready for Claim')return;
  const updatedAt=new Date().toISOString();
  const previousStatus=record.status;
  record.status=nextStatus;
  record.updatedAt=updatedAt;
  const tracker={status:nextStatus,updatedAt};
  localStorage.setItem(createdIdStorageKey,JSON.stringify(createdIdData));
  localStorage.setItem(trackerStorageKey(record.studentNo),JSON.stringify(tracker));
  if(record.studentNo===studentProfile.studentNo){
    s.status=nextStatus;
    localStorage.setItem(trackerKey,JSON.stringify(tracker));
  }

  if(nextStatus==='Ready for Claim'&&previousStatus!=='Ready for Claim'){
    const notificationPrefix=`id-ready-${record.studentNo}-`;
    const notifications=studentNotifications(record.studentNo).filter(notification=>!String(notification.id).startsWith(notificationPrefix));
    notifications.unshift({
      id:`id-ready-${record.studentNo}-${Date.now()}`,
      type:'ready',
      title:'Your ID is ready to claim',
      message:'Your student ID is ready for pickup. Please bring your confirmation slip and a valid ID.',
      createdAt:updatedAt,
      read:false
    });
    localStorage.setItem(studentNotificationKey(record.studentNo),JSON.stringify(notifications));
    if(record.studentNo===studentProfile.studentNo)refreshStudentAlertCount();
  }

  await pushRealtimeAction('application.update',{studentNo:record.studentNo,status:nextStatus});
  toast(nextStatus==='Claimed'?`${record.name}'s ID marked as completed`:`${record.name}'s ID approved and ready for claim`);
  render();
};
const markServingIdClaimed=async(queueNumber,createdIdIndex)=>{
  const queueRow=queueData.find(row=>row.number===queueNumber&&row.status==='Serving');
  const createdId=createdIdData[createdIdIndex];
  if(!queueRow||!createdId||createdId.status!=='Ready for Claim')return;
  if(queueRow.studentNo!==createdId.studentNo&&queueRow.name!==createdId.name)return;

  await updateCreatedIdStatus(createdIdIndex,'Claimed');
  queueRow.status='Completed';
  recalculateWaitTimes();
  await pushRealtimeAction('queue.update',{queueNumber,status:'Completed'});
  localStorage.setItem('nu-smart-id-queue',JSON.stringify(queueData));
  render();
};
const manageWithCreatedIdClaim=manage;
manage=()=>{
  const html=manageWithCreatedIdClaim();
  const serving=activeServing();
  if(!serving)return html;
  const createdIdIndex=createdIdData.findIndex(record=>
    record.status==='Ready for Claim'&&
    (record.studentNo===serving.studentNo||record.name===serving.name)
  );
  if(createdIdIndex<0)return html;

  return html
    .replace(`onclick="complete(${serving.number})">COMPLETE</button>`,`onclick="markServingIdClaimed(${serving.number},${createdIdIndex})">MARK AS CLAIMED</button>`)
    .replace(`onclick="complete(${serving.number})">Complete</button>`,`onclick="markServingIdClaimed(${serving.number},${createdIdIndex})">Mark as Claimed</button>`);
};
const createdIdManagement=()=>`<section class="table"><div class="table-heading"><h2>Created IDs <small>${createdIdData.length} IDs</small></h2></div><table><thead><tr><th>STUDENT NAME</th><th>ID NUMBER</th><th>PROGRAM</th><th>STATUS</th><th>LAST UPDATED</th><th>ACTIONS</th></tr></thead><tbody>${createdIdData.length?createdIdData.map((record,index)=>`<tr><td>${adminHtmlSafe(record.name)}</td><td>${adminHtmlSafe(record.studentNo)}</td><td>${adminHtmlSafe(record.program)}</td><td><em class="${record.status==='Claimed'?'green':record.status==='Ready for Claim'?'green':'gold'}">${adminHtmlSafe(record.status)}</em></td><td>${adminHtmlSafe(record.updatedAt)}</td><td><button onclick="updateCreatedIdStatus(${index},'Ready for Claim')" ${record.status!=='Processing'?'disabled':''}>APPROVE</button> <button onclick="updateCreatedIdStatus(${index},'Claimed')" ${record.status!=='Ready for Claim'?'disabled':''}>MARK AS COMPLETED</button></td></tr>`).join(''):'<tr><td colspan="6">No IDs have been created yet.</td></tr>'}</tbody></table></section>`;
const dashboardWithStudentDirectory=dash;
dash=()=>`${dashboardWithStudentDirectory()}${adminStudentDirectory()}${createdIdManagement()}`;
render();
const renderWithQueueWaitPreview=render;
render=()=>{if(s.view==='student'&&s.student==='alerts')markStudentNotificationsRead(studentProfile.studentNo);refreshStudentAlertCount();renderWithQueueWaitPreview();const preview=document.querySelector('.join-modal .info span:last-child b');if(preview&&!queueEntryForStudent())preview.textContent=`~${nextQueueNumber()*defaultWaitMinutes} minutes`;const studentWait=document.querySelector('.student-content .metrics div:nth-child(2) b');const row=queueEntryForStudent();if(studentWait&&row)studentWait.textContent=`~${row.waitMinutes??defaultWaitMinutes} min`;};

const studentIdApplication=()=>{
  const createdId=createdIdData.find(row=>row.studentNo===studentProfile.studentNo);
  return createdId
    ? [createdId.name,createdId.studentNo,createdId.applicationType||'New ID',createdId.dateApplied,createdId.status,createdId.program,createdId.photo,createdId.updatedAt]
    : applicationData.find(row=>row[1]===studentProfile.studentNo);
};
const studentIdSafe=value=>String(value??'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const saveCreatedIdForStudent=(name,studentNo,program,photo,application)=>{
  const updatedAt=new Date().toISOString();
  const record={
    name,
    studentNo,
    applicationType:application?.[2]||'New ID',
    dateApplied:application?.[3]||new Date(updatedAt).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}),
    status:'Ready for Claim',
    program,
    photo,
    updatedAt
  };
  const recordIndex=createdIdData.findIndex(row=>row.studentNo===studentNo);
  if(recordIndex>=0)createdIdData[recordIndex]=record;
  else createdIdData.push(record);
  localStorage.setItem(createdIdStorageKey,JSON.stringify(createdIdData));

  const applicationIndex=applicationData.findIndex(row=>row[1]===studentNo);
  if(applicationIndex>=0)applicationData.splice(applicationIndex,1);
  localStorage.setItem('nu-smart-id-applications',JSON.stringify(applicationData));
  localStorage.setItem(trackerStorageKey(studentNo),JSON.stringify({status:record.status,updatedAt}));
  if(studentNo===studentProfile.studentNo){
    s.status=record.status;
    localStorage.setItem(trackerKey,JSON.stringify({status:record.status,updatedAt}));
  }

  const notificationPrefix=`id-created-${studentNo}-`;
  const notifications=studentNotifications(studentNo).filter(notification=>!String(notification.id).startsWith(notificationPrefix));
  notifications.unshift({
    id:`id-created-${studentNo}-${Date.now()}`,
    type:'ready',
    title:'Your ID is ready to claim',
    message:'Your new student ID is ready for pickup. View its details in My ID in the Student Portal.',
    createdAt:updatedAt,
    read:false
  });
  localStorage.setItem(studentNotificationKey(studentNo),JSON.stringify(notifications));
  if(studentNo===studentProfile.studentNo)refreshStudentAlertCount();
  localStorage.removeItem(createIdDraftKey);
  s.idSentNotice={name,studentNo};
  s.reviewingApplication=null;
};
const saveIdCreationDraft=()=>{
  const form=document.querySelector('.create-id-form');
  if(!form||s.view!=='admin'||s.admin!=='create'||s.reviewingApplication)return;
  const cardPhoto=form.querySelector('.id-card-portrait img');
  const photoSource=window.photoCropSource||(cardPhoto?.classList.contains('visible')?cardPhoto.src:'');
  const draft={
    name:form.elements.namedItem('name')?.value||'',
    studentNo:form.elements.namedItem('studentNo')?.value||'',
    program:form.elements.namedItem('course')?.value||'',
    photoSource,
    photoOffsetX:Number(window.photoOffsetX||0),
    photoOffsetY:Number(window.photoOffsetY||0),
    photoZoom:Number(window.photoZoom||1)
  };
  localStorage.setItem(createIdDraftKey,JSON.stringify(draft));
};
const restoreIdCreationDraft=()=>{
  const form=document.querySelector('.create-id-form');
  if(!form||s.reviewingApplication)return;
  let draft;
  try{draft=JSON.parse(localStorage.getItem(createIdDraftKey)||'null')}catch{return}
  if(!draft)return;

  form.elements.namedItem('name').value=draft.name||'';
  form.elements.namedItem('studentNo').value=draft.studentNo||'';
  form.elements.namedItem('course').value=draft.program||'';
  updateIdCardPreview({currentTarget:form});
  if(!draft.photoSource)return;

  window.photoCropSource=draft.photoSource;
  window.photoOffsetX=Number(draft.photoOffsetX||0);
  window.photoOffsetY=Number(draft.photoOffsetY||0);
  window.photoZoom=Math.max(1,Number(draft.photoZoom||1));
  const preview=form.querySelector('.photo-preview');
  const cardPhoto=form.querySelector('.id-card-portrait img');
  preview.src=draft.photoSource;
  preview.classList.add('visible');
  cardPhoto.src=draft.photoSource;
  cardPhoto.classList.add('visible');
  form.querySelector('.photo-placeholder').classList.add('hidden');
  form.querySelector('.camera-placeholder').classList.add('hidden');
  form.querySelector('.camera-card-placeholder').classList.add('hidden');
  form.querySelector('.camera-start').hidden=true;
  form.querySelector('.camera-capture').disabled=true;
  form.querySelector('.camera-retake').hidden=false;
  form.querySelectorAll('.photo-crop-controls button,.photo-crop-controls input').forEach(control=>control.disabled=false);
  form.querySelector('.photo-zoom').value=String(window.photoZoom);
  setCameraStatus('Restored your captured photo. Adjust it or retake it before creating the ID.');
  if(window.photoZoom!==1||window.photoOffsetX!==0||window.photoOffsetY!==0){
    autoPlacePhoto(window.photoCropSource,window.photoOffsetX,window.photoOffsetY);
  }
};
const studentMyId=()=>{
  const application=studentIdApplication();
  if(!application||!application[5])return `<div class="student-id-page"><header class="student-id-heading"><h1>My ID</h1><p>View your ID details and status.</p></header><section class="student-id-empty"><b>Your ID card will appear here once the ID Office creates it.</b></section></div>`;

  const currentStatus=trackerState(studentProfile.studentNo).status||application[4];
  const statusCopy={
    Submitted:['Application Submitted','The ID Office has received your application.'],
    Processing:['ID In Production','Your student ID is being prepared.'],
    'Ready for Claim':['ID Ready for Pickup','Your student ID is now ready. Please proceed to the ID claiming area.'],
    Claimed:['ID Claimed','Your student ID has been claimed.'],
    Rejected:['Application Needs Attention','Please contact the ID Office for assistance.']
  };
  const [statusLabel,statusMessage]=statusCopy[currentStatus]||['ID Created','Your student ID details are available below.'];
  const studentName=studentIdSafe(studentProfile.name);
  const studentNo=studentIdSafe(application[1]);
  const course=studentIdSafe(application[5]||studentProfile.program);
  const cardCourse=course.replace(/^Bachelor of Science in\s+/i,'');
  const nameParts=studentProfile.name.trim().split(/\s+/).filter(Boolean);
  const surname=studentIdSafe(nameParts.pop()||studentProfile.name);
  const givenName=studentIdSafe(nameParts.join(' ')||'Given Name');
  const initials=studentProfile.name.split(/\s+/).filter(Boolean).map(part=>part[0]).join('').slice(0,2).toUpperCase();
  const image=typeof application[6]==='string'&&application[6].startsWith('data:image/')?application[6]:'';
  const updatedAt=trackerState(studentProfile.studentNo).updatedAt;
  const updatedDate=updatedAt?new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(updatedAt)):'Not available';
  const pickupInstructions=currentStatus==='Ready for Claim'
    ?'Bring your confirmation slip and a valid ID when claiming your student ID.'
    :currentStatus==='Claimed'
      ?'Your student ID has been marked as claimed.'
    :'Your ID status will update here as the ID Office processes your application.';

  return `<div class="student-id-page"><header class="student-id-heading"><h1>My ID</h1><p>View your ID details and status.</p></header><section class="student-id-status ${currentStatus==='Ready for Claim'?'is-ready':''}"><span class="student-id-status-icon">${currentStatus==='Ready for Claim'?'✓':'i'}</span><div><b>${statusLabel}</b><p>${statusMessage}</p></div><div class="student-id-updated"><small>Date Updated</small><b>${studentIdSafe(updatedDate)}</b></div></section><div class="student-id-grid"><article class="id-card-preview student-id-card"><header><span class="id-card-mark">NU</span><b>NU BALIWAG</b></header><div class="id-card-yellow"></div><div class="id-card-portrait">${image?`<img class="visible" src="${studentIdSafe(image)}" alt="${studentName}">`:`<span>${studentIdSafe(initials)}</span>`}</div><div class="id-card-yellow thin"></div><div class="id-card-details"><b class="id-card-course">${cardCourse.toUpperCase()} | ${studentNo}</b><strong class="id-card-surname">${surname.toUpperCase()}</strong><span class="id-card-given">${givenName}</span></div><footer>Education that works.<sup>®</sup></footer></article><section class="student-id-details"><h2>ID Information</h2><dl><div><dt>Full Name</dt><dd>${studentName}</dd></div><div><dt>Course</dt><dd>${course}</dd></div><div><dt>ID Number</dt><dd>${studentNo}</dd></div><div><dt>Status</dt><dd><span class="student-id-pill ${currentStatus==='Ready for Claim'?'is-ready':''}">${statusLabel}</span></dd></div><div><dt>Date Applied</dt><dd>${studentIdSafe(application[3]||'Not available')}</dd></div><div><dt>Last Updated</dt><dd>${studentIdSafe(updatedDate)}</dd></div></dl><aside class="student-id-instructions"><b>Pickup Instructions</b><p>${pickupInstructions}</p></aside><button class="student-id-download" onclick="downloadStudentId()"><span aria-hidden="true">↓</span> Download ID</button></section></div></div>`;
};
const downloadStudentId=()=>{
  const application=studentIdApplication();
  if(!application||!application[5])return;
  const escapeXml=value=>studentIdSafe(value);
  const name=escapeXml(studentProfile.name);
  const studentNo=escapeXml(application[1]);
  const course=escapeXml(application[5]||studentProfile.program);
  const image=typeof application[6]==='string'&&application[6].startsWith('data:image/')?`<image href="${escapeXml(application[6])}" x="70" y="112" width="180" height="180" preserveAspectRatio="xMidYMid slice"/>`:'';
  const initials=escapeXml(studentProfile.name.split(/\s+/).filter(Boolean).map(part=>part[0]).join('').slice(0,2).toUpperCase());
  const portrait=image||`<rect x="70" y="112" width="180" height="180" rx="12" fill="#e6edf5"/><text x="160" y="222" text-anchor="middle" font-family="Arial,sans-serif" font-size="54" font-weight="700" fill="#51708f">${initials}</text>`;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400"><rect width="640" height="400" rx="22" fill="#f7faff"/><path d="M0 22Q0 0 22 0H618Q640 0 640 22V86H0Z" fill="#123d78"/><circle cx="52" cy="43" r="24" fill="#fff"/><text x="52" y="49" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" font-weight="700" fill="#123d78">NU</text><text x="92" y="38" font-family="Arial,sans-serif" font-size="20" font-weight="700" fill="#fff">NATIONAL UNIVERSITY</text><text x="92" y="62" font-family="Arial,sans-serif" font-size="13" letter-spacing="1" fill="#dceaff">STUDENT ID</text><rect y="86" width="640" height="8" fill="#f4cf35"/>${portrait}<text x="292" y="150" font-family="Arial,sans-serif" font-size="13" fill="#5d728c">FULL NAME</text><text x="292" y="180" font-family="Arial,sans-serif" font-size="23" font-weight="700" fill="#123d78">${name}</text><text x="292" y="228" font-family="Arial,sans-serif" font-size="13" fill="#5d728c">COURSE</text><text x="292" y="250" font-family="Arial,sans-serif" font-size="17" fill="#123d78">${course}</text><text x="292" y="290" font-family="Arial,sans-serif" font-size="13" fill="#5d728c">ID NUMBER</text><text x="292" y="315" font-family="Arial,sans-serif" font-size="19" font-weight="700" fill="#123d78">${studentNo}</text><rect y="364" width="640" height="36" rx="0" fill="#123d78"/><text x="320" y="388" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" font-style="italic" fill="#fff">Education that works.</text></svg>`;
  const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
  const link=document.createElement('a');
  link.href=url;
  link.download=`NU-Student-ID-${String(application[1]).replace(/[^a-zA-Z0-9_-]/g,'_')}.svg`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
};

student=()=>{
  const navigation=[['home','Home','⌂'],['id','My ID','▣'],['queue','My Queue','☷'],['profile','Profile','●'],['settings','Settings','⚙']];
  const initials=(studentProfile.name||'Student').split(' ').map(part=>part[0]).join('').slice(0,2).toUpperCase();
  return `<div class="student-shell"><header class="portal-topbar"><div class="portal-brand"><span>⚙</span><b>Service Management</b></div><div class="portal-tools"><button class="portal-bell" onclick="goStudent('alerts')" aria-label="Notifications">♧<em>${s.alerts}</em></button><button class="portal-avatar" onclick="goStudent('profile')" aria-label="Open profile">${initials}</button><button class="portal-logout" onclick="logout()" aria-label="Log out">⌄</button></div></header><aside class="portal-sidebar"><nav>${navigation.map(([key,label,icon])=>`<button class="${s.student===key?'active':''}" onclick="goStudent('${key}')"><span>${icon}</span><b>${label}</b></button>`).join('')}</nav><button class="portal-help" onclick="goStudent('alerts')"><b>ⓘ &nbsp; Need Help?</b><small>Contact the office for support</small></button></aside><main class="student-content">${s.student==='home'?home():s.student==='id'?studentMyId():s.student==='queue'?queue():s.student==='status'?status():s.student==='profile'?profile():s.student==='settings'?studentSettings():alerts()}</main>${modal()}</div>`;
};

home=()=>{
  const current=trackerState().status;
  const ready=['Ready for Claim','Claimed'].includes(current);
  const active=activeServing();
  const row=queueEntryForStudent();
  const greeting=new Date().getHours()<12?'Good morning,':new Date().getHours()<18?'Good afternoon,':'Good evening,';
  const today=new Intl.DateTimeFormat(undefined,{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date());
  const wait=row?`${row.waitMinutes??defaultWaitMinutes} min`:averageWait();
  return `<section class="portal-greeting"><div class="portal-greeting-copy"><span class="portal-sun" aria-hidden="true">☀</span><div><small>${greeting}</small><h1>${studentProfile.name}!</h1><p>${studentProfile.studentNo} · ${studentProfile.program}</p></div></div><time><span aria-hidden="true">▦</span>${today}</time></section><section class="portal-status"><div class="portal-status-heading"><div><small>ID APPLICATION STATUS</small><small class="portal-student-number">Student ID: ${studentProfile.studentNo}</small></div><span class="status-badge ${ready?'ready-badge':''}">✓ &nbsp;${current.toUpperCase()}</span></div>${trackerMarkup()}</section><button class="portal-join" onclick="openJoin()"><span aria-hidden="true">♟</span><b>JOIN QUEUE</b><span aria-hidden="true">→</span></button><section class="portal-metrics metrics"><div><span class="metric-symbol serving-symbol" aria-hidden="true">◷</span><span><small>Now Serving</small><b>${active?`A-${pad(active.number)}`:'--'}</b></span></div><div><span class="metric-symbol wait-symbol" aria-hidden="true">⌛</span><span><small>Avg. Wait Time</small><b>~${wait}</b></span></div></section><div class="portal-office-note"><span aria-hidden="true">i</span><p><b>ID Office hours:</b> Monday–Friday, 8:00 AM – 5:00 PM. Please bring your OR/receipt when claiming your ID.</p></div>`;
};

studentSettings=()=>`<div class="portal-subpage"><h1>Settings</h1><section class="portal-settings-panel"><div><b>Queue and ID updates</b><small>Manage notifications for your student account.</small></div><label><input type="checkbox" ${localStorage.getItem('nu-smart-id-notifications')!=='false'?'checked':''} onchange="setStudentNotifications(this.checked)"> Notifications</label></section></div>`;
setStudentNotifications=enabled=>{localStorage.setItem('nu-smart-id-notifications',String(enabled));toast(enabled?'Notifications enabled':'Notifications disabled')};
alerts=()=>{const notifications=studentNotifications(studentProfile.studentNo);return `<div class="heading"><h1>Notifications</h1><p>Stay updated about your ID application and queue.</p></div><section class="alerts">${notifications.length?notifications.map(notification=>`<article class="student-notification ${notification.read?'read':'unread'}"><span class="student-notification-icon" aria-hidden="true">✓</span><div><b>${notification.title}</b><p>${notification.message}</p><small>${new Date(notification.createdAt).toLocaleString()}</small></div>${notification.type==='ready'&&trackerState().status==='Ready for Claim'?'<button onclick="openJoin()">JOIN QUEUE</button>':''}</article>`).join(''):'<p class="student-notifications-empty">No notifications yet.</p>'}</section>`};
window.addEventListener('storage',event=>{if(event.key!==studentNotificationKey(studentProfile.studentNo))return;refreshStudentAlertCount();const latest=JSON.parse(event.newValue||'[]');const previous=JSON.parse(event.oldValue||'[]');const freshReady=latest.find(notification=>notification.type==='ready'&&!notification.read&&!previous.some(item=>item.id===notification.id));if(freshReady&&s.view==='student')toast(freshReady.title);if(s.view==='student')render()});
window.addEventListener('storage',event=>{if(event.key!==createdIdStorageKey)return;createdIdData.splice(0,createdIdData.length,...JSON.parse(event.newValue||'[]'));if(s.view==='student')render()});

const createId=()=>`<div class="create-id-page"><div class="create-id-heading"><div><h1>Create New ID</h1><p>Fill in the required information to process the ID application.</p></div><button class="back-to-applications" onclick="goAdmin('applications')">← ID Applications</button></div><section class="create-id-card"><div class="create-id-steps"><div class="active"><i>1</i><b>Personal Information</b></div><div><i>2</i><b>Upload Documents</b></div><div><i>3</i><b>Review &amp; Submit</b></div></div><form class="create-id-form" oninput="updateIdCardPreview(event)" onchange="updateIdCardPreview(event)" onsubmit="createIdApplication(event)"><section class="personal-panel"><h2>♟ &nbsp; Personal Information</h2><p>Please provide the applicant's basic information.</p><label>Full Name <em>*</em><input name="name" required placeholder="Enter full name"></label><label>Course <em>*</em><select name="course" required><option value="">Select course</option>${courseOptions.map(([label,value])=>`<option value="${value}">${label}</option>`).join('')}</select></label><label>ID Number <em>*</em><input name="studentNo" required placeholder="Enter student ID number"></label></section><section class="photo-panel"><h2>▣ &nbsp; ID Card Preview</h2><p>Upload a clear photo to place it on the NU Baliwag ID.</p><label class="photo-drop"><input type="file" name="photo" accept="image/jpeg,image/png" onchange="previewIdPhoto(event)"><span class="photo-placeholder">♟<b>Choose Photo</b><small>JPG, PNG (Max 2MB)</small></span><img class="photo-preview" alt="Selected ID photo"></label><div class="id-card-preview"><header><span class="id-card-mark">NU</span><b>NU BALIWAG</b></header><div class="id-card-yellow"></div><div class="id-card-portrait"><img alt="ID card portrait"></div><div class="id-card-yellow thin"></div><div class="id-card-details"><b class="id-card-course">COURSE | ID NUMBER</b><strong class="id-card-surname">SURNAME</strong><span class="id-card-given">Given Name</span></div><footer>Education that works.<sup>®</sup></footer></div></section><div class="create-id-actions"><button type="button" class="cancel" onclick="goAdmin('dashboard')">Cancel</button><button type="submit" class="primary">Create ID &nbsp;→</button></div></form></section></div>`;
const updateIdCardPreview=event=>{const form=event.currentTarget;const name=String(form.name?.value||'').trim();const parts=name.split(/\s+/).filter(Boolean);const surname=parts.pop()||'SURNAME';const given=parts.join(' ')||'Given Name';const course=form.course?.selectedOptions[0]?.textContent||'COURSE';const card=form.querySelector('.id-card-preview');if(!card)return;card.querySelector('.id-card-course').textContent=`${course.toUpperCase()} | ${form.studentNo?.value.trim()||'ID NUMBER'}`;card.querySelector('.id-card-surname').textContent=surname.toUpperCase();card.querySelector('.id-card-given').textContent=given};
const previewIdPhoto=event=>{const file=event.target.files?.[0];if(!file)return;if(file.size>2*1024*1024){event.target.value='';toast('Photo must be 2MB or smaller');return}const reader=new FileReader();reader.onload=()=>{const drop=event.target.closest('.photo-drop');drop.querySelector('.photo-preview').src=reader.result;drop.querySelector('.photo-preview').classList.add('visible');drop.querySelector('.photo-placeholder').classList.add('hidden');const card=event.target.closest('.photo-panel').querySelector('.id-card-portrait img');card.src=reader.result;card.classList.add('visible')};reader.readAsDataURL(file)};
const createIdApplication=async event=>{event.preventDefault();const form=event.currentTarget;const name=String(form.elements.namedItem('name').value).trim();const studentNo=String(form.elements.namedItem('studentNo').value).trim();const application=applicationData.find(row=>row[1]===studentNo);const photo=form.querySelector('.id-card-portrait img')?.classList.contains('visible')?form.querySelector('.id-card-portrait img').src:'';saveCreatedIdForStudent(name,studentNo,String(form.elements.namedItem('course').value).trim(),photo,application);await pushRealtimeAction('application.update',{studentNo,status:'Ready for Claim'});s.admin='create';s.reviewingApplication=null;render();toast(`ID sent to ${name} in the Student Portal`)};
side=()=>{const nav=[['dashboard','grid','Dashboard'],['queue','queue','Queue Management'],['create','apps','ID Creation'],['reports','reports','Reports']];return `<aside class="side">${brand(true)}${nav.map(x=>`<button class="${s.admin===x[0]?'on':''}" onclick="goAdmin('${x[0]}')">${I[x[1]]} ${x[2]}</button>`).join('')}<span></span><button class="home-nav" onclick="go('landing')" title="Back to Home">← Back to Home</button><button onclick="goAdmin('settings')">${I.settings} Settings</button><button onclick="logout()">${I.logout} Logout</button></aside>`};
atop=()=>{const titles={dashboard:'Dashboard',queue:'Queue Management',create:'ID Creation',applications:'ID Applications',settings:'Settings',reports:'Reports'};return `<header class="atop"><b>${titles[s.admin]||'Dashboard'}</b><div><button onclick="openTv(s.admin)">▣ TV Display</button><i>SA</i><b>Staff Admin<small>ID Office</small></b></div></header>`};
admin=()=>`${side()}<main class="admin">${atop()}${s.admin==='dashboard'?dash():s.admin==='queue'?manage():s.admin==='create'?createId():s.admin==='applications'?applications():s.admin==='settings'?settings():reports()}</main>`;
const savedIdCard=row=>{if(!row)return '';const name=String(row[0]||'').trim();const parts=name.split(/\s+/).filter(Boolean);const surname=parts.pop()||'SURNAME';const given=parts.join(' ')||'Given Name';return `<section class="saved-id-card"><div class="saved-id-card-heading"><h2>Created ID Preview</h2><span>Saved application</span></div><div class="id-card-preview"><header><span class="id-card-mark">NU</span><b>NU BALIWAG</b></header><div class="id-card-yellow"></div><div class="id-card-portrait">${row[6]?`<img class="visible" src="${row[6]}" alt="${name} ID photo">`:'<img alt="ID card portrait">'}</div><div class="id-card-yellow thin"></div><div class="id-card-details"><b class="id-card-course">${String(row[5]||'COURSE').toUpperCase()} | ${row[1]||'ID NUMBER'}</b><strong class="id-card-surname">${surname.toUpperCase()}</strong><span class="id-card-given">${given}</span></div><footer>Education that works.<sup>®</sup></footer></div></section>`};
const autoPlacePhoto=(source,offsetX=window.photoOffsetX||0,offsetY=window.photoOffsetY||0)=>{
  const form=document.querySelector('.create-id-form');
  if(!form||!source)return;
  const image=new Image();
  image.onload=()=>{
    const canvas=document.createElement('canvas');
    canvas.width=600;
    canvas.height=460;
    const zoom=Number(window.photoZoom||1);
    const scale=Math.max(canvas.width/image.width,canvas.height/image.height)*zoom;
    const width=image.width*scale;
    const height=image.height*scale;
    const context=canvas.getContext('2d');
    context.fillStyle='#fff';
    context.fillRect(0,0,canvas.width,canvas.height);
    context.drawImage(image,(canvas.width-width)/2+offsetX,(canvas.height-height)/2+offsetY,width,height);
    const cropped=canvas.toDataURL('image/jpeg',.92);
    form.querySelector('.id-card-portrait img').src=cropped;
    form.querySelector('.photo-preview').src=cropped;
    saveIdCreationDraft();
  };
  image.src=source;
};
const setupPhotoPlacement=()=>{const form=document.querySelector('.create-id-form');const frame=form?.querySelector('.id-card-portrait');if(!frame||frame.dataset.placementReady)return;frame.dataset.placementReady='true';frame.addEventListener('pointerdown',event=>{if(!window.photoCropSource)return;frame.setPointerCapture(event.pointerId);frame.dataset.dragX=String(event.clientX);frame.dataset.dragY=String(event.clientY);frame.classList.add('dragging')});frame.addEventListener('pointermove',event=>{if(!frame.hasPointerCapture(event.pointerId))return;const scale=600/frame.getBoundingClientRect().width;window.photoOffsetX=(window.photoOffsetX||0)+(event.clientX-Number(frame.dataset.dragX))*scale;window.photoOffsetY=(window.photoOffsetY||0)+(event.clientY-Number(frame.dataset.dragY))*scale;frame.dataset.dragX=String(event.clientX);frame.dataset.dragY=String(event.clientY);autoPlacePhoto(window.photoCropSource)});frame.addEventListener('pointerup',event=>{frame.releasePointerCapture(event.pointerId);frame.classList.remove('dragging')})};
applications=()=>{const latest=applicationData[applicationData.length-1];return `<div class="tabs"><button class="active">All (${applicationData.length})</button></div>${savedIdCard(latest)}<section class="table"><h2>ID Application Records</h2><table><thead><tr><th>STUDENT NAME</th><th>STUDENT NO.</th><th>APPLICATION TYPE</th><th>DATE APPLIED</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>${applicationData.map((row,index)=>`<tr><td>${row[0]}</td><td>${row[1]}</td><td>${row[2]}</td><td>${row[3]}</td><td><em class="${row[4]==='Claimed'?'purple':row[4]==='Rejected'?'red':row[4]==='Processing'?'gold':'green'}">${row[4]}</em></td><td><button onclick="advanceApplication(${index})">${row[4]==='Submitted'?'START REVIEW':row[4]==='Processing'?'APPROVE':row[4]==='Ready for Claim'?'MARK CLAIMED':row[4]==='Rejected'?'REJECTED':'COMPLETED'}</button></td></tr>`).join('')}</tbody></table></section>`};
render();
const renderWithImageUpload=render;
render=()=>{renderWithImageUpload();const input=document.querySelector('.create-id-form input[type="file"]');if(input){input.accept='image/*';const hint=input.closest('.photo-drop')?.querySelector('small');if(hint)hint.textContent='Any image (Max 2MB)';input.addEventListener('change',()=>setTimeout(()=>{window.photoCropSource=document.querySelector('.id-card-portrait img')?.src;window.photoOffsetX=0;window.photoOffsetY=0;autoPlacePhoto(window.photoCropSource)},0));setupPhotoPlacement()}};
render();

const advanceApplicationWithReview=advanceApplication;
advanceApplication=index=>{
  const application=applicationData[index];
  const startingReview=application?.[4]==='Submitted';
  advanceApplicationWithReview(index);
  if(!startingReview)return;
  s.reviewingApplication=application[1];
  s.admin='create';
  render();
};

const hydrateReviewIdForm=()=>{
  if(s.view!=='admin'||s.admin!=='create'||!s.reviewingApplication)return;
  const application=applicationData.find(row=>row[1]===s.reviewingApplication);
  const student=adminStudentData.find(row=>row.studentNo===s.reviewingApplication);
  const form=document.querySelector('.create-id-form');
  if(!application||!form)return;
  form.onsubmit=saveReviewedIdApplication;

  form.elements.namedItem('name').value=application[0];
  form.elements.namedItem('name').readOnly=true;
  form.elements.namedItem('studentNo').value=application[1];
  form.elements.namedItem('studentNo').readOnly=true;

  const program=student?.program||courseOptions.find(([label,value])=>label===application[5]||value===application[5])?.[1]||application[5]||'';
  if(program)form.elements.namedItem('course').value=program;
  updateIdCardPreview({currentTarget:form});

  const title=document.querySelector('.create-id-heading h1');
  const description=document.querySelector('.create-id-heading p');
  const saveButton=form.querySelector('button[type="submit"]');
  if(title)title.textContent='Review Student ID';
  if(description)description.textContent='Verify the student information and prepare the ID card.';
  if(saveButton)saveButton.textContent='SAVE ID DETAILS';

  const photo=application[6];
  if(photo){
    const preview=form.querySelector('.photo-preview');
    const cardPhoto=form.querySelector('.id-card-portrait img');
    const placeholder=form.querySelector('.photo-placeholder');
    const cardPlaceholder=form.querySelector('.camera-card-placeholder');
    preview.src=photo;
    preview.classList.add('visible');
    cardPhoto.src=photo;
    cardPhoto.classList.add('visible');
    placeholder.classList.add('hidden');
    cardPlaceholder?.classList.add('hidden');
  }
};

const renderWithReviewForm=render;
const showApplicationActions=()=>{
  if(s.view!=='admin'||s.admin!=='applications')return;
  document.querySelectorAll('.admin .table table tbody tr').forEach(row=>{
    const action=row.cells[row.cells.length-1]?.querySelector('button');
    if(action)action.style.display='';
  });
};
render=()=>{
  renderWithReviewForm();
  hydrateReviewIdForm();
  showApplicationActions();
};

const saveReviewedIdApplication=event=>{
  event.preventDefault();
  const application=applicationData.find(row=>row[1]===s.reviewingApplication);
  if(!application){
    toast('The selected application could not be found.');
    return;
  }

  const form=event.currentTarget;
  const program=String(form.elements.namedItem('course').value||'').trim();
  const photo=form.querySelector('.id-card-portrait img');
  saveCreatedIdForStudent(application[0],application[1],program,photo.classList.contains('visible')?photo.src:'',application);
  s.admin='create';
  render();
  toast(`ID sent to ${application[0]} in the Student Portal`);
};

const idSentConfirmationMarkup=()=>s.idSentNotice?`<section class="id-sent-confirmation" role="status"><b>✓ ID sent to student</b><p>${studentIdSafe(s.idSentNotice.name)}'s ID is now available in the Student Portal under My ID. A notification has been sent to ${studentIdSafe(s.idSentNotice.studentNo)}.</p></section>`:'';
const applicationsWithLatestCard=applications;
applications=()=>{
  const html=applicationsWithLatestCard();
  const latest=applicationData[applicationData.length-1];
  if(s.idSentNotice)return html.replace(savedIdCard(latest),idSentConfirmationMarkup());
  const selected=applicationData.find(row=>row[1]===s.reviewingApplication);
  if(!selected)return html;
  return html.replace(savedIdCard(latest),savedIdCard(selected));
};

const sideWithReviewState=side;
side=()=>sideWithReviewState().replace(
  `onclick="goAdmin('create')"`,
  'onclick="openNewIdCreation()"'
);
const openNewIdCreation=()=>{
  s.reviewingApplication=null;
  s.idSentNotice=null;
  s.admin='create';
  render();
};

render();

let idCameraStream=null;
const stopIdCamera=()=>{
  idCameraStream?.getTracks().forEach(track=>track.stop());
  idCameraStream=null;
  const video=document.querySelector('.camera-feed');
  if(video){
    video.srcObject=null;
    video.hidden=true;
  }
};
const setCameraStatus=message=>{
  const status=document.querySelector('.camera-status');
  if(status)status.textContent=message;
};
const startIdCamera=async()=>{
  const form=document.querySelector('.create-id-form');
  const video=form?.querySelector('.camera-feed');
  if(!form||!video)return;
  if(!navigator.mediaDevices?.getUserMedia){
    setCameraStatus('Camera access is unavailable in this browser or connection. Open this app on localhost or HTTPS and allow camera access.');
    return;
  }

  stopIdCamera();
  setCameraStatus('Waiting for camera permission...');
  try{
    idCameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
    video.srcObject=idCameraStream;
    await video.play();
    video.hidden=false;
    form.querySelector('.photo-placeholder').classList.add('hidden');
    form.querySelector('.photo-preview').classList.remove('visible');
    form.querySelector('.camera-start').hidden=true;
    form.querySelector('.camera-retake').hidden=true;
    form.querySelector('.camera-capture').disabled=false;
    setCameraStatus('Position the student in the frame, then capture the photo.');
  }catch(error){
    stopIdCamera();
    setCameraStatus(error.name==='NotAllowedError'?'Camera access was denied. Allow camera access in your browser settings and try again.':'Could not start the device camera. Check that a camera is connected and try again.');
  }
};
const captureIdPhoto=()=>{
  const form=document.querySelector('.create-id-form');
  const video=form?.querySelector('.camera-feed');
  if(!form||!video||!video.videoWidth){
    setCameraStatus('The camera is not ready yet.');
    return;
  }

  const canvas=document.createElement('canvas');
  canvas.width=video.videoWidth;
  canvas.height=video.videoHeight;
  canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
  const photo=canvas.toDataURL('image/jpeg',.92);
  stopIdCamera();

  const preview=form.querySelector('.photo-preview');
  const cardPhoto=form.querySelector('.id-card-portrait img');
  preview.src=photo;
  preview.classList.add('visible');
  cardPhoto.src=photo;
  cardPhoto.classList.add('visible');
  form.querySelector('.camera-card-placeholder').classList.add('hidden');
  form.querySelector('.camera-placeholder').classList.add('hidden');
  form.querySelector('.camera-capture').disabled=true;
  form.querySelector('.camera-retake').hidden=false;
  form.querySelectorAll('.photo-crop-controls button,.photo-crop-controls input').forEach(control=>control.disabled=false);
  form.querySelector('.photo-zoom').value='1';
  window.photoCropSource=photo;
  window.photoOffsetX=0;
  window.photoOffsetY=0;
  window.photoZoom=1;
  saveIdCreationDraft();
  setCameraStatus('Photo captured from the device camera.');
};
const adjustIdPhotoZoom=value=>{
  window.photoZoom=Math.min(2.5,Math.max(1,Number(value)||1));
  const slider=document.querySelector('.photo-zoom');
  if(slider)slider.value=String(window.photoZoom);
  if(window.photoCropSource)autoPlacePhoto(window.photoCropSource);
};
const resetIdPhotoCrop=()=>{
  window.photoOffsetX=0;
  window.photoOffsetY=0;
  adjustIdPhotoZoom(1);
};
const cameraCreateId=()=>`<div class="create-id-page"><div class="create-id-heading"><div><h1>Create New ID</h1><p>Fill in the required information to process the ID application.</p></div><button class="back-to-applications" onclick="goAdmin('applications')">← ID Applications</button></div><section class="create-id-card"><div class="create-id-steps"><div class="active"><i>1</i><b>Personal Information</b></div><div><i>2</i><b>Capture Photo</b></div><div><i>3</i><b>Review &amp; Submit</b></div></div><form class="create-id-form" oninput="updateIdCardPreview(event)" onchange="updateIdCardPreview(event)" onsubmit="createIdApplication(event)"><section class="personal-panel"><h2>♟ &nbsp; Personal Information</h2><p>Please provide the applicant's basic information.</p><label>Full Name <em>*</em><input name="name" required placeholder="Enter full name"></label><label>Course <em>*</em><select name="course" required><option value="">Select course</option>${courseOptions.map(([label,value])=>`<option value="${value}">${label}</option>`).join('')}</select></label><label>ID Number <em>*</em><input name="studentNo" required placeholder="Enter student ID number"></label></section><section class="photo-panel"><h2>▣ &nbsp; ID Card Preview</h2><p>Capture a photo with the device camera for the student ID.</p><div class="photo-drop camera-preview"><video class="camera-feed" autoplay playsinline muted hidden></video><span class="photo-placeholder camera-placeholder">▣<b>Camera photo</b><small>Use the device camera</small></span><img class="photo-preview" alt="Captured student photo"></div><div class="camera-actions"><button type="button" class="camera-start" onclick="startIdCamera()">OPEN CAMERA</button><button type="button" class="camera-capture" onclick="captureIdPhoto()" disabled>CAPTURE PHOTO</button><button type="button" class="camera-retake" onclick="startIdCamera()" hidden>RETAKE PHOTO</button></div><small class="camera-status" role="status">Camera access is requested only when Open Camera is pressed.</small><div class="id-card-preview"><header><span class="id-card-mark">NU</span><b>NU BALIWAG</b></header><div class="id-card-yellow"></div><div class="id-card-portrait"><span class="camera-card-placeholder">Photo will appear here</span><img alt="ID card portrait"></div><div class="id-card-yellow thin"></div><div class="id-card-details"><b class="id-card-course">COURSE | ID NUMBER</b><strong class="id-card-surname">SURNAME</strong><span class="id-card-given">Given Name</span></div><footer>Education that works.<sup>®</sup></footer></div></section><div class="create-id-actions"><button type="button" class="cancel" onclick="goAdmin('dashboard')">Cancel</button><button type="submit" class="primary">Create ID &nbsp;→</button></div></form></section></div>`;
const cameraCreateIdWithControls=()=>cameraCreateId()
  .replace('<section class="create-id-card">',`${idSentConfirmationMarkup()}<section class="create-id-card">`)
  .replace('<small class="camera-status" role="status">',`<div class="photo-crop-controls"><label>Zoom<input class="photo-zoom" type="range" min="1" max="2.5" step="0.05" value="1" aria-label="Zoom photo" oninput="adjustIdPhotoZoom(this.value)" disabled></label><div class="photo-crop-actions"><button type="button" onclick="adjustIdPhotoZoom(Number(document.querySelector('.photo-zoom').value)-0.1)" aria-label="Zoom out" title="Zoom out" disabled>−</button><button type="button" onclick="adjustIdPhotoZoom(Number(document.querySelector('.photo-zoom').value)+0.1)" aria-label="Zoom in" title="Zoom in" disabled>+</button><button type="button" onclick="resetIdPhotoCrop()" disabled>RESET POSITION</button></div><small>Drag the photo in the ID card preview to reposition it.</small></div><small class="camera-status" role="status">`);
const adminWithUploadedPhotoForm=admin;
admin=()=>s.admin==='create'?`${side()}<main class="admin">${atop()}${cameraCreateIdWithControls()}</main>`:adminWithUploadedPhotoForm();
const renderWithCameraControls=render;
render=()=>{
  if(s.view!=='admin'||s.admin!=='create')stopIdCamera();
  renderWithCameraControls();
  const form=document.querySelector('.create-id-form');
  if(form){
    form.addEventListener('input',saveIdCreationDraft);
    form.addEventListener('change',saveIdCreationDraft);
    if(!s.reviewingApplication)restoreIdCreationDraft();
  }
  setupPhotoPlacement();
};
render();

