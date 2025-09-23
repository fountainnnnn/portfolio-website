document.addEventListener("DOMContentLoaded", () => {
  const sections = document.querySelectorAll(".section");
  const projects = document.querySelectorAll(".project-section");
  const footer = document.querySelector("footer");

  // Snap targets: sections + projects + footer
  const snapTargets = [...sections, ...projects, footer];

  // Fade-in for sections + projects
  const fadeObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });
  [...sections, ...projects].forEach(el => fadeObserver.observe(el));

  let currentIndex = 0;

  const scrollToTarget = (index) => {
    if (index >= 0 && index < snapTargets.length) {
      snapTargets[index].scrollIntoView({ behavior: "smooth" });
      currentIndex = index;
    }
  };

  // Keyboard navigation
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "PageDown") {
      if (currentIndex < snapTargets.length - 1) {
        e.preventDefault();
        scrollToTarget(currentIndex + 1);
      }
    }
    if (e.key === "ArrowUp" || e.key === "PageUp") {
      if (currentIndex > 0) {
        e.preventDefault();
        scrollToTarget(currentIndex - 1);
      }
    }
  });

  // Active index tracking for sections & projects
  const activeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const idx = snapTargets.indexOf(entry.target);
        if (idx !== -1) currentIndex = idx;
      }
    });
  }, { threshold: 0.6 });
  [...sections, ...projects].forEach(el => activeObserver.observe(el));

  // Separate observer for footer
  if (footer) {
    const footerObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          currentIndex = snapTargets.indexOf(footer);
        }
      });
    }, { threshold: 0.2 });
    footerObserver.observe(footer);
  }

  // Typewriter effect
  const text = "Hi, I'm Ng Yu Hang (Mervin)";
  const target = document.getElementById("typewriter");
  let i = 0;
  function type() {
    if (i < text.length) {
      target.textContent += text.charAt(i);
      i++;
      setTimeout(type, 90);
    }
  }
  type();
});


// Custom scroll with slower animation
function smoothScrollTo(targetY, duration = 1200) { // 1200ms = slower
  const startY = window.scrollY;
  const diff = targetY - startY;
  let start;

  function step(timestamp) {
    if (!start) start = timestamp;
    const time = timestamp - start;
    const percent = Math.min(time / duration, 1);

    window.scrollTo(0, startY + diff * percent);

    if (time < duration) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

// Example: scroll to next section slower
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    const next = document.querySelector(".section:nth-of-type(2)");
    if (next) {
      smoothScrollTo(next.offsetTop, 1200); // 1s
    }
  }
});
