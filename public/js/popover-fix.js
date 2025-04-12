/**
 * Direct Fix for How to Order Popover Visibility
 * Add this code at the end of your how-to-order.js file
 */

// Add this to the end of your DOMContentLoaded event handler
document.addEventListener("DOMContentLoaded", function () {
  // Run this code after a small delay to ensure DOM is fully processed
  setTimeout(function () {
    // Get references to the elements
    const button = document.getElementById("how-to-order-btn");
    const popover = document.getElementById("how-to-order-popover");

    if (!button || !popover) {
      console.error("Button or popover element not found");
      return;
    }

    // Force the popover to be a direct child of body
    if (popover.parentElement !== document.body) {
      // Store the original popover HTML
      const popoverHTML = popover.outerHTML;

      // Remove the original popover
      popover.parentNode.removeChild(popover);

      // Create a new popover element directly in the body
      document.body.insertAdjacentHTML("beforeend", popoverHTML);

      console.log("Moved popover to body element for better positioning");
    }

    // Ensure the overlay is also a direct child of body
    let overlay = document.querySelector(".popover-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "popover-overlay";
      document.body.appendChild(overlay);
      console.log("Created overlay element");
    }

    // Re-attach click handlers after moving the elements
    const newPopover = document.getElementById("how-to-order-popover");
    const newButton = document.getElementById("how-to-order-btn");
    const closeBtn = newPopover.querySelector(".close-popover");

    // Simple direct event handler for testing
    newButton.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();

      // Toggle active class
      newPopover.classList.toggle("active");
      overlay.classList.toggle("active");

      // If opening
      if (newPopover.classList.contains("active")) {
        // Force styles to ensure visibility
        newPopover.style.opacity = "1";
        newPopover.style.visibility = "visible";
        newPopover.style.zIndex = "99999";
        document.body.style.overflow = "hidden";

        console.log("Popover opened with forced styles");
      } else {
        // Reset styles when closing
        document.body.style.overflow = "";

        console.log("Popover closed");
      }
    };

    // Close button handler
    if (closeBtn) {
      closeBtn.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();

        newPopover.classList.remove("active");
        overlay.classList.remove("active");
        document.body.style.overflow = "";

        console.log("Popover closed via close button");
      };
    }

    // Overlay click handler
    overlay.onclick = function () {
      newPopover.classList.remove("active");
      overlay.classList.remove("active");
      document.body.style.overflow = "";

      console.log("Popover closed via overlay click");
    };

    console.log("Direct event handlers attached for testing");
  }, 500); // Wait 500ms to ensure everything is loaded
});
