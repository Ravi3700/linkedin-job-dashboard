(function () {
  "use strict";

  const idPattern = /^[a-z0-9][a-z0-9_-]{0,79}$/;

  function isLinkedInUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" &&
        ["www.linkedin.com", "in.linkedin.com"].includes(url.hostname) &&
        ["/jobs/search/", "/search/results/content/"].includes(url.pathname) &&
        !url.username && !url.password;
    } catch {
      return false;
    }
  }

  function validateContent(content) {
    if (!content || content.schemaVersion !== 1 ||
        !Array.isArray(content.sections) ||
        content.sections.length < 1 || content.sections.length > 100) {
      throw new Error("The published search content has an unsupported format.");
    }

    const ids = new Set();
    let searchCount = 0;
    content.sections.forEach(section => {
      if (!section || typeof section.id !== "string" ||
          !idPattern.test(section.id) || ids.has(section.id) ||
          typeof section.title !== "string" ||
          !section.title.trim() || section.title.trim().length > 120 ||
          !["published", "hidden"].includes(section.status) ||
          !Array.isArray(section.searches)) {
        throw new Error("A published search section has invalid data.");
      }
      ids.add(section.id);

      section.searches.forEach(search => {
        searchCount += 1;
        if (!search || typeof search.id !== "string" ||
            !idPattern.test(search.id) || ids.has(search.id) ||
            typeof search.title !== "string" ||
            !search.title.trim() || search.title.trim().length > 160 ||
            !["published", "hidden"].includes(search.status) ||
            !isLinkedInUrl(search.url)) {
          throw new Error("A published search shortcut has invalid data.");
        }
        ids.add(search.id);
      });
    });
    if (searchCount > 2000) {
      throw new Error("The published search content exceeds the supported limit.");
    }
  }

  function notifyContentRendered() {
    document.dispatchEvent(new CustomEvent("jobSearchContentRendered"));
  }

  function renderContent(content) {
    const jobsView = document.getElementById("jobsView");
    if (!jobsView) {
      throw new Error("The dashboard search view could not be found.");
    }

    const visibleSections = content.sections
      .filter(section => section.status === "published")
      .map(section => ({
        ...section,
        searches: section.searches.filter(search => search.status === "published")
      }))
      .filter(section => section.searches.length);
    const fragment = document.createDocumentFragment();

    visibleSections.forEach(sectionData => {
      const section = document.createElement("section");
      section.className = "category";
      section.id = `managed-${sectionData.id}`;
      section.dataset.contentSection = sectionData.id;

      const head = document.createElement("div");
      head.className = "head";

      const title = document.createElement("h2");
      title.textContent = sectionData.title;
      const count = document.createElement("small");
      count.textContent = `(${sectionData.searches.length})`;
      title.append(" ", count);

      const openButton = document.createElement("button");
      openButton.type = "button";
      openButton.className = "cat-btn";
      openButton.textContent = "🚀 Open All Searches";
      openButton.addEventListener("click", () => {
        window.openUrls(sectionData.searches.map(search => search.url));
      });
      head.append(title, openButton);

      const links = document.createElement("div");
      links.className = "grid";
      sectionData.searches.forEach(search => {
        const link = document.createElement("a");
        link.href = search.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = `🔎 ${search.title}`;
        links.appendChild(link);
      });

      section.append(head, links);
      fragment.appendChild(section);
    });

    jobsView.querySelectorAll("section.search-section").forEach(section => section.remove());
    const requestCallout = jobsView.querySelector(".request-callout");
    if (requestCallout) requestCallout.before(fragment);
    else jobsView.appendChild(fragment);

    const footerCount = document.querySelector(".footer-bottom span:nth-child(2)");
    if (footerCount) {
      const searchCount = visibleSections.reduce((total, section) => total + section.searches.length, 0);
      footerCount.textContent = `${searchCount} curated job searches · External links open on LinkedIn or partner sites`;
    }

    notifyContentRendered();
  }

  function showLoadError(error) {
    const jobsView = document.getElementById("jobsView");
    if (jobsView) {
      jobsView.querySelectorAll("section.search-section").forEach(section => section.remove());
      const notice = document.createElement("div");
      notice.className = "info";
      notice.setAttribute("role", "alert");
      notice.textContent = "Job searches could not be loaded. Please refresh the page or try again when the content is available.";
      const requestCallout = jobsView.querySelector(".request-callout");
      if (requestCallout) requestCallout.before(notice);
      else jobsView.appendChild(notice);
    }
    notifyContentRendered();
    console.error("Published search content could not be loaded.", error);
  }

  document.addEventListener("DOMContentLoaded", async function () {
    try {
      const response = await fetch("./data/site-content.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Could not load published searches (${response.status}).`);
      }
      const content = await response.json();
      validateContent(content);
      renderContent(content);
    } catch (error) {
      showLoadError(error);
    }
  }, { once: true });
}());
