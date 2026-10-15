/* Marrowmere site behaviour. Plain script: no modules, no build, no cookies, no storage.
   Loaded as <script src="js/config.js"></script><script src="js/site.js" defer></script>.
   window.Marrowmere exposes the pure helpers for website/tools/tests/test_site_js.mjs. */
(function (w, d) {
  "use strict";

  var SOON_TEXT = "Coming soon";
  var SIGNUP_SOON = "Mailing list opens soon. Wishlist on Steam to hear first.";
  var SIGNUP_BUSY = "Sending…";
  var SIGNUP_OK = "Thank you. You are on the list.";
  var SIGNUP_FAIL = "That did not go through. Please try again later.";

  // html.js switches off the CSS no-script fallbacks (see site.css, "Header and navigation").
  d.documentElement.classList.add("js");

  function each(list, fn) {
    for (var i = 0; i < list.length; i++) fn(list[i], i);
  }

  function getPath(obj, path) {
    if (obj === null || obj === undefined || typeof path !== "string" || path === "") return undefined;
    var parts = path.split(".");
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur === null || typeof cur !== "object" || !Object.prototype.hasOwnProperty.call(cur, parts[i])) {
        return undefined;
      }
      cur = cur[parts[i]];
    }
    return cur;
  }

  function reducedMotion() {
    return !!(w.matchMedia && w.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function applyConfig(config, root) {
    config = config || w.MARROWMERE_CONFIG || {};
    root = root || d;
    each(root.querySelectorAll("[data-cfg]"), function (el) {
      var v = getPath(config, el.getAttribute("data-cfg"));
      if (typeof v === "string" || typeof v === "number") el.textContent = String(v);
    });
    each(root.querySelectorAll("[data-cfg-href]"), function (el) {
      var v = getPath(config, el.getAttribute("data-cfg-href"));
      var url = typeof v === "string" ? v.trim() : "";
      if (url) {
        el.setAttribute("href", url);
        el.classList.remove("is-soon");
        el.removeAttribute("aria-disabled");
        el.removeAttribute("role");
      } else {
        el.removeAttribute("href");
        el.classList.add("is-soon");
        el.setAttribute("role", "link");
        el.setAttribute("aria-disabled", "true");
        el.textContent = el.getAttribute("data-soon") || SOON_TEXT;
      }
    });
    each(root.querySelectorAll("[data-cfg-mailto]"), function (el) {
      var v = getPath(config, el.getAttribute("data-cfg-mailto"));
      var addr = typeof v === "string" ? v.trim() : "";
      if (addr) {
        el.setAttribute("href", "mailto:" + addr);
        el.textContent = addr;
      }
    });
  }

  function initNav() {
    var btn = d.querySelector(".nav-toggle");
    var nav = d.getElementById("site-nav");
    if (!btn || !nav) return;
    function setOpen(open) {
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    }
    btn.addEventListener("click", function () {
      setOpen(btn.getAttribute("aria-expanded") !== "true");
    });
    d.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && btn.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        btn.focus();
      }
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest("a[href]")) setOpen(false);
    });
    if (w.matchMedia) {
      var wide = w.matchMedia("(min-width: 760px)");
      var onWide = function (e) { if (e.matches) setOpen(false); };
      if (wide.addEventListener) wide.addEventListener("change", onWide);
    }
  }

  function initHoverVideos() {
    each(d.querySelectorAll("video[data-hover]"), function (v) {
      var card = v.closest(".place-card") || v.parentNode;
      v.muted = true;
      v.addEventListener("playing", function () { card.classList.add("is-playing"); });
      function play(e) {
        if (e && e.pointerType === "touch") return;   // taps never start a download
        if (reducedMotion() || d.body.classList.contains("reduce-motion")) return;
        var p;
        try { p = v.play(); } catch (err) { return; }
        if (p && typeof p.catch === "function") p.catch(function () {});
      }
      function stop() {
        card.classList.remove("is-playing");
        v.pause();
        try { v.currentTime = 0; } catch (err) { /* not seekable before metadata */ }
      }
      card.addEventListener("pointerenter", play);
      card.addEventListener("pointerleave", stop);
      // A tap focuses the tabindex card too, so focus plays only when it is keyboard focus
      // (:focus-visible); a tap or click focus never starts the download.
      card.addEventListener("focusin", function (e) {
        var t = e.target;
        try { if (t && t.matches && !t.matches(":focus-visible")) return; } catch (err) { /* no :focus-visible: play */ }
        play();
      });
      card.addEventListener("focusout", function (e) {
        if (!e.relatedTarget || !card.contains(e.relatedTarget)) stop();
      });
    });
  }

  function initLightbox() {
    var links = d.querySelectorAll("a[data-lightbox]");
    if (!links.length) return;
    var dlg = d.createElement("dialog");
    if (typeof dlg.showModal !== "function") return;   // old browser: links open the image
    dlg.id = "lightbox";
    dlg.setAttribute("aria-label", "Image viewer");
    dlg.innerHTML =
      '<figure class="lightbox__figure">' +
      '<img class="lightbox__img" alt="">' +
      '<figcaption class="lightbox__caption"></figcaption>' +
      "</figure>" +
      '<p class="lightbox__count" aria-live="polite"></p>' +
      '<button class="btn btn--ghost lightbox__prev" type="button" aria-label="Previous image">&larr;</button>' +
      '<button class="btn btn--ghost lightbox__next" type="button" aria-label="Next image">&rarr;</button>' +
      '<button class="btn btn--ghost lightbox__close" type="button" aria-label="Close" autofocus>&times;</button>';
    d.body.appendChild(dlg);
    var fig = dlg.querySelector(".lightbox__figure");
    var img = dlg.querySelector(".lightbox__img");
    var cap = dlg.querySelector(".lightbox__caption");
    var count = dlg.querySelector(".lightbox__count");
    var prev = dlg.querySelector(".lightbox__prev");
    var next = dlg.querySelector(".lightbox__next");
    var group = [];
    var index = 0;
    var trigger = null;

    function show(i) {
      index = (i + group.length) % group.length;
      var a = group[index];
      var thumb = a.querySelector("img");
      var alt = thumb ? thumb.getAttribute("alt") || "" : "";
      img.src = a.getAttribute("href");
      img.alt = alt;
      cap.textContent = alt;
      count.textContent = group.length > 1 ? (index + 1) + " of " + group.length : "";
      prev.hidden = next.hidden = group.length < 2;
    }
    function open(a) {
      var name = a.getAttribute("data-lightbox");
      group = Array.prototype.filter.call(d.querySelectorAll("a[data-lightbox]"), function (x) {
        return x.getAttribute("data-lightbox") === name;
      });
      trigger = a;
      show(group.indexOf(a));
      dlg.showModal();
    }
    each(links, function (a) {
      a.addEventListener("click", function (e) {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        open(a);
      });
    });
    prev.addEventListener("click", function () { show(index - 1); });
    next.addEventListener("click", function () { show(index + 1); });
    dlg.querySelector(".lightbox__close").addEventListener("click", function () { dlg.close(); });
    // The dialog fills the viewport and the figure fills most of it, so the ::backdrop never
    // receives clicks: a click on the dark area lands on the dialog or the figure itself.
    dlg.addEventListener("click", function (e) { if (e.target === dlg || e.target === fig) dlg.close(); });
    dlg.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft" && group.length > 1) { e.preventDefault(); show(index - 1); }
      if (e.key === "ArrowRight" && group.length > 1) { e.preventDefault(); show(index + 1); }
    });
    // Escape fires "cancel" then "close" natively; every way out ends here.
    dlg.addEventListener("close", function () {
      img.removeAttribute("src");
      if (trigger && trigger.focus) trigger.focus();
      trigger = null;
    });
  }

  function initGlow() {
    if (!w.matchMedia || !w.matchMedia("(pointer: fine)").matches || reducedMotion()) return;
    var glow = d.createElement("div");
    glow.id = "glow";
    glow.setAttribute("aria-hidden", "true");
    d.body.appendChild(glow);
    d.body.classList.add("has-glow");
    var x = 0, y = 0, queued = false;
    d.addEventListener("pointermove", function (e) {
      if (e.pointerType && e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      x = e.clientX;
      y = e.clientY;
      if (queued) return;
      queued = true;
      w.requestAnimationFrame(function () {
        queued = false;
        glow.style.transform = "translate3d(" + x + "px," + y + "px,0)";
        glow.style.opacity = "1";
      });
    }, { passive: true });
    d.documentElement.addEventListener("pointerleave", function () { glow.style.opacity = "0"; });
  }

  function initReducedMotion() {
    if (!w.matchMedia) return;
    var mq = w.matchMedia("(prefers-reduced-motion: reduce)");
    var autos = Array.prototype.slice.call(d.querySelectorAll("video[autoplay]"));
    function apply() {
      var on = mq.matches;
      d.body.classList.toggle("reduce-motion", on);
      if (on) d.body.classList.remove("has-glow");
      else if (d.getElementById("glow")) d.body.classList.add("has-glow");
      each(d.querySelectorAll("video"), function (v) { if (on) v.pause(); });
      if (!on) {
        each(autos, function (v) {
          var p = v.play();
          if (p && typeof p.catch === "function") p.catch(function () {});
        });
      }
    }
    apply();
    if (mq.addEventListener) mq.addEventListener("change", apply);
  }

  function formBody(form) {
    var parts = [];
    each(form.querySelectorAll("[name]"), function (el) {
      if (el.disabled || !el.name) return;
      if ((el.type === "checkbox" || el.type === "radio") && !el.checked) return;
      parts.push(encodeURIComponent(el.name) + "=" + encodeURIComponent(el.value == null ? "" : el.value));
    });
    return parts.join("&");
  }

  // True when the sign-up endpoint is on another origin than this page (a mailing-list provider).
  function crossOrigin(action) {
    try {
      var here = w.location.href;
      return new w.URL(action, here).origin !== new w.URL(here).origin;
    } catch (err) {
      return false;   // unparseable: let fetch report the failure in the default mode
    }
  }

  function initNewsletter(config, root) {
    config = config || w.MARROWMERE_CONFIG || {};
    root = root || d;
    var form = root.querySelector("#newsletter");
    if (!form) return;
    var status = form.querySelector(".signup__status");
    function say(text, state) {
      if (!status) return;
      status.textContent = text;
      status.setAttribute("data-state", state);
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = getPath(config, "newsletterAction");
      var action = typeof v === "string" ? v.trim() : "";
      if (!action) { say(SIGNUP_SOON, "soon"); return; }
      say(SIGNUP_BUSY, "busy");
      var opts = {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formBody(form),
        credentials: "omit"
      };
      // A provider built for plain form posts usually sends no CORS headers, so a default-mode
      // fetch would reject after the address was delivered. no-cors still sends this simple POST;
      // its opaque reply cannot be read, so for a cross-origin endpoint "sent" is all we can know.
      var blind = crossOrigin(action);
      if (blind) opts.mode = "no-cors";
      w.fetch(action, opts).then(function (res) {
        var sent = !!res && (res.ok || (blind && res.type === "opaque"));
        if (!sent) throw new Error("HTTP " + (res && res.status));
        say(SIGNUP_OK, "ok");
        if (form.reset) form.reset();
      }).catch(function () {
        say(SIGNUP_FAIL, "error");
      });
    });
  }

  function init() {
    applyConfig();
    initNav();
    initHoverVideos();
    initLightbox();
    initGlow();
    initReducedMotion();
    initNewsletter();
  }

  w.Marrowmere = { getPath: getPath, applyConfig: applyConfig, initNewsletter: initNewsletter };

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init);
  else init();
})(window, document);
