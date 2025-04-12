// Constants from schema.js
const ORDER_REQUEST_STATUSES = [
  "pending", // Initial state when created
  "quoted", // Received a quote
  "quote_revised", // Seller has revised the quote
  "quote_accepted", // Buyer accepted the quote
  "quote_rejected", // Buyer rejected the quote
  "awaiting_payment", // Payment pending
  "payment_failed", // Payment attempt failed
  "payment_completed", // Payment successful
  "processed", // Being prepared for shipping
  "shipped", // Items shipped
  "delivered", // Delivered to buyer
  "completed", // Order cycle complete
  "cancelled", // Cancelled by buyer
  "cancelled_by_seller", // Cancelled by seller
  "disputed", // Issue raised
];

const QUOTE_STATUSES = [
  "draft", // Initial state (seller side)
  "sent", // Sent to buyer
  "viewed", // Buyer has viewed it
  "pending_revision", // Buyer requested changes
  "revised", // Seller has made changes
  "accepted", // Buyer accepted
  "rejected", // Buyer rejected
  "expired", // Quote timed out
  "cancelled", // Cancelled by seller
];

const PAYMENT_STATUSES = [
  "pending",
  "processing",
  "completed",
  "failed",
  "refunded",
  "partially_refunded",
];

const PAYMENT_METHODS = [
  "cash",
  "bank_transfer",
  "upi",
  "credit_card",
  "debit_card",
  "netbanking",
  "wallet",
  "other",
];

// Pipeline step configuration
const PIPELINE_STEPS = [
  {
    id: "pending",
    label: "Pending",
    icon: "fas fa-hourglass-start",
    statuses: ["pending"],
  },
  {
    id: "quoted",
    label: "Quoted",
    icon: "fas fa-file-invoice-dollar",
    statuses: ["quoted", "quote_revised", "quote_accepted"],
  },
  {
    id: "confirmed",
    label: "Confirmed",
    icon: "fas fa-check-circle",
    statuses: [
      "awaiting_payment",
      "payment_failed",
      "payment_completed",
    ],
  },
  {
    id: "processing",
    label: "Processing",
    icon: "fas fa-cogs",
    statuses: ["processed"],
  },
  {
    id: "shipping",
    label: "Shipping",
    icon: "fas fa-truck",
    statuses: ["shipped"],
  },
  {
    id: "delivered",
    label: "Delivered",
    icon: "fas fa-box-open",
    statuses: ["delivered"],
  },
  {
    id: "completed",
    label: "Completed",
    icon: "fas fa-check-circle",
    statuses: ["completed"],
  },
  {
    id: "cancelled",
    label: "Cancelled",
    icon: "fas fa-times-circle",
    statuses: [
      "cancelled",
      "cancelled_by_seller",
      "disputed",
      "quote_rejected",
    ],
  },
];

// DOM Elements
let ordersList;
let noOrders;
let loadingSpinner;
let orderDetailsModal;
let modalContent;
let orderActionButtons;
let paymentModal;
let revisionModal;
let cancelOrderModal;
let disputeModal;
let searchInput;
let clearSearchBtn;
let searchButton;
let statusFilter;
let publicationFilter;
let dateFromInput;
let dateToInput;
let applyFiltersButton;
let clearFiltersButton;
let tabButtons;
let refreshButton;
let scrollToTopButton;
let pipelineContainer;

// Global variables
let orderRequests = []; // Will be populated from the server
let currentOrderDetail = null; // Current order being viewed

// Initialize page
document.addEventListener("DOMContentLoaded", function () {
  // Initialize DOM elements
  initializeDOMElements();

  // Initialize status filter options from constants
  populateStatusFilter();

  // Initialize payment methods from constants
  populatePaymentMethods();

  // Show loading spinner
  showLoading();

  // Initialize page after a small delay to simulate API call
  setTimeout(() => {
    // Fetch data from the server (simulated here)
    fetchOrderData();

    // Initialize UI with data
    hideLoading();
    renderPipeline(orderRequests);
    renderOrders(orderRequests);
    setupEventListeners();
  }, 800);
});

// Initialize DOM elements
function initializeDOMElements() {
  ordersList = document.getElementById("orders-list");
  noOrders = document.getElementById("no-orders");
  loadingSpinner = document.getElementById("loading-spinner");
  orderDetailsModal = document.getElementById("order-details-modal");
  modalContent = document.getElementById("modal-content");
  orderActionButtons = document.getElementById("order-action-buttons");
  paymentModal = document.getElementById("payment-modal");
  revisionModal = document.getElementById("revision-modal");
  cancelOrderModal = document.getElementById("cancel-order-modal");
  disputeModal = document.getElementById("dispute-modal");
  searchInput = document.getElementById("search-input");
  clearSearchBtn = document.getElementById("clear-search");
  searchButton = document.getElementById("search-btn");
  statusFilter = document.getElementById("status-filter");
  publicationFilter = document.getElementById("publication-filter");
  dateFromInput = document.getElementById("date-from");
  dateToInput = document.getElementById("date-to");
  applyFiltersButton = document.getElementById("apply-filters");
  clearFiltersButton = document.getElementById("clear-filters");
  tabButtons = document.querySelectorAll(".tab-btn");
  refreshButton = document.getElementById("refresh-data");
  scrollToTopButton = document.getElementById("scroll-to-top");
  pipelineContainer = document.getElementById("pipeline-container");
}

// Populate status filter options
function populateStatusFilter() {
  // Clear any existing options except the first one (All Statuses)
  while (statusFilter.options.length > 1) {
    statusFilter.remove(1);
  }

  // Add options from ORDER_REQUEST_STATUSES
  ORDER_REQUEST_STATUSES.forEach((status) => {
    const option = document.createElement("option");
    option.value = status;
    option.textContent = formatStatusLabel(status);
    statusFilter.appendChild(option);
  });
}

// Populate payment methods
function populatePaymentMethods() {
  const paymentOptions = document.querySelector(".payment-options");
  if (!paymentOptions) return;

  // Clear any existing options
  paymentOptions.innerHTML = "";

  // Add options from PAYMENT_METHODS
  PAYMENT_METHODS.forEach((method, index) => {
    let iconClass = "fas fa-money-bill-alt"; // Default
    let description = "Pay using this method";

    // Set appropriate icon and description based on method
    switch (method) {
      case "upi":
        iconClass = "fas fa-mobile-alt";
        description = "Pay using any UPI app (Google Pay, PhonePe, etc.)";
        break;
      case "credit_card":
      case "debit_card":
        iconClass = "fas fa-credit-card";
        description = "Pay securely using your card";
        break;
      case "netbanking":
        iconClass = "fas fa-university";
        description = "Pay through your bank account";
        break;
      case "bank_transfer":
        iconClass = "fas fa-exchange-alt";
        description = "Direct bank transfer";
        break;
      case "wallet":
        iconClass = "fas fa-wallet";
        description = "Pay using digital wallet";
        break;
      case "cash":
        iconClass = "fas fa-money-bill-wave";
        description = "Cash on delivery";
        break;
    }

    const methodName = formatStatusLabel(method);

    // Create payment option
    const optionHtml = `
            <label class="payment-option">
                <input type="radio" name="payment-method" value="${method}" ${
      index === 0 ? "checked" : ""
    }>
                <div class="option-content">
                    <div class="option-icon"><i class="${iconClass}"></i></div>
                    <div class="option-details">
                        <div class="option-title">${methodName}</div>
                        <div class="option-desc">${description}</div>
                    </div>
                </div>
            </label>
        `;

    paymentOptions.innerHTML += optionHtml;
  });
}

// Set up event listeners
function setupEventListeners() {
  // Close modals when clicking close button
  document
    .querySelectorAll(".modal-close, #close-modal-btn")
    .forEach((button) => {
      button.addEventListener("click", (e) => {
        const modal = e.target.closest(".modal");
        if (modal) modal.style.display = "none";
      });
    });

  // Close modals when clicking outside
  window.addEventListener("click", (event) => {
    if (event.target.classList.contains("modal")) {
      event.target.style.display = "none";
    }
  });

  // Search functionality
  searchButton.addEventListener("click", () => {
    searchOrders();
  });

  searchInput.addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
      searchOrders();
    }

    // Show clear button if there's input
    if (searchInput.value) {
      clearSearchBtn.style.display = "block";
    } else {
      clearSearchBtn.style.display = "none";
    }
  });

  // Clear search button
  clearSearchBtn.addEventListener("click", () => {
    searchInput.value = "";
    clearSearchBtn.style.display = "none";
    renderOrders(orderRequests);
  });

  // Apply filters button
  applyFiltersButton.addEventListener("click", () => {
    applyFilters();
  });

  // Clear filters button
  clearFiltersButton.addEventListener("click", () => {
    clearFilters();
  });

  // Tab navigation
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      // Remove active class from all buttons
      tabButtons.forEach((btn) => btn.classList.remove("active"));

      // Add active class to clicked button
      button.classList.add("active");

      // Filter orders based on the selected tab
      const tabCategory = button.getAttribute("data-tab");
      filterOrdersByTab(tabCategory);
    });
  });

  // Refresh data button
  refreshButton.addEventListener("click", () => {
    refreshData();
  });

  // Scroll to top button
  scrollToTopButton.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });

  // Payment buttons
  document
    .getElementById("process-payment-btn")
    .addEventListener("click", () => {
      const orderId = document.getElementById("payment-order-id").textContent;
      const paymentMethod = document.querySelector(
        'input[name="payment-method"]:checked'
      ).value;
      processPayment(orderId, paymentMethod);
    });

  // Revision modal
  document
    .getElementById("submit-revision-btn")
    .addEventListener("click", () => {
      const orderId = document
        .getElementById("submit-revision-btn")
        .getAttribute("data-order-id");
      const reason = document.getElementById("revision-reason").value;
      if (!reason.trim()) {
        showNotification(
          "error",
          "Error",
          "Please provide a reason for the revision request"
        );
        return;
      }
      submitRevisionRequest(orderId, reason);
    });

  // Cancel Order modal
  const cancellationReason = document.getElementById("cancellation-reason");
  const otherReasonGroup = document.getElementById("other-reason-group");
  if (cancellationReason) {
    cancellationReason.addEventListener("change", function () {
      if (this.value === "other") {
        otherReasonGroup.style.display = "block";
      } else {
        otherReasonGroup.style.display = "none";
      }
    });
  }

  document
    .getElementById("confirm-cancellation-btn")
    .addEventListener("click", () => {
      cancelOrder();
    });

  // Dispute modal
  document
    .getElementById("submit-dispute-btn")
    .addEventListener("click", () => {
      submitDispute();
    });
}

// Show loading spinner
function showLoading() {
  if (loadingSpinner) loadingSpinner.style.display = "flex";
  if (ordersList) ordersList.style.display = "none";
  if (noOrders) noOrders.style.display = "none";
}

// Hide loading spinner
function hideLoading() {
  if (loadingSpinner) loadingSpinner.style.display = "none";
  if (ordersList) ordersList.style.display = "block";
}

// Render the order status pipeline
function renderPipeline(orders) {
  if (!pipelineContainer) return;

  pipelineContainer.innerHTML = "";

  // Create each pipeline step
  PIPELINE_STEPS.forEach((step) => {
    // Count orders in this step
    const count = orders.filter((order) =>
      step.statuses.includes(order.status)
    ).length;

    // Determine if any orders are currently in this step
    const hasActiveOrders = count > 0;
    const isCompleted = step.id === "completed" && hasActiveOrders;
    const isCancelled = step.id === "cancelled" && hasActiveOrders;

    // Determine step class
    let stepClass = hasActiveOrders ? "active" : "";
    if (isCompleted) stepClass = "completed";
    if (isCancelled) stepClass = "cancelled";

    // Create the step element
    const stepElement = document.createElement("div");
    stepElement.className = `pipeline-step ${stepClass}`;
    stepElement.dataset.stepId = step.id;
    stepElement.innerHTML = `
      <div class="pipeline-icon">
        <i class="${step.icon}"></i>
      </div>
      <div class="pipeline-label">${step.label}</div>
      <div class="pipeline-count">${count}</div>
    `;

    // Add click event to filter orders by this step
    stepElement.addEventListener("click", () => {
      filterOrdersByPipelineStep(step.statuses);
    });

    pipelineContainer.appendChild(stepElement);
  });
}

// Filter orders by pipeline step
function filterOrdersByPipelineStep(statuses) {
  showLoading();

  setTimeout(() => {
    const filteredOrders = orderRequests.filter((order) =>
      statuses.includes(order.status)
    );

    hideLoading();
    renderOrders(filteredOrders);

    // Update active tab
    // Find the best matching tab based on pipeline statuses
    const statusToTabMap = {
      pending: "pending",
      quoted: "quoted",
      quote_revised: "quoted",
      quote_accepted: "confirmed",
      awaiting_payment: "confirmed",
      payment_failed: "confirmed",
      payment_completed: "confirmed",
      processed: "confirmed",
      shipped: "shipped",
      delivered: "shipped",
      completed: "completed",
      cancelled: "cancelled",
      cancelled_by_seller: "cancelled",
      disputed: "cancelled",
      quote_rejected: "cancelled",
    };

    // Find the best tab to activate
    let tabToActivate = null;
    for (const status of statuses) {
      const mappedTab = statusToTabMap[status];
      if (mappedTab) {
        tabToActivate = mappedTab;
        break; // Use the first matched tab
      }
    }

    // Update active tab if we found a match
    if (tabToActivate) {
      tabButtons.forEach((btn) => {
        const tabCategory = btn.getAttribute("data-tab");
        if (
          tabCategory === tabToActivate ||
          (tabCategory === "all" && !tabToActivate)
        ) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
    }

    // Show notification
    showNotification(
      "info",
      "Filter Applied",
      `Showing ${filteredOrders.length} orders with status: ${statuses
        .map((s) => formatStatusLabel(s))
        .join(", ")}`
    );
  }, 500);
}

// Format status label
function formatStatusLabel(status) {
  if (!status) return "";
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Format date
function formatDate(dateString, includeTime = false) {
  const date = new Date(dateString);
  const options = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };

  if (includeTime) {
    options.hour = "2-digit";
    options.minute = "2-digit";
  }

  return date.toLocaleDateString("en-IN", options);
}

// Render orders to the page
function renderOrders(orders) {
  if (!ordersList) return;

  ordersList.innerHTML = "";

  if (orders.length === 0) {
    if (noOrders) noOrders.style.display = "block";
    return;
  }

  if (noOrders) noOrders.style.display = "none";

  orders.forEach((order) => {
    // Create order card
    const orderCard = document.createElement("div");
    orderCard.className = "order-card";
    orderCard.dataset.orderId = order.id;

    // Format date
    const orderDate = new Date(order.createdAt);
    const formattedDate = formatDate(orderDate);

    // Format order status
    let orderStatusDisplay = formatStatusLabel(order.status);

    // Format quote status if exists
    let quoteStatusDisplay = "";
    let quoteStatusClass = "";

    if (order.quote) {
      if (order.quote.status === "sent") {
        quoteStatusDisplay = "Quote Received";
        quoteStatusClass = "status-quoted";
      } else if (order.quote.status === "pending_revision") {
        quoteStatusDisplay = "Pending Revision";
        quoteStatusClass = "status-pending_revision";
      } else if (order.quote.status === "revised") {
        quoteStatusDisplay = "Quote Revised";
        quoteStatusClass = "status-revised";
      } else {
        quoteStatusDisplay = formatStatusLabel(order.quote.status);
        quoteStatusClass = `status-${order.quote.status}`;
      }
    }

    // Build order header
    let orderHeader = `
      <div class="order-header" data-toggle="collapse" data-target="order-body-${
        order.id
      }">
        <div class="order-header-left">
          <span class="order-id">${order.id.substr(0, 8)}...</span>
          <span class="order-date">${formattedDate}</span>
          <span class="seller-name"><i class="fas fa-store"></i> ${
            order.sellerName
          }</span>
          <span class="publication-badge">${order.publication}</span>
        </div>
        <div class="order-header-right">
          <span class="status-badge status-${order.status}">
            <span class="status-label">Order:</span> ${orderStatusDisplay}
          </span>
          ${
            order.quote
              ? `<span class="status-badge ${quoteStatusClass}">
                  <span class="status-label">Quote:</span> ${quoteStatusDisplay}
                </span>`
              : ""
          }
              ${
                order.invoiceUrl
                  ? `<span class="status-badge status-info">
          <i class="fas fa-file-invoice"></i> Invoice
        </span>`
                  : ""
              }
          <i class="fas fa-chevron-down accordion-icon"></i>
        </div>
      </div>
    `;

    // Determine which set of books and pricing to use (quote or original order)
    const booksToDisplay = order.quote ? order.quote.books : order.books;
    const totalPrice = order.quote ? order.quote.totalPrice : order.totalPrice;
    const discountPercentage = order.quote
      ? order.quote.discountPercentage || 0
      : order.discountPercentage || 0;
    const discountAmount = order.quote
      ? order.quote.discountAmount || 0
      : order.discountAmount || 0;
    const deliveryCharges = order.quote
      ? order.quote.deliveryCharges
      : order.deliveryCharges;
    const handlingCharges =
      order.quote && order.quote.handlingCharges
        ? order.quote.handlingCharges
        : order.handlingCharges || 0;

    // Calculate discounted subtotal and grand total
    const discountedSubtotal = totalPrice - discountAmount;
    const grandTotal = discountedSubtotal + deliveryCharges + handlingCharges;

    // Order Items Table
    let orderItemsTable = `
      <h3 class="section-heading"><i class="fas fa-book"></i> ${
        order.quote ? "Quoted Items" : "Order Items"
      }</h3>
      <div class="items-table-wrapper">
        <table class="items-table">
          <thead>
            <tr>
              <th>Book Title</th>
              <th>Code</th>
              <th>Class</th>
              <th>Subject</th>
              <th>Quantity</th>
              <th>Price (₹)</th>
              <th>Total (₹)</th>
            </tr>
          </thead>
          <tbody>
    `;

    // Add book items to table
    booksToDisplay.forEach((book) => {
      orderItemsTable += `
        <tr>
          <td>${book.title}</td>
          <td>${book.code}</td>
          <td>${book.class}</td>
          <td>${book.subject}</td>
          <td>${book.quantity}</td>
          <td>${book.price.toLocaleString("en-IN")}</td>
          <td>${book.total.toLocaleString("en-IN")}</td>
        </tr>
      `;
    });

    // Add subtotal to table
    orderItemsTable += `
          </tbody>
          <tfoot>
            <tr>
              <td colspan="5"></td>
              <td>Subtotal:</td>
              <td>₹${totalPrice.toLocaleString("en-IN")}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    // Price sections
    let priceSections = `
  <div class="price-section">
    <div class="price-row">
      <span>Subtotal:</span>
      <span>₹${totalPrice.toLocaleString("en-IN")}</span>
    </div>
    <div class="price-row discount">
      <span>Discount (${discountPercentage.toFixed(2)}%):</span>
      <span>- ₹${discountAmount.toLocaleString("en-IN")}</span>
    </div>
    <div class="price-row discounted-subtotal">
      <span>Discounted Subtotal:</span>
      <span>₹${discountedSubtotal.toLocaleString("en-IN")}</span>
    </div>
    <div class="price-row">
      <span>Delivery:</span>
      <span>₹${deliveryCharges.toLocaleString("en-IN")}</span>
    </div>
    <div class="price-row">
      <span>Handling:</span>
      <span>₹${handlingCharges.toLocaleString("en-IN")}</span>
    </div>
    <div class="price-row total">
      <span>Grand Total:</span>
      <span>₹${grandTotal.toLocaleString("en-IN")}</span>
    </div>
  </div>
`;

    // Quote actions based on status
    let actionButtons = `
      <div class="action-buttons">
    `;

    // Generate appropriate action buttons based on order status
    if (order.quote) {
      if (order.quote.status === "sent" || order.quote.status === "revised") {
        actionButtons += `
          <button class="btn-success" onclick="acceptQuote('${order.id}')">
            <i class="fas fa-check"></i> Accept Quote
          </button>
          <button class="btn-danger" onclick="rejectQuote('${order.id}')">
            <i class="fas fa-times"></i> Reject Quote
          </button>
          <button class="btn-secondary" onclick="showRevisionModal('${order.id}')">
            <i class="fas fa-edit"></i> Request Changes
          </button>
        `;
      } else if (
        order.quote.status === "accepted" &&
        (order.status === "quote_accepted" ||
          order.status === "awaiting_payment")
      ) {
        actionButtons += `
          <a href='${order.quote.paymentUrl}' target="_blank" style="text-decoration: none;" class="btn-primary">
            <i class="fas fa-credit-card"></i> Pay Now
          </a>
          <button class="btn-danger" onclick="showCancelOrderModal('${order.id}')">
            <i class="fas fa-times-circle"></i> Cancel Order
          </button>
        `;
      }
    }

    // Additional actions for other order statuses
    if (order.status === "pending") {
      actionButtons += `
        <button class="btn-danger" onclick="showCancelOrderModal('${order.id}')">
          <i class="fas fa-times-circle"></i> Cancel Order
        </button>
      `;
    } else if (order.status === "payment_failed") {
      actionButtons += `
        <a href='${order.quote.paymentUrl}' target="_blank" style="text-decoration: none;" class="btn-primary">
            <i class="fas fa-redo"></i> Retry Payment
          </a>
        <button class="btn-danger" onclick="showCancelOrderModal('${order.id}')">
          <i class="fas fa-times-circle"></i> Cancel Order
        </button>
      `;
    } else if (order.status === "shipped" || order.status === "delivered") {
      actionButtons += `
        <button class="btn-danger" onclick="showDisputeModal('${order.id}')">
          <i class="fas fa-exclamation-triangle"></i> Report Issue
        </button>
      `;
    }

    // In the renderOrders function, modify the actionButtons section:
    if (order.invoiceUrl) {
      actionButtons += `
    <a href="${order.invoiceUrl}" target="_blank" class="btn-info">
      <i class="fas fa-file-invoice"></i> View Invoice
    </a>
  `;
    }

    // Always add view details button
    actionButtons += `
        <button class="btn-primary" onclick="viewOrderDetails('${order.id}')">
          <i class="fas fa-eye"></i> View Details
        </button>
      </div>
    `;

    // Build the order body
    let orderBody = `
      <div class="order-body" id="order-body-${order.id}">
        <div class="order-content">
          ${orderItemsTable}
          ${order.quote ? priceSections : ""}
          ${actionButtons}
        </div>
      </div>
    `;

    // Assemble the order card
    orderCard.innerHTML = `${orderHeader}${orderBody}`;
    ordersList.appendChild(orderCard);
  });

  // Add toggle functionality to order headers
  // document.querySelectorAll(".order-header").forEach((header) => {
  //   header.addEventListener("click", function () {
  //     const targetId = this.getAttribute("data-target");
  //     const content = document.getElementById(targetId);
  //     const icon = this.querySelector(".accordion-icon");

  //     if (content.classList.contains("expanded")) {
  //       content.classList.remove("expanded");
  //       icon.style.transform = "rotate(0deg)";
  //     } else {
  //       content.classList.add("expanded");
  //       icon.style.transform = "rotate(180deg)";
  //     }
  //   });
  // });
  // Add toggle functionality to order headers
  document.querySelectorAll(".order-header").forEach((header) => {
    header.addEventListener("click", function () {
      const targetId = this.getAttribute("data-target");
      const content = document.getElementById(targetId);
      const icon = this.querySelector(".accordion-icon");

      // First, close all other accordions
      document
        .querySelectorAll(".order-body.expanded")
        .forEach((openContent) => {
          // Skip the current one, we'll handle it separately
          if (openContent.id !== targetId) {
            // Find the associated header to rotate its icon back
            const openHeader = document.querySelector(
              `[data-target="${openContent.id}"]`
            );
            const openIcon = openHeader?.querySelector(".accordion-icon");
            if (openIcon) {
              openIcon.style.transform = "rotate(0deg)";
            }
            openContent.classList.remove("expanded");
          }
        });

      // Now toggle the current accordion
      if (content.classList.contains("expanded")) {
        content.classList.remove("expanded");
        icon.style.transform = "rotate(0deg)";
      } else {
        content.classList.add("expanded");
        icon.style.transform = "rotate(180deg)";
      }
    });
  });
}

// View order details
function viewOrderDetails(orderId) {
  const order = orderRequests.find((o) => o.id === orderId);
  if (!order) return;

  currentOrderDetail = { ...order }; // Make a copy to avoid modifying the original

  // Format date
  const orderDate = new Date(order.createdAt);
  const formattedDate = formatDate(orderDate, true);

  // Format status
  const orderStatus = formatStatusLabel(order.status);

  // Build modal content with tabs
  let modalHtml = `
    <div class="detail-tabs">
      ${
        order.quote
          ? `<button class="detail-tab active" data-panel="quote-panel">Quote</button>`
          : ""
      }
      <button class="detail-tab" data-panel="order-info-panel">Order Info</button>
      ${
        order.payment
          ? `<button class="detail-tab" data-panel="payment-panel">Payment</button>`
          : ""
      }
      ${
        order.status === "shipped" ||
        order.status === "delivered" ||
        order.status === "completed"
          ? `<button class="detail-tab" data-panel="shipping-panel">Shipping</button>`
          : ""
      }
      ${
        order.invoiceUrl
          ? `<button class="detail-tab" data-panel="invoice-panel">Invoice</button>`
          : ""
      }
      ${
        order.statusHistory && order.statusHistory.length > 0
          ? `<button class="detail-tab" data-panel="history-panel">History</button>`
          : ""
      }
    </div>

    <!-- Order Info Panel -->
    <div class="detail-panel ${!order.quote ? "active" : ""}" id="order-info-panel">
      <div class="notification info-notification">
        <i class="fas fa-info-circle"></i> Order details including your request and current status.
      </div>
      
      <div class="detail-section">
        <h3><i class="fas fa-info-circle"></i> Order Information</h3>
        <div class="detail-grid">
          <div class="detail-group">
            <h4>Order Details</h4>
            <div class="detail-content">
              <p><strong>Order ID:</strong> ${order.id}</p>
              <p><strong>Date:</strong> ${formattedDate}</p>
              <p><strong>Status:</strong> <span class="status-badge status-${
                order.status
              }">${orderStatus}</span></p>
            </div>
          </div>
          <div class="detail-group">
            <h4>Seller Information</h4>
            <div class="detail-content">
              <p><strong>Name:</strong> ${order.sellerName}</p>
              <p><strong>Publication:</strong> ${order.publication}</p>
            </div>
          </div>
        </div>
        
        <div class="detail-group">
          <h4>Shipping Address</h4>
          <div class="detail-content">
            <p>${order.shippingAddress}</p>
          </div>
        </div>
      </div>

      <h3 class="section-heading"><i class="fas fa-book"></i> Order Items</h3>
      <div class="items-table-wrapper">
        <table class="items-table">
          <thead>
            <tr>
              <th>Book Title</th>
              <th>Code</th>
              <th>Class</th>
              <th>Subject</th>
              <th>Quantity</th>
              <th>Price (₹)</th>
              <th>Total (₹)</th>
            </tr>
          </thead>
          <tbody>
  `;

  // Add book items (original order)
  order.books.forEach((book) => {
    modalHtml += `
      <tr>
        <td>${book.title}</td>
        <td>${book.code}</td>
        <td>${book.class}</td>
        <td>${book.subject}</td>
        <td>${book.quantity}</td>
        <td>${book.price.toLocaleString("en-IN")}</td>
        <td>${book.total.toLocaleString("en-IN")}</td>
      </tr>
    `;
  });

  // Calculate totals
  const handlingCharges = order.handlingCharges || 0;
  const grandTotal = order.totalPrice + order.deliveryCharges + handlingCharges;

  // Add order totals - No need to show entire totals in the modal
  // modalHtml += `
  //         </tbody>
  //         <tfoot>
  //           <tr>
  //             <td colspan="5"></td>
  //             <td>Subtotal:</td>
  //             <td>₹${order.totalPrice.toLocaleString("en-IN")}</td>
  //           </tr>
  //           <tr class="discount">
  //             <td colspan="5"></td>
  //             <td>Discount (${order.discountPercentage.toFixed(2)}%):</td>
  //             <td>- ₹${order.discountAmount.toLocaleString("en-IN")}</td>
  //           </tr>
  //           <tr class="discounted-subtotal">
  //             <td colspan="5"></td>
  //             <td>Discounted Subtotal:</td>
  //             <td>₹${(order.totalPrice - order.discountAmount).toLocaleString(
  //               "en-IN"
  //             )}</td>
  //           </tr>
  //         </tfoot>
  //       </table>
  //     </div>
      
  //     <div class="detail-totals">
  //       <div class="total-row">
  //         <span>Subtotal:</span>
  //         <span>₹${order.totalPrice.toLocaleString("en-IN")}</span>
  //       </div>
  //       <div class="total-row discount">
  //         <span>Discount (${order.discountPercentage.toFixed(2)}%):</span>
  //         <span>- ₹${order.discountAmount.toLocaleString("en-IN")}</span>
  //       </div>
  //       <div class="total-row discounted-subtotal">
  //         <span>Discounted Subtotal:</span>
  //         <span>₹${(order.totalPrice - order.discountAmount).toLocaleString(
  //           "en-IN"
  //         )}</span>
  //       </div>
  //       <div class="total-row">
  //         <span>Delivery Charges:</span>
  //         <span>₹${order.deliveryCharges.toLocaleString("en-IN")}</span>
  //       </div>
  //       <div class="total-row">
  //         <span>Handling Charges:</span>
  //         <span>₹${handlingCharges.toLocaleString("en-IN")}</span>
  //       </div>
  //       <div class="total-row grand-total">
  //         <span>Grand Total:</span>
  //         <span>₹${grandTotal.toLocaleString("en-IN")}</span>
  //       </div>
  //     </div>
  //   </div>
  // `;
  modalHtml += `
          </tbody>
          <tfoot>
            <tr>
              <td colspan="5"></td>
              <td>Subtotal:</td>
              <td>₹${order.totalPrice.toLocaleString("en-IN")}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      
    </div>
  `;

  // Quote Panel
  if (order.quote) {
    // Format date
    const quoteDate = new Date(order.quote.createdAt);
    const formattedQuoteDate = formatDate(quoteDate, true);

    // Format status
    const quoteStatus = formatStatusLabel(order.quote.status);

    // Format expiry date if exists
    let expiryDateDisplay = "N/A";
    if (order.quote.expiryDate) {
      const expiryDate = new Date(order.quote.expiryDate);
      expiryDateDisplay = formatDate(expiryDate);
    }

    modalHtml += `
      <div class="detail-panel" id="quote-panel">
        <div class="notification info-notification">
          <i class="fas fa-info-circle"></i> Quote provided by the seller.
        </div>
        
        <div class="detail-section">
          <h3><i class="fas fa-file-alt"></i> Quote Information</h3>
          <div class="detail-grid">
            <div class="detail-group">
              <div class="detail-content">
                <p><strong>Quote ID:</strong> ${order.quote.id}</p>
                <p><strong>Date:</strong> ${formattedQuoteDate}</p>
                <p><strong>Status:</strong> 
                  <span class="status-badge status-${
                    order.quote.status
                  }">${quoteStatus}</span>
                </p>
                <p><strong>Expiry Date:</strong> ${expiryDateDisplay}</p>
              </div>
            </div>
          </div>
        </div>

        ${
          order.quote.message
            ? `
        <div class="detail-group">
          <h4><i class="fas fa-comment-alt"></i> Message from Seller</h4>
          <div class="detail-content">
            <p>${order.quote.message}</p>
          </div>
        </div>
        `
            : ""
        }

        <h3 class="section-heading"><i class="fas fa-book"></i> Quote Items</h3>
    `;

    // Add comparison section between order and quote
    modalHtml += renderComparisonSection(order.books, order.quote.books);

    // Calculate quote totals
    const quoteHandlingCharges = order.quote.handlingCharges || 0;
    const quoteGrandTotal = order.quote.totalPrice - order.quote.discountAmount + order.quote.deliveryCharges + quoteHandlingCharges;

    // Add quote totals
    modalHtml += `
      <div class="detail-totals">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>₹${order.quote.totalPrice.toLocaleString("en-IN")}</span>
        </div>
        <div class="total-row discount">
          <span>Discount (${order.quote.discountPercentage.toFixed(2)}%):</span>
          <span>- ₹${order.quote.discountAmount.toLocaleString("en-IN")}</span>
        </div>
        <div class="total-row discounted-subtotal">
          <span>Discounted Subtotal:</span>
          <span>₹${(
            order.quote.totalPrice - order.quote.discountAmount
          ).toLocaleString("en-IN")}</span>
        </div>
        <div class="total-row">
          <span>Delivery Charges:</span>
          <span>₹${order.quote.deliveryCharges.toLocaleString("en-IN")}</span>
        </div>
        <div class="total-row">
          <span>Handling Charges:</span>
          <span>₹${quoteHandlingCharges.toLocaleString("en-IN")}</span>
        </div>
        <div class="total-row grand-total">
          <span>Grand Total:</span>
          <span>₹${quoteGrandTotal.toLocaleString("en-IN")}</span>
        </div>
      </div>
      
      ${renderRevisionHistory(order.quote)}
    `;

    // Add quote actions based on status
    if (order.quote.status === "sent" || order.quote.status === "revised") {
      modalHtml += `
        <div class="quote-actions">
          <button class="btn-success" onclick="acceptQuote('${order.id}')">
            <i class="fas fa-check"></i> Accept Quote
          </button>
          <button class="btn-danger" onclick="rejectQuote('${order.id}')">
            <i class="fas fa-times"></i> Reject Quote
          </button>
          <button class="btn-secondary" onclick="showRevisionModal('${order.id}')">
            <i class="fas fa-edit"></i> Request Changes
          </button>
        </div>
      `;
    }

    modalHtml += `</div>`;
  }

  // Payment Panel
  if (order.payment) {
    const paymentDate = formatDate(order.payment.paymentDate, true);

    modalHtml += `
      <div class="detail-panel" id="payment-panel">
        <div class="notification info-notification">
          <i class="fas fa-info-circle"></i> Payment details for this order.
        </div>
        
        <div class="detail-section">
          <h3><i class="fas fa-credit-card"></i> Payment Information</h3>
          <div class="detail-group">
            <div class="detail-content">
              <p><strong>Payment ID:</strong> ${order.payment.id}</p>
              <p><strong>Status:</strong> <span class="status-badge status-${
                order.payment.status
              }">${formatStatusLabel(order.payment.status)}</span></p>
              <p><strong>Amount:</strong> ₹${order.payment.amount.toLocaleString(
                "en-IN"
              )}</p>
              <p><strong>Method:</strong> ${formatStatusLabel(
                order.payment.paymentMethod
              )}</p>
              <p><strong>Transaction ID:</strong> ${
                order.payment.transactionId
              }</p>
              <p><strong>Date:</strong> ${paymentDate}</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Shipping Panel
  if (
    order.status === "shipped" ||
    order.status === "delivered" ||
    order.status === "completed"
  ) {
    modalHtml += `
      <div class="detail-panel" id="shipping-panel">
        <div class="notification info-notification">
          <i class="fas fa-info-circle"></i> Shipping details for this order.
        </div>
        
        <div class="detail-section">
          <h3><i class="fas fa-shipping-fast"></i> Shipping Information</h3>
    `;

    if (order.carrier && order.trackingNumber) {
      const shippingDate = order.shippingDate
        ? formatDate(order.shippingDate)
        : "Not recorded";

      const estimatedDeliveryDate = order.estimatedDeliveryDate
        ? formatDate(order.estimatedDeliveryDate)
        : "Not available";

      const actualDeliveryDate = order.actualDeliveryDate
        ? formatDate(order.actualDeliveryDate)
        : "Not yet delivered";

      modalHtml += `
        <div class="detail-content">
          <p><strong>Shipped Date:</strong> ${shippingDate}</p>
          <p><strong>Carrier:</strong> ${formatStatusLabel(order.carrier)}</p>
          <p><strong>Tracking Number:</strong> ${order.trackingNumber}</p>
          <p><strong>Estimated Delivery:</strong> ${estimatedDeliveryDate}</p>
          <p><strong>Actual Delivery:</strong> ${actualDeliveryDate}</p>
        </div>
      `;
    } else {
      modalHtml += `
        <div class="detail-content">
          <p>Shipping details are not yet available.</p>
        </div>
      `;
    }

    // Inside the shipping panel in viewOrderDetails function, after the shipping details
    if (order.invoiceUrl) {
      modalHtml += `
    <div class="detail-group mt-4">
      <h4><i class="fas fa-file-invoice"></i> Invoice</h4>
      <div class="detail-content">
        <p><strong>Invoice Date:</strong> ${
          order.invoiceDate
            ? formatDate(order.invoiceDate, true)
            : "Not Available"
        }</p>
        <div class="invoice-actions">
          <a href="${order.invoiceUrl}" target="_blank" class="btn-primary">
            <i class="fas fa-download"></i> Download Invoice
          </a>
        </div>
      </div>
    </div>
  `;
    }

    modalHtml += `
        </div>
      </div>
    `;
  }

  // After the shipping panel in viewOrderDetails function
  // Invoice Panel
  if (order.invoiceUrl) {
    modalHtml += `
    <div class="detail-panel" id="invoice-panel">
      <div class="notification info-notification">
        <i class="fas fa-info-circle"></i> Invoice for this order.
      </div>
      
      <div class="detail-section">
        <h3><i class="fas fa-file-invoice"></i> Invoice Details</h3>
        <div class="detail-content">
          <p><strong>Invoice Number:</strong> INV-${order.id
            .substr(0, 8)
            .toUpperCase()}</p>
          <p><strong>Invoice Date:</strong> ${
            order.invoiceDate
              ? formatDate(order.invoiceDate, true)
              : "Not Available"
          }</p>
          <p><strong>Seller:</strong> ${order.sellerName}</p>
          <p><strong>Billing Address:</strong> ${order.shippingAddress}</p>
          
          <div class="invoice-actions">
            <a href="${order.invoiceUrl}" target="_blank" class="btn-primary">
              <i class="fas fa-download"></i> Download Invoice
            </a>
            <a href="${order.invoiceUrl}" target="_blank" class="btn-secondary">
              <i class="fas fa-eye"></i> View Invoice
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
  }

  // History Panel
  if (order.statusHistory && order.statusHistory.length > 0) {
    modalHtml += `
      <div class="detail-panel" id="history-panel">
        <div class="notification info-notification">
          <i class="fas fa-info-circle"></i> Order status history timeline.
        </div>
        
        ${renderStatusHistory(order.statusHistory)}
      </div>
    `;
  }

  // Update modal content
  modalContent.innerHTML = modalHtml;

  // Add order action buttons based on current order status
  orderActionButtons.innerHTML = "";

  // Determine which buttons to show based on status
  if (order.status === "pending") {
    orderActionButtons.innerHTML = `
      <button class="btn-danger" onclick="showCancelOrderModal('${order.id}')">
        <i class="fas fa-times-circle"></i> Cancel Order
      </button>
    `;
  } else if (
    order.quote &&
    (order.quote.status === "sent" || order.quote.status === "revised")
  ) {
    orderActionButtons.innerHTML = `
      <button class="btn-success" onclick="acceptQuote('${order.id}')">
        <i class="fas fa-check"></i> Accept
      </button>
      <button class="btn-danger" onclick="rejectQuote('${order.id}')">
        <i class="fas fa-times"></i> Reject
      </button>
      <button class="btn-secondary" onclick="showRevisionModal('${order.id}')">
        <i class="fas fa-edit"></i> Request Changes
      </button>
    `;
  } else if (
    order.quote &&
    order.quote.status === "accepted" &&
    (order.status === "quote_accepted" || order.status === "awaiting_payment")
  ) {
    orderActionButtons.innerHTML = `
      <a href='${order.quote.paymentUrl}' target="_blank" style="text-decoration: none;" class="btn-primary">
            <i class="fas fa-credit-card"></i> Pay Now
          </a>
      <button class="btn-danger" onclick="showCancelOrderModal('${order.id}')">
        <i class="fas fa-times-circle"></i> Cancel Order
      </button>
    `;
  } else if (order.status === "payment_failed") {
    orderActionButtons.innerHTML = `
      <a href='${order.quote.paymentUrl}' target="_blank" style="text-decoration: none;" class="btn-primary">
            <i class="fas fa-redo"></i> Retry Payment
          </a>
      <button class="btn-danger" onclick="showCancelOrderModal('${order.id}')">
        <i class="fas fa-times-circle"></i> Cancel Order
      </button>
    `;
  } else if (order.status === "shipped" || order.status === "delivered") {
    orderActionButtons.innerHTML = `
      <button class="btn-danger" onclick="showDisputeModal('${order.id}')">
        <i class="fas fa-exclamation-triangle"></i> Report Issue
      </button>
    `;
  }

  // Set up tab functionality
  setupDetailTabs();

  // Show the modal
  orderDetailsModal.style.display = "block";
}

// Set up detail tabs in order detail modal
// function setupDetailTabs() {
//   const tabs = document.querySelectorAll(".detail-tab");

//   tabs.forEach((tab) => {
//     tab.addEventListener("click", function () {
//       // Remove active class from all tabs
//       tabs.forEach((t) => t.classList.remove("active"));

//       // Add active class to clicked tab
//       this.classList.add("active");

//       // Hide all panels
//       const panels = document.querySelectorAll(".detail-panel");
//       panels.forEach((panel) => panel.classList.remove("active"));

//       // Show selected panel
//       const panelId = this.getAttribute("data-panel");
//       document.getElementById(panelId).classList.add("active");
//     });
//   });
// }
// Set up detail tabs in order detail modal - modified to show Quote tab first when available
function setupDetailTabs() {
  const tabs = document.querySelectorAll(".detail-tab");
  
  // If quote exists, make it the active tab by default
  const quoteTab = document.querySelector('.detail-tab[data-panel="quote-panel"]');
  
  if (quoteTab) {
    // Remove active class from all tabs
    tabs.forEach((t) => t.classList.remove("active"));
    
    // Add active class to quote tab
    quoteTab.classList.add("active");
    
    // Hide all panels
    const panels = document.querySelectorAll(".detail-panel");
    panels.forEach((panel) => panel.classList.remove("active"));
    
    // Show quote panel
    document.getElementById("quote-panel").classList.add("active");
  }

  // Add click event handlers for all tabs
  tabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      // Remove active class from all tabs
      tabs.forEach((t) => t.classList.remove("active"));

      // Add active class to clicked tab
      this.classList.add("active");

      // Hide all panels
      const panels = document.querySelectorAll(".detail-panel");
      panels.forEach((panel) => panel.classList.remove("active"));

      // Show selected panel
      const panelId = this.getAttribute("data-panel");
      document.getElementById(panelId).classList.add("active");
    });
  });
}

// Render comparison section between order and quote
function renderComparisonSection(orderBooks, quoteBooks) {
  const orderCodes = orderBooks.map((book) => book.code);
  const quoteCodes = quoteBooks.map((book) => book.code);
  const allCodes = [...new Set([...orderCodes, ...quoteCodes])];

  // Calculate totals
  const orderTotal = orderBooks.reduce((sum, book) => sum + book.total, 0);
  const quoteTotal = quoteBooks.reduce((sum, book) => sum + book.total, 0);

  let html = `
    <div class="comparison-section">
      <div class="comparison-column">
        <div class="comparison-header">Your Request</div>
        <div class="comparison-body">
  `;

  // Order books
  allCodes.forEach((code) => {
    const orderBook = orderBooks.find((book) => book.code === code);

    if (orderBook) {
      html += `
        <div class="comparison-item">
          <div class="comparison-title">${orderBook.title}</div>
          <div class="comparison-data">${orderBook.quantity} x</div>
          <div class="comparison-data">₹${orderBook.price}</div>
        </div>
      `;
    } else {
      // Book in quote but not in order
      html += `
        <div class="comparison-item highlight-add">
          <div class="comparison-title">${
            quoteBooks.find((book) => book.code === code).title
          }</div>
          <div class="comparison-data">0 x</div>
          <div class="comparison-data">-</div>
        </div>
      `;
    }
  });

  html += `
      </div>
      <div class="comparison-footer">
        <span>Subtotal:</span>
        <span>₹${orderTotal.toLocaleString("en-IN")}</span>
      </div>
    </div>
    
    <div class="comparison-column">
      <div class="comparison-header">Seller's Quote</div>
      <div class="comparison-body">
  `;

  // Quote books
  allCodes.forEach((code) => {
    const quoteBook = quoteBooks.find((book) => book.code === code);
    const orderBook = orderBooks.find((book) => book.code === code);

    if (quoteBook) {
      let highlightClass = "";

      if (!orderBook) {
        // Book added in quote
        highlightClass = "highlight-add";
      } else if (
        quoteBook.quantity !== orderBook.quantity ||
        quoteBook.price !== orderBook.price
      ) {
        // Book with modified quantity or price
        highlightClass = "highlight-change";
      }

      html += `
        <div class="comparison-item ${highlightClass}">
          <div class="comparison-title">${quoteBook.title}</div>
          <div class="comparison-data">${quoteBook.quantity} x</div>
          <div class="comparison-data">₹${quoteBook.price}</div>
        </div>
      `;
    } else {
      // Book in order but not in quote
      html += `
        <div class="comparison-item highlight-remove">
          <div class="comparison-title">${
            orderBooks.find((book) => book.code === code).title
          }</div>
          <div class="comparison-data">0 x</div>
          <div class="comparison-data">-</div>
        </div>
      `;
    }
  });

  html += `
      </div>
      <div class="comparison-footer">
        <span>Subtotal:</span>
        <span>₹${quoteTotal.toLocaleString("en-IN")}</span>
      </div>
    </div>
  </div>
  `;

  return html;
}

// Render revision history for a quote
// Render revision history for a quote
function renderRevisionHistory(quote) {
  if (!quote.revisionHistory || quote.revisionHistory.length === 0) {
    return "";
  }

  let html = `
    <div class="detail-section">
      <h3><i class="fas fa-history"></i> Revision History</h3>
      <div class="status-timeline">
  `;

  // Sort history by timestamp (newest first)
  const sortedHistory = [...quote.revisionHistory].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  // Render each revision
  sortedHistory.forEach((revision, index) => {
    const formattedDate = formatDate(revision.timestamp, true);
    
    // Safely handle discount percentage and discount amount
    const discountPercentage = parseFloat(revision.discountPercentage || 0);
    const discountAmount = (parseFloat(revision.totalPrice) * discountPercentage) / 100;

    html += `
      <div class="timeline-event">
        <div class="timeline-content">
          <div class="timeline-header">
            <span class="timeline-status">Quote Revised</span>
            <span class="timeline-time">${formattedDate}</span>
          </div>
          ${
            revision.reason
              ? `<div class="timeline-notes">Reason: ${revision.reason}</div>`
              : ""
          }
          <div class="timeline-notes">
            <strong>Changed:</strong> 
  ${revision.books.length} books, 
  Total: ₹${parseFloat(revision.totalPrice).toLocaleString("en-IN")}, 
  Discount: ${discountPercentage.toFixed(2)}% (₹${discountAmount.toLocaleString("en-IN")}),
  Delivery: ₹${parseFloat(revision.deliveryCharges).toLocaleString("en-IN")},
  Handling: ₹${parseFloat(revision.handlingCharges || 0).toLocaleString("en-IN")}
          </div>
        </div>
      </div>
    `;
  });

  html += `
      </div>
    </div>
  `;

  return html;
}

// Render status history timeline
function renderStatusHistory(statusHistory) {
  if (!statusHistory || statusHistory.length === 0) {
    return "";
  }

  let html = `
    <div class="status-timeline">
  `;

  // Sort history by timestamp (newest first)
  const sortedHistory = [...statusHistory].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  // Render each status change
  sortedHistory.forEach((event, index) => {
    const isActive = index === 0;
    const statusClass = getStatusClass(event.status);
    const formattedDate = formatDate(event.timestamp, true);

    html += `
      <div class="timeline-event ${isActive ? "active" : ""} ${statusClass}">
        <div class="timeline-content">
          <div class="timeline-header">
            <span class="timeline-status">${formatStatusLabel(
              event.status
            )}</span>
            <span class="timeline-time">${formattedDate}</span>
          </div>
          ${
            event.notes
              ? `<div class="timeline-notes">${event.notes}</div>`
              : ""
          }
        </div>
      </div>
    `;
  });

  html += `
    </div>
  `;

  return html;
}

// Get status class for timeline
function getStatusClass(status) {
  if (["completed", "delivered", "payment_completed"].includes(status)) {
    return "completed";
  } else if (
    [
      "cancelled",
      "cancelled_by_seller",
      "disputed",
      "payment_failed",
      "quote_rejected",
    ].includes(status)
  ) {
    return "error";
  }
  return "";
}

// Search, Filter, and Tab Functions based on API
// async function searchOrders() {
//   const searchTerm = searchInput.value.toLowerCase().trim();

//   showLoading();

//   try {
//     const response = await fetch(
//       `/orders/search?term=${encodeURIComponent(searchTerm)}`,
//       {
//         method: "GET",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         credentials: "include",
//       }
//     );

//     if (!response.ok) {
//       throw new Error(`Error searching orders: ${response.statusText}`);
//     }

//     const result = await response.json();
//     const filteredOrders = result.orders;

//     hideLoading();
//     renderOrders(filteredOrders);
//     renderPipeline(filteredOrders);

//     showNotification(
//       "info",
//       "Search Results",
//       `Found ${filteredOrders.length} orders matching "${searchTerm}"`
//     );
//   } catch (error) {
//     console.error("Error searching orders:", error);
//     showNotification(
//       "error",
//       "Error",
//       "Failed to search orders. Please try again."
//     );
//     hideLoading();
//   }
// }

//search based on without API
// Search orders
function searchOrders() {
  const searchTerm = searchInput.value.toLowerCase().trim();

  if (!searchTerm) {
    renderOrders(orderRequests);
    return;
  }

  showLoading();

  // Simulate API delay
  setTimeout(() => {
    const filteredOrders = orderRequests.filter((order) => {
      // Search by order ID
      if (order.id.toLowerCase().includes(searchTerm)) {
        return true;
      }

      // Search by book title or code
      if (
        order.books.some(
          (book) =>
            book.title.toLowerCase().includes(searchTerm) ||
            book.code.toLowerCase().includes(searchTerm)
        )
      ) {
        return true;
      }

      // Search by seller name
      if (
        order.sellerName &&
        order.sellerName.toLowerCase().includes(searchTerm)
      ) {
        return true;
      }

      // Search by publication
      if (
        order.publication &&
        order.publication.toLowerCase().includes(searchTerm)
      ) {
        return true;
      }

      return false;
    });

    hideLoading();
    renderOrders(filteredOrders);
    renderPipeline(filteredOrders);

    // Show notification
    showNotification(
      "info",
      "Search Results",
      `Found ${filteredOrders.length} orders matching "${searchTerm}"`
    );
  }, 500);
}

// Apply filters with API
// async function applyFilters() {
//   const statusValue = statusFilter.value;
//   const publicationValue = publicationFilter.value;
//   const dateFrom = dateFromInput.value;
//   const dateTo = dateToInput.value;

//   showLoading();

//   try {
//     let url = "/orders/filter?";

//     if (statusValue) url += `status=${encodeURIComponent(statusValue)}&`;
//     if (publicationValue)
//       url += `publication=${encodeURIComponent(publicationValue)}&`;
//     if (dateFrom) url += `dateFrom=${encodeURIComponent(dateFrom)}&`;
//     if (dateTo) url += `dateTo=${encodeURIComponent(dateTo)}&`;

//     // Remove trailing & if exists
//     url = url.replace(/&$/, "");

//     const response = await fetch(url, {
//       method: "GET",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       credentials: "include",
//     });

//     if (!response.ok) {
//       throw new Error(`Error filtering orders: ${response.statusText}`);
//     }

//     const result = await response.json();
//     const filteredOrders = result.orders;

//     hideLoading();
//     renderOrders(filteredOrders);
//     renderPipeline(filteredOrders);

//     // Build notification message
//     let filterMsg = `Filters applied. Displaying ${filteredOrders.length} orders`;
//     if (statusValue || publicationValue || dateFrom || dateTo) {
//       if (statusValue)
//         filterMsg += ` with status "${formatStatusLabel(statusValue)}"`;
//       if (publicationValue) filterMsg += ` from "${publicationValue}"`;
//     }

//     showNotification("info", "Filters Applied", filterMsg);
//   } catch (error) {
//     console.error("Error filtering orders:", error);
//     showNotification(
//       "error",
//       "Error",
//       "Failed to apply filters. Please try again."
//     );
//     hideLoading();
//   }
// }

// Apply filters wihtout api based on orderRequest
function applyFilters() {
  const statusValue = statusFilter.value;
  const publicationValue = publicationFilter.value;
  const dateFrom = dateFromInput.value ? new Date(dateFromInput.value) : null;
  const dateTo = dateToInput.value ? new Date(dateToInput.value) : null;

  showLoading();

  // Simulate API delay
  setTimeout(() => {
    let filteredOrders = [...orderRequests];

    // Filter by status
    if (statusValue) {
      filteredOrders = filteredOrders.filter(
        (order) => order.status === statusValue
      );
    }

    // Filter by publication
    if (publicationValue) {
      filteredOrders = filteredOrders.filter(
        (order) => order.publication === publicationValue
      );
    }

    // Filter by date range
    if (dateFrom) {
      filteredOrders = filteredOrders.filter(
        (order) => new Date(order.createdAt) >= dateFrom
      );
    }

    if (dateTo) {
      // Add one day to include the end date
      const adjustedDateTo = new Date(dateTo);
      adjustedDateTo.setDate(adjustedDateTo.getDate() + 1);
      filteredOrders = filteredOrders.filter(
        (order) => new Date(order.createdAt) < adjustedDateTo
      );
    }

    hideLoading();
    renderOrders(filteredOrders);
    renderPipeline(filteredOrders);

    // Show notification
    let filterMsg = `Filters applied. Displaying ${filteredOrders.length} orders`;
    if (statusValue || publicationValue || dateFrom || dateTo) {
      if (statusValue)
        filterMsg += ` with status "${formatStatusLabel(statusValue)}"`;
      if (publicationValue) filterMsg += ` from "${publicationValue}"`;
    }
    showNotification("info", "Filters Applied", filterMsg);
  }, 500);
}

// Clear filters
function clearFilters() {
  statusFilter.value = "";
  publicationFilter.value = "";
  dateFromInput.value = "";
  dateToInput.value = "";

  showLoading();

  setTimeout(() => {
    hideLoading();
    renderOrders(orderRequests);
    renderPipeline(orderRequests);
    showNotification(
      "info",
      "Filters Cleared",
      "All filters have been cleared"
    );
  }, 300);
}

// Filter orders by tab category with API
// async function filterOrdersByTab(category) {
//   showLoading();

//   try {
//     const response = await fetch(`/orders/category/${category}`, {
//       method: "GET",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       credentials: "include",
//     });

//     if (!response.ok) {
//       throw new Error(`Error filtering orders by tab: ${response.statusText}`);
//     }

//     const result = await response.json();
//     const filteredOrders = result.orders;

//     hideLoading();
//     renderOrders(filteredOrders);
//     // Keep pipeline showing all orders
//     renderPipeline(orderRequests);
//   } catch (error) {
//     console.error("Error filtering orders by tab:", error);
//     showNotification(
//       "error",
//       "Error",
//       "Failed to filter orders. Please try again."
//     );
//     hideLoading();
//   }
// }

// Filter orders by tab category without API
function filterOrdersByTab(category) {
  showLoading();

  // Simulate API delay
  setTimeout(() => {
    let filteredOrders = [];

    switch (category) {
      case "all":
        filteredOrders = [...orderRequests];
        break;
      case "pending":
        filteredOrders = orderRequests.filter(
          (order) => order.status === "pending"
        );
        break;
      case "quoted":
        filteredOrders = orderRequests.filter(
          (order) =>
            order.status === "quoted" || order.status === "quote_revised"
        );
        break;
      case "confirmed":
        filteredOrders = orderRequests.filter(
          (order) =>
            order.status === "quote_accepted" ||
            order.status === "awaiting_payment" ||
            order.status === "payment_failed" ||
            order.status === "payment_completed" ||
            order.status === "processed"
        );
        break;
      case "shipped":
        filteredOrders = orderRequests.filter(
          (order) => order.status === "shipped" || order.status === "delivered"
        );
        break;
      case "completed":
        filteredOrders = orderRequests.filter(
          (order) => order.status === "completed"
        );
        break;
      case "cancelled":
        filteredOrders = orderRequests.filter(
          (order) =>
            order.status === "cancelled" ||
            order.status === "cancelled_by_seller" ||
            order.status === "disputed" ||
            order.status === "quote_rejected"
        );
        break;
    }

    hideLoading();
    renderOrders(filteredOrders);
    renderPipeline(orderRequests); // Always show all orders in pipeline
  }, 500);
}

// Refresh data
async function refreshData() {
  // Get the current active tab before refreshing
  const activeTab = document.querySelector(".tab-btn.active");
  const tabCategory = activeTab ? activeTab.getAttribute("data-tab") : "all";

  try {
    await fetchOrderData();

    // Apply current tab filter after refresh
    if (tabCategory !== "all") {
      await filterOrdersByTab(tabCategory);
    }

    showNotification(
      "success",
      "Data Refreshed",
      "Latest order data has been loaded"
    );
  } catch (error) {
    console.error("Error refreshing data:", error);
    showNotification(
      "error",
      "Error",
      "Failed to refresh data. Please try again."
    );
  }
}

// Replace the fetchOrderData function with an actual API call
async function fetchOrderData() {
  try {
    showLoading();
    const response = await fetch('/orders', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // This ensures cookies are sent with the request
    });

    if (!response.ok) {
      throw new Error(`Error fetching orders: ${response.statusText}`);
    }

    const data = await response.json();
    orderRequests = data.orders;
    
    if (orderRequests.length === 0) {
      if (noOrders) noOrders.style.display = "block";
    } else {
      if (noOrders) noOrders.style.display = "none";
    }
    
    renderPipeline(orderRequests);
    renderOrders(orderRequests);
    
    hideLoading();
  } catch (error) {
    console.error('Error fetching orders:', error);
    showNotification('error', 'Error', 'Failed to load orders. Please try again.');
    hideLoading();
  }
}

// Helper functions for order actions
// Show payment modal with correct discounted amount
function showPaymentModal(orderId) {
  const order = orderRequests.find((o) => o.id === orderId);
  if (!order || !order.quote) return;

  // Calculate the grand total with discount applied
  const quoteTotal = parseFloat(order.quote.totalPrice);
  const discountPercentage = parseFloat(order.quote.discountPercentage || 0);
  const discountAmount = (quoteTotal * discountPercentage) / 100;
  const discountedSubtotal = quoteTotal - discountAmount;
  const deliveryCharges = parseFloat(order.quote.deliveryCharges || 0);
  const handlingCharges = parseFloat(order.quote.handlingCharges || 0);
  
  // Calculate the final grand total
  const grandTotal = discountedSubtotal + deliveryCharges + handlingCharges;

  // Set payment details
  document.getElementById("payment-order-id").textContent = order.id;
  document.getElementById("payment-item-count").textContent = `${order.quote.books.length} items`;
  
  // Display the discounted grand total
  document.getElementById("payment-amount").textContent = `₹${grandTotal.toLocaleString("en-IN")}`;

  // Show payment modal
  paymentModal.style.display = "block";
}

function showRevisionModal(orderId) {
  const order = orderRequests.find((o) => o.id === orderId);
  if (!order || !order.quote) return;

  // Clear previous input
  document.getElementById("revision-reason").value = "";

  // Set order ID for submission
  document
    .getElementById("submit-revision-btn")
    .setAttribute("data-order-id", orderId);

  // Show revision modal
  revisionModal.style.display = "block";
}

function showCancelOrderModal(orderId) {
  const order = orderRequests.find((o) => o.id === orderId);
  if (!order) return;

  // Check if order can be cancelled by buyer
  const cancellableStatuses = [
    "pending",
    "quoted",
    "quote_revised",
    "quote_accepted",
    "awaiting_payment",
    "payment_failed",
  ];

  if (!cancellableStatuses.includes(order.status)) {
    showNotification(
      "error",
      "Cannot Cancel",
      "This order cannot be cancelled at its current stage."
    );
    return;
  }

  currentOrderDetail = { ...order }; // Make a copy to avoid modifying the original

  // Reset the form
  document.getElementById("cancellation-reason").value = "";
  document.getElementById("other-reason").value = "";
  document.getElementById("cancellation-notes").value = "";
  document.getElementById("other-reason-group").style.display = "none";

  // Set order ID to the cancel button's data attribute
  document
    .getElementById("confirm-cancellation-btn")
    .setAttribute("data-order-id", orderId);

  // Show the modal
  cancelOrderModal.style.display = "block";
}

function showDisputeModal(orderId) {
  const order = orderRequests.find((o) => o.id === orderId);
  if (!order) return;

  // Check if dispute can be raised
  const disputeStatuses = ["shipped", "delivered", "completed"];
  if (!disputeStatuses.includes(order.status)) {
    showNotification(
      "error",
      "Cannot Raise Issue",
      "Issues can only be raised for shipped or delivered orders."
    );
    return;
  }

  currentOrderDetail = { ...order }; // Make a copy to avoid modifying the original

  // Reset the form
  document.getElementById("dispute-type").value = "";
  document.getElementById("dispute-description").value = "";

  // Set order ID to the submit button's data attribute
  document
    .getElementById("submit-dispute-btn")
    .setAttribute("data-order-id", orderId);

  // Show the modal
  disputeModal.style.display = "block";
}

// Accept Quote
async function acceptQuote(orderId) {
  if (!confirm("Are you sure you want to accept this quote?")) {
    return;
  }

  showLoading();

  try {
    const response = await fetch(`/orders/${orderId}/accept-quote`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Error accepting quote: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Find and update the order in local data
    const orderIndex = orderRequests.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
      orderRequests[orderIndex] = result.order;
    }

    hideLoading();
    renderOrders(orderRequests);
    renderPipeline(orderRequests);

    showNotification(
      'success', 
      'Quote Accepted', 
      `You have accepted the quote for order ${orderId}. Please complete the payment.`
    );

    // Close and reopen the modal with updated info
    orderDetailsModal.style.display = "none";
    setTimeout(() => {
      viewOrderDetails(orderId);
    }, 300);
  } catch (error) {
    console.error('Error accepting quote:', error);
    showNotification('error', 'Error', 'Failed to accept quote. Please try again.');
    hideLoading();
  }
}

// Reject Quote
async function rejectQuote(orderId) {
  if (!confirm("Are you sure you want to reject this quote?")) {
    return;
  }

  const reason = prompt("Please provide a reason for rejecting the quote:");
  if (!reason) return;

  showLoading();

  try {
    const response = await fetch(`/orders/${orderId}/reject-quote`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason }),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Error rejecting quote: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Find and update the order in local data
    const orderIndex = orderRequests.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
      orderRequests[orderIndex] = result.order;
    }

    hideLoading();
    renderOrders(orderRequests);
    renderPipeline(orderRequests);

    showNotification('info', 'Quote Rejected', `You have rejected the quote for order ${orderId}`);

    // Close and reopen the modal with updated info
    orderDetailsModal.style.display = "none";
    setTimeout(() => {
      viewOrderDetails(orderId);
    }, 300);
  } catch (error) {
    console.error('Error rejecting quote:', error);
    showNotification('error', 'Error', 'Failed to reject quote. Please try again.');
    hideLoading();
  }
}

// Process Payment
// Process Payment with correct discounted amount
async function processPayment(orderId, paymentMethod) {
  const order = orderRequests.find((o) => o.id === orderId);
  if (!order || !order.quote) return;

  // Calculate the grand total with discount applied
  const quoteTotal = parseFloat(order.quote.totalPrice);
  const discountPercentage = parseFloat(order.quote.discountPercentage || 0);
  const discountAmount = (quoteTotal * discountPercentage) / 100;
  const discountedSubtotal = quoteTotal - discountAmount;
  const deliveryCharges = parseFloat(order.quote.deliveryCharges || 0);
  const handlingCharges = parseFloat(order.quote.handlingCharges || 0);
  
  // Calculate the final grand total
  const grandTotal = discountedSubtotal + deliveryCharges + handlingCharges;

  showLoading();
  paymentModal.style.display = "none";

  try {
    const response = await fetch(`/orders/${orderId}/payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentMethod,
        quoteId: order.quote.id,
        amount: grandTotal, // Use the correct discounted amount
      }),
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Error processing payment: ${response.statusText}`);
    }

    const result = await response.json();

    // Find and update the order in local data
    const orderIndex = orderRequests.findIndex((o) => o.id === orderId);
    if (orderIndex !== -1) {
      orderRequests[orderIndex] = result.order;
    }

    hideLoading();
    renderOrders(orderRequests);
    renderPipeline(orderRequests);

    showNotification(
      "success",
      "Payment Successful",
      `Your payment for order ${orderId} has been processed successfully`
    );

    // Close and reopen the modal with updated info
    orderDetailsModal.style.display = "none";
    setTimeout(() => {
      viewOrderDetails(orderId);
    }, 300);
  } catch (error) {
    console.error("Error processing payment:", error);
    showNotification(
      "error",
      "Error",
      "Failed to process payment. Please try again."
    );
    hideLoading();
  }
}

// Submit Revision Request
async function submitRevisionRequest(orderId, reason) {
  if (!reason.trim()) {
    showNotification(
      "error",
      "Error",
      "Please provide a reason for the revision request"
    );
    return;
  }

  showLoading();
  revisionModal.style.display = "none";

  try {
    const response = await fetch(`/orders/${orderId}/request-revision`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason }),
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Error requesting revision: ${response.statusText}`);
    }

    const result = await response.json();

    // Find and update the order in local data
    const orderIndex = orderRequests.findIndex((o) => o.id === orderId);
    if (orderIndex !== -1) {
      orderRequests[orderIndex] = result.order;
    }

    hideLoading();
    renderOrders(orderRequests);
    renderPipeline(orderRequests);

    showNotification(
      "success",
      "Revision Requested",
      `Your revision request for order ${orderId} has been submitted`
    );

    // Close and reopen the modal with updated info
    orderDetailsModal.style.display = "none";
    setTimeout(() => {
      viewOrderDetails(orderId);
    }, 300);
  } catch (error) {
    console.error("Error requesting revision:", error);
    showNotification(
      "error",
      "Error",
      "Failed to request revision. Please try again."
    );
    hideLoading();
  }
}

// Cancel Order
async function cancelOrder() {
  const orderId = document
    .getElementById("confirm-cancellation-btn")
    .getAttribute("data-order-id");
  if (!orderId) return;

  const reasonSelect = document.getElementById("cancellation-reason");
  const otherReasonInput = document.getElementById("other-reason");
  const notesInput = document.getElementById("cancellation-notes");

  let reason = reasonSelect.value;
  const otherReason = otherReasonInput.value.trim();
  const notes = notesInput.value.trim();

  // Validate inputs
  if (!reason) {
    showNotification("error", "Error", "Please select a cancellation reason.");
    return;
  }

  if (reason === "other" && !otherReason) {
    showNotification(
      "error",
      "Error",
      "Please specify the cancellation reason."
    );
    return;
  }

  // Get final reason text
  const reasonText =
    reason === "other"
      ? otherReason
      : reasonSelect.options[reasonSelect.selectedIndex].text;

  // Show loading spinner
  showLoading();
  cancelOrderModal.style.display = "none";

  try {
    const response = await fetch(`/orders/${orderId}/cancel`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason: reasonText,
        notes,
      }),
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Error cancelling order: ${response.statusText}`);
    }

    const result = await response.json();

    // Find and update the order in local data
    const orderIndex = orderRequests.findIndex((o) => o.id === orderId);
    if (orderIndex !== -1) {
      orderRequests[orderIndex] = result.order;
    }

    hideLoading();
    renderOrders(orderRequests);
    renderPipeline(orderRequests);

    showNotification(
      "success",
      "Order Cancelled",
      "The order has been cancelled successfully."
    );

    // Close order detail modal if open
    orderDetailsModal.style.display = "none";
  } catch (error) {
    console.error("Error cancelling order:", error);
    showNotification(
      "error",
      "Error",
      "Failed to cancel order. Please try again."
    );
    hideLoading();
  }
}

// Submit Dispute
async function submitDispute() {
  const orderId = document
    .getElementById("submit-dispute-btn")
    .getAttribute("data-order-id");
  if (!orderId) return;

  const disputeType = document.getElementById("dispute-type").value;
  const disputeDescription = document
    .getElementById("dispute-description")
    .value.trim();

  // Validate inputs
  if (!disputeType) {
    showNotification("error", "Error", "Please select an issue type.");
    return;
  }

  if (!disputeDescription) {
    showNotification(
      "error",
      "Error",
      "Please provide a description of the issue."
    );
    return;
  }

  // Show loading spinner
  showLoading();
  disputeModal.style.display = "none";

  try {
    const response = await fetch(`/orders/${orderId}/dispute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: disputeType,
        description: disputeDescription,
      }),
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Error submitting dispute: ${response.statusText}`);
    }

    const result = await response.json();

    // Find and update the order in local data
    const orderIndex = orderRequests.findIndex((o) => o.id === orderId);
    if (orderIndex !== -1) {
      orderRequests[orderIndex] = result.order;
    }

    hideLoading();
    renderOrders(orderRequests);
    renderPipeline(orderRequests);

    showNotification(
      "success",
      "Issue Reported",
      "Your issue has been reported. The seller will review it and contact you."
    );

    // Close order detail modal if open
    orderDetailsModal.style.display = "none";
  } catch (error) {
    console.error("Error submitting dispute:", error);
    showNotification(
      "error",
      "Error",
      "Failed to submit issue. Please try again."
    );
    hideLoading();
  }
}

// Show notification toast
function showNotification(type, title, message) {
  const container = document.getElementById("notification-container");

  const toast = document.createElement("div");
  toast.className = `notification-toast toast-${type}`;

  let iconClass = "fas fa-info-circle";
  switch (type) {
    case "success":
      iconClass = "fas fa-check-circle";
      break;
    case "error":
      iconClass = "fas fa-exclamation-circle";
      break;
    case "warning":
      iconClass = "fas fa-exclamation-triangle";
      break;
  }

  toast.innerHTML = `
    <div class="toast-icon">
      <i class="${iconClass}"></i>
    </div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close">×</button>
  `;

  container.appendChild(toast);

  // Add close button functionality
  toast.querySelector(".toast-close").addEventListener("click", () => {
    toast.classList.add("toast-exit");
    setTimeout(() => {
      if (container.contains(toast)) {
        container.removeChild(toast);
      }
    }, 300);
  });

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (container.contains(toast)) {
      toast.classList.add("toast-exit");
      setTimeout(() => {
        if (container.contains(toast)) {
          container.removeChild(toast);
        }
      }, 300);
    }
  }, 5000);
}

// Make the functions globally available
window.viewOrderDetails = viewOrderDetails;
window.acceptQuote = acceptQuote;
window.rejectQuote = rejectQuote;
window.showPaymentModal = showPaymentModal;
window.showRevisionModal = showRevisionModal;
window.showCancelOrderModal = showCancelOrderModal;
window.showDisputeModal = showDisputeModal;
window.processPayment = processPayment;
window.submitRevisionRequest = submitRevisionRequest;
window.cancelOrder = cancelOrder;
window.submitDispute = submitDispute;
