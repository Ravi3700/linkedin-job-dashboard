/* ==========================================================================
   js/career.js — Career tab rendering/filtering logic (the "Career" view:
   target companies + job platforms). Separate from the Jobs dashboard
   logic in open-all.js/filters.js/tab-manager.js — the Career tab does not
   open/track/close dashboard search tabs, it just links out to company
   career pages and job boards.
   Depends on: data/career-data.js.
   Used by: index.html (showView('career') on the Career nav tab, which
   lazily calls initCareer() the first time it's opened).
   ========================================================================== */

let careerState = { query:"", category:"all", role:"all" };

function careerLinkedIn(name, role){
  const kw = encodeURIComponent(name.replace(/\s*\([^)]*\)/,'') + " " + role);
  return "https://www.linkedin.com/jobs/search/?keywords=" + kw + "&location=India";
}
function careerNaukri(name){
  const slug = name.replace(/\s*\([^)]*\)/,'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
  return "https://www.naukri.com/" + slug + "-jobs";
}
function careerIndeed(name, role){
  const q = encodeURIComponent(name.replace(/\s*\([^)]*\)/,'') + " " + role);
  return "https://in.indeed.com/jobs?q=" + q + "&l=India";
}
function careerGlassdoor(name){
  const q = encodeURIComponent(name.replace(/\s*\([^)]*\)/,''));
  return "https://www.glassdoor.co.in/Job/jobs.htm?sc.keyword=" + q;
}
const FRESHER_BADGE_CLASS = {High:"badge-fresher", Medium:"badge-loc", Growing:"badge-loc", Low:"badge-fresher-low"};
function escapeHtml(value){
  return String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
}
function safeExternalUrl(value){
  const url=String(value||'');
  return /^https:\/\//i.test(url) ? escapeHtml(url) : '#';
}
function fresherBadgeClass(level){ return FRESHER_BADGE_CLASS[level] || "badge-loc"; }
function priorityBadge(p){
  if(p==="high") return '<span class="badge badge-priority-high">⭐ High Priority</span>';
  if(p==="medium") return '<span class="badge badge-priority-medium">🔵 Medium Priority</span>';
  return '<span class="badge badge-priority-normal">⚪ Normal</span>';
}
function priorityIcon(p){ return p==='high' ? '⭐' : p==='medium' ? '🔵' : '⚪'; }

// Best-route hierarchy: 🥇 official/early-career page → 🥈 verified job-platform search → 🥉 backup platforms
function primaryRoute(c){
  if(c.entry) return {label:"🎓 EARLY CAREERS", url:c.entry};
  if(!c.noCareerPage && c.url) return {label:"🏢 OFFICIAL CAREERS", url:c.url};
  return {label:"🔎 LINKEDIN JOBS", url: careerLinkedIn(c.name, c.roles[0])};
}

function companyCard(c, isTop10){
  const roleForLink = c.roles[0];
  const primary = primaryRoute(c);
  const officialBtn = (!c.noCareerPage && c.url && primary.url !== c.url)
    ? `<a href="${safeExternalUrl(c.url)}" target="_blank" rel="noopener noreferrer" class="route-secondary">🏢 Company Careers</a>` : '';
  const noCareerNote = c.noCareerPage
    ? `<div class="nocareer-note">🔎 Official Career Page: <strong>Not clearly available</strong> — apply via the routes below instead.</div>` : '';
  const cardClass = "company-card" + (isTop10 ? " top10-card" : "") + (c.noCareerPage ? " nocareer-card" : "");
  return `
    <div class="${cardClass}">
      ${isTop10 ? '<div class="top10-ribbon">🏆 TOP 10</div>' : ''}
      <h3>${priorityIcon(c.pri)} ${escapeHtml(c.name)}</h3>
      <div class="company-tags">${CATEGORY_ICONS[c.cat]||''} ${escapeHtml(CATEGORY_LABELS[c.cat]||'Company')}</div>
      <div class="company-badges">
        <span class="badge ${fresherBadgeClass(c.fresher)}">🎓 Fresher-Friendly: ${escapeHtml(c.fresher)}</span>
        <span class="badge badge-loc">📍 ${escapeHtml(c.loc)}</span>
        ${priorityBadge(c.pri)}
        ${c.noCareerPage ? '<span class="badge badge-nocareer">🔎 No Simple Career Page</span>' : ''}
      </div>
      <div class="company-roles"><strong>Relevant roles:</strong> ${escapeHtml(c.roles.join(' • '))}<br><strong>Why target:</strong> ${escapeHtml(c.why)}</div>
      ${noCareerNote}
      <div class="company-links">
        <a href="${safeExternalUrl(primary.url)}" target="_blank" rel="noopener noreferrer" class="route-primary">🚀 Open Career Route</a>
        ${officialBtn}
      </div>
      <div class="company-links company-links-secondary">
        <a href="${safeExternalUrl(careerLinkedIn(c.name, roleForLink))}" target="_blank" rel="noopener noreferrer">🔗 LinkedIn</a>
        <a href="${safeExternalUrl(careerNaukri(c.name))}" target="_blank" rel="noopener noreferrer">🔎 Naukri</a>
        <a href="${safeExternalUrl(careerIndeed(c.name, roleForLink))}" target="_blank" rel="noopener noreferrer">🔎 Indeed</a>
        <a href="${safeExternalUrl(careerGlassdoor(c.name))}" target="_blank" rel="noopener noreferrer">🔎 Glassdoor</a>
      </div>
      <div class="company-verified">Career route last reviewed: ${escapeHtml(CAREER_LAST_REVIEWED)} · Always check the official page for today's actual openings. ⚠️ Never pay to apply.</div>
    </div>`;
}

function showView(view){
  const jobsView=document.getElementById('jobsView');
  const careerView=document.getElementById('careerView');
  jobsView.style.display = view==='jobs' ? '' : 'none';
  careerView.style.display = view==='career' ? '' : 'none';
  jobsView.hidden = view!=='jobs';
  careerView.hidden = view!=='career';
  document.getElementById('tabJobsBtn').classList.toggle('active', view==='jobs');
  document.getElementById('tabCareerBtn').classList.toggle('active', view==='career');
  document.getElementById('tabJobsBtn').setAttribute('aria-selected', view==='jobs');
  document.getElementById('tabCareerBtn').setAttribute('aria-selected', view==='career');
  document.getElementById('tabJobsBtn').tabIndex = view==='jobs' ? 0 : -1;
  document.getElementById('tabCareerBtn').tabIndex = view==='career' ? 0 : -1;
  if(view==='career' && !window.__careerInit){ initCareer(); window.__careerInit = true; }
  window.scrollTo({top:0, behavior:'smooth'});
}

document.addEventListener('keydown', function(event){
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
  const active=document.activeElement;
  if(!active || !active.matches('#tabJobsBtn, #tabCareerBtn')) return;
  event.preventDefault();
  const target=event.key==='Home' || event.key==='ArrowLeft' ? 'jobs' : 'career';
  showView(event.key==='End' ? 'career' : target);
  document.getElementById(target==='jobs' ? 'tabJobsBtn' : 'tabCareerBtn').focus();
});

function initCareer(){
  document.getElementById('careerLastReviewed').textContent = CAREER_LAST_REVIEWED;
  const topReviewEl = document.getElementById('careerLastReviewedTop');
  if(topReviewEl) topReviewEl.textContent = CAREER_LAST_REVIEWED;

  const quickNav = document.getElementById('careerQuickNav');
  if(quickNav){
    const navItems = [["top10","🏆 Top 10"],["analytics","📊 Analytics"],["it","💻 IT"],["bfsi","🏦 BFSI"],["corporate","🏢 Corporate"],["ecommerce","🛒 E-commerce"],["startup","🚀 Startups"],["platforms","🌐 Job Platforms"]];
    quickNav.innerHTML = navItems.map(([key,label]) =>
      `<button type="button" class="quick-nav-pill" onclick="jumpCareerSection('${key}')">${label}</button>`
    ).join('');
  }

  const catRow = document.getElementById('categoryFilters');
  const cats = [["all","All Companies"],["top10","🏆 Top 10"],["fresher","🎓 Fresher-Friendly"], ...Object.entries(CATEGORY_LABELS), ["nocareer","🔎 Career Page Not Listed"]];
  catRow.innerHTML = cats.map(([key,label]) =>
    `<button type="button" class="filter-chip${key==='all'?' active':''}" data-cat="${key}" onclick="setCareerFilter('category','${key}')">${label}</button>`
  ).join('');

  const roleRow = document.getElementById('roleFilters');
  roleRow.innerHTML = ['<button type="button" class="filter-chip active" data-role="all" onclick="setCareerFilter(\'role\',\'all\')">All Job Roles</button>']
    .concat(ROLE_FILTERS.map(r => `<button type="button" class="filter-chip" data-role="${r}" onclick="setCareerFilter('role','${r}')">${r}</button>`))
    .join('');

  const top10Host = document.getElementById('top10Cards');
  if(top10Host){
    const top10 = CAREER_COMPANIES.filter(c => c.top10);
    top10Host.innerHTML = top10.map(c => companyCard(c, true)).join('');
  }

  const platformHost = document.getElementById('platformCards');
  platformHost.innerHTML = CAREER_PLATFORMS.map(p => `
    <div class="platform-card">
      <h3><span><span class="platform-rank">${p.rank}</span> ${p.name}</span></h3>
      <p>${p.note}</p>
      <a href="${safeExternalUrl(p.url)}" target="_blank" rel="noopener noreferrer">🔎 Search Data and BI Jobs</a>
    </div>`).join('');

  renderCareer();
}

function jumpCareerSection(key){
  if(key === 'top10'){ setCareerFilter('category','top10'); document.getElementById('top10Section').scrollIntoView({behavior:'smooth'}); return; }
  if(key === 'platforms'){ document.getElementById('platformCards').scrollIntoView({behavior:'smooth'}); return; }
  setCareerFilter('category', key);
  document.getElementById('careerCards').scrollIntoView({behavior:'smooth'});
}

function focusCareerSearch(){
  const input=document.getElementById('careerSearch');
  if(input){ input.focus(); input.scrollIntoView({behavior:'smooth', block:'center'}); }
}

function clearCareerSearch(){
  const input=document.getElementById('careerSearch');
  if(input){ input.value=''; renderCareer(); input.focus(); }
}

function setCareerFilter(kind, value){
  careerState[kind] = value;
  document.querySelectorAll(`#${kind==='category'?'categoryFilters':'roleFilters'} .filter-chip`).forEach(btn=>{
    btn.classList.toggle('active', btn.dataset[kind]===value);
  });
  renderCareer();
}

const SPECIAL_CATEGORY_KEYS = ['fresher','top10','nocareer'];
function renderCareer(){
  careerState.query = document.getElementById('careerSearch').value.trim().toLowerCase();
  const host = document.getElementById('careerCards');
  const filtered = CAREER_COMPANIES.filter(c => {
    if(careerState.category==='fresher' && c.fresher!=='High') return false;
    if(careerState.category==='top10' && !c.top10) return false;
    if(careerState.category==='nocareer' && !c.noCareerPage) return false;
    if(careerState.category!=='all' && !SPECIAL_CATEGORY_KEYS.includes(careerState.category) && c.cat!==careerState.category) return false;
    if(careerState.role!=='all' && !c.roles.includes(careerState.role)) return false;
    if(careerState.query){
      const tags = (c.top10?' top 10 best target ':'') + (c.noCareerPage?' no career page linkedin only ':'');
      const hay = (c.name+' '+CATEGORY_LABELS[c.cat]+' '+c.roles.join(' ')+' '+c.skills+' '+c.loc+' '+c.fresher+' '+c.why+tags).toLowerCase();
      if(!hay.includes(careerState.query)) return false;
    }
    return true;
  }).sort((a,b)=>{
    if(a.top10!==b.top10) return a.top10 ? -1 : 1;
    const pr = {high:0,medium:1,normal:2};
    if(pr[a.pri]!==pr[b.pri]) return pr[a.pri]-pr[b.pri];
    return (a.fresher==='High'?0:1) - (b.fresher==='High'?0:1);
  });

  document.getElementById('careerCount').textContent = `(${filtered.length} of ${CAREER_COMPANIES.length} companies)`;

  if(!filtered.length){
    host.innerHTML = '<div class="no-results">No matching companies found. Try another keyword or clear the filters.</div>';
    return;
  }

  host.innerHTML = filtered.map(c => companyCard(c, false)).join('');
}
