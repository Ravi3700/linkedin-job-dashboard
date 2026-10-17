document.addEventListener('DOMContentLoaded', function(){
  const navMenus = document.querySelectorAll('.view-tabs-menu, .page-menu');
  if(navMenus.length){
    const mobileBreakpoint = window.matchMedia('(max-width: 800px)');
    let isMobile = mobileBreakpoint.matches;
    navMenus.forEach(menu => { menu.open = !isMobile; });
    window.addEventListener('resize', function(){
      const nextIsMobile = mobileBreakpoint.matches;
      if(nextIsMobile !== isMobile){
        navMenus.forEach(menu => { menu.open = !nextIsMobile; });
        isMobile = nextIsMobile;
      }
    });
  }

  if(typeof SITE_CONFIG === 'undefined') return;

  document.querySelectorAll('[data-site-name]').forEach(element => { element.textContent = SITE_CONFIG.siteName; });
  document.querySelectorAll('[data-site-tagline]').forEach(element => { element.textContent = SITE_CONFIG.siteTagline; });

  document.querySelectorAll('[data-request-link]').forEach(link => {
    if(SITE_CONFIG.requestJobSearchUrl){
      link.href = SITE_CONFIG.requestJobSearchUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.classList.remove('is-disabled');
      link.removeAttribute('aria-disabled');
    }else{
      link.removeAttribute('href');
      link.removeAttribute('target');
      link.classList.add('is-disabled');
      link.setAttribute('aria-disabled', 'true');
      link.title = 'Add the Microsoft Forms URL in data/config.js to enable this link.';
    }
  });

  document.querySelectorAll('[data-social]').forEach(link => {
    const platform = link.dataset.social;
    const url = SITE_CONFIG.socialLinks && SITE_CONFIG.socialLinks[platform];
    if(url && /^https:\/\//i.test(url)){
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.classList.remove('is-disabled');
      link.removeAttribute('aria-disabled');
    }else{
      link.removeAttribute('href');
      link.removeAttribute('target');
      link.classList.add('is-disabled');
      link.setAttribute('aria-disabled', 'true');
      link.title = 'Add the profile URL in data/config.js to enable this link.';
    }
  });
});
