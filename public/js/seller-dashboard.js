// Constants from schema.js
const ORDER_REQUEST_STATUSES = [
  "pending",
  "quoted",
  "quote_revised",
  "quote_accepted",
  "quote_rejected",
  "awaiting_payment",
  "payment_failed",
  "payment_completed",
  "processed",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
  "cancelled_by_seller",
  "disputed",
];

const QUOTE_STATUSES = [
  "draft",
  "sent",
  "viewed",
  "pending_revision",
  "revised",
  "accepted",
  "rejected",
  "expired",
  "cancelled",
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

const SHIPPING_CARRIERS = [
  "blue_dart",
  "delhivery",
  "dtdc",
  "speed_post",
  "fedex",
  "ecom_express",
  "other",
];

// Pipeline step configuration
const PIPELINE_STEPS = [
  {
    id: "pending",
    label: "New Orders",
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
    id: "payment",
    label: "Payment",
    icon: "fas fa-credit-card",
    statuses: ["awaiting_payment", "payment_failed", "payment_completed"],
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
    statuses: ["cancelled", "cancelled_by_seller", "disputed","quote_rejected"],
  },
];

// DOM Elements
let ordersList;
let noOrders;
let loadingSpinner;
let quoteEditModal;
let quoteModalContent;
let orderDetailModal;
let orderModalContent;
let processOrderModal;
let shippingModal;
let completeOrderModal;
let invoiceUploadModal;
let cancelOrderModal;
let orderActionButtons;
let searchInput;
let clearSearchBtn;
let searchButton;
let orderStatusFilter;
let quoteStatusFilter;
let dateFromInput;
let dateToInput;
let applyFiltersButton;
let clearFiltersButton;
let tabButtons;
let refreshButton;
let pipelineContainer;
let invoiceFileInput;
let fileUploadArea;
let fileInfo;
let fileName;
let removeFileBtn;
let cancellationReason;
let otherReasonGroup;
let otherReason;
let confirmCancellationBtn;

// Global variables
let currentOrderDetail = null;
let currentQuoteData = null;
let bookCatalog = []; // Will be populated from the server
let orderRequests = []; // Will be populated from the server
let selectedInvoiceFile = null; // For file upload

// Initialize page
document.addEventListener("DOMContentLoaded", function () {
  // Initialize DOM elements
  initializeDOMElements();

  // Initialize status filter options from constants
  populateStatusFilter();

  // Set initial date for estimated delivery (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const estimatedDeliveryInput = document.getElementById("estimated-delivery");
  if (estimatedDeliveryInput) {
    estimatedDeliveryInput.min = tomorrow.toISOString().split("T")[0];
    estimatedDeliveryInput.value = tomorrow.toISOString().split("T")[0];
  }

  // Initialize file upload functionality
  initializeFileUpload();

  // Show loading spinner
  showLoading();

  // Initialize page after a small delay to simulate API call
  setTimeout(() => {
    // Fetch data from the server (simulated here)
    fetchOrderData();
    fetchBookCatalog();

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
  quoteEditModal = document.getElementById("quote-edit-modal");
  quoteModalContent = document.getElementById("quote-modal-content");
  orderDetailModal = document.getElementById("order-detail-modal");
  orderModalContent = document.getElementById("order-modal-content");
  processOrderModal = document.getElementById("process-order-modal");
  shippingModal = document.getElementById("shipping-modal");
  completeOrderModal = document.getElementById("complete-order-modal");
  invoiceUploadModal = document.getElementById("invoice-upload-modal");
  cancelOrderModal = document.getElementById("cancel-order-modal");
  orderActionButtons = document.getElementById("order-action-buttons");
  searchInput = document.getElementById("search-input");
  clearSearchBtn = document.getElementById("clear-search");
  searchButton = document.getElementById("search-btn");
  orderStatusFilter = document.getElementById("order-status-filter");
  quoteStatusFilter = document.getElementById("quote-status-filter");
  dateFromInput = document.getElementById("date-from");
  dateToInput = document.getElementById("date-to");
  applyFiltersButton = document.getElementById("apply-filters");
  clearFiltersButton = document.getElementById("clear-filters");
  tabButtons = document.querySelectorAll(".tab-btn");
  refreshButton = document.getElementById("refresh-btn");
  pipelineContainer = document.getElementById("pipeline-container");

  // File upload elements
  invoiceFileInput = document.getElementById("invoice-file");
  fileUploadArea = document.getElementById("file-upload-area");
  fileInfo = document.getElementById("file-info");
  fileName = document.getElementById("file-name");
  removeFileBtn = document.getElementById("remove-file");

  // Cancellation elements
  cancellationReason = document.getElementById("cancellation-reason");
  otherReasonGroup = document.getElementById("other-reason-group");
  otherReason = document.getElementById("other-reason");
  confirmCancellationBtn = document.getElementById("confirm-cancellation-btn");
}

// Populate status filter options
function populateStatusFilter() {
  // Clear any existing options except the first one (All Statuses)
  while (orderStatusFilter.options.length > 1) {
    orderStatusFilter.remove(1);
  }

  while (quoteStatusFilter.options.length > 1) {
    quoteStatusFilter.remove(1);
  }

  // Add options from ORDER_REQUEST_STATUSES
  ORDER_REQUEST_STATUSES.forEach((status) => {
    const option = document.createElement("option");
    option.value = status;
    option.textContent = formatStatusLabel(status);
    orderStatusFilter.appendChild(option);
  });

  // Add options from QUOTE_STATUSES
  QUOTE_STATUSES.forEach((status) => {
    const option = document.createElement("option");
    option.value = status;
    option.textContent = formatStatusLabel(status);
    quoteStatusFilter.appendChild(option);
  });
}

// Initialize file upload functionality
function initializeFileUpload() {
  if (!fileUploadArea || !invoiceFileInput) return;

  // Click on the upload area to trigger file input
  fileUploadArea.addEventListener("click", () => {
    invoiceFileInput.click();
  });

  // Handle file selection
  invoiceFileInput.addEventListener("change", handleFileSelection);

  // Drag and drop functionality
  fileUploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    fileUploadArea.classList.add("dragover");
  });

  fileUploadArea.addEventListener("dragleave", () => {
    fileUploadArea.classList.remove("dragover");
  });

  fileUploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    fileUploadArea.classList.remove("dragover");

    if (e.dataTransfer.files.length) {
      invoiceFileInput.files = e.dataTransfer.files;
      handleFileSelection();
    }
  });

  // Remove selected file
  if (removeFileBtn) {
    removeFileBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent triggering fileUploadArea click
      resetFileUpload();
    });
  }
}

// Handle file selection
function handleFileSelection() {
  if (invoiceFileInput.files && invoiceFileInput.files[0]) {
    const file = invoiceFileInput.files[0];

    // Check if it's a PDF
    if (file.type !== "application/pdf") {
      showNotification("error", "File Error", "Please select a PDF file.");
      resetFileUpload();
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showNotification("error", "File Error", "File size exceeds 5MB limit.");
      resetFileUpload();
      return;
    }

    // Store selected file
    selectedInvoiceFile = file;

    // Show file info
    if (fileName && fileInfo) {
      fileName.textContent = file.name;
      fileInfo.style.display = "flex";
      fileUploadArea.style.display = "none";
    }
  }
}

// Reset file upload
function resetFileUpload() {
  if (invoiceFileInput) invoiceFileInput.value = "";
  selectedInvoiceFile = null;

  if (fileInfo && fileUploadArea) {
    fileInfo.style.display = "none";
    fileUploadArea.style.display = "block";
  }
}

// Set up event listeners
function setupEventListeners() {
  // Close modal buttons
  document.querySelectorAll(".modal-close").forEach((button) => {
    button.addEventListener("click", function () {
      const modal = this.closest(".modal");
      if (modal) modal.style.display = "none";
    });
  });

  // Cancel buttons in modals
  document
    .querySelectorAll(
      "#cancel-quote-btn, #close-detail-btn, #cancel-process-btn, #cancel-shipping-btn, #cancel-complete-btn, #cancel-invoice-btn, #cancel-cancellation-btn"
    )
    .forEach((button) => {
      button.addEventListener("click", function () {
        const modal = this.closest(".modal");
        if (modal) modal.style.display = "none";
      });
    });

  // Close modals when clicking outside
  window.addEventListener("click", (event) => {
    if (event.target.classList.contains("modal")) {
      event.target.style.display = "none";
    }
  });

  // Save quote as draft
  document.getElementById("save-as-draft-btn").addEventListener("click", () => {
    saveQuote("draft");
  });

  // Send quote to buyer
  document.getElementById("send-quote-btn").addEventListener("click", () => {
    saveQuote("sent");
  });

  // Process order button
  document
    .getElementById("confirm-process-btn")
    .addEventListener("click", () => {
      processOrder();
    });

  // Ship order button
  document
    .getElementById("confirm-shipping-btn")
    .addEventListener("click", () => {
      shipOrder();
    });

  // Complete order button
  document
    .getElementById("confirm-complete-btn")
    .addEventListener("click", () => {
      completeOrder();
    });

  // Upload invoice button
  const uploadInvoiceBtn = document.getElementById("upload-invoice-btn");
  if (uploadInvoiceBtn) {
    uploadInvoiceBtn.addEventListener("click", () => {
      uploadInvoice();
    });
  }

  // Confirm cancellation button
  if (confirmCancellationBtn) {
    confirmCancellationBtn.addEventListener("click", () => {
      cancelOrder();
    });
  }

  // Cancellation reason dropdown change
  if (cancellationReason) {
    cancellationReason.addEventListener("change", function () {
      if (this.value === "other") {
        otherReasonGroup.style.display = "block";
      } else {
        otherReasonGroup.style.display = "none";
      }
    });
  }

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
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      const tabCategory = button.getAttribute("data-tab");
      filterOrdersByTab(tabCategory);
    });
  });

  // Refresh button (Floating button)
  refreshButton.addEventListener("click", () => {
    refreshData();
  });

  // Refresh pipeline button
  document.getElementById("refresh-pipeline").addEventListener("click", () => {
    refreshData();
  });

  // Shipping carrier dropdown
  const shippingCarrier = document.getElementById("shipping-carrier");
  const otherCarrierGroup = document.getElementById("other-carrier-group");

  if (shippingCarrier && otherCarrierGroup) {
    shippingCarrier.addEventListener("change", function () {
      if (this.value === "other") {
        otherCarrierGroup.style.display = "block";
      } else {
        otherCarrierGroup.style.display = "none";
      }
    });
  }
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
    stepElement.dataset.statuses = JSON.stringify(step.statuses);
    stepElement.innerHTML = `
      <div class="pipeline-icon">
        <i class="${step.icon}"></i>
      </div>
      <div class="pipeline-label">${step.label}</div>
      <div class="pipeline-count">${count}</div>
    `;

    // Add click event to filter orders by this step
    stepElement.addEventListener("click", () => {
      const statusesToFilter = step.statuses;
      filterOrdersByPipelineStep(statusesToFilter);
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

    // Highlight active tab based on pipeline step
    const statusToTabMap = {
      pending: "pending",
      quoted: "quoted",
      quote_revised: "quoted",
      quote_accepted: "accepted",
      awaiting_payment: "accepted",
      payment_completed: "payment_completed",
      processed: "processing",
      shipped: "processing",
      delivered: "processing",
      completed: "completed",
      cancelled: "cancelled",
      cancelled_by_seller: "cancelled",
      quote_rejected: "cancelled",
      disputed: "cancelled",
    };

    // Try to find the best tab to activate
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

    // Format status
    const orderStatus = formatStatusLabel(order.status);

    // Format quote status if exists
    let quoteStatusDisplay = "";
    let quoteStatusClass = "";

    if (order.quote) {
      if (order.quote.status === "draft") {
        quoteStatusDisplay = "Draft Quote";
        quoteStatusClass = "status-draft";
      } else if (order.quote.status === "sent") {
        quoteStatusDisplay = "Quote Sent";
        quoteStatusClass = "status-sent";
      } else if (order.quote.status === "viewed") {
        quoteStatusDisplay = "Quote Viewed";
        quoteStatusClass = "status-viewed";
      } else if (order.quote.status === "pending_revision") {
        quoteStatusDisplay = "Revision Requested";
        quoteStatusClass = "status-pending_revision";
      } else if (order.quote.status === "revised") {
        quoteStatusDisplay = "Quote Revised";
        quoteStatusClass = "status-revised";
      } else if (order.quote.status === "accepted") {
        quoteStatusDisplay = "Quote Accepted";
        quoteStatusClass = "status-accepted";
      } else if (order.quote.status === "rejected") {
        quoteStatusDisplay = "Quote Rejected";
        quoteStatusClass = "status-rejected";
      } else if (order.quote.status === "expired") {
        quoteStatusDisplay = "Quote Expired";
        quoteStatusClass = "status-expired";
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
          <span class="buyer-name"><i class="fas fa-user"></i> ${
            order.buyerName || "Buyer Name"
          }</span>
        </div>
        <div class="order-header-right">
          <span class="status-badge status-${order.status}">
            <span class="status-label">Order:</span> ${orderStatus}
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

    // Build quick summary of order
    let orderSummary = `
      <div class="order-info">
        <div class="info-card">
          <h3><i class="fas fa-user"></i> Buyer Information</h3>
          <div class="info-item">
            <span class="info-label">Buyer Name</span>
            <span class="info-value">${order.buyerName || "Buyer Name"}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Email</span>
            <span class="info-value">${
              order.buyerEmail || "buyer@example.com"
            }</span>
          </div>
          <div class="info-item">
            <span class="info-label">Phone</span>
            <span class="info-value">${
              order.buyerPhone || "+91 9876543210"
            }</span>
          </div>
        </div>
        
        <div class="info-card">
          <h3><i class="fas fa-shipping-fast"></i> Shipping Information</h3>
          <div class="info-item">
            <span class="info-label">Address</span>
            <span class="info-value">${order.shippingAddress}</span>
          </div>
        </div>
      </div>
    `;

    // Create a labels section that clearly identifies original order request vs quote
    let labelsSection = "";

    if (order.quote && order.quote.status !== "draft") {
      // Determine which data to show (original order or quote)
      const originalOrderTotal = order.totalPrice.toLocaleString("en-IN");
      const quoteTotal = order.quote.totalPrice.toLocaleString("en-IN");

      const isDifferent = order.totalPrice !== order.quote.totalPrice;

      labelsSection = `
        <div class="comparison-section">
          <div class="comparison-column">
            <div class="comparison-header">Original Order Request</div>
            <div class="comparison-body">
              <div class="comparison-item">
                <span class="comparison-title">Number of Book Titles:</span>
                <span class="comparison-data">${order.books.length}</span>
              </div>
              <div class="comparison-item">
                <span class="comparison-title">Total Items:</span>
                <span class="comparison-data">${order.books.reduce(
                  (sum, book) => sum + book.quantity,
                  0
                )}</span>
              </div>
              <div class="comparison-item">
                <span class="comparison-title">Subtotal:</span>
                <span class="comparison-data">₹${originalOrderTotal}</span>
              </div>
            </div>
          </div>
          
          <div class="comparison-column">
            <div class="comparison-header">Your Quote ${
              isDifferent
                ? '<span class="status-badge status-info" style="float:right;font-size:10px;">Modified</span>'
                : ""
            }</div>
            <div class="comparison-body">
              <div class="comparison-item">
                <span class="comparison-title">Number of Book Titles:</span>
                <span class="comparison-data">${order.quote.books.length}</span>
              </div>
              <div class="comparison-item">
                <span class="comparison-title">Total Items:</span>
                <span class="comparison-data">${order.quote.books.reduce(
                  (sum, book) => sum + book.quantity,
                  0
                )}</span>
              </div>
              <div class="comparison-item">
                <span class="comparison-title">Subtotal:</span>
                <span class="comparison-data">₹${quoteTotal}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // Build books table based on the order's current status
    // For orders with quotes that are sent/accepted, show the quote books
    // For draft quotes or pending orders, show the original order books
    const booksToDisplay =
      order.quote && order.quote.status !== "draft"
        ? order.quote.books
        : order.books;
    const totalPrice =
      order.quote && order.quote.status !== "draft"
        ? order.quote.totalPrice
        : order.totalPrice;
    const discountPercentage =
      order.quote && order.quote.status !== "draft"
        ? order.quote.discountPercentage || 0
        : order.discountPercentage || 0;
    const discountAmount =
      order.quote && order.quote.status !== "draft"
        ? (order.quote.totalPrice * (order.quote.discountPercentage || 0)) / 100
        : (order.totalPrice * (order.discountPercentage || 0)) / 100;
    const deliveryCharges =
      order.quote && order.quote.status !== "draft"
        ? order.quote.deliveryCharges
        : order.deliveryCharges;
    const handlingCharges =
      order.quote && order.quote.status !== "draft"
        ? order.quote.handlingCharges || 0
        : order.handlingCharges || 0;

    // Calculate discounted subtotal and grand total
    const discountedSubtotal = totalPrice - discountAmount;
    const grandTotal = discountedSubtotal + deliveryCharges + handlingCharges;

    let booksTable = `
      <h3 class="section-heading"><i class="fas fa-book"></i> Order Details</h3>
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

    // Add book items
    booksToDisplay.forEach((book) => {
      booksTable += `
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

    // Add order totals
    // booksTable += `
    //       </tbody>
    //       <tfoot>
    //         <tr>
    //           <td colspan="5"></td>
    //           <td>Subtotal:</td>
    //           <td>₹${totalPrice.toLocaleString("en-IN")}</td>
    //         </tr>
    //         <tr>
    //           <td colspan="5"></td>
    //           <td>Delivery:</td>
    //           <td>₹${deliveryCharges.toLocaleString("en-IN")}</td>
    //         </tr>
    //         <tr>
    //           <td colspan="5"></td>
    //           <td>Handling:</td>
    //           <td>₹${handlingCharges.toLocaleString("en-IN")}</td>
    //         </tr>
    //         <tr>
    //           <td colspan="5"></td>
    //           <td><strong>Grand Total:</strong></td>
    //           <td><strong>₹${grandTotal.toLocaleString("en-IN")}</strong></td>
    //         </tr>
    //       </tfoot>
    //     </table>
    //   </div>
    // `;
    booksTable += `
          </tbody>
          <tfoot>
            <tr>
              <td colspan="5"></td>
              <td>Subtotal:</td>
              <td>₹${totalPrice.toLocaleString("en-IN")}</td>
            </tr>
            <tr class="discount">
              <td colspan="5"></td>
              <td>Discount (${discountPercentage.toFixed(2)}%):</td>
              <td>- ₹${discountAmount.toLocaleString("en-IN")}</td>
            </tr>
            <tr class="discounted-subtotal">
              <td colspan="5"></td>
              <td>Discounted Subtotal:</td>
              <td>₹${discountedSubtotal.toLocaleString("en-IN")}</td>
            </tr>
            <tr>
              <td colspan="5"></td>
              <td>Delivery:</td>
              <td>₹${deliveryCharges.toLocaleString("en-IN")}</td>
            </tr>
            <tr>
              <td colspan="5"></td>
              <td>Handling:</td>
              <td>₹${handlingCharges.toLocaleString("en-IN")}</td>
            </tr>
            <tr>
              <td colspan="5"></td>
              <td><strong>Grand Total:</strong></td>
              <td><strong>₹${grandTotal.toLocaleString("en-IN")}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    // Action buttons based on order status and quote status
    let actionButtons = `
      <div class="action-buttons">
    `;

    // Determine which action buttons to show based on order state
    if (order.status === "pending" && !order.quote) {
      // New order without quote
      actionButtons += `
    <button class="btn-primary" onclick="editQuote('${order.id}')">
      <i class="fas fa-plus-circle"></i> Create Quote
    </button>
    <button class="btn-danger" onclick="showCancelOrderModal('${order.id}')">
      <i class="fas fa-times-circle"></i> Cancel Order
    </button>
  `;
    } else if (order.quote && order.quote.status === "draft") {
      // Order with draft quote
      actionButtons += `
    <button class="btn-primary" onclick="editQuote('${order.id}')">
      <i class="fas fa-edit"></i> Edit Draft Quote
    </button>
    <button class="btn-danger" onclick="showCancelOrderModal('${order.id}')">
      <i class="fas fa-times-circle"></i> Cancel Order
    </button>
  `;
    } else if (order.quote && order.quote.status === "pending_revision") {
      // Order with quote pending revision
      actionButtons += `
    <button class="btn-warning" onclick="editQuote('${order.id}', true)">
      <i class="fas fa-edit"></i> Revise Quote
    </button>
    <button class="btn-danger" onclick="showCancelOrderModal('${order.id}')">
      <i class="fas fa-times-circle"></i> Cancel Order
    </button>
  `;
    } else if (
      order.status === "quote_accepted" ||
      order.status === "awaiting_payment"
    ) {
      // Quote accepted, payment awaiting
      actionButtons += `
    <button class="btn-danger" onclick="showCancelOrderModal('${order.id}')">
      <i class="fas fa-times-circle"></i> Cancel Order
    </button>
  `;
    } else if (order.status === "payment_completed") {
      // Order is paid and ready to process
      actionButtons += `
    <button class="btn-success" onclick="showProcessOrderModal('${order.id}')">
      <i class="fas fa-box"></i> Process Order
    </button>
  `;
    } else if (order.status === "processed") {
      // Order is processed and ready to ship
      if (order.invoiceUrl) {
        // If invoice is already uploaded, only show ship button
        actionButtons += `
      <button class="btn-info" onclick="showShippingModal('${order.id}')">
        <i class="fas fa-shipping-fast"></i> Mark as Shipped
      </button>
    `;
      } else {
        // Otherwise show both invoice upload and ship buttons
        actionButtons += `
      <button class="btn-primary" onclick="showInvoiceUploadModal('${
        order.id
      }')">
        <i class="fas fa-file-invoice"></i> Upload Invoice
      </button>
      <button class="btn-info" onclick="showShippingModal('${
        order.id
      }')" class="${!order.invoiceUrl ? "btn-disabled" : ""}" ${
          !order.invoiceUrl ? "disabled" : ""
        }>
        <i class="fas fa-shipping-fast"></i> Mark as Shipped
      </button>
    `;
      }
    } else if (order.status === "shipped" || order.status === "delivered") {
      // Show for both shipped AND delivered statuses with appropriate text
      actionButtons += `
    <button class="btn-success" onclick="showCompleteOrderModal('${order.id}')">
      <i class="fas fa-check-circle"></i> ${
        order.status === "shipped" ? "Mark as Delivered" : "Mark as Completed"
      }
    </button>
  `;
    }

    // Add view details button for all orders
    actionButtons += `
      <button class="btn-secondary" onclick="viewOrderDetails('${order.id}')">
        <i class="fas fa-eye"></i> View Details
      </button>
    `;

    actionButtons += `
      </div>
    `;

    // Build the order body
    let orderBody = `
      <div class="order-body" id="order-body-${order.id}">
        <div class="order-content">
          ${orderSummary}
          ${labelsSection}
          ${booksTable}
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

// Edit or create quote
async function editQuote(orderId, isRevision = false) {
  try {
    // First, fetch the order details
    const response = await fetch(`/seller/orders/${orderId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Error fetching order details: ${response.statusText}`);
    }

    const result = await response.json();
    const order = result.order;
    currentOrderDetail = { ...order }; // Make a copy to avoid modifying the original

    // Determine if we're editing a draft, creating a new quote, or revising a quote
    const isEditingDraft = order.quote && order.quote.status === "draft";

    // Set modal title based on action
    let modalTitle = "Create New Quote";
    if (isEditingDraft) {
      modalTitle = "Edit Draft Quote";
    } else if (isRevision) {
      modalTitle = "Revise Quote";
    }

    document.getElementById("quote-modal-title").textContent = modalTitle;

    // Get the books to display (either from draft quote, original order, or in case of revision, the current quote)
    let booksToDisplay;
    let discountPercentage;
    let deliveryCharges;
    let handlingCharges;
    let quoteMessage = "";

    if (isEditingDraft) {
      // Display draft quote data
      booksToDisplay = [...order.quote.books]; // Make a copy
      discountPercentage = order.quote.discountPercentage || 0;
      deliveryCharges = order.quote.deliveryCharges;
      handlingCharges = order.quote.handlingCharges || 0;
      quoteMessage = order.quote.message || "";
    } else if (isRevision && order.quote) {
      // Display current quote data for revision
      booksToDisplay = [...order.quote.books]; // Make a copy
      discountPercentage = order.quote.discountPercentage || 0;
      deliveryCharges = order.quote.deliveryCharges;
      handlingCharges = order.quote.handlingCharges || 0;
      quoteMessage = order.quote.message || "";
    } else {
      // Display original order data for new quote
      booksToDisplay = [...order.books]; // Make a copy
      discountPercentage = order.discountPercentage || 0;
      deliveryCharges = order.deliveryCharges;
      handlingCharges = order.handlingCharges || 0;
    }

    // Build modal content
    let modalContent = `
    <div class="notification info-notification">
      <i class="fas fa-info-circle"></i> Review the order details and create a quote for the buyer. You can modify prices, quantities, or add new books as needed.
    </div>

    <div class="form-group">
      <label for="buyer-info">Buyer Information</label>
      <div class="detail-content">
        <p><strong>Buyer:</strong> ${order.buyerName || "Buyer Name"}</p>
        <p><strong>Email:</strong> ${
          order.buyerEmail || "buyer@example.com"
        }</p>
        <p><strong>Phone:</strong> ${order.buyerPhone || "+91 9876543210"}</p>
      </div>
    </div>

    <div class="form-group">
      <label for="shipping-address">Shipping Address</label>
      <div class="detail-content">
        <p>${order.shippingAddress}</p>
      </div>
    </div>
  `;

    // If this is a revision, show the revision request reason if available
    if (isRevision && order.quote && order.quote.revisionReason) {
      modalContent += `
      <div class="notification warning-notification">
        <i class="fas fa-exclamation-triangle"></i> <strong>Revision Request:</strong> ${order.quote.revisionReason}
      </div>
    `;
    }

    // Add original order details if this is a new quote or revision
    if (!isEditingDraft) {
      modalContent += `
      <h3 class="section-heading"><i class="fas fa-shopping-cart"></i> Original Order Request</h3>
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

      // Add original order books
      order.books.forEach((book) => {
        modalContent += `
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

      // Calculate subtotal
      const originalOrderSubtotal = order.books.reduce(
        (sum, book) => sum + book.total,
        0
      );

      modalContent += `
          </tbody>
          <tfoot>
            <tr>
              <td colspan="5"></td>
              <td>Subtotal:</td>
              <td>₹${originalOrderSubtotal.toLocaleString("en-IN")}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
    }

    // Add quote editor
    modalContent += `
    <h3 class="section-heading"><i class="fas fa-edit"></i> ${
      isEditingDraft
        ? "Edit Quote"
        : isRevision
        ? "Revise Quote"
        : "Create Quote"
    }</h3>
    
    <div class="book-search">
      <input type="text" id="book-search-input" placeholder="Search to add more books...">
      <div id="book-search-results" class="book-search-results"></div>
    </div>
    
    <div class="items-table-wrapper">
      <table class="items-table" id="quote-books-table">
        <thead>
          <tr>
            <th>Book Title</th>
            <th>Code</th>
            <th>Class</th>
            <th>Subject</th>
            <th>Quantity</th>
            <th>Price (₹)</th>
            <th>Total (₹)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
  `;

    // Add editable book items
    booksToDisplay.forEach((book, index) => {
      modalContent += `
      <tr data-code="${book.code}">
        <td>${book.title}</td>
        <td>${book.code}</td>
        <td>${book.class}</td>
        <td>${book.subject}</td>
        <td class="editable-cell" onclick="makeEditable(this, 'quantity', ${index})">
          <span>${book.quantity}</span>
        </td>
        <td class="editable-cell" onclick="makeEditable(this, 'price', ${index})">
          <span>${book.price.toLocaleString("en-IN")}</span>
        </td>
        <td data-total="${book.total}">${book.total.toLocaleString(
        "en-IN"
      )}</td>
        <td class="book-action">
          <button type="button" onclick="removeBook(this, '${book.code}')">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
    });

    // Calculate subtotal
    // const subtotal = booksToDisplay.reduce((sum, book) => sum + book.total, 0);
    // const grandTotal = subtotal + deliveryCharges + handlingCharges;
    const subtotal = booksToDisplay.reduce((sum, book) => sum + book.total, 0);
    const discountAmount = (subtotal * discountPercentage) / 100;
    const discountedSubtotal = subtotal - discountAmount;
    const grandTotal = discountedSubtotal + deliveryCharges + handlingCharges;

    modalContent += `
        </tbody>
        <tfoot id="quote-total-row">
          <tr>
            <td colspan="5"></td>
            <td>Subtotal:</td>
            <td id="quote-subtotal">₹${subtotal.toLocaleString("en-IN")}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
    
    <div class="price-section">
      <div class="price-row">
        <span>Subtotal:</span>
        <span id="quote-summary-subtotal">₹${subtotal.toLocaleString(
          "en-IN"
        )}</span>
      </div>
      <div class="price-row discount">
        <span>Discount Percentage (%):</span>
        <div class="price-input">
          <input type="number" id="discount-percentage" min="0" max="100" step="0.01" value="${discountPercentage}" onchange="updateGrandTotal()">
        </div>
      </div>
      <div class="price-row discount">
        <span>Discount Amount:</span>
        <span id="quote-discount-amount">- ₹${discountAmount.toLocaleString(
          "en-IN"
        )}</span>
      </div>
      <div class="price-row discounted-subtotal">
        <span>Discounted Subtotal:</span>
        <span id="quote-discounted-subtotal">₹${discountedSubtotal.toLocaleString(
          "en-IN"
        )}</span>
      </div>
      <div class="price-row">
        <span>Delivery Charges:</span>
        <div class="price-input">
          <input type="number" id="delivery-charges" min="0" step="10" value="${deliveryCharges}" onchange="updateGrandTotal()">
        </div>
      </div>
      <div class="price-row">
        <span>Handling Charges:</span>
        <div class="price-input">
          <input type="number" id="handling-charges" min="0" step="10" value="${handlingCharges}" onchange="updateGrandTotal()">
        </div>
      </div>
      <div class="price-row total">
        <span>Grand Total:</span>
        <span id="quote-grand-total">₹${grandTotal.toLocaleString(
          "en-IN"
        )}</span>
      </div>
    </div>
    
    <div class="form-group">
      <label for="quote-message">Message to Buyer</label>
      <textarea id="quote-message" placeholder="Add any notes or information for the buyer...">${quoteMessage}</textarea>
      <div class="form-hint">This message will be visible to the buyer when they receive your quote.</div>
    </div>
  `;

    // Save current data for the form
    // Save current data for the form - update to include discountPercentage
    currentQuoteData = {
      orderId: order.id,
      isNewQuote: !isEditingDraft && !isRevision,
      isDraft: isEditingDraft,
      isRevision: isRevision,
      books: [...booksToDisplay], // Make a copy of the books array
      discountPercentage: discountPercentage,
      deliveryCharges: deliveryCharges,
      handlingCharges: handlingCharges,
    };

    // Continue with the rest of the function...
    // Update modal content
    quoteModalContent.innerHTML = modalContent;

    // Add book search functionality
    setupBookSearch();

    // Show the modal
    quoteEditModal.style.display = "block";
  } catch (error) {
    console.error('Error loading quote data:', error);
    showNotification('error', 'Error', 'Failed to load quote data. Please try again.');
  }
}

// Set up book search in the quote edit modal
function setupBookSearch() {
  const searchInput = document.getElementById("book-search-input");
  const searchResults = document.getElementById("book-search-results");

  if (!searchInput || !searchResults) return;

  searchInput.addEventListener("keyup", function () {
    const searchTerm = this.value.toLowerCase().trim();

    if (searchTerm.length < 2) {
      searchResults.classList.remove("open");
      return;
    }

    // Filter books from catalog
    const filteredBooks = bookCatalog.filter((book) => {
      // Don't show books already in the quote
      const bookTable = document.getElementById("quote-books-table");
      const bookRows = bookTable.querySelectorAll("tbody tr");
      const existingCodes = Array.from(bookRows).map((row) => row.dataset.code);

      if (existingCodes.includes(book.code)) {
        return false;
      }

      // Filter by title or code
      return (
        book.title.toLowerCase().includes(searchTerm) ||
        book.code.toLowerCase().includes(searchTerm) ||
        book.subject.toLowerCase().includes(searchTerm) ||
        book.class.toString().includes(searchTerm)
      );
    });

    if (filteredBooks.length === 0) {
      searchResults.innerHTML =
        "<div class='book-search-item'>No books found</div>";
    } else {
      searchResults.innerHTML = filteredBooks
        .map(
          (book) => `
            <div class="book-search-item" onclick="addBookToQuote('${book.code}')">
              ${book.title} (${book.code}) - Class ${book.class} - ${book.subject}
            </div>
          `
        )
        .join("");
    }

    searchResults.classList.add("open");
  });

  // Close search results when clicking outside
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".book-search")) {
      searchResults.classList.remove("open");
    }
  });
}

// Make a cell editable (for quantity and price fields in the quote editor)
function makeEditable(cell, field, index) {
  const currentValue = parseFloat(
    cell.querySelector("span").textContent.replace(/,/g, "")
  );

  // Create input element
  const input = document.createElement("input");
  input.type = "number";
  input.min = field === "quantity" ? 1 : 0.01;
  input.step = field === "quantity" ? 1 : 0.01;
  input.value = currentValue;

  // Replace cell content with input
  cell.innerHTML = "";
  cell.appendChild(input);
  input.focus();

  // Add event listener for blur (when input loses focus)
  input.addEventListener("blur", function () {
    let newValue = parseFloat(this.value);

    if (isNaN(newValue) || newValue <= 0) {
      newValue = currentValue;
    }

    // Update cell
    cell.innerHTML = `<span>${
      field === "quantity" ? newValue : newValue.toLocaleString("en-IN")
    }</span>`;

    // Update row total
    const row = cell.parentNode;
    const quantity = parseFloat(row.cells[4].textContent.replace(/,/g, ""));
    const price = parseFloat(row.cells[5].textContent.replace(/,/g, ""));
    const total = quantity * price;

    row.cells[6].textContent = total.toLocaleString("en-IN");
    row.cells[6].dataset.total = total;

    // Update book in current quote data
    const bookCode = row.dataset.code;
    const bookIndex = currentQuoteData.books.findIndex(
      (book) => book.code === bookCode
    );

    if (bookIndex !== -1) {
      if (field === "quantity") {
        currentQuoteData.books[bookIndex].quantity = newValue;
      } else if (field === "price") {
        currentQuoteData.books[bookIndex].price = newValue;
      }
      currentQuoteData.books[bookIndex].total = quantity * price;
    }

    // Update subtotal
    updateQuoteSubtotal();
  });

  // Add event listener for Enter key
  input.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      this.blur();
    }
  });
}

// Add a book to the quote
function addBookToQuote(bookCode) {
  const book = bookCatalog.find((b) => b.code === bookCode);
  if (!book) return;

  const tbody = document.querySelector("#quote-books-table tbody");
  const index = tbody.children.length;

  // Create new row
  const row = document.createElement("tr");
  row.dataset.code = book.code;

  const quantity = 1;
  const total = quantity * book.price;

  row.innerHTML = `
    <td>${book.title}</td>
    <td>${book.code}</td>
    <td>${book.class}</td>
    <td>${book.subject}</td>
    <td class="editable-cell" onclick="makeEditable(this, 'quantity', ${index})">
      <span>${quantity}</span>
    </td>
    <td class="editable-cell" onclick="makeEditable(this, 'price', ${index})">
      <span>${book.price.toLocaleString("en-IN")}</span>
    </td>
    <td data-total="${total}">${total.toLocaleString("en-IN")}</td>
    <td class="book-action">
      <button type="button" onclick="removeBook(this, '${book.code}')">
        <i class="fas fa-trash"></i>
      </button>
    </td>
  `;

  tbody.appendChild(row);

  // Add book to current quote data
  currentQuoteData.books.push({
    code: book.code,
    title: book.title,
    class: book.class,
    subject: book.subject,
    quantity: quantity,
    price: book.price,
    total: total,
  });

  // Close search results
  const searchResults = document.getElementById("book-search-results");
  searchResults.classList.remove("open");

  // Clear search input
  document.getElementById("book-search-input").value = "";

  // Update subtotal
  updateQuoteSubtotal();
}

// Remove a book from the quote
function removeBook(button, bookCode) {
  // Confirm removal
  if (!confirm("Are you sure you want to remove this book from the quote?")) {
    return;
  }

  // Remove row from table
  const row = button.closest("tr");
  row.parentNode.removeChild(row);

  // Remove book from current quote data
  const bookIndex = currentQuoteData.books.findIndex(
    (book) => book.code === bookCode
  );
  if (bookIndex !== -1) {
    currentQuoteData.books.splice(bookIndex, 1);
  }

  // Update subtotal
  updateQuoteSubtotal();
}

// Update the quote subtotal and grand total
function updateQuoteSubtotal() {
  // Calculate subtotal from table
  const table = document.getElementById("quote-books-table");
  const totalCells = table.querySelectorAll("tbody td[data-total]");

  let subtotal = 0;
  totalCells.forEach((cell) => {
    subtotal += parseFloat(cell.dataset.total);
  });

  // Update subtotal in table footer
  document.getElementById(
    "quote-subtotal"
  ).textContent = `₹${subtotal.toLocaleString("en-IN")}`;

  // Update subtotal in summary
  document.getElementById(
    "quote-summary-subtotal"
  ).textContent = `₹${subtotal.toLocaleString("en-IN")}`;

  // Update grand total
  updateGrandTotal();
}

// Update grand total when delivery charges or handling charges change
// function updateGrandTotal() {
//   const subtotalElement = document.getElementById("quote-summary-subtotal");
//   const subtotal = parseFloat(
//     subtotalElement.textContent.replace(/[^\d.-]/g, "")
//   );

//   const deliveryChargesInput = document.getElementById("delivery-charges");
//   const deliveryCharges = parseFloat(deliveryChargesInput.value) || 0;

//   const handlingChargesInput = document.getElementById("handling-charges");
//   const handlingCharges = parseFloat(handlingChargesInput.value) || 0;

//   // Update current quote data
//   currentQuoteData.deliveryCharges = deliveryCharges;
//   currentQuoteData.handlingCharges = handlingCharges;

//   const grandTotal = subtotal + deliveryCharges + handlingCharges;

//   document.getElementById(
//     "quote-grand-total"
//   ).textContent = `₹${grandTotal.toLocaleString("en-IN")}`;
// }
function updateGrandTotal() {
  const subtotalElement = document.getElementById("quote-summary-subtotal");
  const subtotal = parseFloat(
    subtotalElement.textContent.replace(/[^\d.-]/g, "")
  );

  const discountPercentageInput = document.getElementById(
    "discount-percentage"
  );
  const discountPercentage = parseFloat(discountPercentageInput.value) || 0;

  // Calculate discount amount based on percentage
  const discountAmount = subtotal * (discountPercentage / 100);

  const deliveryChargesInput = document.getElementById("delivery-charges");
  const deliveryCharges = parseFloat(deliveryChargesInput.value) || 0;

  const handlingChargesInput = document.getElementById("handling-charges");
  const handlingCharges = parseFloat(handlingChargesInput.value) || 0;

  // Update current quote data
  currentQuoteData.discountPercentage = discountPercentage;
  currentQuoteData.deliveryCharges = deliveryCharges;
  currentQuoteData.handlingCharges = handlingCharges;

  // Update discount amount display
  document.getElementById(
    "quote-discount-amount"
  ).textContent = `- ₹${discountAmount.toLocaleString("en-IN")}`;

  // Calculate and display discounted subtotal
  const discountedSubtotal = subtotal - discountAmount;
  document.getElementById(
    "quote-discounted-subtotal"
  ).textContent = `₹${discountedSubtotal.toLocaleString("en-IN")}`;

  // Calculate grand total
  const grandTotal = discountedSubtotal + deliveryCharges + handlingCharges;

  document.getElementById(
    "quote-grand-total"
  ).textContent = `₹${grandTotal.toLocaleString("en-IN")}`;

  // Add highlight animation to the discount amount field
  const discountAmountElement = document.getElementById(
    "quote-discount-amount"
  );
  discountAmountElement.classList.remove("discount-changed");
  void discountAmountElement.offsetWidth; // Trigger reflow
  discountAmountElement.classList.add("discount-changed");
}

// Save quote (as draft or send to buyer)
// async function saveQuote(status) {
//   if (!currentQuoteData || !currentOrderDetail) return;

//   // Get quote data from form
//   const message = document.getElementById("quote-message").value.trim();
//   const deliveryCharges = parseFloat(document.getElementById("delivery-charges").value) || 0;
//   const handlingCharges = parseFloat(document.getElementById("handling-charges").value) || 0;

//   // Check if there are any books
//   if (currentQuoteData.books.length === 0) {
//     showNotification("error", "Error", "You must add at least one book to the quote.");
//     return;
//   }

//   // Calculate totals
//   const totalPrice = currentQuoteData.books.reduce((sum, book) => sum + book.total, 0);

//   showLoading();
//   quoteEditModal.style.display = "none";

//   try {
//     let response;
    
//     // Prepare quote data
//     const quoteData = {
//       books: currentQuoteData.books,
//       totalPrice: totalPrice,
//       deliveryCharges: deliveryCharges,
//       handlingCharges: handlingCharges,
//       message: message,
//       status: status
//     };

//     if (currentQuoteData.isNewQuote) {
//       // Create new quote
//       response = await fetch(`/seller/orders/${currentQuoteData.orderId}/quote`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(quoteData),
//         credentials: 'include',
//       });
//     } else {
//       // Update existing quote
//       const quoteId = currentOrderDetail.quote.id;
//       response = await fetch(`/seller/orders/${currentQuoteData.orderId}/quote/${quoteId}`, {
//         method: 'PUT',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(quoteData),
//         credentials: 'include',
//       });
//     }

//     if (!response.ok) {
//       throw new Error(`Error saving quote: ${response.statusText}`);
//     }

//     const result = await response.json();
    
//     // Find and update the order in local data
//     const orderIndex = orderRequests.findIndex(o => o.id === currentQuoteData.orderId);
//     if (orderIndex !== -1) {
//       orderRequests[orderIndex] = result.order;
//     }

//     // Get the current active tab
//     const activeTab = document.querySelector(".tab-btn.active");
//     const tabCategory = activeTab ? activeTab.getAttribute("data-tab") : "all";

//     // Update UI with the current tab's data
//     renderPipeline(orderRequests);
//     filterOrdersByTab(tabCategory);

//     // Show success notification
//     if (status === "draft") {
//       showNotification("success", "Quote Saved", "Quote has been saved as a draft.");
//     } else {
//       showNotification("success", "Quote Sent", "Quote has been sent to the buyer.");
//     }

//     // Reset current data
//     currentQuoteData = null;
//   } catch (error) {
//     console.error('Error saving quote:', error);
//     showNotification('error', 'Error', 'Failed to save quote. Please try again.');
//     hideLoading();
//   }
// }
async function saveQuote(status) {
  if (!currentQuoteData || !currentOrderDetail) return;

  // Get quote data from form
  const message = document.getElementById("quote-message").value.trim();
  const discountPercentage =
    parseFloat(document.getElementById("discount-percentage").value) || 0; // Get discount percentage
  const deliveryCharges =
    parseFloat(document.getElementById("delivery-charges").value) || 0;
  const handlingCharges =
    parseFloat(document.getElementById("handling-charges").value) || 0;

  // Check if there are any books
  if (currentQuoteData.books.length === 0) {
    showNotification(
      "error",
      "Error",
      "You must add at least one book to the quote."
    );
    return;
  }

  // Calculate totals
  const totalPrice = currentQuoteData.books.reduce(
    (sum, book) => sum + book.total,
    0
  );

  showLoading();
  quoteEditModal.style.display = "none";

  try {
    let response;

    // Prepare quote data
    const quoteData = {
      books: currentQuoteData.books,
      totalPrice: totalPrice,
      discountPercentage: discountPercentage, // Include discountPercentage in the quote data
      deliveryCharges: deliveryCharges,
      handlingCharges: handlingCharges,
      message: message,
      status: status,
    };

    if (currentQuoteData.isNewQuote) {
      // Create new quote
      response = await fetch(
        `/seller/orders/${currentQuoteData.orderId}/quote`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(quoteData),
          credentials: "include",
        }
      );
    } else {
      // Update existing quote
      const quoteId = currentOrderDetail.quote.id;
      response = await fetch(
        `/seller/orders/${currentQuoteData.orderId}/quote/${quoteId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(quoteData),
          credentials: "include",
        }
      );
    }

    if (!response.ok) {
      throw new Error(`Error saving quote: ${response.statusText}`);
    }

    const result = await response.json();

    // Find and update the order in local data
    const orderIndex = orderRequests.findIndex(
      (o) => o.id === currentQuoteData.orderId
    );
    if (orderIndex !== -1) {
      orderRequests[orderIndex] = result.order;
    }

    // Get the current active tab
    const activeTab = document.querySelector(".tab-btn.active");
    const tabCategory = activeTab ? activeTab.getAttribute("data-tab") : "all";

    // Update UI with the current tab's data
    renderPipeline(orderRequests);
    filterOrdersByTab(tabCategory);

    // Show success notification
    if (status === "draft") {
      showNotification(
        "success",
        "Quote Saved",
        "Quote has been saved as a draft."
      );
    } else {
      showNotification(
        "success",
        "Quote Sent",
        "Quote has been sent to the buyer."
      );
    }

    // Reset current data
    currentQuoteData = null;
  } catch (error) {
    console.error("Error saving quote:", error);
    showNotification(
      "error",
      "Error",
      "Failed to save quote. Please try again."
    );
    hideLoading();
  }
}

// View order details
async function viewOrderDetails(orderId) {
  try {
    showLoading();

    const response = await fetch(`/seller/orders/${orderId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Error fetching order details: ${response.statusText}`);
    }

    const result = await response.json();
    const order = result.order;
    currentOrderDetail = { ...order }; // Make a copy

    // Continue with the existing function to build the modal content
    // ...
    // Format date
    const orderDate = new Date(order.createdAt);
    const formattedDate = formatDate(orderDate, true);

    // Format status
    const orderStatus = formatStatusLabel(order.status);

    // Build modal content with tabs
    let modalContent = `
    <div class="detail-tabs">
      ${
        order.quote
          ? `<button class="detail-tab" data-panel="quote-panel">Quote</button>`
          : ""
      }
      <button class="detail-tab active" data-panel="order-info-panel">Order Info</button>    
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
    <div class="detail-panel ${
      !order.quote ? "active" : ""
    }" id="order-info-panel">
      <div class="notification info-notification">
        <i class="fas fa-info-circle"></i> This is the original order request from the buyer.
      </div>
      
      <div class="order-info">
        <div class="info-card">
          <h3><i class="fas fa-info-circle"></i> Order Information</h3>
          <div class="info-item">
            <span class="info-label">Order ID</span>
            <span class="info-value">${order.id}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Date</span>
            <span class="info-value">${formattedDate}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Status</span>
            <span class="info-value">
              <span class="status-badge status-${
                order.status
              }">${orderStatus}</span>
            </span>
          </div>
        </div>

        <div class="info-card">
          <h3><i class="fas fa-user"></i> Buyer Information</h3>
          <div class="info-item">
            <span class="info-label">Buyer Name</span>
            <span class="info-value">${order.buyerName || "Buyer Name"}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Email</span>
            <span class="info-value">${
              order.buyerEmail || "buyer@example.com"
            }</span>
          </div>
          <div class="info-item">
            <span class="info-label">Phone</span>
            <span class="info-value">${
              order.buyerPhone || "+91 9876543210"
            }</span>
          </div>
        </div>
      </div>

      <div class="info-card">
        <h3><i class="fas fa-shipping-fast"></i> Shipping Information</h3>
        <div class="info-item">
          <span class="info-label">Address</span>
          <span class="info-value">${order.shippingAddress}</span>
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
      modalContent += `
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
    const grandTotal =
      order.totalPrice + order.deliveryCharges + handlingCharges;

    // Add order totals
    //   modalContent += `
    //         </tbody>
    //         <tfoot>
    //           <tr>
    //             <td colspan="5"></td>
    //             <td>Subtotal:</td>
    //             <td>₹${order.totalPrice.toLocaleString("en-IN")}</td>
    //           </tr>
    //           <tr>
    //             <td colspan="5"></td>
    //             <td>Delivery:</td>
    //             <td>₹${order.deliveryCharges.toLocaleString("en-IN")}</td>
    //           </tr>
    //           <tr>
    //             <td colspan="5"></td>
    //             <td>Handling:</td>
    //             <td>₹${handlingCharges.toLocaleString("en-IN")}</td>
    //           </tr>
    //           <tr>
    //             <td colspan="5"></td>
    //             <td><strong>Grand Total:</strong></td>
    //             <td><strong>₹${grandTotal.toLocaleString("en-IN")}</strong></td>
    //           </tr>
    //         </tfoot>
    //       </table>
    //     </div>
    //   </div>
    // `;
    modalContent += `
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

  //   modalContent += `
  //   </tbody>
  //   <tfoot>
  //             <tr>
  //               <td colspan="5"></td>
  //               <td>Subtotal:</td>
  //               <td>₹${order.totalPrice.toLocaleString("en-IN")}</td>
  //             </tr>
  //             <tr class="discount">
  //               <td colspan="5"></td>
  //               <td>Discount (${order.discountPercentage.toFixed(2)}%):</td>
  //               <td>- ₹${(
  //                 (order.totalPrice * order.discountPercentage) /
  //                 100
  //               ).toLocaleString("en-IN")}</td>
  //             </tr>
  //             <tr class="discounted-subtotal">
  //               <td colspan="5"></td>
  //               <td>Discounted Subtotal:</td>
  //               <td>₹${(
  //                 order.totalPrice -
  //                 (order.totalPrice * order.discountPercentage) / 100
  //               ).toLocaleString("en-IN")}--------</td>
  //             </tr>
  //           </tfoot>
  //         </table>
  //       </div>
  //     </div>
  // `;

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

      modalContent += `
      <div class="detail-panel" id="quote-panel">
        <div class="notification info-notification">
          <i class="fas fa-info-circle"></i> This is the quote you have sent to the buyer.
        </div>
        
        <div class="order-info">
          <div class="info-card">
            <h3><i class="fas fa-file-alt"></i> Quote Information</h3>
            <div class="info-item">
              <span class="info-label">Quote ID</span>
              <span class="info-value">${order.quote.id}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Date</span>
              <span class="info-value">${formattedQuoteDate}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Status</span>
              <span class="info-value">
                <span class="status-badge status-${
                  order.quote.status
                }">${quoteStatus}</span>
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">Expiry Date</span>
              <span class="info-value">${expiryDateDisplay}</span>
            </div>
          </div>
        </div>

        ${
          order.quote.message
            ? `
        <div class="info-card">
          <h3><i class="fas fa-comment-alt"></i> Message to Buyer</h3>
          <div class="info-item">
            <span class="info-value">${order.quote.message}</span>
          </div>
        </div>
        `
            : ""
        }

        <h3 class="section-heading"><i class="fas fa-book"></i> Quote Items</h3>
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

      // Add book items (quote)
      order.quote.books.forEach((book) => {
        // Check if this book is different from the original order
        const originalBook = order.books.find((b) => b.code === book.code);
        const isModified =
          originalBook &&
          (originalBook.quantity !== book.quantity ||
            originalBook.price !== book.price);

        const isNew = !order.books.some((b) => b.code === book.code);

        const rowClass = isNew
          ? "highlight-add"
          : isModified
          ? "highlight-change"
          : "";

        modalContent += `
            <tr class="${rowClass}">
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

      // Check for removed books
      order.books.forEach((originalBook) => {
        const isRemoved = !order.quote.books.some(
          (b) => b.code === originalBook.code
        );

        if (isRemoved) {
          modalContent += `
                <tr class="highlight-remove">
                    <td>${originalBook.title}</td>
                    <td>${originalBook.code}</td>
                    <td>${originalBook.class}</td>
                    <td>${originalBook.subject}</td>
                    <td>0</td>
                    <td>${originalBook.price.toLocaleString("en-IN")}</td>
                    <td>0.00</td>
                </tr>
            `;
        }
      });

      // Calculate quote totals including handling charges
      // const quoteHandlingCharges = order.quote.handlingCharges || 0;
      // const quoteGrandTotal =
      //   order.quote.totalPrice +
      //   order.quote.deliveryCharges +
      //   quoteHandlingCharges;
      const quoteDiscountPercentage = order.quote.discountPercentage || 0;
      const quoteDiscountAmount =
        (order.quote.totalPrice * quoteDiscountPercentage) / 100;
      const quoteDiscountedSubtotal =
        order.quote.totalPrice - quoteDiscountAmount;
      const quoteHandlingCharges = order.quote.handlingCharges || 0;
      const quoteGrandTotal =
        quoteDiscountedSubtotal +
        order.quote.deliveryCharges +
        quoteHandlingCharges;

      // Add quote totals
      modalContent += `
                </tbody>
                <tfoot>
                <tr>
                  <td colspan="5"></td>
                  <td>Subtotal:</td>
                  <td>₹${order.quote.totalPrice.toLocaleString("en-IN")}</td>
                </tr>
                <tr class="discount">
                  <td colspan="5"></td>
                  <td>Discount (${quoteDiscountPercentage.toFixed(2)}%):</td>
                  <td>- ₹${quoteDiscountAmount.toLocaleString("en-IN")}</td>
                </tr>
                <tr class="discounted-subtotal">
                  <td colspan="5"></td>
                  <td>Discounted Subtotal:</td>
                  <td>₹${quoteDiscountedSubtotal.toLocaleString("en-IN")}</td>
                </tr>
                <tr>
                  <td colspan="5"></td>
                  <td>Delivery:</td>
                  <td>₹${order.quote.deliveryCharges.toLocaleString(
                    "en-IN"
                  )}</td>
                </tr>
                <tr>
                  <td colspan="5"></td>
                  <td>Handling:</td>
                  <td>₹${quoteHandlingCharges.toLocaleString("en-IN")}</td>
                </tr>
                <tr>
                  <td colspan="5"></td>
                  <td><strong>Grand Total:</strong></td>
                  <td><strong>₹${quoteGrandTotal.toLocaleString(
                    "en-IN"
                  )}</strong></td>
                </tr>
              </tfoot>
            </table>
        </div>
        
        ${renderRevisionHistory(order.quote)}
    </div>
    `;
    }

    // Payment Panel
    if (order.payment) {
      const paymentDate = formatDate(order.payment.paymentDate, true);

      modalContent += `
        <div class="detail-panel" id="payment-panel">
            <div class="notification info-notification">
                <i class="fas fa-info-circle"></i> This order has been paid for.
            </div>
            
            <div class="info-card">
                <h3><i class="fas fa-credit-card"></i> Payment Information</h3>
                <div class="info-item">
                    <span class="info-label">Payment ID</span>
                    <span class="info-value">${order.payment.id}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Status</span>
                    <span class="info-value">
                        <span class="status-badge status-${
                          order.payment.status
                        }">
                            ${formatStatusLabel(order.payment.status)}
                        </span>
                    </span>
                </div>
                <div class="info-item">
                    <span class="info-label">Amount</span>
                    <span class="info-value">₹${order.payment.amount.toLocaleString(
                      "en-IN"
                    )}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Method</span>
                    <span class="info-value">${formatStatusLabel(
                      order.payment.paymentMethod
                    )}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Transaction ID</span>
                    <span class="info-value">${
                      order.payment.transactionId
                    }</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Date</span>
                    <span class="info-value">${paymentDate}</span>
                </div>
            </div>
        </div>
    `;
    }

    // Invoice Panel
    if (order.invoiceUrl) {
      modalContent += `
        <div class="detail-panel" id="invoice-panel">
            <div class="notification info-notification">
                <i class="fas fa-info-circle"></i> Invoice for this order.
            </div>
            
            <div class="info-card">
                <h3><i class="fas fa-file-invoice"></i> Invoice Details</h3>
                <div class="info-item">
                    <span class="info-label">Uploaded On</span>
                    <span class="info-value">${
                      order.invoiceDate
                        ? formatDate(order.invoiceDate, true)
                        : "Not Available"
                    }</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Actions</span>
                    <span class="info-value">
                        <a href="${
                          order.invoiceUrl
                        }" target="_blank" class="btn-primary btn-sm">
                            <i class="fas fa-download"></i> Download Invoice
                        </a>
                    </span>
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
      modalContent += `
        <div class="detail-panel" id="shipping-panel">
            <div class="notification info-notification">
                <i class="fas fa-info-circle"></i> This order has been shipped.
            </div>
            
            <div class="info-card">
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

        modalContent += `
                <div class="info-item">
                    <span class="info-label">Shipped Date</span>
                    <span class="info-value">${shippingDate}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Carrier</span>
                    <span class="info-value">${formatStatusLabel(
                      order.carrier
                    )}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Tracking Number</span>
                    <span class="info-value">${order.trackingNumber}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Estimated Delivery</span>
                    <span class="info-value">${estimatedDeliveryDate}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Actual Delivery</span>
                    <span class="info-value">${actualDeliveryDate}</span>
                </div>
        `;
      } else {
        modalContent += `
                <div class="info-item">
                    <span class="info-value">Shipping details not available.</span>
                </div>
        `;
      }

      modalContent += `
            </div>
        </div>
    `;
    }

    // History Panel - Improved timeline UI
    if (order.statusHistory && order.statusHistory.length > 0) {
      modalContent += `
        <div class="detail-panel" id="history-panel">
            <div class="notification info-notification">
                <i class="fas fa-info-circle"></i> Order status history timeline.
            </div>
            
            <div class="status-timeline">
    `;

      // Sort history by timestamp (newest first)
      const sortedHistory = [...order.statusHistory].sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );

      // Render each status change
      sortedHistory.forEach((event, index) => {
        const isActive = index === 0;
        const statusClass = getStatusClass(event.status);
        const formattedDate = formatDate(event.timestamp, true);

        modalContent += `
            <div class="timeline-event ${
              isActive ? "active" : ""
            } ${statusClass}">
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

      modalContent += `
            </div>
        </div>
    `;
    }

    // Update modal content
    orderModalContent.innerHTML = modalContent;

    // Add action buttons based on order status
    orderActionButtons.innerHTML = "";

    // Determine which buttons to show based on status
    if (order.status === "pending" && !order.quote) {
      orderActionButtons.innerHTML = `
        <button class="btn-primary" onclick="editQuote('${order.id}')">
            <i class="fas fa-plus-circle"></i> Create Quote
        </button>
        <button class="btn-danger" onclick="showCancelOrderModal('${order.id}')">
            <i class="fas fa-times-circle"></i> Cancel Order
        </button>
    `;
    } else if (order.quote && order.quote.status === "draft") {
      orderActionButtons.innerHTML = `
        <button class="btn-primary" onclick="editQuote('${order.id}')">
            <i class="fas fa-edit"></i> Edit Draft Quote
        </button>
        <button class="btn-danger" onclick="showCancelOrderModal('${order.id}')">
            <i class="fas fa-times-circle"></i> Cancel Order
        </button>
    `;
    } else if (order.quote && order.quote.status === "pending_revision") {
      orderActionButtons.innerHTML = `
        <button class="btn-warning" onclick="editQuote('${order.id}', true)">
            <i class="fas fa-edit"></i> Revise Quote
        </button>
        <button class="btn-danger" onclick="showCancelOrderModal('${order.id}')">
            <i class="fas fa-times-circle"></i> Cancel Order
        </button>
    `;
    } else if (
      order.status === "quote_accepted" ||
      order.status === "awaiting_payment"
    ) {
      orderActionButtons.innerHTML = `
        <button class="btn-danger" onclick="showCancelOrderModal('${order.id}')">
            <i class="fas fa-times-circle"></i> Cancel Order
        </button>
    `;
    } else if (order.status === "payment_completed") {
      orderActionButtons.innerHTML = `
        <button class="btn-success" onclick="showProcessOrderModal('${order.id}')">
            <i class="fas fa-box"></i> Process Order
        </button>
    `;
    } else if (order.status === "processed") {
      if (order.invoiceUrl) {
        // If invoice is already uploaded, only show ship button
        orderActionButtons.innerHTML = `
            <button class="btn-info" onclick="showShippingModal('${order.id}')">
                <i class="fas fa-shipping-fast"></i> Mark as Shipped
            </button>
        `;
      } else {
        // Otherwise show both invoice upload and ship buttons
        orderActionButtons.innerHTML = `
            <button class="btn-primary" onclick="showInvoiceUploadModal('${
              order.id
            }')">
                <i class="fas fa-file-invoice"></i> Upload Invoice
            </button>
            <button class="btn-info" onclick="showShippingModal('${
              order.id
            }')" class="${!order.invoiceUrl ? "btn-disabled" : ""}" ${
          !order.invoiceUrl ? "disabled" : ""
        }>
                <i class="fas fa-shipping-fast"></i> Mark as Shipped
            </button>
        `;
      }
    } else if (order.status === "shipped" || order.status === "delivered") {
      // Add button for both shipped AND delivered statuses
      orderActionButtons.innerHTML = `
        <button class="btn-success" onclick="showCompleteOrderModal('${
          order.id
        }')">
            <i class="fas fa-check-circle"></i> ${
              order.status === "shipped"
                ? "Mark as Delivered"
                : "Mark as Completed"
            }
        </button>
    `;
    }

    // Add tab functionality
    setupDetailTabs();

    hideLoading();

    // Show the modal
    orderDetailModal.style.display = "block";
  } catch (error) {
    console.error('Error loading order details:', error);
    showNotification('error', 'Error', 'Failed to load order details. Please try again.');
    hideLoading();
  }
}

// Show invoice upload modal
function showInvoiceUploadModal(orderId) {
  const order = orderRequests.find((o) => o.id === orderId);
  if (!order) return;

  currentOrderDetail = { ...order }; // Make a copy to avoid modifying the original

  // Reset the form
  resetFileUpload();
  document.getElementById("invoice-notes").value = "";

  // Set order ID to the upload button's data attribute
  document.getElementById("upload-invoice-btn").setAttribute("data-order-id", orderId);

  // Show the modal
  invoiceUploadModal.style.display = "block";
}

// Upload invoice
async function uploadInvoice() {
  const orderId = document.getElementById("upload-invoice-btn").getAttribute("data-order-id");
  if (!orderId || !selectedInvoiceFile) {
    showNotification("error", "Error", "Please select an invoice file to upload.");
    return;
  }

  const notes = document.getElementById("invoice-notes").value.trim();

  // Create FormData object
  const formData = new FormData();
  formData.append('invoice', selectedInvoiceFile);
  formData.append('notes', notes);

  // Show loading spinner
  showLoading();
  invoiceUploadModal.style.display = "none";

  try {
    const response = await fetch(`/seller/orders/${orderId}/invoice`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Error uploading invoice: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Find and update the order in local data
    const orderIndex = orderRequests.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
      orderRequests[orderIndex] = result.order;
    }

    // Get the current active tab
    const activeTab = document.querySelector(".tab-btn.active");
    const tabCategory = activeTab ? activeTab.getAttribute("data-tab") : "all";

    // Update UI
    hideLoading();
    renderPipeline(orderRequests);
    filterOrdersByTab(tabCategory);

    // Show success notification
    showNotification("success", "Invoice Uploaded", "Invoice has been uploaded successfully.");

    // Reset file data
    selectedInvoiceFile = null;

    // Close order detail modal if open
    orderDetailModal.style.display = "none";
  } catch (error) {
    console.error('Error uploading invoice:', error);
    showNotification('error', 'Error', 'Failed to upload invoice. Please try again.');
    hideLoading();
  }
}

// Show cancel order modal
function showCancelOrderModal(orderId) {
  const order = orderRequests.find((o) => o.id === orderId);
  if (!order) return;

  // Check if order can be cancelled by seller
  const cancellableStatuses = [
    "pending",
    "quoted",
    "quote_revised",
    "quote_accepted",
    "awaiting_payment",
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

// Cancel order
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
    const response = await fetch(`/seller/orders/${orderId}/cancel`, {
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

    // Get the current active tab
    const activeTab = document.querySelector(".tab-btn.active");
    const tabCategory = activeTab ? activeTab.getAttribute("data-tab") : "all";

    // Update UI
    renderPipeline(orderRequests);
    filterOrdersByTab(tabCategory);

    // Show success notification
    showNotification(
      "success",
      "Order Cancelled",
      "The order has been cancelled successfully."
    );

    // Close order detail modal if open
    orderDetailModal.style.display = "none";
    hideLoading();
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

// Render revision history for a quote
// Render revision history for a quote
function renderRevisionHistory(quote) {
  if (!quote.revisionHistory || quote.revisionHistory.length === 0) {
    return "";
  }

  let html = `
    <h3 class="section-heading"><i class="fas fa-history"></i> Revision History</h3>
    <div class="status-timeline">
  `;

  // Sort history by timestamp (newest first)
  const sortedHistory = [...quote.revisionHistory].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  // Render each revision
  sortedHistory.forEach((revision, index) => {
    const formattedDate = formatDate(revision.timestamp, true);
    
    // Safely handle discount percentage and calculate discount amount
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
            Discount: ${discountPercentage.toFixed(2)}% 
            (₹${discountAmount.toLocaleString("en-IN")}),
            Delivery: ₹${parseFloat(revision.deliveryCharges).toLocaleString("en-IN")},
            Handling: ₹${parseFloat(revision.handlingCharges || 0).toLocaleString("en-IN")}
          </div>
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

// Show process order modal
function showProcessOrderModal(orderId) {
  const order = orderRequests.find((o) => o.id === orderId);
  if (!order || order.status !== "payment_completed") return;

  currentOrderDetail = { ...order }; // Make a copy to avoid modifying the original

  // Reset form
  document.getElementById("processing-notes").value = "";

  // Show modal
  processOrderModal.style.display = "block";
}

// Process order
async function processOrder() {
  if (!currentOrderDetail) return;

  // Get processing notes
  const notes = document.getElementById("processing-notes").value.trim();

  // Show loading
  showLoading();
  processOrderModal.style.display = "none";

  try {
    const response = await fetch(`/seller/orders/${currentOrderDetail.id}/process`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notes }),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Error processing order: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Find and update the order in local data
    const orderIndex = orderRequests.findIndex(o => o.id === currentOrderDetail.id);
    if (orderIndex !== -1) {
      orderRequests[orderIndex] = result.order;
    }

    // Get the current active tab
    const activeTab = document.querySelector(".tab-btn.active");
    const tabCategory = activeTab ? activeTab.getAttribute("data-tab") : "all";

    // Update UI
    renderPipeline(orderRequests);
    filterOrdersByTab(tabCategory);

    // Show notification
    showNotification(
      "success",
      "Order Processed",
      `Order ${currentOrderDetail.id} has been marked as processed and is ready for shipping.`
    );

    // Close order details modal if open
    orderDetailModal.style.display = "none";
    hideLoading();
  } catch (error) {
    console.error('Error processing order:', error);
    showNotification('error', 'Error', 'Failed to process order. Please try again.');
    hideLoading();
  }
}

// Show shipping modal
function showShippingModal(orderId) {
  const order = orderRequests.find((o) => o.id === orderId);
  if (!order || order.status !== "processed") return;

  currentOrderDetail = { ...order }; // Make a copy to avoid modifying the original

  // Check if invoice has been uploaded - mandatory before shipping
  if (!order.invoiceUrl) {
    // Show reminder and disable shipping button
    const shippingInvoiceReminder = document.getElementById("shipping-invoice-reminder");
    if (shippingInvoiceReminder) {
      shippingInvoiceReminder.style.display = "flex";
    }

    const confirmShippingBtn = document.getElementById("confirm-shipping-btn");
    if (confirmShippingBtn) {
      confirmShippingBtn.disabled = true;
      confirmShippingBtn.classList.add("btn-disabled");
    }
  } else {
    // Hide reminder and enable shipping button
    const shippingInvoiceReminder = document.getElementById("shipping-invoice-reminder");
    if (shippingInvoiceReminder) {
      shippingInvoiceReminder.style.display = "none";
    }

    const confirmShippingBtn = document.getElementById("confirm-shipping-btn");
    if (confirmShippingBtn) {
      confirmShippingBtn.disabled = false;
      confirmShippingBtn.classList.remove("btn-disabled");
    }
  }

  // Reset form
  document.getElementById("shipping-carrier").value = "";
  document.getElementById("other-carrier").value = "";
  document.getElementById("tracking-number").value = "";
  document.getElementById("shipping-notes").value = "";
  document.getElementById("other-carrier-group").style.display = "none";

  // Set default estimated delivery date (7 days from now)
  const estimatedDelivery = new Date();
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 7);
  document.getElementById("estimated-delivery").value = estimatedDelivery.toISOString().split("T")[0];

  // Show modal
  shippingModal.style.display = "block";
}

// Ship order
async function shipOrder() {
  if (!currentOrderDetail) return;

  // Get form values
  const carrierSelect = document.getElementById("shipping-carrier");
  const otherCarrierInput = document.getElementById("other-carrier");
  const trackingNumberInput = document.getElementById("tracking-number");
  const estimatedDeliveryInput = document.getElementById("estimated-delivery");
  const shippingNotesInput = document.getElementById("shipping-notes");

  // Ship order (continued)
  const carrier = carrierSelect.value;
  const trackingNumber = trackingNumberInput.value.trim();
  const estimatedDelivery = estimatedDeliveryInput.value.trim();
  const notes = shippingNotesInput.value.trim();

  // Validate inputs
  if (!carrier) {
    showNotification("error", "Error", "Please select a shipping carrier.");
    return;
  }

  if (carrier === "other" && !otherCarrierInput.value.trim()) {
    showNotification("error", "Error", "Please enter the carrier name.");
    return;
  }

  if (!trackingNumber) {
    showNotification("error", "Error", "Please enter a tracking number.");
    return;
  }

  // Check if invoice has been uploaded - mandatory before shipping
  if (!currentOrderDetail.invoiceUrl) {
    showNotification(
      "error",
      "Invoice Required",
      "You must upload an invoice before shipping this order."
    );
    return;
  }

  // Show loading
  showLoading();
  shippingModal.style.display = "none";

  try {
    const requestData = {
      carrier,
      trackingNumber,
      estimatedDeliveryDate: estimatedDelivery,
      notes,
    };

    // Add other carrier if selected
    if (carrier === "other") {
      requestData.otherCarrier = otherCarrierInput.value.trim();
    }

    const response = await fetch(
      `/seller/orders/${currentOrderDetail.id}/ship`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error(`Error shipping order: ${response.statusText}`);
    }

    const result = await response.json();

    // Find and update the order in local data
    const orderIndex = orderRequests.findIndex(
      (o) => o.id === currentOrderDetail.id
    );
    if (orderIndex !== -1) {
      orderRequests[orderIndex] = result.order;
    }

    // Get the current active tab
    const activeTab = document.querySelector(".tab-btn.active");
    const tabCategory = activeTab ? activeTab.getAttribute("data-tab") : "all";

    // Update UI
    renderPipeline(orderRequests);
    filterOrdersByTab(tabCategory);

    // Show notification
    showNotification(
      "success",
      "Order Shipped",
      `Order ${currentOrderDetail.id} has been marked as shipped.`
    );

    // Close order details modal if open
    orderDetailModal.style.display = "none";
    hideLoading();
  } catch (error) {
    console.error("Error shipping order:", error);
    showNotification(
      "error",
      "Error",
      "Failed to ship order. Please try again."
    );
    hideLoading();
  }
}

// Show complete order modal
function showCompleteOrderModal(orderId) {
  const order = orderRequests.find((o) => o.id === orderId);
  // Accept both shipped and delivered statuses
  if (!order || (order.status !== "shipped" && order.status !== "delivered")) return;

  currentOrderDetail = { ...order }; // Make a copy to avoid modifying the original

  // Reset form
  document.getElementById("completion-notes").value = "";

  // Set default actual delivery date (today)
  document.getElementById("actual-delivery").value = new Date()
    .toISOString()
    .split("T")[0];

  // Show modal
  completeOrderModal.style.display = "block";
}

// Complete order
async function completeOrder() {
  if (!currentOrderDetail) return;

  // Get completion notes
  const notes = document.getElementById("completion-notes").value.trim();
  const actualDelivery = document.getElementById("actual-delivery").value;

  // Show loading
  showLoading();
  completeOrderModal.style.display = "none";

  try {
    const response = await fetch(
      `/seller/orders/${currentOrderDetail.id}/complete`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          actualDeliveryDate: actualDelivery,
          notes,
        }),
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error(`Error completing order: ${response.statusText}`);
    }

    const result = await response.json();

    // Find and update the order in local data
    const orderIndex = orderRequests.findIndex(
      (o) => o.id === currentOrderDetail.id
    );
    if (orderIndex !== -1) {
      orderRequests[orderIndex] = result.order;
    }

    // Get the current active tab before making any changes
    const activeTab = document.querySelector(".tab-btn.active");
    const tabCategory = activeTab ? activeTab.getAttribute("data-tab") : "all";

    // Update UI
    renderPipeline(orderRequests);
    filterOrdersByTab(tabCategory);

    // Show notification
    showNotification(
      "success",
      "Order Completed",
      `Order ${currentOrderDetail.id} has been marked as completed.`
    );

    // Close order details modal if open
    orderDetailModal.style.display = "none";
    
    // IMPORTANT: Make sure to hide loading here
    hideLoading();
  } catch (error) {
    console.error("Error completing order:", error);
    showNotification(
      "error",
      "Error",
      "Failed to complete order. Please try again."
    );
    
    // IMPORTANT: Make sure to hide loading on error too
    hideLoading();
  }
}

// Search orders Without API
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

      // Search by buyer name
      if (
        order.buyerName &&
        order.buyerName.toLowerCase().includes(searchTerm)
      ) {
        return true;
      }

      // Search by buyer email
      if (
        order.buyerEmail &&
        order.buyerEmail.toLowerCase().includes(searchTerm)
      ) {
        return true;
      }

      // Search in quote data if available
      if (order.quote) {
        if (order.quote.id.toLowerCase().includes(searchTerm)) {
          return true;
        }

        if (
          order.quote.books &&
          order.quote.books.some(
            (book) =>
              book.title.toLowerCase().includes(searchTerm) ||
              book.code.toLowerCase().includes(searchTerm)
          )
        ) {
          return true;
        }
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

// Search, Filter, and Tab Functions with API
// async function searchOrders() {
//   const searchTerm = searchInput.value.toLowerCase().trim();

//   showLoading();

//   try {
//     const response = await fetch(
//       `/api/seller/orders/search?term=${encodeURIComponent(searchTerm)}`,
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

//     // Show notification
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

// Apply filters without API
function applyFilters() {
  const orderStatusValue = orderStatusFilter.value;
  const quoteStatusValue = quoteStatusFilter.value;
  const dateFrom = dateFromInput.value ? new Date(dateFromInput.value) : null;
  const dateTo = dateToInput.value ? new Date(dateToInput.value) : null;

  showLoading();

  // Simulate API delay
  setTimeout(() => {
    let filteredOrders = [...orderRequests];

    // Filter by order status
    if (orderStatusValue) {
      filteredOrders = filteredOrders.filter(
        (order) => order.status === orderStatusValue
      );
    }

    // Filter by quote status
    if (quoteStatusValue) {
      filteredOrders = filteredOrders.filter(
        (order) => order.quote && order.quote.status === quoteStatusValue
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
    if (orderStatusValue || quoteStatusValue || dateFrom || dateTo) {
      if (orderStatusValue)
        filterMsg += ` with status "${formatStatusLabel(orderStatusValue)}"`;
      if (quoteStatusValue)
        filterMsg += ` and quote status "${formatStatusLabel(
          quoteStatusValue
        )}"`;
    }
    showNotification("info", "Filters Applied", filterMsg);
  }, 500);
}

//apply filter with API
// async function applyFilters() {
//   const orderStatusValue = orderStatusFilter.value;
//   const quoteStatusValue = quoteStatusFilter.value;
//   const dateFrom = dateFromInput.value;
//   const dateTo = dateToInput.value;

//   showLoading();

//   try {
//     let url = "/api/seller/orders/filter?";

//     if (orderStatusValue)
//       url += `status=${encodeURIComponent(orderStatusValue)}&`;
//     if (quoteStatusValue)
//       url += `quoteStatus=${encodeURIComponent(quoteStatusValue)}&`;
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
//     if (orderStatusValue || quoteStatusValue || dateFrom || dateTo) {
//       if (orderStatusValue)
//         filterMsg += ` with status "${formatStatusLabel(orderStatusValue)}"`;
//       if (quoteStatusValue)
//         filterMsg += ` and quote status "${formatStatusLabel(
//           quoteStatusValue
//         )}"`;
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

// Clear filters
function clearFilters() {
  orderStatusFilter.value = "";
  quoteStatusFilter.value = "";
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
          (order) => order.status === "pending" && !order.quote
        );
        break;
      case "draft":
        filteredOrders = orderRequests.filter(
          (order) => order.quote && order.quote.status === "draft"
        );
        break;
      case "quoted":
        filteredOrders = orderRequests.filter(
          (order) =>
            (order.status === "quoted" || order.status === "quote_revised") &&
            order.quote &&
            (order.quote.status === "sent" ||
              order.quote.status === "revised" ||
              order.quote.status === "viewed" ||
              order.quote.status === "pending_revision")
        );
        break;
      case "accepted":
        filteredOrders = orderRequests.filter(
          (order) =>
            order.quote &&
            order.quote.status === "accepted" &&
            (order.status === "quote_accepted" ||
              order.status === "awaiting_payment")
        );
        break;
      case "payment_completed":
        filteredOrders = orderRequests.filter(
          (order) => order.status === "payment_completed"
        );
        break;
      case "processing":
        filteredOrders = orderRequests.filter(
          (order) =>
            order.status === "processed" ||
            order.status === "shipped" ||
            order.status === "delivered"
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

//Filterorderbytab with API
// async function filterOrdersByTab(category) {
//   showLoading();

//   try {
//     const response = await fetch(`/api/seller/orders/category/${category}`, {
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

// Helper function to capitalize the first letter of each word
function formatStatusLabel(status) {
  if (!status) return "";

  return status
    .split("_")
    .map((word) => {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
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

// Generate a unique ID
function generateId(prefix) {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

// Fetch order data (simulated here)
async function fetchOrderData() {
  try {
    showLoading();
    const response = await fetch("/seller/orders", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // This ensures cookies are sent with the request
    });

    if (!response.ok) {
      throw new Error(`Error fetching orders: ${response.statusText}`);
    }

    const data = await response.json();
    orderRequests = data.orders;

    hideLoading();
    renderPipeline(orderRequests);
    renderOrders(orderRequests);
  } catch (error) {
    console.error("Error fetching orders:", error);
    showNotification(
      "error",
      "Error",
      "Failed to load orders. Please try again."
    );
    hideLoading();
  }
}

// Replace the fetchBookCatalog function
async function fetchBookCatalog() {
  try {
    const response = await fetch('/seller/books', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Error fetching book catalog: ${response.statusText}`);
    }

    const data = await response.json();
    bookCatalog = data.books;
  } catch (error) {
    console.error('Error fetching book catalog:', error);
    showNotification('error', 'Error', 'Failed to load book catalog. Some features may be limited.');
  }
}

// Make the functions globally available
window.viewOrderDetails = viewOrderDetails;
window.editQuote = editQuote;
window.makeEditable = makeEditable;
window.addBookToQuote = addBookToQuote;
window.removeBook = removeBook;
window.updateGrandTotal = updateGrandTotal;
window.updateQuoteSubtotal = updateQuoteSubtotal;
window.showProcessOrderModal = showProcessOrderModal;
window.showShippingModal = showShippingModal;
window.showCompleteOrderModal = showCompleteOrderModal;
window.showInvoiceUploadModal = showInvoiceUploadModal;
window.showCancelOrderModal = showCancelOrderModal;
window.searchOrders = searchOrders;
window.applyFilters = applyFilters;
window.clearFilters = clearFilters;
window.filterOrdersByTab = filterOrdersByTab;
window.refreshData = refreshData;
