function api(path, opts) {
  opts = opts || {};
  var headers = opts.headers || {};
  var body = opts.body;
  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(body);
  }
  return fetch(path, { method: opts.method || "GET", headers: headers, body: body, credentials: "same-origin" }).then(
    function (r) {
      return r.json().then(function (data) {
        if (!r.ok) throw new Error(data.error || "Request failed.");
        return data;
      });
    }
  );
}

function escapeHTML(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function slugify(s) {
  return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function toast(message, isError) {
  var el = document.getElementById("admin-toast");
  if (!el) return;
  el.textContent = message;
  el.className = "admin-toast visible" + (isError ? " error" : "");
  clearTimeout(toast._t);
  toast._t = setTimeout(function () {
    el.classList.remove("visible");
  }, 3000);
}

// ================= Login page =================

(function initLoginForm() {
  var form = document.getElementById("login-form");
  if (!form) return;
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var errorEl = document.getElementById("login-error");
    errorEl.textContent = "";
    var password = document.getElementById("password").value;
    api("/api/admin/login", { method: "POST", body: { password: password } })
      .then(function () {
        window.location.href = "index.html";
      })
      .catch(function (err) {
        errorEl.textContent = err.message;
      });
  });
})();

// ================= Admin shell =================

(function initAdminShell() {
  var nav = document.getElementById("admin-nav");
  if (!nav) return;

  api("/api/admin/me")
    .then(function (data) {
      if (!data.authenticated) {
        window.location.href = "login.html";
        return;
      }
      boot();
    })
    .catch(function () {
      window.location.href = "login.html";
    });

  function boot() {
    var tabs = ["settings", "categories", "pages", "ventures", "products", "hire-requests", "account"];
    var renderers = {
      settings: renderSettings,
      categories: renderCategories,
      pages: renderPages,
      ventures: renderVentures,
      products: renderProducts,
      "hire-requests": renderHireRequests,
      account: renderAccount
    };

    function activate(tab) {
      if (tabs.indexOf(tab) === -1) tab = "settings";
      nav.querySelectorAll("a").forEach(function (a) {
        a.classList.toggle("active", a.dataset.tab === tab);
      });
      document.querySelectorAll(".admin-panel").forEach(function (p) {
        p.classList.toggle("active", p.id === "panel-" + tab);
      });
      renderers[tab]();
    }

    window.addEventListener("hashchange", function () {
      activate(window.location.hash.replace("#", ""));
    });

    document.getElementById("logout-btn").addEventListener("click", function () {
      api("/api/admin/logout", { method: "POST" }).then(function () {
        window.location.href = "login.html";
      });
    });

    activate(window.location.hash.replace("#", "") || "settings");
  }
})();

// ================= Settings panel =================

function renderSettings() {
  var el = document.getElementById("panel-settings");
  el.innerHTML = '<h1>Site Settings</h1><p class="panel-sub">Loading…</p>';

  api("/api/admin/settings").then(function (s) {
    el.innerHTML =
      "<h1>Site Settings</h1>" +
      '<p class="panel-sub">Controls the logo, homepage header, footer, and Hire Us page copy across the whole site.</p>' +
      '<div class="card">' +
      "<h2>Logo</h2>" +
      '<div style="display:flex;align-items:center;gap:16px;">' +
      '<div class="logo-preview" id="logo-preview">' +
      (s.logo_url ? '<img src="' + s.logo_url + '" alt="">' : "<span style=\"font-size:11px;color:var(--text-faint)\">Default</span>") +
      "</div>" +
      '<div style="display:flex;flex-direction:column;gap:8px;">' +
      '<input type="file" id="logo-file" accept="image/*">' +
      '<div style="display:flex;gap:8px;">' +
      '<button class="btn btn-sm" id="logo-upload-btn" type="button">Upload logo</button>' +
      '<button class="btn btn-sm" id="logo-reset-btn" type="button">Use default mark</button>' +
      "</div>" +
      "</div>" +
      "</div>" +
      "</div>" +
      '<form class="card" id="settings-form">' +
      "<h2>Content</h2>" +
      '<div class="form-row"><label>Site name</label><input name="site_name" value="' + escapeHTML(s.site_name) + '"></div>' +
      '<div class="form-row"><label>Homepage title</label><input name="content_title" value="' + escapeHTML(s.content_title) + '"></div>' +
      '<div class="form-row"><label>Homepage description</label><input name="content_description" value="' + escapeHTML(s.content_description) + '"></div>' +
      "<h2 style=\"margin-top:24px;\">Footer</h2>" +
      '<div class="form-row"><label>Footer quote</label><textarea name="footer_quote" rows="2">' + escapeHTML(s.footer_quote) + "</textarea></div>" +
      '<div class="form-row"><label>Footer note</label><input name="footer_note" value="' + escapeHTML(s.footer_note) + '"></div>' +
      '<div class="form-row"><label>Copyright name</label><input name="copyright_name" value="' + escapeHTML(s.copyright_name) + '"></div>' +
      '<div class="form-two">' +
      '<div class="form-row"><label>Partner link label</label><input name="partner_label" value="' + escapeHTML(s.partner_label) + '"></div>' +
      '<div class="form-row"><label>Partner link URL</label><input name="partner_url" value="' + escapeHTML(s.partner_url) + '"></div>' +
      "</div>" +
      "<h2 style=\"margin-top:24px;\">Hire Us page</h2>" +
      '<div class="form-row"><label>Heading</label><input name="hire_title" value="' + escapeHTML(s.hire_title) + '"></div>' +
      '<div class="form-row"><label>Description</label><textarea name="hire_description" rows="2">' + escapeHTML(s.hire_description) + "</textarea></div>" +
      '<button type="submit" class="btn btn-primary" style="margin-top:8px;">Save Settings</button>' +
      "</form>";

    document.getElementById("settings-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var data = Object.fromEntries(new FormData(e.target).entries());
      api("/api/admin/settings", { method: "PUT", body: data })
        .then(function () { toast("Settings saved."); })
        .catch(function (err) { toast(err.message, true); });
    });

    document.getElementById("logo-upload-btn").addEventListener("click", function () {
      var fileInput = document.getElementById("logo-file");
      if (!fileInput.files[0]) return toast("Choose an image file first.", true);
      var fd = new FormData();
      fd.append("file", fileInput.files[0]);
      api("/api/admin/upload/logo", { method: "POST", body: fd })
        .then(function (res) { return api("/api/admin/settings", { method: "PUT", body: { logo_url: res.url } }); })
        .then(function () {
          toast("Logo updated.");
          renderSettings();
        })
        .catch(function (err) { toast(err.message, true); });
    });

    document.getElementById("logo-reset-btn").addEventListener("click", function () {
      api("/api/admin/settings", { method: "PUT", body: { logo_url: null } })
        .then(function () {
          toast("Logo reset to default mark.");
          renderSettings();
        })
        .catch(function (err) { toast(err.message, true); });
    });
  });
}

// ================= Categories panel =================

function renderCategories() {
  var el = document.getElementById("panel-categories");
  el.innerHTML = '<h1>Categories</h1><p class="panel-sub">Loading…</p>';

  api("/api/admin/categories").then(function (categories) {
    el.innerHTML =
      "<h1>Categories</h1>" +
      '<p class="panel-sub">These power both the sidebar’s Browse section and the category filter pills on the homepage.</p>' +
      '<form class="card" id="add-category-form">' +
      "<h2>Add category</h2>" +
      '<div class="form-two">' +
      '<div class="form-row"><label>Name</label><input name="name" id="cat-name-input" required></div>' +
      '<div class="form-row"><label>Slug</label><input name="slug" id="cat-slug-input" required></div>' +
      "</div>" +
      '<button type="submit" class="btn btn-primary">Add Category</button>' +
      "</form>" +
      '<div class="card"><table><thead><tr><th>Name</th><th>Slug</th><th></th></tr></thead><tbody id="categories-tbody"></tbody></table></div>';

    var nameInput = document.getElementById("cat-name-input");
    var slugInput = document.getElementById("cat-slug-input");
    var slugTouched = false;
    slugInput.addEventListener("input", function () { slugTouched = true; });
    nameInput.addEventListener("input", function () {
      if (!slugTouched) slugInput.value = slugify(nameInput.value);
    });

    document.getElementById("add-category-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var data = Object.fromEntries(new FormData(e.target).entries());
      api("/api/admin/categories", { method: "POST", body: data })
        .then(function () { toast("Category added."); renderCategories(); })
        .catch(function (err) { toast(err.message, true); });
    });

    var tbody = document.getElementById("categories-tbody");
    if (!categories.length) {
      tbody.innerHTML = '<tr><td colspan="3" class="empty-row">No categories yet.</td></tr>';
      return;
    }

    categories.forEach(function (cat, i) {
      var row = document.createElement("tr");
      row.innerHTML =
        "<td>" + escapeHTML(cat.name) + "</td>" +
        "<td>" + escapeHTML(cat.slug) + "</td>" +
        '<td><div class="row-actions">' +
        '<button class="btn btn-sm" data-action="up"' + (i === 0 ? " disabled" : "") + ">&uarr;</button>" +
        '<button class="btn btn-sm" data-action="down"' + (i === categories.length - 1 ? " disabled" : "") + ">&darr;</button>" +
        '<button class="btn btn-sm" data-action="edit">Edit</button>' +
        '<button class="btn btn-sm btn-danger" data-action="delete">Delete</button>' +
        "</div></td>";

      row.querySelector('[data-action="delete"]').addEventListener("click", function () {
        if (!confirm('Delete category "' + cat.name + '"? Products in this category will keep their old category value.')) return;
        api("/api/admin/categories/" + cat.id, { method: "DELETE" }).then(function () {
          toast("Category deleted.");
          renderCategories();
        });
      });

      row.querySelector('[data-action="up"]').addEventListener("click", function () {
        var prev = categories[i - 1];
        Promise.all([
          api("/api/admin/categories/" + cat.id, { method: "PUT", body: { sort_order: prev.sort_order } }),
          api("/api/admin/categories/" + prev.id, { method: "PUT", body: { sort_order: cat.sort_order } })
        ]).then(renderCategories);
      });

      row.querySelector('[data-action="down"]').addEventListener("click", function () {
        var next = categories[i + 1];
        Promise.all([
          api("/api/admin/categories/" + cat.id, { method: "PUT", body: { sort_order: next.sort_order } }),
          api("/api/admin/categories/" + next.id, { method: "PUT", body: { sort_order: cat.sort_order } })
        ]).then(renderCategories);
      });

      row.querySelector('[data-action="edit"]').addEventListener("click", function () {
        row.innerHTML =
          '<td><input type="text" value="' + escapeHTML(cat.name) + '" id="edit-name-' + cat.id + '"></td>' +
          '<td><input type="text" value="' + escapeHTML(cat.slug) + '" id="edit-slug-' + cat.id + '"></td>' +
          '<td><div class="row-actions">' +
          '<button class="btn btn-sm btn-primary" data-action="save">Save</button>' +
          '<button class="btn btn-sm" data-action="cancel">Cancel</button>' +
          "</div></td>";
        row.querySelector('[data-action="cancel"]').addEventListener("click", renderCategories);
        row.querySelector('[data-action="save"]').addEventListener("click", function () {
          var name = document.getElementById("edit-name-" + cat.id).value;
          var slug = document.getElementById("edit-slug-" + cat.id).value;
          api("/api/admin/categories/" + cat.id, { method: "PUT", body: { name: name, slug: slug } })
            .then(function () { toast("Category updated."); renderCategories(); })
            .catch(function (err) { toast(err.message, true); });
        });
      });

      tbody.appendChild(row);
    });
  });
}

// ================= Pages panel =================

function renderPages() {
  var el = document.getElementById("panel-pages");
  el.innerHTML = '<h1>Studio Pages</h1><p class="panel-sub">Loading…</p>';

  api("/api/admin/pages").then(function (pages) {
    el.innerHTML =
      "<h1>Studio Pages</h1>" +
      '<p class="panel-sub">These appear in the sidebar’s Studio section, after the built-in Hire Us link. Add, edit, or remove pages freely.</p>' +
      '<form class="card" id="add-page-form">' +
      "<h2>Add page</h2>" +
      '<div class="form-two">' +
      '<div class="form-row"><label>Title</label><input name="title" id="page-title-input" required></div>' +
      '<div class="form-row"><label>Slug</label><input name="slug" id="page-slug-input" required></div>' +
      "</div>" +
      '<div class="form-row"><label>Body</label><textarea name="body" rows="4" placeholder="Separate paragraphs with a blank line."></textarea></div>' +
      '<button type="submit" class="btn btn-primary">Add Page</button>' +
      "</form>" +
      '<div class="card"><table><thead><tr><th>Title</th><th>Slug</th><th></th></tr></thead><tbody id="pages-tbody"></tbody></table></div>';

    var titleInput = document.getElementById("page-title-input");
    var slugInput = document.getElementById("page-slug-input");
    var slugTouched = false;
    slugInput.addEventListener("input", function () { slugTouched = true; });
    titleInput.addEventListener("input", function () {
      if (!slugTouched) slugInput.value = slugify(titleInput.value);
    });

    document.getElementById("add-page-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var data = Object.fromEntries(new FormData(e.target).entries());
      api("/api/admin/pages", { method: "POST", body: data })
        .then(function () { toast("Page added."); renderPages(); })
        .catch(function (err) { toast(err.message, true); });
    });

    var tbody = document.getElementById("pages-tbody");
    if (!pages.length) {
      tbody.innerHTML = '<tr><td colspan="3" class="empty-row">No pages yet.</td></tr>';
      return;
    }

    pages.forEach(function (page) {
      var row = document.createElement("tr");
      row.innerHTML =
        "<td>" + escapeHTML(page.title) + "</td>" +
        "<td>" + escapeHTML(page.slug) + "</td>" +
        '<td><div class="row-actions">' +
        '<button class="btn btn-sm" data-action="edit">Edit</button>' +
        '<button class="btn btn-sm btn-danger" data-action="delete">Delete</button>' +
        "</div></td>";

      row.querySelector('[data-action="delete"]').addEventListener("click", function () {
        if (!confirm('Delete page "' + page.title + '"? It will be removed from the Studio nav too.')) return;
        api("/api/admin/pages/" + page.id, { method: "DELETE" }).then(function () {
          toast("Page deleted.");
          renderPages();
        });
      });

      row.querySelector('[data-action="edit"]').addEventListener("click", function () {
        el.querySelectorAll(".card.editing").forEach(function (c) { c.remove(); });
        var editCard = document.createElement("div");
        editCard.className = "card editing";
        editCard.innerHTML =
          "<h2>Edit page</h2>" +
          '<div class="form-two">' +
          '<div class="form-row"><label>Title</label><input id="edit-title" value="' + escapeHTML(page.title) + '"></div>' +
          '<div class="form-row"><label>Slug</label><input id="edit-slug" value="' + escapeHTML(page.slug) + '"></div>' +
          "</div>" +
          '<div class="form-row"><label>Body</label><textarea id="edit-body" rows="8">' + escapeHTML(page.body) + "</textarea></div>" +
          '<div style="display:flex;gap:8px;">' +
          '<button class="btn btn-primary" id="edit-save">Save Changes</button>' +
          '<button class="btn" id="edit-cancel">Cancel</button>' +
          "</div>";
        el.appendChild(editCard);
        editCard.scrollIntoView({ behavior: "smooth", block: "center" });

        document.getElementById("edit-cancel").addEventListener("click", function () { editCard.remove(); });
        document.getElementById("edit-save").addEventListener("click", function () {
          var body = {
            title: document.getElementById("edit-title").value,
            slug: document.getElementById("edit-slug").value,
            body: document.getElementById("edit-body").value
          };
          api("/api/admin/pages/" + page.id, { method: "PUT", body: body })
            .then(function () { toast("Page updated."); renderPages(); })
            .catch(function (err) { toast(err.message, true); });
        });
      });

      tbody.appendChild(row);
    });
  });
}

// ================= Ventures panel =================

function renderVentures() {
  var el = document.getElementById("panel-ventures");
  el.innerHTML = '<h1>Ventures</h1><p class="panel-sub">Loading…</p>';

  api("/api/admin/ventures").then(function (ventures) {
    el.innerHTML =
      '<div class="section-head"><div>' +
      "<h1>Ventures</h1>" +
      '<p class="panel-sub" style="margin-bottom:0;">Shown on the public Ventures page under Studio.</p>' +
      "</div><button class=\"btn btn-primary\" id=\"add-venture-btn\">Add Venture</button></div>" +
      '<div id="venture-form-slot"></div>' +
      '<div class="card"><table><thead><tr><th></th><th>Name</th><th>Category</th><th></th></tr></thead><tbody id="ventures-tbody"></tbody></table></div>';

    document.getElementById("add-venture-btn").addEventListener("click", function () {
      showVentureForm(null);
    });

    var tbody = document.getElementById("ventures-tbody");
    if (!ventures.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-row">No ventures yet.</td></tr>';
      return;
    }

    ventures.forEach(function (v) {
      var row = document.createElement("tr");
      row.innerHTML =
        '<td class="thumb-cell">' + (v.logo_url ? '<img src="' + v.logo_url + '" alt="">' : "") + "</td>" +
        "<td>" + escapeHTML(v.name) + "</td>" +
        "<td>" + escapeHTML(v.category) + "</td>" +
        '<td><div class="row-actions">' +
        '<button class="btn btn-sm" data-action="edit">Edit</button>' +
        '<button class="btn btn-sm btn-danger" data-action="delete">Delete</button>' +
        "</div></td>";

      row.querySelector('[data-action="delete"]').addEventListener("click", function () {
        if (!confirm('Delete "' + v.name + '"?')) return;
        api("/api/admin/ventures/" + v.id, { method: "DELETE" }).then(function () {
          toast("Venture deleted.");
          renderVentures();
        });
      });

      row.querySelector('[data-action="edit"]').addEventListener("click", function () {
        showVentureForm(v);
      });

      tbody.appendChild(row);
    });
  });
}

function showVentureForm(venture) {
  var slot = document.getElementById("venture-form-slot");
  var isEdit = !!venture;
  var logoUrl = venture ? venture.logo_url : null;

  slot.innerHTML =
    '<div class="card">' +
    "<h2>" + (isEdit ? "Edit venture" : "New venture") + "</h2>" +
    '<div class="form-two">' +
    '<div class="form-row"><label>Name</label><input id="vf-name" value="' + escapeHTML(venture ? venture.name : "") + '"></div>' +
    '<div class="form-row"><label>Slug</label><input id="vf-slug" value="' + escapeHTML(venture ? venture.slug : "") + '" placeholder="auto from name"></div>' +
    "</div>" +
    '<div class="form-two">' +
    '<div class="form-row"><label>Category</label><input id="vf-category" value="' + escapeHTML(venture ? venture.category : "") + '" placeholder="e.g. Website & App Builder"></div>' +
    '<div class="form-row"><label>Link URL</label><input id="vf-link" value="' + escapeHTML(venture ? venture.link_url : "") + '" placeholder="https://..."></div>' +
    "</div>" +
    '<div class="form-row"><label>Description</label><textarea id="vf-description" rows="3">' + escapeHTML(venture ? venture.description : "") + "</textarea></div>" +
    '<div class="form-row"><label>Logo image</label><input type="file" id="vf-logo-file" accept="image/*">' +
    '<div id="vf-logo-preview" style="margin-top:6px;"></div></div>' +
    '<div style="display:flex;gap:8px;margin-top:8px;">' +
    '<button class="btn btn-primary" id="vf-save">' + (isEdit ? "Save Changes" : "Create Venture") + "</button>" +
    '<button class="btn" id="vf-cancel">Cancel</button>' +
    "</div>" +
    "</div>";

  function renderLogoPreview() {
    var box = document.getElementById("vf-logo-preview");
    box.innerHTML = logoUrl ? '<img src="' + logoUrl + '" style="width:56px;height:56px;object-fit:cover;border-radius:8px;">' : "";
  }
  renderLogoPreview();

  document.getElementById("vf-logo-file").addEventListener("change", function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var fd = new FormData();
    fd.append("file", file);
    api("/api/admin/upload/venture", { method: "POST", body: fd })
      .then(function (res) {
        logoUrl = res.url;
        renderLogoPreview();
      })
      .catch(function (err) { toast(err.message, true); });
  });

  document.getElementById("vf-cancel").addEventListener("click", function () { slot.innerHTML = ""; });

  document.getElementById("vf-save").addEventListener("click", function () {
    var body = {
      name: document.getElementById("vf-name").value,
      slug: document.getElementById("vf-slug").value || undefined,
      category: document.getElementById("vf-category").value,
      link: document.getElementById("vf-link").value,
      description: document.getElementById("vf-description").value,
      logo: logoUrl
    };
    if (!body.name) return toast("Name is required.", true);

    var request = isEdit
      ? api("/api/admin/ventures/" + venture.id, { method: "PUT", body: body })
      : api("/api/admin/ventures", { method: "POST", body: body });

    request
      .then(function () {
        toast(isEdit ? "Venture updated." : "Venture created.");
        renderVentures();
      })
      .catch(function (err) { toast(err.message, true); });
  });

  slot.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ================= Products panel =================

var ASPECT_OPTIONS = ["4 / 3", "3 / 4", "1 / 1", "16 / 9", "16 / 10", "4 / 5"];

function renderProducts() {
  var el = document.getElementById("panel-products");
  el.innerHTML = '<h1>Products</h1><p class="panel-sub">Loading…</p>';

  Promise.all([api("/api/admin/products"), api("/api/admin/categories")]).then(function (res) {
    var products = res[0];
    var categories = res[1];

    el.innerHTML =
      '<div class="section-head"><div>' +
      "<h1>Products</h1>" +
      '<p class="panel-sub" style="margin-bottom:0;">Design assets shown in the marketplace grid.</p>' +
      "</div><button class=\"btn btn-primary\" id=\"add-product-btn\">Add Product</button></div>" +
      '<div id="product-form-slot"></div>' +
      '<div class="card"><table><thead><tr><th></th><th>Name</th><th>Category</th><th>Price</th><th></th></tr></thead><tbody id="products-tbody"></tbody></table></div>';

    document.getElementById("add-product-btn").addEventListener("click", function () {
      showProductForm(null, categories);
    });

    var tbody = document.getElementById("products-tbody");
    if (!products.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-row">No products yet.</td></tr>';
      return;
    }

    products.forEach(function (p) {
      var row = document.createElement("tr");
      row.innerHTML =
        '<td class="thumb-cell">' + (p.thumb ? '<img src="' + p.thumb + '" alt="">' : "") + "</td>" +
        "<td>" + escapeHTML(p.name) + "</td>" +
        "<td>" + escapeHTML(p.category_slug) + "</td>" +
        "<td>$" + p.price + "</td>" +
        '<td><div class="row-actions">' +
        '<button class="btn btn-sm" data-action="edit">Edit</button>' +
        '<button class="btn btn-sm btn-danger" data-action="delete">Delete</button>' +
        "</div></td>";

      row.querySelector('[data-action="delete"]').addEventListener("click", function () {
        if (!confirm('Delete "' + p.name + '"?')) return;
        api("/api/admin/products/" + p.id, { method: "DELETE" }).then(function () {
          toast("Product deleted.");
          renderProducts();
        });
      });

      row.querySelector('[data-action="edit"]').addEventListener("click", function () {
        showProductForm(p, categories);
      });

      tbody.appendChild(row);
    });
  });
}

function showProductForm(product, categories) {
  var slot = document.getElementById("product-form-slot");
  var isEdit = !!product;
  var galleryUrls = product ? (product.images || []).slice() : [];
  var thumbUrl = product ? product.thumb : null;

  var categoryOptions = categories
    .map(function (c) {
      var selected = product && product.category_slug === c.slug ? " selected" : "";
      return '<option value="' + c.slug + '"' + selected + ">" + escapeHTML(c.name) + "</option>";
    })
    .join("");

  var aspectOptions = ASPECT_OPTIONS.map(function (a) {
    var selected = product && product.aspect === a ? " selected" : "";
    return '<option value="' + a + '"' + selected + ">" + a + "</option>";
  }).join("");

  slot.innerHTML =
    '<div class="card">' +
    "<h2>" + (isEdit ? "Edit product" : "New product") + "</h2>" +
    '<div class="form-two">' +
    '<div class="form-row"><label>Name</label><input id="pf-name" value="' + escapeHTML(product ? product.name : "") + '"></div>' +
    '<div class="form-row"><label>Slug</label><input id="pf-slug" value="' + escapeHTML(product ? product.slug : "") + '" placeholder="auto from name"></div>' +
    "</div>" +
    '<div class="form-two">' +
    '<div class="form-row"><label>Category</label><select id="pf-category">' + categoryOptions + "</select></div>" +
    '<div class="form-row"><label>Price (USD)</label><input id="pf-price" type="number" min="0" step="1" value="' + (product ? product.price : "") + '"></div>' +
    "</div>" +
    '<div class="form-two">' +
    '<div class="form-row"><label>Formats</label><input id="pf-formats" value="' + escapeHTML(product ? product.formats : "") + '" placeholder="Figma, PNG..."></div>' +
    '<div class="form-row"><label>License</label><input id="pf-license" value="' + escapeHTML(product ? product.license : "Standard License") + '"></div>' +
    "</div>" +
    '<div class="form-row"><label>Aspect ratio</label><select id="pf-aspect">' + aspectOptions + "</select></div>" +
    '<div class="form-row"><label>Description</label><textarea id="pf-description" rows="4">' + escapeHTML(product ? product.description : "") + "</textarea></div>" +
    '<div class="form-row"><label>Thumbnail image</label><input type="file" id="pf-thumb-file" accept="image/*">' +
    '<div id="pf-thumb-preview" style="margin-top:6px;"></div></div>' +
    '<div class="form-row"><label>Gallery images (multiple)</label><input type="file" id="pf-gallery-file" accept="image/*" multiple>' +
    '<div id="pf-gallery-preview" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;"></div></div>' +
    '<div style="display:flex;gap:8px;margin-top:8px;">' +
    '<button class="btn btn-primary" id="pf-save">' + (isEdit ? "Save Changes" : "Create Product") + "</button>" +
    '<button class="btn" id="pf-cancel">Cancel</button>' +
    "</div>" +
    "</div>";

  function renderThumbPreview() {
    var box = document.getElementById("pf-thumb-preview");
    box.innerHTML = thumbUrl ? '<img src="' + thumbUrl + '" style="width:64px;height:64px;object-fit:cover;border-radius:8px;">' : "";
  }
  function renderGalleryPreview() {
    var box = document.getElementById("pf-gallery-preview");
    box.innerHTML = galleryUrls
      .map(function (url, i) {
        return (
          '<div style="position:relative;">' +
          '<img src="' + url + '" style="width:56px;height:56px;object-fit:cover;border-radius:8px;display:block;">' +
          '<button type="button" data-i="' + i + '" style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;border:1px solid var(--border);background:#fff;font-size:11px;line-height:1;cursor:pointer;">&times;</button>' +
          "</div>"
        );
      })
      .join("");
    box.querySelectorAll("button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        galleryUrls.splice(parseInt(btn.dataset.i, 10), 1);
        renderGalleryPreview();
      });
    });
  }
  renderThumbPreview();
  renderGalleryPreview();

  document.getElementById("pf-thumb-file").addEventListener("change", function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var fd = new FormData();
    fd.append("file", file);
    api("/api/admin/upload/product", { method: "POST", body: fd })
      .then(function (res) {
        thumbUrl = res.url;
        renderThumbPreview();
      })
      .catch(function (err) { toast(err.message, true); });
  });

  document.getElementById("pf-gallery-file").addEventListener("change", function (e) {
    var files = Array.from(e.target.files || []);
    var chain = Promise.resolve();
    files.forEach(function (file) {
      chain = chain
        .then(function () {
          var fd = new FormData();
          fd.append("file", file);
          return api("/api/admin/upload/product", { method: "POST", body: fd });
        })
        .then(function (res) {
          galleryUrls.push(res.url);
          renderGalleryPreview();
        });
    });
    chain.catch(function (err) { toast(err.message, true); });
  });

  document.getElementById("pf-cancel").addEventListener("click", function () { slot.innerHTML = ""; });

  document.getElementById("pf-save").addEventListener("click", function () {
    var body = {
      name: document.getElementById("pf-name").value,
      slug: document.getElementById("pf-slug").value || undefined,
      category: document.getElementById("pf-category").value,
      price: document.getElementById("pf-price").value,
      formats: document.getElementById("pf-formats").value,
      license: document.getElementById("pf-license").value,
      aspect: document.getElementById("pf-aspect").value,
      description: document.getElementById("pf-description").value,
      thumb: thumbUrl || (galleryUrls[0] || null),
      images: galleryUrls
    };
    if (!body.name) return toast("Name is required.", true);

    var request = isEdit
      ? api("/api/admin/products/" + product.id, { method: "PUT", body: body })
      : api("/api/admin/products", { method: "POST", body: body });

    request
      .then(function () {
        toast(isEdit ? "Product updated." : "Product created.");
        renderProducts();
      })
      .catch(function (err) { toast(err.message, true); });
  });

  slot.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ================= Hire requests panel =================

function renderHireRequests() {
  var el = document.getElementById("panel-hire-requests");
  el.innerHTML = '<h1>Hire Requests</h1><p class="panel-sub">Loading…</p>';

  api("/api/admin/hire-requests").then(function (rows) {
    el.innerHTML =
      "<h1>Hire Requests</h1>" +
      '<p class="panel-sub">Submissions from the Hire Us form, newest first.</p>' +
      '<div class="card"><table><thead><tr><th>Name</th><th>Email</th><th>Company</th><th>Type</th><th>Budget</th><th>Message</th><th>Date</th></tr></thead><tbody id="hire-tbody"></tbody></table></div>';

    var tbody = document.getElementById("hire-tbody");
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-row">No requests yet.</td></tr>';
      return;
    }

    tbody.innerHTML = rows
      .map(function (r) {
        return (
          "<tr>" +
          "<td>" + escapeHTML(r.name) + "</td>" +
          "<td>" + escapeHTML(r.email) + "</td>" +
          "<td>" + escapeHTML(r.company) + "</td>" +
          "<td>" + escapeHTML(r.project_type) + "</td>" +
          "<td>" + escapeHTML(r.budget) + "</td>" +
          '<td style="max-width:260px;white-space:normal;">' + escapeHTML(r.message) + "</td>" +
          "<td>" + escapeHTML(r.created_at) + "</td>" +
          "</tr>"
        );
      })
      .join("");
  });
}

// ================= Account panel =================

function renderAccount() {
  var el = document.getElementById("panel-account");
  el.innerHTML =
    "<h1>Account</h1>" +
    '<p class="panel-sub">Change the password used to log in to this admin panel.</p>' +
    '<form class="card" id="password-form">' +
    '<div class="form-row"><label>Current password</label><input type="password" id="current-password" required></div>' +
    '<div class="form-row"><label>New password</label><input type="password" id="new-password" required minlength="6"></div>' +
    '<button type="submit" class="btn btn-primary">Update Password</button>' +
    "</form>";

  document.getElementById("password-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var body = {
      currentPassword: document.getElementById("current-password").value,
      newPassword: document.getElementById("new-password").value
    };
    api("/api/admin/change-password", { method: "POST", body: body })
      .then(function () {
        toast("Password updated.");
        e.target.reset();
      })
      .catch(function (err) { toast(err.message, true); });
  });
}
