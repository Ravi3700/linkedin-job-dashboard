/* ==========================================================================
   js/tab-manager.js — Generic dashboard-opened window tracking + CLOSE
   DASHBOARD TABS.
   tabs / tabNames / tabSeq   shared tracking state, appended to by
                              js/open-all.js every time a search tab opens
   closeTabs()                closes every tracked window (by reference, and
                              by stable name as a same-origin-safe fallback),
                              safely skipping already-closed/unavailable
                              windows, then resets the tracking lists
   This mechanism is intentionally generic: it has no per-city or
   per-category logic, so any current or future section that opens tabs via
   js/open-all.js is automatically closable with zero changes here.
   Depends on: nothing.
   Used by: js/open-all.js (pushes into tabs/tabNames), index.html
   (closeTabs() on the CLOSE DASHBOARD TABS button).
   ========================================================================== */
let tabs=[]; let tabNames=[]; let tabSeq=0;
const sectionTabs=Object.create(null);

function trackOpenedTab(sectionId, windowRef, name){
    if(!windowRef) return;
    tabs.push(windowRef); tabNames.push(name);
    const key=sectionId||"unassigned";
    (sectionTabs[key] ||= []).push({windowRef,name});
}

function closeSectionTabs(sectionId){
    const entries=sectionTabs[sectionId]||[];
    entries.forEach(entry=>{
        try{if(entry.windowRef&&!entry.windowRef.closed)entry.windowRef.close()}catch(error){}
        try{const named=window.open("",entry.name);if(named&&!named.closed)named.close()}catch(error){}
    });
    sectionTabs[sectionId]=[];
    const closedNames=new Set(entries.map(entry=>entry.name));
    tabs=tabs.filter(windowRef=>{try{return windowRef&&!windowRef.closed}catch(error){return false}});
    tabNames=tabNames.filter(name=>name&&!closedNames.has(name));
}

function closeTabs(){
    // Close every tab opened by this dashboard session.
    tabs.forEach(w=>{try{if(w&&!w.closed)w.close()}catch(e){}});
    // Also close by stable window names in case a cross-origin navigation
    // makes the stored Window reference unreliable in the browser.
    tabNames.forEach(name=>{try{const w=window.open("",name); if(w&&!w.closed)w.close()}catch(e){}});
    tabs=[];
    tabNames=[];
    Object.keys(sectionTabs).forEach(key=>{sectionTabs[key]=[]});
}

// A plain clicked <a target="_blank"> is a native browser navigation, not
// a window.open() call, so this page is never given a reference to that
// tab and CLOSE DASHBOARD TABS has nothing to track/close for it. Scoped
// to #jobsView's own search links (role-section grids, Hiring grid, and
// city/walk-in category links) - the same links openAll()/openUrls()
// already treat as "search links" - so individually-opened search tabs
// become trackable/closable too, without touching Career, nav, or footer
// links, and without changing any href/search URL.
document.addEventListener("click", function(ev){
    const a = ev.target && ev.target.closest ? ev.target.closest('#jobsView a[target="_blank"][href]') : null;
    if(!a || ev.defaultPrevented) return;
    ev.preventDefault();
    const sectionId = a.closest('.search-section')?.id || "unassigned";
    const name = "jobdash_tab_" + (++tabSeq);
    // No noopener/noreferrer here either - see js/open-all.js for why.
    const w = window.open(a.href, name);
    trackOpenedTab(sectionId, w, name);
});