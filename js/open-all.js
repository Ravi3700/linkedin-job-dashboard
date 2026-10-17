/* ==========================================================================
   js/open-all.js — OPEN ALL system (global, per-category, per-city, and
   state-filtered).
   openGroup(jobs, isPost)  opens every entry in a data/search-data.js array
                            (used by the 4 role-section + Hiring "OPEN ALL"
                            buttons, and by openAll() for the global button)
   openUrls(urls)           opens a plain array of full URLs (used by every
                            Regular-Jobs-by-city / Walk-in "OPEN ALL" button,
                            which pass their own hard-coded URL arrays from
                            index.html, and by openAll() for those sections)
   openAll()                opens the currently rendered search links, so
                            it follows the published JSON content and filters
   Every open goes through the same tracked window.open() call (recorded in
   js/tab-manager.js's tabs/tabNames), and is skipped when it doesn't match
   the active js/filters.js state filter — this is what makes OPEN ALL,
   section OPEN ALL, and state-filtered OPEN ALL all work through one path.
   Depends on: js/utils.js (makeUrl/makeLocUrl), js/filters.js
   (currentState/getEntryState), js/tab-manager.js (tabs/tabNames/tabSeq).
   Used by: index.html (openAll(), and every "OPEN ALL"/"🚀 OPEN ALL" button's
   onclick, which calls openGroup([...]) or openUrls([...]) directly).
   ========================================================================== */

function openGroup(jobs,p=false,sectionIdOverride){
  const trigger=typeof event!=="undefined" ? event.currentTarget : null;
  const sectionId=sectionIdOverride||trigger?.closest?.('.search-section')?.id||"unassigned";
  // Every job/search in every category (including Hiring / Recruitment
  // Posts) is opened the same tracked way: a uniquely-named window.open()
  // call whose reference (and stable name, as a same-origin-safe fallback)
  // is recorded in the shared tabs/tabNames lists. CLOSE DASHBOARD TABS
  // reads those same shared lists, so any category's OPEN ALL - current or
  // added later - is automatically closable with no per-category code.
  // A plain string entry keeps the original India-wide search behavior
  // exactly as before; a [title, city] entry (used by the new location and
  // startup-city searches) is opened as a city-scoped search instead.
  jobs.forEach(j=>{
    const label=Array.isArray(j) ? j.join(' ') : j;
    if(!matchesSearchText(label)) return;
    // Respect the state filter: skip searches tied to a different state.
    // Generic/India-wide entries (getEntryState -> null) stay open under
    // any filter, since they aren't tied to one specific location.
    if(currentState!=='ALL'){
      const st=getEntryState(j);
      if(st && st!==currentState) return;
    }
    const name="jobdash_tab_"+(++tabSeq);
    const url=Array.isArray(j) ? makeLocUrl(j[0], j[1]) : makeUrl(j,p);
    // NOTE: no "noopener"/"noreferrer" feature here. Per the window.open()
    // spec, either flag makes the call return null - CLOSE DASHBOARD TABS
    // had nothing to track/close as a result. These URLs are all built by
    // our own code (LinkedIn/company search links, never user input), so
    // dropping the flag carries no meaningful tabnabbing risk and is what
    // makes the opened tab an actual closable, script-opened window.
    const w=window.open(url,name);
    trackOpenedTab(sectionId,w,name);
  });
}function openAll(){
  const urls=Array.from(document.querySelectorAll('#jobsView .search-section .grid a[href], #jobsView .search-section .links a[href]')).map(anchor=>anchor.href);
  openUrls(urls);
}

function openUrls(urls){
  const trigger=typeof event!=="undefined" ? event.currentTarget : null;
  const sectionId=trigger?.closest?.('.search-section')?.id||"unassigned";
    urls.forEach(url=>{
    const anchors=Array.from(document.querySelectorAll('a[href]')).filter(anchor=>anchor.href===url || anchor.getAttribute('href')===url);
    if(anchors.length && !anchors.some(isVisibleSearchAnchor)) return;
        if(currentState!=='ALL'){
          const st=getEntryState(url);
          if(st && st!==currentState) return;
        }
        const name="jobdash_tab_"+(++tabSeq);
        // See the matching note in openGroup(): no noopener/noreferrer,
        // otherwise window.open() returns null and there is nothing to
        // track/close. These are our own pre-built LinkedIn/company URLs.
        const tab=window.open(url,name);
        trackOpenedTab(sectionId,tab,name);
    });
}