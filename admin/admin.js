(function () {
  "use strict";

  const config = window.JOB_DASHBOARD_ADMIN_CONFIG || {};
  const apiBaseUrl = String(config.apiBaseUrl || "").replace(/\/+$/, "");
  const signInButton = document.getElementById("signInButton");
  const signOutButton = document.getElementById("signOutButton");
  const loginPanel = document.getElementById("loginPanel");
  const loginStatus = document.getElementById("loginStatus");
  const editorPanel = document.getElementById("editorPanel");
  const setupNote = document.getElementById("setupNote");
  const sectionsEditor = document.getElementById("sectionsEditor");
  const contentSummary = document.getElementById("contentSummary");
  const previewButton = document.getElementById("previewButton");
  const submitButton = document.getElementById("submitButton");
  const previewPanel = document.getElementById("previewPanel");
  const previewContent = document.getElementById("previewContent");
  const statusMessage = document.getElementById("statusMessage");
  const linkedinSearchPaths = new Set(["/jobs/search/", "/search/results/content/"]);

  let sessionToken = null;
  let content = null;
  let initialSnapshot = "";
  let previewSnapshot = "";

  function apiConfigured() {
    return apiBaseUrl !== "https://SET-WORKER-NAME.workers.dev" &&
      (/^https:\/\/[a-z0-9-]+\.workers\.dev$/i.test(apiBaseUrl) ||
       /^https:\/\/[a-z0-9.-]+$/.test(apiBaseUrl));
  }

  function setMessage(message, kind) {
    statusMessage.textContent = message;
    statusMessage.dataset.kind = kind || "";
    loginStatus.textContent = message;
    loginStatus.dataset.kind = kind || "";
  }

  function setAuthenticated(authenticated) {
    loginPanel.hidden = authenticated;
    editorPanel.hidden = !authenticated;
    signOutButton.hidden = !authenticated;
  }

  async function request(path, options) {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers: {
        ...(options && options.headers),
        Authorization: `Bearer ${sessionToken}`,
        "Content-Type": "application/json"
      }
    });
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error(`Admin service returned an unreadable response (${response.status}).`);
    }
    if (!response.ok) {
      throw new Error(result.error || `Admin request failed (${response.status}).`);
    }
    return result;
  }

  function createField(labelText, type, value, fieldName) {
    const label = document.createElement("label");
    label.className = "field";
    label.append(document.createTextNode(labelText));

    const input = type === "select"
      ? document.createElement("select")
      : document.createElement("input");
    input.dataset.field = fieldName;

    if (type === "select") {
      [["published", "Published"], ["hidden", "Hidden"]].forEach(([value, text]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = text;
        input.appendChild(option);
      });
    } else {
      input.type = type;
      if (type === "url") input.placeholder = "https://www.linkedin.com/...";
      else input.maxLength = 160;
    }

    input.value = value;
    label.appendChild(input);
    return label;
  }

  function addAction(parent, text, className, handler, disabled) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `button small ${className || "secondary"}`;
    button.textContent = text;
    button.disabled = !!disabled;
    button.addEventListener("click", handler);
    parent.appendChild(button);
  }

  function invalidatePreview() {
    previewSnapshot = "";
    submitButton.disabled = true;
    previewPanel.hidden = true;
    setMessage("Content changed. Preview it before submitting.", "");
  }

  function syncFromEditor() {
    const sections = [...sectionsEditor.querySelectorAll("[data-section-id]")];
    content.sections = sections.map(sectionElement => {
      const section = content.sections.find(item => item.id === sectionElement.dataset.sectionId);
      section.title = sectionElement.querySelector('[data-field="title"]').value;
      section.status = sectionElement.querySelector('[data-field="status"]').value;
      section.searches = [...sectionElement.querySelectorAll("[data-search-id]")].map(row => {
        const search = section.searches.find(item => item.id === row.dataset.searchId);
        search.title = row.querySelector('[data-field="title"]').value;
        search.url = row.querySelector('[data-field="url"]').value;
        search.status = row.querySelector('[data-field="status"]').value;
        return search;
      });
      return section;
    });
    return content;
  }

  function renderEditor() {
    sectionsEditor.replaceChildren();

    content.sections.forEach((section, sectionIndex) => {
      const card = document.createElement("article");
      card.className = "section-card";
      card.dataset.sectionId = section.id;

      const heading = document.createElement("div");
      heading.className = "section-heading";
      const title = document.createElement("h3");
      title.textContent = section.title || "Untitled section";
      heading.appendChild(title);

      const sectionActions = document.createElement("div");
      sectionActions.className = "shortcut-actions";
      addAction(sectionActions, "Move up", "secondary", () => moveSection(sectionIndex, -1), sectionIndex === 0);
      addAction(sectionActions, "Move down", "secondary", () => moveSection(sectionIndex, 1), sectionIndex === content.sections.length - 1);
      addAction(sectionActions, "Remove section", "danger", () => removeSection(section.id));
      heading.appendChild(sectionActions);
      card.appendChild(heading);

      const fields = document.createElement("div");
      fields.className = "section-fields";
      fields.append(
        createField("Section title", "text", section.title, "title"),
        createField("Section visibility", "select", section.status, "status")
      );
      card.appendChild(fields);

      const list = document.createElement("div");
      list.className = "shortcut-list";
      section.searches.forEach(search => {
        const row = document.createElement("div");
        row.className = "shortcut-row";
        row.dataset.searchId = search.id;
        row.append(
          createField("Shortcut title", "text", search.title, "title"),
          createField("LinkedIn search URL", "url", search.url, "url"),
          createField("Visibility", "select", search.status, "status")
        );

        const actions = document.createElement("div");
        actions.className = "shortcut-actions";
        addAction(actions, "Remove", "danger", () => removeSearch(section.id, search.id));
        row.appendChild(actions);
        list.appendChild(row);
      });
      card.appendChild(list);

      const addSearch = document.createElement("button");
      addSearch.type = "button";
      addSearch.className = "button small secondary";
      addSearch.textContent = "Add search shortcut";
      addSearch.addEventListener("click", () => addShortcut(section.id));
      card.appendChild(addSearch);

      sectionsEditor.appendChild(card);
    });

    contentSummary.textContent = `${content.sections.length} sections · ${content.sections.reduce((sum, section) => sum + section.searches.length, 0)} shortcuts`;
  }

  function newId(prefix) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  function moveSection(index, offset) {
    syncFromEditor();
    const [section] = content.sections.splice(index, 1);
    content.sections.splice(index + offset, 0, section);
    renderEditor();
    invalidatePreview();
  }

  function removeSection(id) {
    const section = content.sections.find(item => item.id === id);
    if (!section || !window.confirm(`Remove "${section.title}" and its ${section.searches.length} shortcuts? The removal will only go live after GitHub review and merge.`)) return;
    syncFromEditor();
    content.sections = content.sections.filter(item => item.id !== id);
    renderEditor();
    invalidatePreview();
  }

  function addShortcut(sectionId) {
    syncFromEditor();
    const section = content.sections.find(item => item.id === sectionId);
    section.searches.push({ id: newId("search"), title: "", url: "", status: "published" });
    renderEditor();
    invalidatePreview();
    sectionsEditor.querySelector(`[data-search-id="${section.searches.at(-1).id}"] input`).focus();
  }

  function removeSearch(sectionId, searchId) {
    const section = content.sections.find(item => item.id === sectionId);
    const search = section && section.searches.find(item => item.id === searchId);
    if (!search || !window.confirm(`Remove "${search.title || "this shortcut"}"? It will remain public until the review pull request is merged.`)) return;
    syncFromEditor();
    section.searches = section.searches.filter(item => item.id !== searchId);
    renderEditor();
    invalidatePreview();
  }

  function validateContent(proposed) {
    const errors = [];
    const urls = new Map();
    if (!proposed.sections.length) errors.push("Keep at least one section.");

    proposed.sections.forEach((section, sectionIndex) => {
      if (!section.title.trim()) errors.push(`Section ${sectionIndex + 1} needs a title.`);
      if (section.title.trim().length > 120) errors.push(`Section ${sectionIndex + 1} title must be 120 characters or fewer.`);
      section.searches.forEach((search, searchIndex) => {
        const prefix = `Shortcut ${sectionIndex + 1}.${searchIndex + 1}`;
        if (!search.title.trim()) errors.push(`${prefix} needs a title.`);
        if (search.title.trim().length > 160) errors.push(`${prefix} title must be 160 characters or fewer.`);
        try {
          const url = new URL(search.url);
          if (url.protocol !== "https:" ||
              !["www.linkedin.com", "in.linkedin.com"].includes(url.hostname) ||
              !linkedinSearchPaths.has(url.pathname) || url.username || url.password) {
            errors.push(`${prefix} must use a secure LinkedIn search URL.`);
          } else {
            const normalized = url.href;
            if (urls.has(normalized)) urls.set(normalized, urls.get(normalized) + 1);
            else urls.set(normalized, 1);
          }
        } catch {
          errors.push(`${prefix} needs a valid LinkedIn URL.`);
        }
      });
    });

    return {
      errors,
      duplicateCount: [...urls.values()].filter(count => count > 1).length
    };
  }

  function renderPreview(proposed) {
    previewContent.replaceChildren();
    proposed.sections.forEach(section => {
      const block = document.createElement("section");
      block.className = "preview-section";
      const heading = document.createElement("h3");
      heading.textContent = `${section.title} · ${section.status}`;
      if (section.status === "hidden") heading.className = "preview-hidden";
      block.appendChild(heading);

      const list = document.createElement("ul");
      section.searches.forEach(search => {
        const item = document.createElement("li");
        item.textContent = `${search.title || "(untitled)"} — ${search.status}${search.status === "published" && section.status === "published" ? ` · ${search.url}` : ""}`;
        if (search.status === "hidden" || section.status === "hidden") item.className = "preview-hidden";
        list.appendChild(item);
      });
      block.appendChild(list);
      previewContent.appendChild(block);
    });
    previewPanel.hidden = false;
  }

  async function loadContent() {
    setMessage("Loading the current published content…", "");
    const result = await request("/api/content", { method: "GET" });
    content = result.content;
    initialSnapshot = JSON.stringify(content);
    renderEditor();
    setMessage("Current content loaded. Edits remain private until you submit a pull request.", "success");
  }

  signInButton.addEventListener("click", () => {
    if (!apiConfigured()) {
      setupNote.hidden = false;
      return;
    }
    window.location.assign(`${apiBaseUrl}/auth/start`);
  });

  signOutButton.addEventListener("click", () => {
    sessionToken = null;
    content = null;
    previewSnapshot = "";
    setAuthenticated(false);
    setMessage("", "");
  });

  document.getElementById("addSectionButton").addEventListener("click", () => {
    syncFromEditor();
    content.sections.push({ id: newId("section"), title: "New section", status: "published", searches: [] });
    renderEditor();
    invalidatePreview();
  });

  sectionsEditor.addEventListener("input", invalidatePreview);
  sectionsEditor.addEventListener("change", invalidatePreview);

  previewButton.addEventListener("click", () => {
    const proposed = syncFromEditor();
    const validation = validateContent(proposed);
    if (validation.errors.length) {
      setMessage(validation.errors[0], "error");
      submitButton.disabled = true;
      return;
    }
    previewSnapshot = JSON.stringify(proposed);
    renderPreview(proposed);
    if (previewSnapshot === initialSnapshot) {
      submitButton.disabled = true;
      setMessage("There are no changes to submit.", "");
      return;
    }
    submitButton.disabled = false;
    setMessage(validation.duplicateCount
      ? `Preview ready. Warning: ${validation.duplicateCount} duplicate search URL(s) found; review them before submitting.`
      : "Preview ready. Review it, then submit the pull request for GitHub approval.", validation.duplicateCount ? "error" : "success");
  });

  submitButton.addEventListener("click", async () => {
    const proposed = syncFromEditor();
    const validation = validateContent(proposed);
    if (validation.errors.length) {
      setMessage(validation.errors[0], "error");
      return;
    }
    if (!previewSnapshot || previewSnapshot !== JSON.stringify(proposed)) {
      setMessage("Preview the current edits again before submitting.", "error");
      submitButton.disabled = true;
      return;
    }
    if (validation.duplicateCount && !window.confirm(`There are ${validation.duplicateCount} duplicate search URL(s). Submit them anyway?`)) return;

    submitButton.disabled = true;
    setMessage("Creating a review pull request…", "");
    try {
      const result = await request("/api/submit", {
        method: "POST",
        body: JSON.stringify({ content: proposed })
      });
      setMessage(`Pull request #${result.number} created. Review its file changes on GitHub; the live site will not change until you approve and merge it.`, "success");
      const link = document.createElement("a");
      link.href = result.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Open pull request on GitHub";
      statusMessage.append(" ", link);
      initialSnapshot = JSON.stringify(proposed);
      previewSnapshot = "";
    } catch (error) {
      setMessage(error.message, "error");
      submitButton.disabled = false;
    }
  });

  const hash = new URLSearchParams(window.location.hash.slice(1));
  const callbackToken = hash.get("session");
  const callbackError = hash.get("auth_error");
  if (callbackToken || callbackError) {
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }

  if (!apiConfigured()) setupNote.hidden = false;
  if (callbackError) setMessage("GitHub sign-in was not authorized. Check the configured admin account and try again.", "error");

  if (callbackToken) {
    sessionToken = callbackToken;
    setAuthenticated(true);
    loadContent().catch(error => {
      sessionToken = null;
      setAuthenticated(false);
      setMessage(error.message, "error");
    });
  }
}());
