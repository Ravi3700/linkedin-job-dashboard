/* ==========================================================================
   js/filters.js — State filter engine.
   currentState        the globally selected state ("ALL" by default)
   getEntryState(item)  resolve a job title / [title,city] pair / URL to a
                        state, using data/locations.js (returns null for
                        generic/India-wide searches, which stay visible and
                        openable under every filter)
   tagAnchors()         runs once on load; tags every rendered search link
                        with its resolved state for fast show/hide
   applyStateFilter()   shows/hides links (and whole sections when none of
                        their links match) for the selected state, and
                        updates the "Showing X of Y searches" counter
   setStateFilter(state) called by the header <select>'s onchange
   Depends on: data/locations.js (CITY_STATE).
   Used by: index.html (setStateFilter), js/open-all.js (currentState,
   getEntryState — so OPEN ALL only opens what's currently visible).
   ========================================================================== */

let currentState="ALL";
let searchQuery="";
function matchesSearchText(text){
  return !searchQuery.trim() || String(text).toLowerCase().includes(searchQuery.trim().toLowerCase());
}
function isVisibleSearchAnchor(anchor){
  return !!anchor && anchor.style.display !== 'none';
}
// Determine which state (if any) a search belongs to. Accepts a plain job
// title, a [title,city] pair, or a full search URL. Returns null for
// generic/India-wide searches with no specific city (these stay visible/
// openable under every state, since they aren't tied to one location).
function getEntryState(item){
  if(Array.isArray(item)) return CITY_STATE[item[1]]||null;
  if(/^https?:\/\//.test(item)){
    try{
      const u=new URL(item);
      const loc=u.searchParams.get('location');
      if(loc){ const d=decodeURIComponent(loc.replace(/\+/g,' ')); if(CITY_STATE[d]) return CITY_STATE[d]; for(const c in CITY_STATE){ if(d.includes(c)) return CITY_STATE[c]; } }
      const kw=decodeURIComponent((u.searchParams.get('keywords')||'').replace(/\+/g,' '));
      for(const c in CITY_STATE){ if(kw.includes(c)) return CITY_STATE[c]; }
    }catch(e){}
    return null;
  }
  for(const c in CITY_STATE){ if(item.includes(c)) return CITY_STATE[c]; }
  return null;
}
// Tag every rendered search link with its detected state (once, on load) so
// the visual filter can show/hide instantly without re-parsing every click.
function tagAnchors(){
  document.querySelectorAll('.grid a[href], .links a[href]').forEach(a=>{
    const st=getEntryState(a.getAttribute('href'));
    if(st) a.dataset.state=st;
  });
}
// Show/hide individual search links (and whole sections when none of their
// links match) for the selected state. "All States" restores everything.
function applyStateFilter(){
  let visible=0, total=0;
  const query=searchQuery.trim().toLowerCase();
  document.querySelectorAll('#jobsView section').forEach(sec=>{
    const anchors=sec.querySelectorAll('.grid a[href], .links a[href]');
    if(!anchors.length) return;
    let anyVisible=false;
    anchors.forEach(a=>{
      total++;
      const st=a.dataset.state;
      const matchesState=currentState==='ALL' || !st || st===currentState;
      const matchesSearch=matchesSearchText(a.textContent);
      const show=matchesState && matchesSearch;
      a.style.display=show?'':'none';
      if(show){ anyVisible=true; visible++; }
    });
    sec.style.display=anyVisible?'':'none';
    if(anyVisible && searchQuery.trim() && sec.classList.contains('search-section')){
      sec.classList.add('is-expanded');
      const toggle=sec.querySelector('.role-toggle');
      if(toggle){
        toggle.setAttribute('aria-expanded','true');
        const label=toggle.querySelector('.role-toggle-label');
        const icon=toggle.querySelector('.role-toggle-icon');
        if(label) label.textContent='Hide searches';
        if(icon) icon.textContent='−';
      }
    }
  });
  const vc=document.getElementById('visibleCount');
  if(vc) vc.textContent = !query && currentState==='ALL' ? `Showing all ${total} job searches` : `Showing ${visible} of ${total} job searches${currentState==='ALL'?'':` — ${currentState}`}`;
  const searchCount=document.getElementById('jobSearchCount');
  if(searchCount) searchCount.textContent = query ? `${visible} matching job search${visible===1?'':'es'}` : `${total} job searches available`;
  const emptyState=document.getElementById('jobSearchEmpty');
  if(emptyState) emptyState.hidden=visible>0 || total===0 || (!query && currentState==='ALL');
}
function setStateFilter(state){
  currentState=state;
  applyStateFilter();
}
function setSearchQuery(query){
  searchQuery=query;
  applyStateFilter();
}
function clearSearch(){
  const input=document.getElementById('jobSearch');
  if(input) input.value='';
  setSearchQuery('');
  if(input) input.focus();
}
function resetJobFilters(){
  const stateFilter=document.getElementById('stateFilter');
  const input=document.getElementById('jobSearch');
  currentState='ALL';
  searchQuery='';
  if(stateFilter) stateFilter.value='ALL';
  if(input) input.value='';
  applyStateFilter();
  if(input) input.focus();
}
