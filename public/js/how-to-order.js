/**
 * Improved How to Order Popover Functionality
 * - Ensures modals display properly without scrollbars
 * - Centered positioning for all screen sizes
 * - Better event handling
 */
document.addEventListener("DOMContentLoaded", function () {
  const howToOrderBtn = document.getElementById("how-to-order-btn");
  const howToOrderPopover = document.getElementById("how-to-order-popover");

  if (!howToOrderBtn || !howToOrderPopover) return;

  // Create overlay for background dimming
  let overlay = document.querySelector(".popover-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "popover-overlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 9998;
      display: none;
    `;
    document.body.appendChild(overlay);
  }

  // Set popover style to ensure correct positioning
  howToOrderPopover.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    max-width: 500px;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    z-index: 9999;
    display: none;
    max-height: 90vh;
    overflow-y: auto;
    border-radius: 20px;
  `;

  // Track popover state
  let isPopoverOpen = false;

  // Toggle popover visibility
  function togglePopover(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    isPopoverOpen = !isPopoverOpen;

    if (isPopoverOpen) {
      // Open popover
      howToOrderPopover.style.display = "block";
      overlay.style.display = "block";

      // Lock body scroll
      document.body.style.overflow = "hidden";

      // Set ARIA attributes
      howToOrderBtn.setAttribute("aria-expanded", "true");

      // Focus on close button
      setTimeout(() => {
        const closeBtn = howToOrderPopover.querySelector(".close-popover");
        if (closeBtn) closeBtn.focus();
      }, 50);

      // Add escape key listener
      document.addEventListener("keydown", handleEscapeKey);
    } else {
      // Close popover
      howToOrderPopover.style.display = "none";
      overlay.style.display = "none";

      // Restore body scroll
      document.body.style.overflow = "";

      // Update ARIA attributes
      howToOrderBtn.setAttribute("aria-expanded", "false");

      // Return focus to button
      howToOrderBtn.focus();

      // Remove escape key listener
      document.removeEventListener("keydown", handleEscapeKey);
    }
  }

  // Handle escape key press
  function handleEscapeKey(e) {
    if (e.key === "Escape" && isPopoverOpen) {
      togglePopover();
    }
  }

  // Handle clicks outside the popover
  function handleOutsideClick(e) {
    if (
      isPopoverOpen &&
      !howToOrderPopover.contains(e.target) &&
      e.target !== howToOrderBtn &&
      !e.target.closest("#how-to-order-btn")
    ) {
      togglePopover();
    }
  }

  // Set up accessibility attributes
  howToOrderBtn.setAttribute("aria-expanded", "false");
  howToOrderBtn.setAttribute("aria-controls", "how-to-order-popover");
  howToOrderPopover.setAttribute("role", "dialog");
  howToOrderPopover.setAttribute("aria-labelledby", "popover-title");

  // Set up event listeners
  howToOrderBtn.addEventListener("click", togglePopover);

  // Close button click handler
  const closeBtn = howToOrderPopover.querySelector(".close-popover");
  if (closeBtn) {
    closeBtn.addEventListener("click", togglePopover);
  }

  // Overlay click handler
  overlay.addEventListener("click", togglePopover);

  // Document click for outside clicks
  document.addEventListener("click", handleOutsideClick);

  // Cleanup event listeners
  window.addEventListener("beforeunload", function () {
    document.removeEventListener("click", handleOutsideClick);
    document.removeEventListener("keydown", handleEscapeKey);
  });
});
