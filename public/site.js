var GRIDLAB_SITE = null;

function escapeHTML(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function fetchSite() {
  return Promise.all([
    fetch("/api/site").then(function (r) { return r.json(); }),
    fetch("/api/categories").then(function (r) { return r.json(); })
  ]).then(function (results) {
    var site = results[0];
    site.categories = results[1];
    return site;
  });
}

function defaultLogoSVG() {
  return (
    '<svg viewBox="0 0 200 136" xmlns="http://www.w3.org/2000/svg">' +
    '<rect x="8" y="8" width="60" height="24" rx="12" fill="#1e4d5b"/>' +
    '<rect x="90" y="8" width="100" height="24" rx="12" fill="#8bc53f"/>' +
    '<rect x="8" y="56" width="130" height="24" rx="12" fill="#fdd23c"/>' +
    '<circle cx="176" cy="68" r="14" fill="#38415c"/>' +
    '<rect x="8" y="104" width="60" height="24" rx="12" fill="#ef5a45"/>' +
    '<rect x="90" y="104" width="100" height="24" rx="12" fill="#12a4c4"/>' +
    "</svg>"
  );
}

function logoMarkHTML(settings) {
  if (settings.logo_url) {
    return '<img src="' + settings.logo_url + '" alt="' + settings.site_name + '">';
  }
  return defaultLogoSVG();
}

function currentPath() {
  return window.location.pathname.split("/").pop() || "index.html";
}

function browseNavHTML(contentTypes) {
  var params = new URLSearchParams(window.location.search);
  var activeType = params.get("type") || (currentPath() === "index.html" ? "all" : null);
  var path = currentPath();

  var items = [{ slug: "all", name: "All Design" }].concat(contentTypes);
  return items
    .map(function (c) {
      var isActive = path === "index.html" && activeType === c.slug;
      return (
        '<a href="index.html?type=' + c.slug + '" class="nav-link' + (isActive ? " active" : "") + '" data-type="' + c.slug + '">' +
        c.name +
        "</a>"
      );
    })
    .join("");
}

function studioNavHTML(pages) {
  var path = currentPath();
  var params = new URLSearchParams(window.location.search);
  var slug = params.get("slug");

  var hireActive = path === "hire.html";
  var venturesActive = path === "ventures.html";
  var html =
    '<a href="hire.html" class="nav-link' + (hireActive ? " active" : "") + '">Hire Us</a>' +
    '<a href="ventures.html" class="nav-link' + (venturesActive ? " active" : "") + '">Ventures</a>';

  html += pages
    .map(function (p) {
      var isActive = path === "page.html" && slug === p.slug;
      return (
        '<a href="page.html?slug=' + p.slug + '" class="nav-link' + (isActive ? " active" : "") + '">' +
        p.title +
        "</a>"
      );
    })
    .join("");

  return html;
}

function renderShell(site) {
  var settings = site.settings;
  document.querySelectorAll(".year").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  var logoHTML = logoMarkHTML(settings);

  var mobileTopbar = document.getElementById("mobile-topbar");
  if (mobileTopbar) {
    mobileTopbar.innerHTML =
      '<a href="index.html" class="logo" aria-label="' + settings.site_name + ' Home">' +
      '<span class="logo-mark" aria-hidden="true">' + logoHTML + "</span>" +
      "</a>" +
      '<button class="menu-toggle" data-menu-toggle aria-label="Toggle menu">' +
      '<svg width="18" height="14" viewBox="0 0 18 14"><path d="M0 1h18M0 7h18M0 13h18" stroke="currentColor" stroke-width="1.5"/></svg>' +
      "</button>";
  }

  var sidebar = document.getElementById("sidebar");
  if (sidebar) {
    sidebar.innerHTML =
      '<div class="sidebar-top">' +
      '<a href="index.html" class="logo" aria-label="' + settings.site_name + ' Home">' +
      '<span class="logo-mark" aria-hidden="true">' + logoHTML + "</span>" +
      "</a>" +
      '<button class="btn" data-login>Log in</button>' +
      "</div>" +
      '<nav class="sidebar-nav">' +
      '<div class="nav-group"><h4>Browse</h4>' + browseNavHTML(site.contentTypes) + "</div>" +
      '<div class="nav-group"><h4>Studio</h4>' + studioNavHTML(site.pages) + "</div>" +
      "</nav>" +
      '<div class="sidebar-footer">' +
      '<p class="sidebar-quote">' + settings.footer_quote + "</p>" +
      '<a href="hire.html" class="btn btn-primary">Hire Us</a>' +
      '<p class="sidebar-note">' + settings.footer_note + "</p>" +
      '<div class="sidebar-bottom">' +
      "<span>&copy; <span class=\"year\">" + new Date().getFullYear() + "</span> " + settings.copyright_name + "</span>" +
      '<a href="' + settings.partner_url + '">' + settings.partner_label + "</a>" +
      "</div>" +
      "</div>";
  }

  initMobileNav();
  initLoginButtons();
}

function showToast(message) {
  var toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(function () {
    toast.classList.remove("visible");
  }, 2600);
}

function initMobileNav() {
  var toggles = document.querySelectorAll("[data-menu-toggle]");
  toggles.forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.body.classList.toggle("nav-open");
    });
  });
  document.addEventListener("click", function (e) {
    if (
      document.body.classList.contains("nav-open") &&
      !e.target.closest(".sidebar") &&
      !e.target.closest("[data-menu-toggle]")
    ) {
      document.body.classList.remove("nav-open");
    }
  });
}

function initLoginButtons() {
  document.querySelectorAll("[data-login]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      showToast("Accounts are coming soon — check back shortly.");
    });
  });
}

function formatPrice(n) {
  return "$" + n;
}

function typeLabel(site, slug) {
  var found = site.contentTypes.find(function (c) { return c.slug === slug; });
  return found ? found.name : slug;
}

function categoryName(site, slug) {
  if (!slug) return null;
  var found = site.categories.find(function (c) { return c.slug === slug; });
  return found ? found.name : null;
}

function productClassifierLabel(site, p) {
  return categoryName(site, p.category) || typeLabel(site, p.type);
}

function productCardHTML(site, p) {
  return (
    '<a class="product-card" href="product.html?slug=' + p.slug + '">' +
    '<div class="product-thumb" style="aspect-ratio:' + (p.aspect || "4 / 3") + '">' +
    '<img src="' + p.thumb + '" alt="' + p.name + '" loading="lazy">' +
    '<span class="product-price-badge">' + formatPrice(p.price) + "</span>" +
    "</div>" +
    '<div class="product-info"><div>' +
    '<div class="product-name">' + p.name + "</div>" +
    '<div class="product-cat">' + productClassifierLabel(site, p) + "</div>" +
    "</div></div>" +
    "</a>"
  );
}

function renderProductGrid(site, containerId, products) {
  var el = document.getElementById(containerId);
  if (!el) return;
  if (!products.length) {
    el.innerHTML = '<div class="empty-state">No designs found. Try a different category or search term.</div>';
    return;
  }
  el.innerHTML = products.map(function (p) { return productCardHTML(site, p); }).join("");
}

// ---------- Page: index.html ----------

function initHomeGrid(site) {
  var grid = document.getElementById("product-grid");
  if (!grid) return;

  var titleEl = document.querySelector(".content-header h1");
  var descEl = document.querySelector(".content-header p");
  if (titleEl) titleEl.textContent = site.settings.content_title;
  if (descEl) descEl.textContent = site.settings.content_description;

  var pillRow = document.getElementById("pill-row");
  var subPillRow = document.getElementById("subpill-row");
  var params = new URLSearchParams(window.location.search);
  var activeType = params.get("type") || "all";
  var activeCategory = params.get("cat") || "all";

  function renderSubPills() {
    if (!subPillRow) return;
    if (activeType === "all") {
      subPillRow.innerHTML = "";
      subPillRow.style.display = "none";
      return;
    }
    var categories = site.categories.filter(function (c) { return c.content_type_slug === activeType; });
    if (!categories.length) {
      subPillRow.innerHTML = "";
      subPillRow.style.display = "none";
      return;
    }
    subPillRow.style.display = "";
    var subPills = [{ slug: "all", name: "All " + typeLabel(site, activeType) }].concat(categories);
    subPillRow.innerHTML = subPills
      .map(function (c) {
        return (
          '<button class="pill pill-sm' + (c.slug === activeCategory ? " active" : "") + '" data-cat="' + c.slug + '">' +
          c.name +
          "</button>"
        );
      })
      .join("");
    subPillRow.querySelectorAll(".pill").forEach(function (pill) {
      pill.addEventListener("click", function () {
        subPillRow.querySelectorAll(".pill").forEach(function (p) { p.classList.remove("active"); });
        pill.classList.add("active");
        activeCategory = pill.dataset.cat;
        var url = new URL(window.location.href);
        if (activeCategory === "all") url.searchParams.delete("cat");
        else url.searchParams.set("cat", activeCategory);
        history.replaceState(null, "", url);
        load();
      });
    });
  }

  if (pillRow) {
    var pills = [{ slug: "all", name: "All" }].concat(site.contentTypes);
    pillRow.innerHTML = pills
      .map(function (c) {
        return (
          '<button class="pill' + (c.slug === activeType ? " active" : "") + '" data-type="' + c.slug + '">' +
          c.name +
          "</button>"
        );
      })
      .join("");
  }

  renderSubPills();

  var searchInput = document.getElementById("search-input");

  function load() {
    var q = (searchInput && searchInput.value || "").trim();
    var url = "/api/products?";
    if (activeType && activeType !== "all") url += "type=" + encodeURIComponent(activeType) + "&";
    if (activeCategory && activeCategory !== "all") url += "category=" + encodeURIComponent(activeCategory) + "&";
    if (q) url += "q=" + encodeURIComponent(q);
    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (products) { renderProductGrid(site, "product-grid", products); });
  }

  if (pillRow) {
    pillRow.querySelectorAll(".pill").forEach(function (pill) {
      pill.addEventListener("click", function () {
        pillRow.querySelectorAll(".pill").forEach(function (p) { p.classList.remove("active"); });
        pill.classList.add("active");
        activeType = pill.dataset.type;
        activeCategory = "all";
        var url = new URL(window.location.href);
        if (activeType === "all") url.searchParams.delete("type");
        else url.searchParams.set("type", activeType);
        url.searchParams.delete("cat");
        history.replaceState(null, "", url);
        renderSubPills();
        load();
      });
    });
  }

  if (searchInput) searchInput.addEventListener("input", load);

  load();
}

// ---------- Page: product.html ----------

function initProductDetail(site) {
  var container = document.getElementById("product-detail");
  if (!container) return;

  var params = new URLSearchParams(window.location.search);
  var slug = params.get("slug") || params.get("id");

  fetch("/api/products/" + encodeURIComponent(slug))
    .then(function (r) {
      if (!r.ok) throw new Error("not found");
      return r.json();
    })
    .then(function (data) {
      var product = data.product;
      document.title = product.name + " — " + site.settings.site_name + " Design Market";

      document.getElementById("detail-cat").textContent = productClassifierLabel(site, product);
      document.getElementById("detail-name").textContent = product.name;
      document.getElementById("detail-price").textContent = formatPrice(product.price);
      document.getElementById("detail-desc").textContent = product.description;
      document.getElementById("detail-format").textContent = product.formats;
      document.getElementById("detail-license").textContent = product.license;

      var mainImg = document.getElementById("gallery-main-img");
      var thumbsEl = document.getElementById("gallery-thumbs");
      var captionEl = document.getElementById("gallery-caption");

      var galleryItems = (product.images || []).map(function (img) {
        return typeof img === "string" ? { url: img, keyword: "", caption: "" } : img;
      });
      var viewerItems = [];
      var coverUrl = product.cover || product.thumb;
      if (coverUrl) viewerItems.push({ url: coverUrl, keyword: product.name, caption: "" });
      viewerItems = viewerItems.concat(galleryItems);

      function showItem(i) {
        var item = viewerItems[i];
        if (!item) return;
        mainImg.src = item.url;
        mainImg.alt = item.keyword || product.name;
        if (captionEl) {
          captionEl.textContent = item.caption || "";
          captionEl.style.display = item.caption ? "" : "none";
        }
      }

      thumbsEl.innerHTML = viewerItems
        .map(function (item, i) {
          return (
            '<button data-i="' + i + '" class="' + (i === 0 ? "active" : "") + '">' +
            '<img src="' + item.url + '" alt="' + escapeHTML(item.keyword || product.name) + '">' +
            "</button>"
          );
        })
        .join("");

      showItem(0);

      thumbsEl.querySelectorAll("button").forEach(function (btn) {
        btn.addEventListener("click", function () {
          thumbsEl.querySelectorAll("button").forEach(function (b) { b.classList.remove("active"); });
          btn.classList.add("active");
          showItem(parseInt(btn.dataset.i, 10));
        });
      });

      var buyBtn = document.getElementById("buy-btn");
      if (buyBtn) {
        var subject = encodeURIComponent("Purchase request: " + product.name);
        var body = encodeURIComponent(
          "Hi " + site.settings.site_name + ",\n\nI'd like to purchase \"" + product.name + "\" (" +
          formatPrice(product.price) + ").\n\nPlease send payment instructions.\n"
        );
        buyBtn.href = "mailto:hello@gridlab.co?subject=" + subject + "&body=" + body;
      }

      renderProductGrid(site, "related-grid", data.related);
    })
    .catch(function () {
      container.innerHTML = '<div class="empty-state">This design could not be found.</div>';
    });
}

// ---------- Page: page.html (generic CMS page) ----------

function initGenericPage(site) {
  var container = document.getElementById("page-content");
  if (!container) return;

  var params = new URLSearchParams(window.location.search);
  var slug = params.get("slug");

  fetch("/api/pages/" + encodeURIComponent(slug))
    .then(function (r) {
      if (!r.ok) throw new Error("not found");
      return r.json();
    })
    .then(function (page) {
      document.title = page.title + " — " + site.settings.site_name + " Design Market";
      var paragraphs = page.body.split(/\n\s*\n/).filter(Boolean);
      container.innerHTML =
        '<div class="page-header"><h1>' + page.title + "</h1></div>" +
        '<div class="page-body">' +
        paragraphs.map(function (p) { return "<p>" + p + "</p>"; }).join("") +
        "</div>";
    })
    .catch(function () {
      container.innerHTML = '<div class="empty-state">This page could not be found.</div>';
    });
}

// ---------- Page: hire.html ----------

function initHirePage(site) {
  var form = document.getElementById("hire-form");
  if (!form) return;

  var titleEl = document.querySelector(".page-header h1");
  var descEl = document.querySelector(".page-header p");
  if (titleEl) titleEl.textContent = site.settings.hire_title;
  if (descEl) descEl.textContent = site.settings.hire_description;

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var data = new FormData(form);
    var payload = {
      name: data.get("name"),
      email: data.get("email"),
      company: data.get("company"),
      projectType: data.get("project-type"),
      budget: data.get("budget"),
      message: data.get("message")
    };
    var submitBtn = form.querySelector("[type=submit]");
    submitBtn.disabled = true;
    fetch("/api/hire", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json(); })
      .then(function () {
        var success = document.getElementById("form-success");
        if (success) success.classList.add("visible");
        form.reset();
      })
      .finally(function () {
        submitBtn.disabled = false;
      });
  });
}

// ---------- Page: ventures.html ----------

function ventureLogoHTML(v) {
  return v.logo
    ? '<img src="' + v.logo + '" alt="' + v.name + '">'
    : '<div class="venture-logo-fallback">' + v.name.charAt(0) + "</div>";
}

function heroVentureCardHTML(v) {
  var cover = v.cover || v.logo || "";
  var inner =
    (cover ? '<img class="venture-hero-img" src="' + cover + '" alt="' + v.name + '">' : "") +
    '<div class="venture-hero-scrim"></div>' +
    '<div class="venture-hero-meta">' +
    '<div class="venture-hero-name">' + v.name + "</div>" +
    (v.category ? '<div class="venture-hero-category">' + v.category + "</div>" : "") +
    "</div>";
  return v.link
    ? '<a class="venture-hero-card" href="' + v.link + '" target="_blank" rel="noopener">' + inner + "</a>"
    : '<div class="venture-hero-card">' + inner + "</div>";
}

function dealVentureCardHTML(v) {
  var cover = v.cover || v.logo;
  var inner =
    '<div class="venture-deal-img">' +
    (cover ? '<img src="' + cover + '" alt="' + v.name + '">' : "") +
    "</div>" +
    '<div class="venture-deal-info">' +
    '<div class="venture-logo">' + ventureLogoHTML(v) + "</div>" +
    '<div class="venture-info">' +
    '<div class="venture-name">' + v.name + "</div>" +
    (v.category ? '<div class="venture-category">' + v.category + "</div>" : "") +
    "</div>" +
    "</div>" +
    (v.description ? '<p class="venture-desc">' + v.description + "</p>" : "");
  return v.link
    ? '<a class="venture-deal-card" href="' + v.link + '" target="_blank" rel="noopener">' + inner + "</a>"
    : '<div class="venture-deal-card">' + inner + "</div>";
}

function initVenturesPage(site) {
  var heroEl = document.getElementById("ventures-hero");
  var gridEl = document.getElementById("ventures-grid");
  var dealsHeading = document.getElementById("ventures-deals-heading");
  if (!heroEl || !gridEl) return;

  fetch("/api/ventures")
    .then(function (r) { return r.json(); })
    .then(function (ventures) {
      if (!ventures.length) {
        heroEl.innerHTML = '<div class="empty-state">No ventures yet.</div>';
        return;
      }
      var hero = ventures.slice(0, 2);
      var rest = ventures.slice(2);
      heroEl.innerHTML = hero.map(heroVentureCardHTML).join("");
      if (rest.length) {
        if (dealsHeading) dealsHeading.style.display = "";
        gridEl.innerHTML = rest.map(dealVentureCardHTML).join("");
      }
    });
}

// ---------- Boot ----------

fetchSite().then(function (site) {
  GRIDLAB_SITE = site;
  renderShell(site);
  initHomeGrid(site);
  initProductDetail(site);
  initGenericPage(site);
  initVenturesPage(site);
  initHirePage(site);
});
