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

function feedNavHTML() {
  var params = new URLSearchParams(window.location.search);
  var activeType = params.get("type") || (currentPath() === "index.html" ? "all" : null);
  var isActive = currentPath() === "index.html" && activeType === "all";
  return '<a href="index.html?type=all" class="nav-link' + (isActive ? " active" : "") + '" data-type="all">Feed</a>';
}

function browseNavHTML(contentTypes) {
  var params = new URLSearchParams(window.location.search);
  var activeType = params.get("type") || (currentPath() === "index.html" ? "all" : null);
  var path = currentPath();

  return contentTypes
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

function sponsorHTML(settings) {
  if (!settings.sponsor_name) return "";
  var logo = settings.sponsor_logo_url
    ? '<img src="' + settings.sponsor_logo_url + '" alt="">'
    : settings.sponsor_name.charAt(0).toUpperCase();
  return (
    '<a class="sidebar-sponsor" href="' + (settings.sponsor_link_url || "#") + '" target="_blank" rel="noopener sponsored">' +
    '<div class="sponsor-header">' +
    '<span class="sponsor-logo">' + logo + "</span>" +
    '<span class="sponsor-title">' +
    '<span class="sponsor-name">' + settings.sponsor_name + "</span>" +
    '<span class="sponsor-label">Sponsored</span>' +
    "</span>" +
    "</div>" +
    (settings.sponsor_description ? '<p class="sponsor-desc">' + settings.sponsor_description + "</p>" : "") +
    "</a>"
  );
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
      '<div class="sidebar-clock" id="sidebar-clock"></div>' +
      "</div>" +
      '<nav class="sidebar-nav">' +
      '<div class="nav-group"><h4>Browse</h4>' + feedNavHTML() + "</div>" +
      '<div class="nav-group"><h4>Product</h4>' + browseNavHTML(site.contentTypes) + "</div>" +
      '<div class="nav-group"><h4>Studio</h4>' + studioNavHTML(site.pages) + "</div>" +
      "</nav>" +
      sponsorHTML(settings) +
      '<div class="sidebar-footer">' +
      '<p class="sidebar-note">' + settings.footer_note + "</p>" +
      '<div class="sidebar-bottom">' +
      "<span>&copy; <span class=\"year\">" + new Date().getFullYear() + "</span> " + settings.copyright_name + "</span>" +
      '<a href="' + settings.partner_url + '">' + settings.partner_label + "</a>" +
      "</div>" +
      "</div>";
  }

  initMobileNav();
  initSidebarClock();
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

var CLOCK_ZONES = [
  { city: "Toronto", tz: "America/Toronto" }
];

function zoneTimeInfo(tz) {
  var now = new Date();
  var display = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true })
    .format(now)
    .replace(/\s?[AP]M$/i, "");
  var hour24 = parseInt(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(now),
    10
  );
  var isNight = hour24 < 6 || hour24 >= 18;
  return { time: display, isNight: isNight };
}

function initSidebarClock() {
  var el = document.getElementById("sidebar-clock");
  if (!el) return;

  var i = 0;
  function tick() {
    var zone = CLOCK_ZONES[i % CLOCK_ZONES.length];
    i++;
    var info = zoneTimeInfo(zone.tz);
    el.innerHTML =
      '<span class="clock-time">' + info.time + "</span>" +
      '<span class="clock-icon">' + (info.isNight ? "&#127769;" : "&#9728;&#65039;") + "</span>" +
      '<span class="clock-city">' + zone.city + "</span>";
  }

  tick();
  clearInterval(initSidebarClock._t);
  initSidebarClock._t = setInterval(tick, 5000);
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
  var isCraft = p.resource_type === "craft";
  return (
    '<a class="product-card" href="product.html?slug=' + p.slug + '">' +
    '<div class="product-thumb" style="aspect-ratio:' + (p.aspect || "4 / 3") + '">' +
    '<img src="' + p.thumb + '" alt="' + p.name + '" loading="lazy">' +
    (isCraft ? "" : '<span class="product-price-badge">' + formatPrice(p.price) + "</span>") +
    "</div>" +
    '<div class="product-info">' +
    '<div class="product-name">' + p.name + "</div>" +
    '<div class="product-cat">' + productClassifierLabel(site, p) + "</div>" +
    "</div>" +
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
  var params = new URLSearchParams(window.location.search);
  // A content-type filter can still arrive via the sidebar's Product links
  // (index.html?type=slug) — honored for fetching, but the pill row itself
  // is category-based now, so no pill lights up for a type-only filter.
  var activeType = params.get("type") || "all";
  var activeCategory = params.get("category") || params.get("cat") || "all";

  if (pillRow) {
    var pills = [{ slug: "all", name: "All" }].concat(site.categories);
    pillRow.innerHTML = pills
      .map(function (c) {
        return (
          '<button class="pill' + (c.slug === activeCategory ? " active" : "") + '" data-cat="' + c.slug + '">' +
          c.name +
          "</button>"
        );
      })
      .join("");
  }

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
        activeCategory = pill.dataset.cat;
        activeType = "all";
        var url = new URL(window.location.href);
        if (activeCategory === "all") url.searchParams.delete("category");
        else url.searchParams.set("category", activeCategory);
        url.searchParams.delete("type");
        url.searchParams.delete("cat");
        history.replaceState(null, "", url);
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

      var mainEl = document.querySelector(".gallery-main");
      var thumbsEl = document.getElementById("gallery-thumbs");
      var captionEl = document.getElementById("gallery-caption");

      function normalizeItem(img) {
        if (typeof img === "string") return { url: img, type: "image", caption: "", tags: [] };
        var tags = Array.isArray(img.tags) ? img.tags : (img.keyword ? [img.keyword] : []);
        return { url: img.url, type: img.type === "video" ? "video" : "image", caption: img.caption || "", tags: tags };
      }

      var galleryItems = (product.images || []).map(normalizeItem);
      var viewerItems = [];
      var coverUrl = product.cover || product.thumb;
      if (coverUrl) viewerItems.push({ url: coverUrl, type: "image", caption: "", tags: [product.name] });
      viewerItems = viewerItems.concat(galleryItems);

      function labelFor(item) {
        return item.tags && item.tags.length ? item.tags.join(", ") : product.name;
      }

      function showItem(i) {
        var item = viewerItems[i];
        if (!item) return;
        mainEl.innerHTML = item.type === "video"
          ? '<video src="' + item.url + '" controls playsinline></video>'
          : '<img src="' + item.url + '" alt="' + escapeHTML(labelFor(item)) + '">';
        if (captionEl) {
          captionEl.textContent = item.caption || "";
          captionEl.style.display = item.caption ? "" : "none";
        }
      }

      thumbsEl.innerHTML = viewerItems
        .map(function (item, i) {
          var media = item.type === "video"
            ? '<video src="' + item.url + '" muted playsinline></video>'
            : '<img src="' + item.url + '" alt="' + escapeHTML(labelFor(item)) + '">';
          return '<button data-i="' + i + '" class="' + (i === 0 ? "active" : "") + '">' + media + "</button>";
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
      var buyNote = document.querySelector(".buy-note");
      if (buyBtn) {
        if (product.buy_url) {
          buyBtn.href = product.buy_url;
          buyBtn.target = "_blank";
          buyBtn.rel = "noopener";
          if (buyNote) buyNote.style.display = "none";
        } else {
          var subject = encodeURIComponent("Purchase request: " + product.name);
          var body = encodeURIComponent(
            "Hi " + site.settings.site_name + ",\n\nI'd like to purchase \"" + product.name + "\" (" +
            formatPrice(product.price) + ").\n\nPlease send payment instructions.\n"
          );
          buyBtn.href = "mailto:hello@gridlab.co?subject=" + subject + "&body=" + body;
        }
      }

      renderProductGrid(site, "related-grid", data.related);
    })
    .catch(function () {
      container.innerHTML = '<div class="empty-state">This design could not be found.</div>';
    });
}

// ---------- Page: page.html (generic CMS page) ----------

function teamAvatarsHTML() {
  var colors = ["#c6ff5e", "#7ee8fa", "#ffb86b"];
  return (
    '<div class="team-avatars">' +
    colors
      .map(function (bg) {
        return (
          '<span class="team-avatar" style="background:' + bg + '">' +
          '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
          '<circle cx="12" cy="8.5" r="4" fill="rgba(0,0,0,0.55)"/>' +
          '<path d="M4 20.5c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="rgba(0,0,0,0.55)"/>' +
          "</svg>" +
          "</span>"
        );
      })
      .join("") +
    "</div>"
  );
}

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
      var bodyHTML;

      if (slug === "about" && paragraphs.length) {
        var intro = "<p>" + paragraphs[0] + "</p>";
        var rest = paragraphs
          .slice(1)
          .map(function (p) { return "<p>" + p + "</p>"; })
          .join("");
        bodyHTML =
          '<div class="page-body">' + intro + "</div>" +
          teamAvatarsHTML() +
          '<div class="page-body team-intro">' +
          "<p>GridLab is an independent, global design and development studio operating across Dhaka, Toronto, and New York. Founded by three long-time friends and collaborators, we bring together an international perspective with a deep commitment to craft.</p>" +
          "<p>We bridge the gap between complex engineering and intuitive user experience. Whether architecting scalable design systems, building modern web applications, or launching brand platforms, we focus on turning tough, ambiguous challenges into seamless digital products that deliver real, measurable impact.</p>" +
          "</div>" +
          '<div class="page-body">' + rest + "</div>";
      } else {
        bodyHTML =
          '<div class="page-body">' +
          paragraphs.map(function (p) { return "<p>" + p + "</p>"; }).join("") +
          "</div>";
      }

      container.innerHTML = '<div class="page-header"><h1>' + page.title + "</h1></div>" + bodyHTML;
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
