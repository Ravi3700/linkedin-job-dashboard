function careerSearchUrl(entry){
  return Array.isArray(entry) ? makeLocUrl(entry[0],entry[1]) : makeUrl(entry,false);
}
function careerSearchLabel(entry){
  return Array.isArray(entry) ? `${entry[0]} — ${entry[1]}` : entry;
}
function openCareerSearchGroup(index){
  const group=CAREER_SEARCH_GROUPS[index];
  const section=document.querySelector(`[data-career-group="${group?.key||''}"]`);
  if(group) openGroup(group.entries,false,section?.id);
}
function renderCareerSearchGroups(){
  const jobsView=document.getElementById('jobsView');
  const anchor=jobsView.querySelector('.category');
  if(!jobsView || !anchor) return;
  const fragment=document.createDocumentFragment();
  CAREER_SEARCH_GROUPS.forEach((group,index)=>{
    const section=document.createElement('section');
    section.className='category generated-career-section';
    section.dataset.careerGroup=group.key;
    const head=document.createElement('div');
    head.className='category-head';
    const heading=document.createElement('h2');
    heading.textContent=group.title+' ';
    const count=document.createElement('span');
    count.textContent=`(${group.entries.length})`;
    heading.appendChild(count);
    const openButton=document.createElement('button');
    openButton.type='button';
    openButton.className='cat-btn';
    openButton.textContent='🚀 Open All Searches';
    openButton.addEventListener('click',()=>openCareerSearchGroup(index));
    head.append(heading,openButton);
    const links=document.createElement('div');
    links.className='links';
    group.entries.forEach(entry=>{
      const link=document.createElement('a');
      link.href=careerSearchUrl(entry);
      link.target='_blank';
      link.rel='noopener noreferrer';
      link.textContent='🔎 '+careerSearchLabel(entry);
      links.appendChild(link);
    });
    section.append(head,links);
    fragment.appendChild(section);
  });
  // NOTE: `anchor` (the first ".category" section) is not necessarily a
  // direct child of #jobsView — the existing city/walk-in ".category"
  // sections are wrapped in a container (e.g. #location-added). insertBefore
  // requires the reference node to be a direct child of the node it's
  // called on, so we insert relative to the anchor's real parent instead of
  // assuming it's jobsView itself.
  anchor.parentElement.insertBefore(fragment,anchor);
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',renderCareerSearchGroups,{once:true});
else renderCareerSearchGroups();
