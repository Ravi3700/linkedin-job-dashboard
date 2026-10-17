/* ==========================================================================
   js/app.js — Application entry point. Runs last (after every other script
   has defined its globals) and wires up the parts that need to happen once,
   on page load:
     - tagAnchors() + applyStateFilter(): initializes the state filter so
       "Showing X of Y searches" is correct from the first paint
     - Service worker registration (progressive enhancement — offline/
       caching support; safely no-ops if unsupported or sw.js is absent)
   Depends on: js/filters.js (tagAnchors, applyStateFilter).
   Used by: nothing else — this is the top of the dependency chain.
   ========================================================================== */
document.addEventListener('DOMContentLoaded', function(){
  document.querySelectorAll('a[target="_blank"]').forEach(anchor=>{
    const rel=new Set((anchor.getAttribute('rel')||'').split(/\s+/).filter(Boolean));
    rel.add('noopener');
    rel.add('noreferrer');
    anchor.setAttribute('rel',Array.from(rel).join(' '));
  });
  tagAnchors();
  applyStateFilter(); // no-op visually at default "All States", sets the initial counter text
    /* QR SCAN POPUP */
  const headerQr = document.getElementById('headerQr');
  const qrModal = document.getElementById('qrModal');
  const qrModalClose = document.getElementById('qrModalClose');
  const qrModalOverlay = document.getElementById('qrModalOverlay');

  if (headerQr && qrModal && qrModalClose && qrModalOverlay) {

    const openQrModal = () => {
      qrModal.classList.add('is-open');
      qrModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    };

    const closeQrModal = () => {
      qrModal.classList.remove('is-open');
      qrModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };

    headerQr.addEventListener('click', openQrModal);

    headerQr.addEventListener('keydown', function(event){
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openQrModal();
      }
    });

    document.addEventListener('jobSearchContentRendered', function(){
      document.querySelectorAll('#jobsView a[target="_blank"]').forEach(anchor=>{
        const rel=new Set((anchor.getAttribute('rel')||'').split(/\s+/).filter(Boolean));
        rel.add('noopener');
        rel.add('noreferrer');
        anchor.setAttribute('rel',Array.from(rel).join(' '));
      });
      tagAnchors();
      applyStateFilter();
    });

    qrModalClose.addEventListener('click', closeQrModal);
    qrModalOverlay.addEventListener('click', closeQrModal);

    document.addEventListener('keydown', function(event){
      if (
        event.key === 'Escape' &&
        qrModal.classList.contains('is-open')
      ) {
        closeQrModal();
      }
    });
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
/* =========================================================
   HEADER QR — TAP / CLICK TO REVEAL
   ========================================================= */

/* =========================================================
   HEADER QR — CLICK / TAP TO OPEN SCANABLE POPUP
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const headerQr = document.getElementById("headerQr");
  const qrModal = document.getElementById("qrModal");
  const qrModalClose = document.getElementById("qrModalClose");
  const qrModalOverlay = document.getElementById("qrModalOverlay");

  if (!headerQr || !qrModal) return;

  const openQrModal = () => {
    qrModal.classList.add("is-open");
    qrModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  };

  const closeQrModal = () => {
    qrModal.classList.remove("is-open");
    qrModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };

  /* QR / Tap for scan — both open popup */
  headerQr.addEventListener("click", openQrModal);

  headerQr.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openQrModal();
    }
  });

  /* Close button */
  qrModalClose.addEventListener("click", closeQrModal);

  /* Click outside popup */
  qrModalOverlay.addEventListener("click", closeQrModal);

  /* ESC key */
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && qrModal.classList.contains("is-open")) {
      closeQrModal();
    }
  });
});