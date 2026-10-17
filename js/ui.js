/* Mobile floating back-to-top button */
(function(){
  document.addEventListener("keydown", function(event){
    const active=document.activeElement;
    const isTyping=active && ["INPUT","TEXTAREA","SELECT"].includes(active.tagName);
    if(event.key==="/" && !isTyping){
      const careerView=document.getElementById("careerView");
      const input=careerView && careerView.style.display!=="none"
        ? document.getElementById("careerSearch")
        : document.getElementById("jobSearch");
      if(input){event.preventDefault();input.focus();}
    }
    if(event.key==="Escape" && active && active.id==="jobSearch") clearSearch();
    if(event.key==="Escape" && active && active.id==="careerSearch") clearCareerSearch();
  });
})();

/* Mobile role sections stay compact until the user opens one. */
(function(){
  function initRoleSections(){
    document.querySelectorAll('#jobsView section').forEach((section,index)=>{
      if(!section.querySelector('.grid a[href], .links a[href]')) return;
      const heading=section.querySelector('.head h2, .category-head h2');
      const head=section.querySelector('.head, .category-head');
      if(!heading || !head) return;
      if(section.classList.contains('search-section')) return;
      section.classList.add('search-section');
      section.id=section.id||'search-section-'+index;
      const content=document.createElement('div');
      content.className='search-section-content';
      content.id='search-section-content-'+index;
      while(head.nextSibling) content.appendChild(head.nextSibling);
      section.appendChild(content);
      const toggle=document.createElement('button');
      toggle.type='button';
      toggle.className='role-toggle';
      toggle.setAttribute('aria-controls',content.id);
      toggle.setAttribute('aria-expanded','false');
      toggle.innerHTML='<span class="role-toggle-label">View searches</span><span class="role-toggle-icon" aria-hidden="true">+</span>';
      toggle.addEventListener('click',function(){
        const expanded=section.classList.toggle('is-expanded');
        toggle.setAttribute('aria-expanded',String(expanded));
        toggle.querySelector('.role-toggle-label').textContent=expanded?'Hide searches':'View searches';
        toggle.querySelector('.role-toggle-icon').textContent=expanded?'−':'+';
      });
      head.insertBefore(toggle,head.firstChild);

      const openButton=[...head.querySelectorAll('button')].find(button=>button!==toggle);
      if(openButton){
        const actions=document.createElement('div');
        actions.className='section-actions';
        openButton.parentNode.insertBefore(actions,openButton);
        actions.appendChild(openButton);
        const closeButton=document.createElement('button');
        closeButton.type='button';
        closeButton.className='section-close-tabs';
        closeButton.textContent='✖ Close Opened Search Tabs';
        closeButton.title='Close tabs opened from this section';
        closeButton.addEventListener('click',()=>closeSectionTabs(section.id));
        actions.appendChild(closeButton);
      }
    });
    const searchLinks=document.querySelectorAll('#jobsView .grid a[href], #jobsView .links a[href]');
    const statSearches=document.getElementById('statSearches');
    const statSections=document.getElementById('statSections');
    const statStates=document.getElementById('statStates');
    if(statSearches) statSearches.textContent=searchLinks.length;
    if(statSections) statSections.textContent=document.querySelectorAll('#jobsView .search-section').length;
    if(statStates) statStates.textContent=document.querySelectorAll('#stateFilter option:not([value="ALL"])').length;
    document.querySelectorAll('[data-role-jump]').forEach(link=>{
      if(link.dataset.roleJumpReady) return;
      link.dataset.roleJumpReady='true';
      link.addEventListener('click',function(event){
      event.preventDefault();
      const target=document.querySelectorAll('#jobsView .search-section')[Number(link.dataset.roleJump)];
      if(!target) return;
      target.classList.add('is-expanded');
      const toggle=target.querySelector('.role-toggle');
      if(toggle){toggle.setAttribute('aria-expanded','true');toggle.querySelector('.role-toggle-label').textContent='Hide searches';toggle.querySelector('.role-toggle-icon').textContent='−';}
      target.scrollIntoView({behavior:'smooth',block:'start'});
      });
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initRoleSections,{once:true});
  else initRoleSections();
  document.addEventListener('jobSearchContentRendered',initRoleSections);
})();

(function(){
  const topButton = document.getElementById("mobileBackToTop");
  if(!topButton) return;
  const mobileQuery=window.matchMedia("(max-width: 650px)");
  const storageKey="jobdash_back_to_top_position";
  const dragThreshold=8;
  let framePending=false;
  let pointerState=null;
  let suppressClick=false;

  function isMobile(){ return mobileQuery.matches; }
  function setVisibility(){
    const visible=isMobile() && window.scrollY>1;
    topButton.classList.toggle("show",visible);
    topButton.setAttribute("aria-hidden",String(!visible));
    topButton.tabIndex=visible ? 0 : -1;
  }
  function scheduleVisibility(){
    if(framePending) return;
    framePending=true;
    requestAnimationFrame(function(){ framePending=false; setVisibility(); });
  }
  function clampPosition(left,top){
    const margin=8;
    const width=topButton.offsetWidth || 52;
    const height=topButton.offsetHeight || 52;
    return {
      left:Math.min(Math.max(margin,left),Math.max(margin,window.innerWidth-width-margin)),
      top:Math.min(Math.max(margin,top),Math.max(margin,window.innerHeight-height-margin))
    };
  }
  function applyPosition(left,top,save){
    const position=clampPosition(left,top);
    topButton.classList.add("is-positioned");
    topButton.style.left=position.left+"px";
    topButton.style.top=position.top+"px";
    if(save){
      try{ sessionStorage.setItem(storageKey,JSON.stringify(position)); }catch(error){}
    }
  }
  function restorePosition(){
    if(!isMobile()) return;
    try{
      const saved=JSON.parse(sessionStorage.getItem(storageKey)||"null");
      if(saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)) applyPosition(saved.left,saved.top,false);
    }catch(error){}
  }
  function clearPosition(){
    topButton.classList.remove("is-positioned");
    topButton.style.left="";
    topButton.style.top="";
  }
  function handlePointerDown(event){
    if(!isMobile() || event.pointerType==="mouse" && event.button!==0) return;
    const rect=topButton.getBoundingClientRect();
    pointerState={id:event.pointerId,startX:event.clientX,startY:event.clientY,left:rect.left,top:rect.top,moved:false};
    topButton.setPointerCapture?.(event.pointerId);
  }
  function handlePointerMove(event){
    if(!pointerState || event.pointerId!==pointerState.id) return;
    const deltaX=event.clientX-pointerState.startX;
    const deltaY=event.clientY-pointerState.startY;
    if(!pointerState.moved && Math.hypot(deltaX,deltaY)<dragThreshold) return;
    pointerState.moved=true;
    event.preventDefault();
    applyPosition(pointerState.left+deltaX,pointerState.top+deltaY,false);
  }
  function finishPointer(event){
    if(!pointerState || event.pointerId!==pointerState.id) return;
    if(pointerState.moved){
      const position=clampPosition(parseFloat(topButton.style.left),parseFloat(topButton.style.top));
      applyPosition(position.left,position.top,true);
      suppressClick=true;
      window.setTimeout(()=>{suppressClick=false;},0);
    }
    topButton.releasePointerCapture?.(event.pointerId);
    pointerState=null;
  }
  function scrollToTop(){
    if(suppressClick) return;
    window.scrollTo({top:0,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"});
  }
  topButton.addEventListener("pointerdown",handlePointerDown);
  topButton.addEventListener("pointermove",handlePointerMove,{passive:false});
  topButton.addEventListener("pointerup",finishPointer);
  topButton.addEventListener("pointercancel",finishPointer);
  topButton.addEventListener("click",scrollToTop);
  window.addEventListener("scroll",scheduleVisibility,{passive:true});
  window.addEventListener("resize",function(){
    if(isMobile() && topButton.classList.contains("is-positioned")) applyPosition(topButton.offsetLeft,topButton.offsetTop,false);
    scheduleVisibility();
  },{passive:true});
  mobileQuery.addEventListener?.("change",function(){
    if(isMobile()) restorePosition(); else clearPosition();
    scheduleVisibility();
  });
  restorePosition();
  setVisibility();
})();
