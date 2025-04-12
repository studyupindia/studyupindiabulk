// Constants
const CART_KEY = document.body.getAttribute("data-cart-key") || "DEFAULT_CART";
const CART_PUBLICATION = document.body.getAttribute("data-cart-publication");
const MIN_CART_TOTAL = 10000; // Minimum cart total in INR

/**
 * Safely format a price value with Indian number formatting
 */
function formatPrice(price) {
  // Handle different types of input
  if (typeof price !== "number") {
    // Try to convert to number
    price = Number(price);
  }

  // If it's still not a valid number, return the original with fallback
  if (isNaN(price)) {
    return price || 0;
  }

  // Format with 2 decimal places using Indian number format
  return price.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Debounce function to improve performance
function debounce(func, wait = 300) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// DOM Elements
const productList = document.getElementById("product-list");
const productGrid = document.getElementById("product-grid");
const cartItems = document.getElementById("cart-items");
const cartTotal = document.getElementById("cart-total");
const expandedTotal = document.getElementById("expanded-total");
const itemsCount = document.getElementById("items-count");
const cartCount = document.getElementById("cart-count");
const checkoutButton = document.getElementById("checkout-button");
const tableViewBtn = document.getElementById("table-view-btn");
const gridViewBtn = document.getElementById("grid-view-btn");
const tableView = document.getElementById("table-view");
const gridView = document.getElementById("grid-view");
const resultsCount = document.getElementById("results-count");
const howToOrderBtn = document.getElementById("how-to-order-btn");
const howToOrderPopover = document.getElementById("how-to-order-popover");

// State
let products = [];
let cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
let currentView = "table";
let gridViewData = null; // For lazy loading grid view

/**
 * Setup the "How to Order" functionality
 */
function setupHowToOrder() {
  if (!howToOrderBtn || !howToOrderPopover) return;

  // Toggle popover when the button is clicked
  howToOrderBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    howToOrderPopover.classList.toggle("active");
  });

  // Close popover when the close button is clicked
  const closePopover = howToOrderPopover.querySelector(".close-popover");
  if (closePopover) {
    closePopover.addEventListener("click", () => {
      howToOrderPopover.classList.remove("active");
    });
  }

  // Close popover when clicking outside of it
  document.addEventListener("click", (e) => {
    if (
      howToOrderPopover.classList.contains("active") &&
      !howToOrderPopover.contains(e.target) &&
      e.target !== howToOrderBtn
    ) {
      howToOrderPopover.classList.remove("active");
    }
  });

  // Close popover when pressing Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && howToOrderPopover.classList.contains("active")) {
      howToOrderPopover.classList.remove("active");
    }
  });
}

/**
 * Fetch books from the server
 */
async function fetchProducts() {
  try {
    showLoading(true);

    const response = await fetch(
      `/get-books?publication=${encodeURIComponent(CART_PUBLICATION)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    products = data.books || [];

    if (!products.length) {
      showMessage("No books found for this publication.", "warning");
      return;
    }

    populateProductViews(products);
    updateResultsCount(products.length);
    addFilterListeners();
  } catch (error) {
    console.error("Error fetching books:", error);
    showMessage(`Failed to load books: ${error.message}`, "error");
  } finally {
    showLoading(false);
  }
}

/**
 * Show or hide loading indicator
 */
function showLoading(isLoading) {
  let loader = document.querySelector(".loader");

  if (isLoading) {
    if (!loader) {
      loader = document.createElement("div");
      loader.className = "loader";
      loader.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
      document.querySelector(".books-section .container").prepend(loader);
    }
  } else if (loader) {
    loader.remove();
  }
}

/**
 * Show a message to the user
 */
function showMessage(message, type = "info") {
  // Create message element if it doesn't exist
  let msgElement = document.querySelector(".message-container");
  if (!msgElement) {
    msgElement = document.createElement("div");
    msgElement.className = "message-container";
    document.querySelector(".books-section .container").prepend(msgElement);
  }

  // Create message
  const msgItem = document.createElement("div");
  msgItem.className = `message ${type}`;
  msgItem.innerHTML = `
    <p>${message}</p>
    <button class="close-message" aria-label="Close message">×</button>
  `;

  msgElement.appendChild(msgItem);

  // Add event listener to close button
  msgItem.querySelector(".close-message").addEventListener("click", () => {
    msgItem.remove();
  });

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (msgItem.parentNode) {
      msgItem.remove();
    }
  }, 5000);
}

/**
 * Populate both table and grid views with products
 */
function populateProductViews(filteredProducts) {
  populateTableView(filteredProducts);

  // Only populate grid if it's visible, otherwise store for lazy loading
  if (currentView === "grid") {
    populateGridView(filteredProducts);
  } else {
    gridViewData = filteredProducts;
  }

  updateAddToCartButtons();
}

/**
 * Populate the table view with products
 */
function populateTableView(filteredProducts) {
  showLoading(true);

  // Use setTimeout to prevent UI blocking
  setTimeout(() => {
    productList.innerHTML = "";

    if (filteredProducts.length === 0) {
      const emptyRow = document.createElement("tr");
      emptyRow.innerHTML = `<td colspan="6" class="text-center">No books found matching your criteria</td>`;
      productList.appendChild(emptyRow);
      showLoading(false);
      return;
    }

    // Use document fragment for better performance
    const fragment = document.createDocumentFragment();

    filteredProducts.forEach((product) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${product.code}</td>
        <td>${product.title}</td>
        <td>${product.class}</td>
        <td>${product.subject}</td>
        <td>₹${formatPrice(product.price)}</td>
        <td>
          <button class="add-to-cart" data-id="${product.code}" data-price="${
        product.price
      }" 
            data-title="${product.title.replace(/"/g, "&quot;")}" data-class="${
        product.class
      }" data-subject="${product.subject}" aria-label="Add to cart">
            <i class="fas fa-cart-plus"></i>
          </button>
        </td>
      `;
      fragment.appendChild(row);
    });

    productList.appendChild(fragment);
    updateAddToCartButtons();
    showLoading(false);
  }, 10);
}

/**
 * Populate the grid view with products
 */
function populateGridView(filteredProducts) {
  if (!productGrid || currentView !== "grid") return;

  showLoading(true);

  // Use setTimeout to prevent UI blocking
  setTimeout(() => {
    productGrid.innerHTML = "";

    if (filteredProducts.length === 0) {
      const emptyMessage = document.createElement("div");
      emptyMessage.className = "empty-message";
      emptyMessage.textContent = "No books found matching your criteria";
      productGrid.appendChild(emptyMessage);
      showLoading(false);
      return;
    }

    // Use document fragment for better performance
    const fragment = document.createDocumentFragment();

    filteredProducts.forEach((product) => {
      const card = document.createElement("div");
      card.className = "book-card";
      card.innerHTML = `
        <span class="book-code">${product.code}</span>
        <h3 class="book-title">${product.title}</h3>
        <div class="book-details">
          <span class="book-detail"><i class="fas fa-graduation-cap"></i> Class ${
            product.class
          }</span>
          <span class="book-detail"><i class="fas fa-book"></i> ${
            product.subject
          }</span>
          <span class="book-detail"><i class="fas fa-language"></i> ${capitalizeFirstLetter(
            product.language
          )}</span>
        </div>
        <div class="book-price">₹${formatPrice(product.price)}</div>
        <button class="add-to-cart" data-id="${product.code}" data-price="${
        product.price
      }" 
          data-title="${product.title.replace(/"/g, "&quot;")}" data-class="${
        product.class
      }" data-subject="${product.subject}" aria-label="Add to cart">
          <i class="fas fa-cart-plus"></i> Add to Cart
        </button>
      `;
      fragment.appendChild(card);
    });

    productGrid.appendChild(fragment);
    updateAddToCartButtons();
    showLoading(false);
  }, 10);
}

/**
 * Capitalize the first letter of a string
 */
function capitalizeFirstLetter(string) {
  if (!string) return "";
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Update the results count display
 */
function updateResultsCount(count) {
  if (resultsCount) {
    resultsCount.textContent = `Showing ${count} of ${products.length} books`;
  }
}

/**
 * Add filter event listeners
 */
function addFilterListeners() {
  const typeFilter = document.getElementById("type-filter");
  const languageFilter = document.getElementById("language-filter");
  const classFilter = document.getElementById("class-filter");
  const subjectFilter = document.getElementById("subject-filter");
  const searchBar = document.getElementById("search-bar");
  const resetButton = document.getElementById("reset-filters");

  const filters = [typeFilter, languageFilter, classFilter, subjectFilter];

  function applyFilters() {
    showLoading(true);

    // Defer execution to prevent UI freezing
    setTimeout(() => {
      const type = typeFilter?.value?.toLowerCase() || "";
      const language = languageFilter?.value?.toLowerCase() || "";
      const classValue = classFilter?.value?.toLowerCase() || "";
      const subject = subjectFilter?.value?.toLowerCase() || "";
      const searchQuery = searchBar?.value?.toLowerCase() || "";

      const filteredProducts = products.filter((product) => {
        return (
          (!type || product.type.toLowerCase() === type) &&
          (!language || product.language.toLowerCase() === language) &&
          (!classValue ||
            product.class.toString().toLowerCase() === classValue) &&
          (!subject || product.subject?.toLowerCase().includes(subject)) &&
          (!searchQuery ||
            product.title?.toLowerCase().includes(searchQuery) ||
            product.code?.toString().toLowerCase().includes(searchQuery))
        );
      });

      populateProductViews(filteredProducts);
      updateResultsCount(filteredProducts.length);
    }, 10);
  }

  // Debounced version for search input
  const debouncedApplyFilters = debounce(applyFilters, 300);

  // Add event listeners to dropdown filters
  filters.forEach((filter) => {
    if (filter) {
      filter.addEventListener("change", applyFilters);
    }
  });

  // Add event listener to search input with debounce
  if (searchBar) {
    searchBar.addEventListener("input", debouncedApplyFilters);
    searchBar.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        applyFilters();
      }
    });
  }

  // Reset button event listener
  if (resetButton) {
    resetButton.addEventListener("click", () => {
      filters.forEach((filter) => {
        if (filter) filter.value = "";
      });

      if (searchBar) searchBar.value = "";

      populateProductViews(products);
      updateResultsCount(products.length);
    });
  }
}

/**
 * Toggle between table and grid views
 */
function setupViewToggle() {
  if (!tableViewBtn || !gridViewBtn || !tableView || !gridView) return;

  tableViewBtn.addEventListener("click", () => {
    if (currentView !== "table") {
      currentView = "table";
      tableView.classList.remove("hidden");
      gridView.classList.add("hidden");
      tableViewBtn.classList.add("active");
      gridViewBtn.classList.remove("active");
    }
  });

  gridViewBtn.addEventListener("click", () => {
    if (currentView !== "grid") {
      currentView = "grid";

      // Lazy load grid view only when switching to it
      if (gridViewData) {
        populateGridView(gridViewData);
      }

      gridView.classList.remove("hidden");
      tableView.classList.add("hidden");
      gridViewBtn.classList.add("active");
      tableViewBtn.classList.remove("active");
    }
  });
}

/**
 * Add item to cart
 */
function addToCart(product) {
  const existingItem = cart.find((item) => item.code === product.code);

  if (existingItem) {
    existingItem.quantity += 1;
    existingItem.subtotal = existingItem.quantity * existingItem.price;
  } else {
    cart.push({
      ...product,
      quantity: 1,
      subtotal: product.price,
    });
  }

  saveCart();
  updateCartUI();
  showMessage(`Added "${product.title}" to cart`, "success");
}

/**
 * Remove item from cart
 */
function removeFromCart(index) {
  const removedItem = cart[index];
  cart.splice(index, 1);
  saveCart();
  updateCartUI();
  showMessage(`Removed "${removedItem.title}" from cart`, "info");
}

/**
 * Save cart to localStorage
 */
function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

/**
 * Update cart UI elements
 */
function updateCartUI() {
  if (!cartItems) return;

  cartItems.innerHTML = "";

  let itemsTotal = 0;
  let count = 0;

  // Use document fragment for better performance
  const fragment = document.createDocumentFragment();

  cart.forEach((item, index) => {
    const subtotal = item.quantity > 0 ? item.price * item.quantity : 0;
    itemsTotal += subtotal;
    count += item.quantity;

    const row = document.createElement("tr");
    row.classList.toggle("invalid-item", item.quantity <= 0);

    row.innerHTML = `
      <td>${item.code} - ${item.title}</td>
      <td>₹${formatPrice(item.price)}</td>
      <td>
        <input type="number" min="0" value="${
          item.quantity
        }" class="cart-quantity" data-index="${index}" aria-label="Quantity">
      </td>
      <td>₹${formatPrice(subtotal)}</td>
      <td>
        <button class="cart-delete" data-index="${index}" aria-label="Remove from cart">
          <i class="fas fa-trash-alt"></i>
        </button>
      </td>
    `;

    fragment.appendChild(row);
  });

  cartItems.appendChild(fragment);

  // Calculate total
  const total = itemsTotal;

  // Update cart totals and counts
  if (cartTotal) cartTotal.textContent = `Total: ₹${formatPrice(total)}`;
  if (expandedTotal) expandedTotal.textContent = `₹${formatPrice(total)}`;
  if (itemsCount) itemsCount.textContent = count;
  if (cartCount) cartCount.textContent = count;

  // Update items total display if element exists
  const itemsTotalElem = document.getElementById("items-subtotal");
  if (itemsTotalElem) {
    itemsTotalElem.textContent = `₹${formatPrice(itemsTotal)}`;
  }

  // Update checkout button state
  if (checkoutButton) {
    const hasInvalidItems = cart.some((item) => item.quantity <= 0);
    checkoutButton.disabled = total < MIN_CART_TOTAL || hasInvalidItems;
  }

  // Update add/remove button states
  updateAddToCartButtons();
}

/**
 * Update the state of Add/Remove buttons based on cart contents
 */
function updateAddToCartButtons() {
  document.querySelectorAll(".add-to-cart").forEach((button) => {
    const productCode = button.dataset.id;
    const inCart = cart.some((item) => item.code === productCode);

    if (inCart) {
      button.innerHTML = '<i class="fas fa-trash-alt"></i>';
      button.classList.add("remove-from-cart");
      button.setAttribute("aria-label", "Remove from cart");
    } else {
      if (button.closest("#table-view")) {
        button.innerHTML = '<i class="fas fa-cart-plus"></i>';
      } else {
        button.innerHTML = '<i class="fas fa-cart-plus"></i> Add to Cart';
      }
      button.classList.remove("remove-from-cart");
      button.setAttribute("aria-label", "Add to cart");
    }
  });
}

/**
 * Set up cart toggle with improved animation and mobile compatibility
 */
function setupCartToggle() {
  const toggleCartButton = document.getElementById("toggle-cart");
  const cartBody = document.querySelector(".cart-body");
  const cartContainer = document.querySelector(".cart-items-container");
  const cartFooter = document.querySelector(".cart-footer");

  if (!toggleCartButton || !cartBody) return;

  toggleCartButton.addEventListener("click", () => {
    const isHidden = cartBody.classList.contains("hidden");
    const isMobile = window.innerWidth <= 768;

    if (isHidden) {
      // Opening cart
      cartBody.classList.remove("hidden");

      // Force a reflow to enable the transition
      cartBody.offsetHeight;

      // Calculate appropriate height based on content and device
      const footerHeight = cartFooter ? cartFooter.offsetHeight : 150; // Estimate if not available

      // Use different calculation based on device type
      let maxHeight;
      if (isMobile) {
        // On mobile, we need to reserve more space for the footer
        maxHeight = window.innerHeight * 0.9; // 90% of viewport

        // Ensure footer is visible by setting a minimum height
        setTimeout(() => {
          // Apply minimum height to cart body to ensure footer is visible
          const minHeight = footerHeight + 350; // Add some padding
          cartBody.style.minHeight = `${minHeight}px`;
        }, 100);
      } else {
        // On desktop, we can use more space
        const contentHeight = cartContainer.scrollHeight + footerHeight + 300;
        maxHeight = Math.min(contentHeight, window.innerHeight * 0.85);
      }

      // Set max-height for smooth transition
      cartBody.style.maxHeight = `${maxHeight}px`;
      // cartBody.style.maxHeight = `95vh`;
      cartBody.style.opacity = "1";
      cartBody.style.transform = "translateY(0)";

      // Ensure cart is scrolled to appropriate position
      setTimeout(() => {
        if (isMobile) {
          // On mobile, we want to see the top of the cart items first
          cartContainer.scrollTop = 0;

          // Make sure checkout button is visible
          const checkoutButton = document.getElementById("checkout-button");
          if (checkoutButton) {
            checkoutButton.style.display = "block";
            checkoutButton.style.visibility = "visible";
          }
        } else if (cartContainer.scrollHeight > cartContainer.clientHeight) {
          cartContainer.scrollTop = 0;
        }
      }, 100);
    } else {
      // Closing cart
      cartBody.style.maxHeight = "0";
      cartBody.style.opacity = "0";
      cartBody.style.transform = "translateY(30px)";

      // Wait for transition to finish before hiding
      setTimeout(() => {
        cartBody.classList.add("hidden");
        cartBody.style.minHeight = ""; // Reset min-height
      }, 400);
    }
  });
}

/**
 * Set up event listeners for cart actions
 */
function setupCartListeners() {
  if (!cartItems || !checkoutButton) return;

  // Add to cart - Use event delegation
  document.addEventListener("click", (e) => {
    if (e.target.closest(".add-to-cart")) {
      const button = e.target.closest(".add-to-cart");
      const product = {
        code: button.dataset.id,
        title: button.dataset.title,
        price: parseFloat(button.dataset.price),
        class: button.dataset.class,
        subject: button.dataset.subject,
      };

      if (button.classList.contains("remove-from-cart")) {
        const index = cart.findIndex((item) => item.code === product.code);
        removeFromCart(index);
      } else {
        addToCart(product);
      }
    }
  });

  // Update quantity
  cartItems.addEventListener("input", (e) => {
    if (e.target.classList.contains("cart-quantity")) {
      const index = parseInt(e.target.dataset.index, 10);
      const quantity = parseInt(e.target.value, 10) || 0;

      // Update cart item
      cart[index].quantity = quantity;
      cart[index].subtotal = quantity * cart[index].price;

      // Toggle invalid class
      const row = e.target.closest("tr");
      row.classList.toggle("invalid-item", quantity <= 0);

      // Update subtotal cell
      const subtotalCell = row.querySelector("td:nth-child(4)");
      subtotalCell.textContent = `₹${formatPrice(
        quantity * cart[index].price
      )}`;

      saveCart();

      // Calculate new totals
      const itemsTotal = cart.reduce(
        (sum, item) => sum + item.quantity * item.price,
        0
      );
      const total = itemsTotal;
      const count = cart.reduce((sum, item) => sum + item.quantity, 0);

      // Update displayed totals
      if (cartTotal) cartTotal.textContent = `Total: ₹${formatPrice(total)}`;
      if (expandedTotal) expandedTotal.textContent = `₹${formatPrice(total)}`;
      if (itemsCount) itemsCount.textContent = count;
      if (cartCount) cartCount.textContent = count;

      // Update items total display if element exists
      const itemsTotalElem = document.getElementById("items-subtotal");
      if (itemsTotalElem) {
        itemsTotalElem.textContent = `₹${formatPrice(itemsTotal)}`;
      }

      // Update checkout button
      const hasInvalidItems = cart.some((item) => item.quantity <= 0);
      checkoutButton.disabled = total < MIN_CART_TOTAL || hasInvalidItems;
    }
  });

  // Delete from cart
  cartItems.addEventListener("click", (e) => {
    if (e.target.closest(".cart-delete")) {
      const button = e.target.closest(".cart-delete");
      const index = parseInt(button.dataset.index, 10);
      removeFromCart(index);
    }
  });

  // Checkout
  checkoutButton.addEventListener("click", async () => {
    if (validateCart()) {
      try {
        showLoading(true);

        const orderData = {
          publication: CART_PUBLICATION,
          books: cart,
        };

        const response = await fetch("/create-order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(orderData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to process checkout.");
        }

        const responseData = await response.json();

        // Clear cart
        cart = [];
        saveCart();
        updateCartUI();

        // Close cart drawer if it's open
        const cartBody = document.querySelector(".cart-body");
        if (cartBody && !cartBody.classList.contains("hidden")) {
          // Closing cart
          cartBody.style.maxHeight = "0";
          cartBody.style.opacity = "0";
          cartBody.style.transform = "translateY(30px)";

          // Wait for transition to finish before hiding
          setTimeout(() => {
            cartBody.classList.add("hidden");
            cartBody.style.minHeight = ""; // Reset min-height
          }, 400);
        }

        // Use the order confirmation modal from the external script
        if (window.processOrderResponse) {
          window.processOrderResponse(responseData, orderData);
        } else {
          // Fallback if modal script isn't loaded
          showMessage(
            `Order placed successfully! Order ID: ${responseData.id}`,
            "success"
          );
        }
      } catch (error) {
        console.error("Checkout error:", error);
        showMessage(`Checkout failed: ${error.message}`, "error");
      } finally {
        showLoading(false);
      }
    }
  });
}

/**
 * Validate cart before checkout
 */
function validateCart() {
  const invalidItems = cart.filter((item) => item.quantity <= 0);

  if (invalidItems.length > 0) {
    showMessage(
      "Please ensure all items have a quantity greater than 0.",
      "warning"
    );
    return false;
  }

  const itemsTotal = cart.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );

  if (itemsTotal < MIN_CART_TOTAL) {
    showMessage(
      `Your cart total must be at least ₹${MIN_CART_TOTAL.toLocaleString()} to proceed.`,
      "warning"
    );
    return false;
  }

  return true;
}

/**
 * Initialize the page
 */
function init() {
  setupHowToOrder();
  fetchProducts();
  updateCartUI();
  setupViewToggle();
  setupCartToggle();
  setupCartListeners();

  // Ensure subtotal element exists
  const cartFooter = document.querySelector(".cart-summary");
  if (cartFooter && !document.getElementById("items-subtotal")) {
    const subtotalDiv = document.createElement("div");
    subtotalDiv.className = "summary-item";
    subtotalDiv.innerHTML = `
      <span>Subtotal:</span>
      <span id="items-subtotal">₹0.00</span>
    `;
    cartFooter.prepend(subtotalDiv);
  }
}

// Start the application when DOM is ready
document.addEventListener("DOMContentLoaded", init);
