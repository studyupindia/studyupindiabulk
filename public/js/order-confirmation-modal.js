/**
 * Streamlined Order Confirmation Modal
 *
 * Features:
 * - Compact, no-scroll design across all devices
 * - Optimized for readability and clean appearance
 * - Improved animation and interactions
 */

// Create and show the order confirmation modal
function showOrderConfirmationModal(orderData) {
  // Create modal overlay
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "confirmationModal";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "confirmation-title");

  // Current date formatted
  const orderDate = new Date().toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Format total with commas for thousands
  const formattedTotal = formatPriceForModal(orderData.total || 0);

  // Create a more compact modal HTML without scrollable content
  // overlay.innerHTML = `
  //   <div class="order-confirmation-modal">
  //     <div class="modal-header">
  //       <button class="modal-close-btn" id="closeModal" aria-label="Close modal">
  //         <i class="fas fa-times"></i>
  //       </button>
  //       <div class="success-icon" aria-hidden="true">
  //         <!-- Using inline style to ensure the checkmark is always visible -->
  //         <i class="fas fa-check" style="color: #4caf50; opacity: 1;"></i>
  //       </div>
  //       <h2 class="modal-title" id="confirmation-title">Order Confirmed!</h2>
  //       <p class="modal-subtitle">Your order request has been submitted successfully</p>
  //     </div>
      
  //     <div class="modal-body">
  //       <div class="order-details">
  //         <div class="order-detail-item">
  //           <span class="detail-label">Order ID:</span>
  //           <span class="detail-value detail-id">${orderData.id || "N/A"}</span>
  //         </div>
  //         <div class="order-detail-item">
  //           <span class="detail-label">Date:</span>
  //           <span class="detail-value">${orderDate}</span>
  //         </div>
  //         <div class="order-detail-item">
  //           <span class="detail-label">Items:</span>
  //           <span class="detail-value">${orderData.itemCount || 0}</span>
  //         </div>
  //         <div class="order-detail-item">
  //           <span class="detail-label">Total:</span>
  //           <span class="detail-value">₹${formattedTotal}</span>
  //         </div>
  //       </div>
        
  //       <p class="message">
  //         Thank you for your order request. The seller will review your request and send you a quote with delivery details shortly.
  //       </p>
  //     </div>
      
  //     <div class="modal-footer">
  //       <button class="modal-btn primary-btn" id="closeOrder">
  //         <i class="fas fa-check-circle"></i> Done
  //       </button>
  //     </div>
  //   </div>
  // `;
  overlay.innerHTML = `
    <div class="order-confirmation-modal">
      <div class="modal-header">
        <button class="modal-close-btn" id="closeModal" aria-label="Close modal">
          <i class="fas fa-times"></i>
        </button>
        <div class="success-icon" aria-hidden="true">
          <!-- Using inline style to ensure the checkmark is always visible -->
          <i class="fas fa-check" style="color: #4caf50; opacity: 1;"></i>
        </div>
        <h2 class="modal-title" id="confirmation-title">Order Confirmed!</h2>
      </div>
      
      <div class="modal-body">
        <div class="order-details">
          <div class="order-detail-item">
            <span class="detail-label">Order ID:</span>
            <span class="detail-value detail-id">${orderData.id || "N/A"}</span>
          </div>
          <div class="order-detail-item">
            <span class="detail-label">Date:</span>
            <span class="detail-value">${orderDate}</span>
          </div>
          <div class="order-detail-item">
            <span class="detail-label">Total:</span>
            <span class="detail-value">₹${formattedTotal}</span>
          </div>
        </div>
        
        <p class="message">
          The seller will review your request and send you a quote with delivery details shortly.
        </p>
      </div>
      
      <div class="modal-footer">
        <a href="/order-history" class="modal-btn primary-btn" id="closeOrder">
          <i class="fas fa-check-circle"></i> Done
        </a>
      </div>
    </div>
  `;

  // Append modal to body
  document.body.appendChild(overlay);

  // Prevent background scrolling
  toggleBodyScroll(true);

  // Force reflow to enable animations
  overlay.offsetHeight;

  // Add active class for animation
  overlay.classList.add("active");

  // Add event listeners
  const closeBtn = overlay.querySelector("#closeModal");
  const doneBtn = overlay.querySelector("#closeOrder");

  // Close button event
  closeBtn.addEventListener("click", () => {
    closeModal(overlay);
  });

  // Done button event
  if (doneBtn) {
    doneBtn.addEventListener("click", () => {
      closeModal(overlay);
    });
  }

  // Close on click outside
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      closeModal(overlay);
    }
  });

  // Close on escape key
  document.addEventListener("keydown", function escapeHandler(e) {
    if (e.key === "Escape") {
      closeModal(overlay);
      document.removeEventListener("keydown", escapeHandler);
    }
  });

  // Set focus to the Done button for accessibility
  setTimeout(() => {
    if (doneBtn) {
      doneBtn.focus();
    }
  }, 100);
}

// Close and remove the modal with animation
function closeModal(overlay) {
  overlay.classList.remove("active");

  // Enable scrolling again
  toggleBodyScroll(false);

  // Remove from DOM after animation completes
  setTimeout(() => {
    overlay.remove();
  }, 300);
}

// Prevent background scrolling when modal is open
function toggleBodyScroll(isOpen) {
  if (isOpen) {
    // Store current scroll position
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
  } else {
    // Restore scroll position
    const scrollY = document.body.style.top;
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
    document.body.style.overflow = "";
    window.scrollTo(0, parseInt(scrollY || "0") * -1);
  }
}

// Helper function to format price
function formatPriceForModal(price) {
  // Handle different types of input
  if (typeof price !== "number") {
    price = Number(price);
  }

  // If it's not a valid number, return a safe default
  if (isNaN(price)) {
    return "0.00";
  }

  // Format with 2 decimal places using Indian number format
  try {
    return price.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch (e) {
    // Fallback method if toLocaleString fails
    return price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
}

// Process API response and show modal
function processOrderResponse(responseData, orderData) {
  // Calculate total from order data
  const itemCount = orderData.books.reduce(
    (sum, book) => sum + book.quantity,
    0
  );
  const total = orderData.books.reduce(
    (sum, book) => sum + book.price * book.quantity,
    0
  );

  // Show the confirmation modal
  showOrderConfirmationModal({
    id: responseData.id || "N/A",
    itemCount: itemCount,
    total: total,
  });
}

// Initialize the modal system after DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  // Expose functions globally
  window.showOrderConfirmationModal = showOrderConfirmationModal;
  window.processOrderResponse = processOrderResponse;
});
