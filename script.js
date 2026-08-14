document.addEventListener("DOMContentLoaded", () => {
  const logoVideo = document.getElementById("video-logo");
  const blurVideo = document.getElementById("video-blur");
  const introOverlay = document.getElementById("intro-overlay");

  const isMobile = window.matchMedia("(max-width: 768px)").matches;

  let introFinished = false;
  let introWatchdog = null;

  function finishIntro() {
    if (introFinished) return;
    introFinished = true;
    if (introWatchdog) clearTimeout(introWatchdog);
    if (introOverlay) {
      introOverlay.classList.add("intro-done");
    }
  }

  /* ------------------------------------------------------------------
     INTRO WATCHDOG — iOS SAFARI
     Safari can't decode WebM, and Low Power Mode blocks autoplay outright.
     Both failures are silent: `ended` never fires and the overlay would
     sit on black forever. Every exit is covered here — a decode error, a
     rejected play(), a tap, or simply running out of patience.
     ------------------------------------------------------------------ */
  const INTRO_MAX_MS = 9000;
  introWatchdog = setTimeout(finishIntro, INTRO_MAX_MS);

  [logoVideo, blurVideo].forEach((video) => {
    if (!video) return;
    // fires when no <source> in the list could be played at all
    video.addEventListener("error", finishIntro);
    video.querySelectorAll("source").forEach((source) => {
      source.addEventListener("error", () => {
        // only bail once the browser has given up on the whole element
        if (video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
          finishIntro();
        }
      });
    });
  });

  // let an impatient visitor tap straight through
  if (introOverlay) {
    introOverlay.addEventListener("click", finishIntro);
    introOverlay.addEventListener("touchend", finishIntro, { passive: true });
  }

  // Point a video at its mobile files. Desktop paths live in the <source>
  // tags in index.html; mobile paths live in data-mobile-webm /
  // data-mobile-mp4 on the <video>. Both formats are swapped together so
  // the Safari mp4 fallback survives the switch.
  function applyIntroSource(video) {
    if (!video || !isMobile) return;

    const swap = (selector, src) => {
      if (!src) return;
      const source = video.querySelector(selector);
      if (source) source.setAttribute("src", src);
    };

    swap("source.src-webm", video.dataset.mobileWebm);
    swap("source.src-mp4", video.dataset.mobileMp4);

    if (video.dataset.mobileWebm || video.dataset.mobileMp4) video.load();
  }

  applyIntroSource(logoVideo);
  applyIntroSource(blurVideo);

  if (blurVideo) blurVideo.load();

  if (logoVideo && blurVideo) {
    logoVideo.addEventListener("ended", () => {
      logoVideo.classList.add("hidden");
      blurVideo.classList.remove("hidden");

      blurVideo.play().catch((err) => {
        console.warn("Autoplay restriction prevented blur video playback:", err);
        finishIntro();
      });
    });

    blurVideo.addEventListener("ended", () => {
      finishIntro();
    });
  }

  if (logoVideo) {
    logoVideo.play().catch(() => {
      finishIntro();
    });
  }

  /* ============================================================
     3D EYE — SMOOTH MOUSE TILT / PARALLAX
     ============================================================ */
  const eyeContainer = document.querySelector(".eye-3d-container");

  if (eyeContainer) {
    const maxTilt = 14;
    const maxShift = 12;
    const ease = 0.08;

    let targetRotateX = 0, targetRotateY = 0, targetX = 0, targetY = 0, targetScale = 1;
    let curRotateX = 0, curRotateY = 0, curX = 0, curY = 0, curScale = 1;

    eyeContainer.addEventListener("mousemove", (e) => {
      const rect = eyeContainer.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      targetRotateY = (x - 0.5) * maxTilt * 2;
      targetRotateX = (0.5 - y) * maxTilt * 2;
      targetX = (x - 0.5) * maxShift * 2;
      targetY = (y - 0.5) * maxShift * 2;
      targetScale = 1.04;
    });

    eyeContainer.addEventListener("mouseleave", () => {
      targetRotateX = 0;
      targetRotateY = 0;
      targetX = 0;
      targetY = 0;
      targetScale = 1;
    });

    function animateTilt() {
      curRotateX += (targetRotateX - curRotateX) * ease;
      curRotateY += (targetRotateY - curRotateY) * ease;
      curX += (targetX - curX) * ease;
      curY += (targetY - curY) * ease;
      curScale += (targetScale - curScale) * ease;

      eyeContainer.style.transform =
        `perspective(900px) rotateX(${curRotateX}deg) rotateY(${curRotateY}deg) translate(${curX}px, ${curY}px) scale(${curScale})`;

      requestAnimationFrame(animateTilt);
    }

    requestAnimationFrame(animateTilt);
  }

  /* ============================================================
     SCREEN 2 — SMOOTH LERP MOUSE TRACKING FOR "GENRA" TEXT
     ============================================================ */
  const artworkFrame = document.querySelector(".artwork-frame");
  const hoverBox = document.getElementById("genra-hover-box");

  if (artworkFrame && hoverBox) {
    let targetX = 0, targetY = 0;
    let currentX = 0, currentY = 0;
    let isHovered = false;

    artworkFrame.addEventListener("mousemove", (e) => {
      const rect = artworkFrame.getBoundingClientRect();
      targetX = e.clientX - rect.left;
      targetY = e.clientY - rect.top;

      if (!isHovered) {
        currentX = targetX;
        currentY = targetY;
        isHovered = true;
        hoverBox.classList.add("active");
      }
    });

    artworkFrame.addEventListener("mouseleave", () => {
      isHovered = false;
      hoverBox.classList.remove("active");
    });

    function animateHoverText() {
      if (isHovered) {
        // Smooth linear interpolation (lerp)
        currentX += (targetX - currentX) * 0.12;
        currentY += (targetY - currentY) * 0.12;
        hoverBox.style.left = `${currentX}px`;
        hoverBox.style.top = `${currentY}px`;
      }
      requestAnimationFrame(animateHoverText);
    }

    requestAnimationFrame(animateHoverText);
  }

  /* ============================================================
     SCREEN 2 — GENRA LINK (prevent default '#' jump from fighting
     the custom scroll-snap controller and freezing scroll)
     ============================================================ */
  const genraLink = document.getElementById("genra-link");
  if (genraLink) {
    genraLink.addEventListener("click", (e) => {
      const href = genraLink.getAttribute("href");
      if (!href || href === "#") {
        e.preventDefault(); // no real destination set yet — do nothing instead of jumping
      }
      // once you set a real href (e.g. "https://..."), this block leaves it alone
      // and the browser will navigate normally.
    });
  }

  /* ============================================================
     SCREEN 6 — PACKAGE OFFERS: swap description on logo click
     ============================================================ */
  const s6Copy = document.getElementById("s6-copy");
  const s6Logos = document.querySelectorAll(".ps6-logo");

  // Package content lives here as plain data — never as HTML strings —
  // so it's built into the DOM with createElement/textContent below,
  // which has no HTML-parsing surface and can't execute injected markup.
  const s6PackageData = {
    clash: {
      title: "Clash Series",
      price: "$24.99",
      bullets: [
        "16 Semi-Finals",
        "Top 3 qualify on Day 1",
        "Top 5 qualify on Day 2",
        "Grand Final featuring PMGO teams",
        "Best for high-level competitive events",
      ],
    },
    sonic: {
      title: "Sonic Series",
      price: "$9.99",
      bullets: [
        "2 events per day (52 per month)",
        "Top 2 qualify to Super Weekend",
        "Opportunity to compete against Tier 1 teams",
        "Flexible KSA & CEST schedules",
      ],
    },
    empire: {
      title: "Empire Series",
      price: "$19.99",
      bullets: [
        "16 Semi-Finals",
        "Top 4 teams qualify on Day 1 & Day 2",
        "Grand Final featuring PMGO teams",
        "Ideal for competitive tournaments",
      ],
    },
    // genx: intentionally left out — still using the plain-text data-copy
    // fallback below until its package details are ready.
  };

  function buildPackageContent(pkg) {
    const frag = document.createDocumentFragment();

    const title = document.createElement("strong");
    title.className = "s6-copy-title";
    // no package carries an emoji, so interpolating one printed a literal
    // "undefined " in front of every title
    title.textContent = pkg.title;
    frag.appendChild(title);

    const price = document.createElement("span");
    price.className = "s6-copy-price";
    price.textContent = pkg.price;
    frag.appendChild(price);

    const list = document.createElement("ul");
    pkg.bullets.forEach((bulletText) => {
      const li = document.createElement("li");
      li.textContent = bulletText;
      list.appendChild(li);
    });
    frag.appendChild(list);

    return frag;
  }

  if (s6Copy && s6Logos.length > 0) {
    let s6SwapTimer = null;

    const showPackage = (btn) => {
      const pkgKey = btn.getAttribute("data-package");
      const plainCopy = btn.getAttribute("data-copy");
      const pkg = pkgKey ? s6PackageData[pkgKey] : null;

      if (!pkg && !plainCopy) return;
      if (btn.classList.contains("is-active")) return; // already showing

      // toggle active state (only one highlighted at a time)
      s6Logos.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");

      // fade out, swap content, fade in
      s6Copy.style.transition = "opacity 0.25s ease";
      s6Copy.style.opacity = "0";
      if (s6SwapTimer) clearTimeout(s6SwapTimer);
      s6SwapTimer = setTimeout(() => {
        s6Copy.textContent = ""; // clear safely before rebuilding
        if (pkg) {
          s6Copy.appendChild(buildPackageContent(pkg));
        } else {
          s6Copy.textContent = plainCopy;
        }
        s6Copy.style.opacity = "1";
      }, 250);
    };

    // Pointers with a real hover (desktop) reveal a package by hovering it.
    // Clicking used to focus the <button>, and the browser then scrolled the
    // focused element into view — which dragged the snap container off its
    // section, the "jumps to the bottom right" behaviour. Hover never takes
    // focus, so the page stays put.
    const canHover = window.matchMedia("(hover: hover)").matches;

    s6Logos.forEach((btn) => {
      if (canHover) {
        btn.addEventListener("mouseenter", () => showPackage(btn));
        // belt and braces: even a stray click must not scroll the section
        btn.addEventListener("mousedown", (e) => e.preventDefault());
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          showPackage(btn);
        });
      } else {
        // touch keeps tap-to-open — there is no hover to use
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          showPackage(btn);
        });
      }

      // keyboard users still get focus, so keep them in sync without
      // letting the browser scroll the section to reach the button
      btn.addEventListener("focus", (e) => {
        if (e.target.matches(":focus-visible")) showPackage(btn);
      });
    });
  }

  /* ============================================================
     SECTION SCROLL GUARD
     Backstop for browsers without `overflow: clip` (Safari <16). If
     anything ever scrolls a section internally — focus, an IME, a
     find-in-page hit — snap it straight back so the artwork can't be
     left parked off-centre.
     ============================================================ */
  document.querySelectorAll(".section, .viewport-wrapper").forEach((box) => {
    box.addEventListener("scroll", () => {
      if (box.scrollTop !== 0) box.scrollTop = 0;
      if (box.scrollLeft !== 0) box.scrollLeft = 0;
    }, { passive: true });
  });

  /* ============================================================
     SCREEN 8 — STAFF CAROUSEL ARROWS
     ============================================================ */
  const s8Track = document.querySelector(".s8-track");
  const s8Prev = document.querySelector(".s8-arrow-prev");
  const s8Next = document.querySelector(".s8-arrow-next");

  if (s8Track && s8Prev && s8Next) {
    // Advance by exactly one screenful. On mobile the track is a 2-row grid
    // showing two columns (four people), on desktop it's a single row of
    // however many fit — reading the real gap and column width keeps one
    // tap == one page in both, with no card left sliced at the edge.
    const scrollByCards = (dir) => {
      const card = s8Track.querySelector(".s8-card");
      if (!card) return;

      const gap = parseFloat(getComputedStyle(s8Track).columnGap) || 0;
      const step = card.getBoundingClientRect().width + gap;
      if (step <= 0) return;

      const columnsInView = Math.max(1, Math.round(s8Track.clientWidth / step));
      s8Track.scrollBy({ left: dir * step * columnsInView, behavior: "smooth" });
    };

    s8Prev.addEventListener("click", () => scrollByCards(-1));
    s8Next.addEventListener("click", () => scrollByCards(1));

    // let vertical wheel scroll the track horizontally instead of
    // fighting the page's own snap-scroll controller
    s8Track.addEventListener("wheel", (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.stopPropagation();
        e.preventDefault();
        s8Track.scrollLeft += e.deltaY;
      }
    }, { passive: false });
  }

  /* ============================================================
     ONE-CUT SMOOTH WHEEL SNAP CONTROLLER
     ============================================================ */
  const snapContainer = document.querySelector(".snap-container");
  const sections = document.querySelectorAll(".section");
  let isScrolling = false;
  let currentIndex = 0;
  let scrollLockTimer = null;

  if (snapContainer && sections.length > 0) {
    snapContainer.addEventListener("wheel", (e) => {
      e.preventDefault();
      if (isScrolling) return;

      if (e.deltaY > 20 && currentIndex < sections.length - 1) {
        currentIndex++;
        scrollToSection(currentIndex);
      } else if (e.deltaY < -20 && currentIndex > 0) {
        currentIndex--;
        scrollToSection(currentIndex);
      }
    }, { passive: false });

    function scrollToSection(index) {
      isScrolling = true;
      sections[index].scrollIntoView({ behavior: "smooth" });

      // Clear any previous pending unlock so overlapping calls can't
      // leave isScrolling stuck true forever.
      if (scrollLockTimer) clearTimeout(scrollLockTimer);
      scrollLockTimer = setTimeout(() => {
        isScrolling = false;
        scrollLockTimer = null;
      }, 850);
    }

    /* ==========================================================
       TOUCH — ONE SWIPE = ONE SCREEN
       CSS gives .snap-container `touch-action: pan-x` on mobile, so
       the browser never scrolls vertically on its own. Every vertical
       gesture lands here and moves exactly one section, which is what
       kills the free/momentum scrolling.
       ========================================================== */
    const SWIPE_THRESHOLD = 45; // px of vertical travel before it counts
    let touchStartY = 0;
    let touchStartX = 0;
    let touchTracking = false;

    snapContainer.addEventListener("touchstart", (e) => {
      // a swipe that begins inside the staff carousel belongs to the
      // carousel, not to the page
      if (e.touches.length !== 1 || e.target.closest(".s8-track")) {
        touchTracking = false;
        return;
      }
      touchTracking = true;
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
    }, { passive: true });

    snapContainer.addEventListener("touchend", (e) => {
      if (!touchTracking) return;
      touchTracking = false;
      if (isScrolling) return;

      const touch = e.changedTouches[0];
      const deltaY = touchStartY - touch.clientY;
      const deltaX = touchStartX - touch.clientX;

      // ignore short taps and anything that reads as a horizontal drag
      if (Math.abs(deltaY) < SWIPE_THRESHOLD) return;
      if (Math.abs(deltaY) < Math.abs(deltaX)) return;

      if (deltaY > 0 && currentIndex < sections.length - 1) {
        currentIndex++;
        scrollToSection(currentIndex);
      } else if (deltaY < 0 && currentIndex > 0) {
        currentIndex--;
        scrollToSection(currentIndex);
      }
    }, { passive: true });

    snapContainer.addEventListener("touchcancel", () => {
      touchTracking = false;
    }, { passive: true });

    // Keep currentIndex honest if the container ever moves by some other
    // route (keyboard, resize, browser restoring a position), so the very
    // next swipe still steps from where the user actually is.
    snapContainer.addEventListener("scroll", () => {
      if (isScrolling) return;
      const step = snapContainer.clientHeight || 1;
      currentIndex = Math.max(
        0,
        Math.min(sections.length - 1, Math.round(snapContainer.scrollTop / step))
      );
    }, { passive: true });

    // Safety net: if something ever interrupts the flow (e.g. a click
    // stealing focus mid-scroll) and the lock never clears, force-unlock
    // after a short grace period so the page can never stay frozen.
    setInterval(() => {
      if (isScrolling && !scrollLockTimer) {
        isScrolling = false;
      }
    }, 1000);

    /* ==========================================================
       IN-PAGE ANCHOR LINKS (footer links, nav pills, etc.)
       Route any "#section-id" click through the same
       scrollToSection() used by the wheel controller so
       currentIndex stays in sync for subsequent wheel scrolls.
       ========================================================== */
    const sectionsArray = Array.from(sections);

    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      const targetId = link.getAttribute("href").slice(1);
      if (!targetId) return; // skip bare "#" links (e.g. logo, unset href)

      const targetIndex = sectionsArray.findIndex((sec) => sec.id === targetId);
      if (targetIndex === -1) return; // not one of our sections — leave default behavior

      link.addEventListener("click", (e) => {
        e.preventDefault();
        currentIndex = targetIndex;
        scrollToSection(currentIndex);
      });
    });
  }

  /* ============================================================
     MOBILE NAV — BURGER DROPDOWN TOGGLE
     ============================================================ */
  const menuToggle = document.getElementById("mobile-menu-toggle");
  const menuPanel = document.getElementById("mobile-menu-panel");

  if (menuToggle && menuPanel) {
    menuToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = menuPanel.classList.toggle("is-open");
      menuToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    // close when a link inside the panel is tapped
    menuPanel.querySelectorAll(".mobile-menu-link").forEach((link) => {
      link.addEventListener("click", () => {
        menuPanel.classList.remove("is-open");
        menuToggle.setAttribute("aria-expanded", "false");
      });
    });

    // close on outside tap
    document.addEventListener("click", (e) => {
      if (!menuPanel.contains(e.target) && e.target !== menuToggle) {
        menuPanel.classList.remove("is-open");
        menuToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

});
