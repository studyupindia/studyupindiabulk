/**
 * Mobile menu toggle functionality
 */
document.addEventListener("DOMContentLoaded", function () {
  // Toggle mobile menu
  const menuToggle = document.getElementById("menu-toggle");
  const mobileMenu = document.getElementById("mobile-menu");
  const menuClose = document.getElementById("menu-close");
  const body = document.body;

  // Create overlay element
  const overlay = document.createElement("div");
  overlay.className = "overlay";
  body.appendChild(overlay);

  // Open menu function
  function openMenu() {
    mobileMenu.classList.add("active");
    overlay.classList.add("active");
    body.style.overflow = "hidden"; // Prevent scrolling when menu is open
  }

  // Close menu function
  function closeMenu() {
    mobileMenu.classList.remove("active");
    overlay.classList.remove("active");
    body.style.overflow = ""; // Re-enable scrolling
  }

  // Event listeners
  if (menuToggle) {
    menuToggle.addEventListener("click", openMenu);
  }

  if (menuClose) {
    menuClose.addEventListener("click", closeMenu);
  }

  // Close menu when clicking outside
  overlay.addEventListener("click", closeMenu);

  // Close menu when pressing Escape key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && mobileMenu.classList.contains("active")) {
      closeMenu();
    }
  });

  // Close menu when window is resized to desktop view
  window.addEventListener("resize", function () {
    if (window.innerWidth > 768 && mobileMenu.classList.contains("active")) {
      closeMenu();
    }
  });
});
