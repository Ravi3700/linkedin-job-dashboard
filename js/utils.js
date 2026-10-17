/* ==========================================================================
   js/utils.js — Reusable URL-building helpers.
   makeUrl(title, isPost)     -> India-wide job-search or content-search URL
   makeLocUrl(title, city)    -> city-scoped job-search URL
   These reproduce EXACTLY the URL patterns already in production (do not
   change the query-string construction without explicit instruction).
   Depends on: nothing (pure functions).
   Used by: js/open-all.js.
   ========================================================================== */

function makeUrl(j,p){let e=encodeURIComponent(j).replace(/%20/g,'+');return p?'https://www.linkedin.com/search/results/content/?keywords='+e+'&geoUrn=%5B%22102713980%22%5D&f_TPR=r86400&sortBy=%22date_posted%22':'https://www.linkedin.com/jobs/search/?keywords='+e+'&geoId=102713980&f_TPR=r86400&sortBy=DD'}
// Same URL pattern already used by the existing "Regular Jobs — <City>" /
// walk-in sections, for city-scoped searches (keyword + location param).
function makeLocUrl(title,city){return 'https://www.linkedin.com/jobs/search/?keywords='+encodeURIComponent(title)+'&location='+encodeURIComponent(city)+'&f_TPR=r86400&sortBy=DD'}
