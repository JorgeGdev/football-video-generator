/**
 * Sofia Giraldo's Portfolio - Main JavaScript File
 * Unified script combining all animations and interactions
 */

document.addEventListener("DOMContentLoaded", function () {
  // ===========================================
  // 1. SCROLL REVEAL ANIMATIONS
  // ===========================================

  const initScrollReveal = () => {
    // Default props for ScrollReveal
    const defaultProps = {
      easing: "cubic-bezier(0.5, 0, 0, 1)",
      distance: "30px",
      duration: 1000,
      desktop: true,
      mobile: true,
      reset: false,
    };

    // General elements animations
    const targetElements = [
      {
        element: ".section-title",
        animation: {
          delay: 300,
          distance: "0px",
          origin: "bottom",
        },
      },
      {
        element: ".hero-title",
        animation: {
          delay: 500,
          origin: window.innerWidth > 768 ? "left" : "bottom",
        },
      },
      {
        element: ".hero-cta",
        animation: {
          delay: 1000,
          origin: window.innerWidth > 768 ? "left" : "bottom",
        },
      },
      {
        element: ".hero-social-links",
        animation: {
          delay: 1200,
          origin: window.innerWidth > 768 ? "left" : "bottom",
        },
      },
      {
        element: ".world-button-container",
        animation: {
          delay: 1500,
          distance: "20px",
          origin: "top",
        },
      },
      {
        element: ".hero-image-wrapper",
        animation: {
          delay: 800,
          origin: window.innerWidth > 768 ? "right" : "bottom",
        },
      },
      {
        element: ".about-wrapper__image",
        animation: {
          delay: 600,
          origin: "bottom",
        },
      },
      {
        element: ".about-wrapper__info",
        animation: {
          delay: 1000,
          origin: window.innerWidth > 768 ? "left" : "bottom",
        },
      },
      {
        element: ".project-wrapper__text",
        animation: {
          delay: 500,
          origin: window.innerWidth > 768 ? "left" : "bottom",
        },
      },
      {
        element: ".project-wrapper__image",
        animation: {
          delay: 1000,
          origin: window.innerWidth > 768 ? "right" : "bottom",
        },
      },
      {
        element: ".contact-wrapper",
        animation: {
          delay: 800,
          origin: "bottom",
        },
      },
    ];

    // Initialize ScrollReveal
    if (typeof ScrollReveal !== "undefined") {
      ScrollReveal({ reset: false });

      // Apply general animations
      targetElements.forEach(({ element, animation }) => {
        ScrollReveal().reveal(
          element,
          Object.assign({}, defaultProps, animation)
        );
      });
    }
  };

  // ===========================================
  // 2. SKILLS SECTION ANIMATIONS
  // ===========================================

  const initSkillsAnimations = () => {
    const skillItems = document.querySelectorAll("#skills li");

    // Apply interactive effects to skill items
    skillItems.forEach((item, index) => {
      // Add data attributes for ScrollReveal
      item.setAttribute("data-sr-id", `skill-${index}`);

      // Add hover effects
      item.addEventListener("mouseenter", function () {
        this.style.backgroundColor = "var(--primary-color)";
        this.style.color = "#fff";
        this.style.transform = "translateY(-2px)";
      });

      item.addEventListener("mouseleave", function () {
        this.style.backgroundColor = "var(--card-bg)";
        this.style.color = "var(--text-color)";
        this.style.transform = "translateY(0)";
      });
    });

    // Initialize ScrollReveal for skills with staggered delay
    if (typeof ScrollReveal !== "undefined") {
      skillItems.forEach((item, index) => {
        ScrollReveal().reveal(item, {
          delay: 300 + index * 100,
          distance: "20px",
          origin: index % 2 === 0 ? "left" : "right",
          duration: 800,
          easing: "cubic-bezier(0.5, 0, 0, 1)",
          reset: false,
        });
      });
    }

    // Enhanced language skills with progress bars
    const skillsHeadings = document.querySelectorAll("#skills h3");
    let languageSection = null;

    skillsHeadings.forEach((heading) => {
      if (heading.textContent.trim() === "Languages") {
        languageSection = heading;
      }
    });

    if (languageSection) {
      const languageItems =
        languageSection.nextElementSibling.querySelectorAll("li");

      languageItems.forEach((item) => {
        const text = item.textContent.trim();
        let progressValue = 100;
        let language = text;
        let level = "";

        if (text.includes("Native")) {
          progressValue = 100;
          language = "Spanish";
          level = "Native";
        } else if (text.includes("Fluent")) {
          progressValue = 95;
          language = "English";
          level = "Fluent C2";
        } else if (text.includes("Advanced")) {
          progressValue = 80;
          language = "Portuguese";
          level = "Advanced";
        } else if (text.includes("Intermediate")) {
          progressValue = 60;
          language = "Italian";
          level = "Intermediate";
        }

        item.innerHTML = `
          <div class="skill-with-progress">
            <span>${language}</span>
            <div class="progress-container">
              <div class="progress-bar" style="width: ${progressValue}%"></div>
            </div>
            <span class="level-indicator">${level}</span>
          </div>
        `;
      });
    }
  };

  // ===========================================
  // 3. THEME SWITCHER (DARK/LIGHT MODE)
  // ===========================================

  const initThemeSwitcher = () => {
    // Create the theme switcher element
    const themeSwitcherContainer = document.createElement("div");
    themeSwitcherContainer.className = "theme-switcher";
    themeSwitcherContainer.innerHTML = `
      <div class="theme-switcher-container">
        <div class="theme-toggle-wrapper">
          <input type="checkbox" id="theme-toggle" class="theme-toggle">
          <label for="theme-toggle" class="theme-toggle-label">
            <span class="theme-toggle-icon"></span>
          </label>
          <span class="theme-toggle-text">Dark Mode</span>
        </div>
      </div>
    `;

    // Insert at the beginning of body
    const bodyElement = document.body;
    bodyElement.insertBefore(themeSwitcherContainer, bodyElement.firstChild);

    // Check for saved theme preference
    const currentTheme =
      localStorage.getItem("theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");

    // Apply saved theme
    if (currentTheme === "dark") {
      document.body.classList.add("dark-theme");
      document.getElementById("theme-toggle").checked = true;
    }

    // Toggle theme functionality
    document
      .getElementById("theme-toggle")
      .addEventListener("change", function (e) {
        if (e.target.checked) {
          document.body.classList.add("dark-theme");
          localStorage.setItem("theme", "dark");
        } else {
          document.body.classList.remove("dark-theme");
          localStorage.setItem("theme", "light");
        }
      });
  };

  // ===========================================
  // 4. WORLD BUTTON DROPDOWN
  // ===========================================

  const initWorldButton = () => {
    // Create dropdown menu
    const createDropdownMenu = () => {
      const dropdownMenu = document.createElement("div");
      dropdownMenu.className = "world-dropdown-menu";
      dropdownMenu.innerHTML = `
  <div class="world-dropdown-content">
    <h3>Access Studio</h3>
    <a href="/studio" target="_self">
      <i class="fa fa-cogs"></i> Sofia's Studio
    </a>
  </div>
`;
      return dropdownMenu;
    };

    const worldButtonContainer = document.querySelector(
      ".world-button-container"
    );
    if (!worldButtonContainer) return;

    const dropdownMenu = createDropdownMenu();
    worldButtonContainer.appendChild(dropdownMenu);

    // Toggle dropdown functionality
    const worldButton = document.getElementById("world-button");
    if (worldButton) {
      worldButton.addEventListener("click", function (e) {
        e.preventDefault();
        dropdownMenu.classList.toggle("show");

        if (dropdownMenu.classList.contains("show")) {
          dropdownMenu.classList.add("animate-dropdown");
          worldButton.classList.add("active");
        } else {
          dropdownMenu.classList.remove("animate-dropdown");
          worldButton.classList.remove("active");
        }
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener("click", function (event) {
      if (!worldButtonContainer.contains(event.target)) {
        dropdownMenu.classList.remove("show");
        dropdownMenu.classList.remove("animate-dropdown");
        if (worldButton) worldButton.classList.remove("active");
      }
    });

    // Add hover effects to dropdown links
    const dropdownLinks = dropdownMenu.querySelectorAll("a");
    dropdownLinks.forEach((link) => {
      link.addEventListener("mouseenter", function () {
        this.style.transform = "translateX(8px)";
      });

      link.addEventListener("mouseleave", function () {
        this.style.transform = "translateX(0)";
      });
    });
  };

  // ===========================================
  // 5. TILT EFFECTS
  // ===========================================

  const initTiltEffects = () => {
    const tiltElements = document.querySelectorAll(".js-tilt");
    if (tiltElements.length > 0 && typeof VanillaTilt !== "undefined") {
      VanillaTilt.init(tiltElements);
    }
  };

  // ===========================================
  // 6. INITIALIZE ALL FEATURES
  // ===========================================

  // Initialize all functionality
  initScrollReveal();
  initSkillsAnimations();
  initThemeSwitcher();
  initWorldButton();
  initTiltEffects();

  console.log("🚀 Sofia Giraldo Portfolio - All features loaded successfully!");
});
