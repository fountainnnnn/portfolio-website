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
    if (document.body.classList.contains("modal-open")) return;
    if (e.target.closest("input, textarea, select, button, .portfolio-chat")) return;

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

  // Certificate preview modal
  const certModal = document.getElementById("certModal");
  const certModalImage = document.getElementById("certModalImage");
  const certModalLabel = document.getElementById("certModalLabel");

  if (certModal && certModalImage && certModalLabel) {
    const certCloseButton = certModal.querySelector("[data-bs-dismiss='modal']");
    let lastFocusedElement = null;

    const clearCertModal = () => {
      certModalImage.removeAttribute("src");
      certModalImage.alt = "";
    };

    const openCertModal = () => {
      lastFocusedElement = document.activeElement;
      certModal.classList.add("show");
      certModal.style.display = "block";
      certModal.removeAttribute("aria-hidden");
      certModal.setAttribute("aria-modal", "true");
      certModal.setAttribute("role", "dialog");
      document.body.classList.add("modal-open");
      document.body.style.overflow = "hidden";

      if (!document.querySelector(".cert-modal-backdrop")) {
        const backdrop = document.createElement("div");
        backdrop.className = "modal-backdrop fade show cert-modal-backdrop";
        document.body.appendChild(backdrop);
      }

      certCloseButton?.focus();
    };

    const closeCertModal = () => {
      certModal.classList.remove("show");
      certModal.style.display = "none";
      certModal.setAttribute("aria-hidden", "true");
      certModal.removeAttribute("aria-modal");
      certModal.removeAttribute("role");
      document.body.classList.remove("modal-open");
      document.body.style.removeProperty("overflow");
      document.body.style.removeProperty("padding-right");
      document.querySelectorAll(".cert-modal-backdrop").forEach(backdrop => backdrop.remove());
      clearCertModal();

      if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
        lastFocusedElement.focus();
      }
    };

    document.querySelectorAll(".cert-card").forEach(card => {
      card.addEventListener("click", (event) => {
        event.preventDefault();

        const certTitle = card.querySelector("strong")?.textContent?.trim() || "Certificate";
        const certSrc = card.getAttribute("href");
        if (!certSrc) return;

        certModalLabel.textContent = certTitle;
        certModalImage.src = certSrc;
        certModalImage.alt = `${certTitle} certificate`;
        openCertModal();
      });
    });

    certModal.addEventListener("click", (event) => {
      if (event.target === certModal) {
        closeCertModal();
      }
    });

    certCloseButton?.addEventListener("click", closeCertModal);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && certModal.classList.contains("show")) {
        closeCertModal();
      }
    });
  }

  // Portfolio chat
  const chatRoot = document.getElementById("portfolioChat");
  const chatToggle = document.getElementById("chatToggle");
  const chatClose = document.getElementById("chatClose");
  const chatPanel = document.getElementById("chatPanel");
  const chatMessages = document.getElementById("chatMessages");
  const chatForm = document.getElementById("chatForm");
  const chatInput = document.getElementById("chatInput");
  const chatStatus = document.getElementById("chatStatus");

  if (chatRoot && chatToggle && chatClose && chatPanel && chatMessages && chatForm && chatInput && chatStatus) {
    const conversation = [];
    let isSending = false;
    const isLocalPreview = ["localhost", "127.0.0.1"].includes(window.location.hostname) && window.location.port !== "3000";
    const chatApiUrl = window.CHAT_API_URL || (window.location.protocol === "file:" || isLocalPreview
      ? "http://localhost:3000/api/chat"
      : "/api/chat");

    chatMessages.querySelectorAll(".chat-message").forEach(message => {
      message.textContent = message.textContent.trim();
    });

    const setChatOpen = (isOpen) => {
      chatRoot.classList.toggle("is-open", isOpen);
      chatToggle.setAttribute("aria-expanded", String(isOpen));
      chatPanel.setAttribute("aria-hidden", String(!isOpen));
      if (isOpen) {
        setTimeout(() => chatInput.focus(), 120);
      } else {
        chatToggle.focus();
      }
    };

    const scrollChatToBottom = () => {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const addMessage = (role, content, extraClass = "") => {
      const row = document.createElement("div");
      row.className = `chat-row chat-row-${role}`;

      const message = document.createElement("article");
      message.className = `chat-message chat-message-${role} ${extraClass}`.trim();
      message.textContent = content;

      if (role === "assistant") {
        const avatar = document.createElement("img");
        avatar.className = "chat-message-avatar";
        avatar.src = "img/myself.png";
        avatar.alt = "";
        avatar.setAttribute("aria-hidden", "true");
        row.appendChild(avatar);
      }

      row.appendChild(message);
      chatMessages.appendChild(row);
      scrollChatToBottom();
      return message;
    };

    const removeMessageRow = (message) => {
      const row = message.closest(".chat-row");
      if (row) {
        row.remove();
      } else {
        message.remove();
      }
    };

    const autosizeInput = () => {
      chatInput.style.height = "auto";
      chatInput.style.height = `${Math.min(chatInput.scrollHeight, 118)}px`;
    };

    chatToggle.addEventListener("click", () => {
      setChatOpen(!chatRoot.classList.contains("is-open"));
    });

    chatClose.addEventListener("click", () => setChatOpen(false));

    chatInput.addEventListener("input", autosizeInput);

    chatInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        chatForm.requestSubmit();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && chatRoot.classList.contains("is-open")) {
        setChatOpen(false);
      }
    });

    chatForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const text = chatInput.value.trim();
      if (!text || isSending) return;

      isSending = true;
      chatStatus.textContent = "";
      chatInput.value = "";
      autosizeInput();
      chatInput.disabled = true;
      chatForm.querySelector("button").disabled = true;

      conversation.push({ role: "user", content: text });
      addMessage("user", text);
      const thinkingMessage = addMessage("assistant", "Thinking...", "is-thinking");

      try {
        const response = await fetch(chatApiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: conversation.slice(-10) })
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.reply) {
          throw new Error(data.error || "Chat is unavailable right now.");
        }

        thinkingMessage.classList.remove("is-thinking");
        thinkingMessage.textContent = data.reply;
        conversation.push({ role: "assistant", content: data.reply });
      } catch (error) {
        removeMessageRow(thinkingMessage);
        chatStatus.textContent = error.message === "Failed to fetch"
          ? "Chat server is not reachable. Open this from http://localhost:3000/ or run npm start."
          : error.message || "Chat is unavailable right now.";
      } finally {
        isSending = false;
        chatInput.disabled = false;
        chatForm.querySelector("button").disabled = false;
        chatInput.focus();
        scrollChatToBottom();
      }
    });
  }
});
