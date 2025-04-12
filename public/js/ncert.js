// Constants
// const CART_KEY = 'NCERT_CART'; // Define cart key as a constant
const CART_KEY = document.body.getAttribute("data-cart-key") || "DEFAULT_CART";
const MIN_CART_TOTAL = 10000; // Define minimum cart total as a constant

let products = []; // Declare products in a broader scope
const cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
const cartItems = document.getElementById("cart-items");
const cartTotal = document.getElementById("cart-total");
const exapndTotal = document.getElementById("exapnd-total");
const checkoutButton = document.getElementById("checkout-button");

async function fetchProducts() {
  try {
    const response = await fetch(" ", {
      method: "POST", // Use GET instead of POST
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}), // No payload needed, but kept for structure
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json(); // Convert response to JSON

    // Extract books and sellerId
    products = data.books;
    const sellerId = data.sellerId;
    localStorage.setItem(`${CART_KEY}_SELLER_ID`, sellerId);

    // Ensure we have products before populating
    if (!products.length) {
      console.warn("No NCERT books found.");
      return;
    }

    // Use the fetched books data to populate the product table
    populateProductTable(products);

    // Call existing functions to handle filters
    addFilterListeners();
    // loadFilterPreferences(); // Load saved filter preferences

    // Optional: Store sellerId if needed for later use
    console.log("Seller ID:", sellerId);
  } catch (error) {
    console.error("Error fetching NCERT books: ", error);
  }
}



// Populate product table
function populateProductTable(filteredProducts) {
  const productList = document.getElementById("product-list");
  productList.innerHTML = "";
  filteredProducts.forEach((product) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${product.code}</td>
      <td>${product.title}</td>
      <td>₹${product.price}</td>
      <td><button class="add-to-cart" data-id="${product.code}" data-price="${product.price}" data-title="${product.title}">Add</button></td>
    `;
    productList.appendChild(row);
  });
  updateAddToCartButtons();
}

// Add filter listeners
function addFilterListeners() {
  const typeFilter = document.getElementById("type-filter");
  const languageFilter = document.getElementById("language-filter");
  const classFilter = document.getElementById("class-filter");
  const subjectFilter = document.getElementById("subject-filter");
  const searchBar = document.getElementById("search-bar");

  function filterProducts() {
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
        (!subject || product.subject?.toLowerCase() === subject) &&
        (!searchQuery ||
          product.title?.toLowerCase().includes(searchQuery) || // ✅ Search in title
          product.code?.toLowerCase().includes(searchQuery)) // ✅ Search in code
      );
    });

    populateProductTable(filteredProducts);
    // saveFilterPreferences({ type, language, classValue, subject, searchQuery });
  }

  [typeFilter, languageFilter, classFilter, subjectFilter, searchBar].forEach(
    (filter) => {
      if (filter) filter.addEventListener("input", filterProducts);
    }
  );
}

function resetFilters() {
  // Get all filter elements
  const typeFilter = document.getElementById("type-filter");
  const languageFilter = document.getElementById("language-filter");
  const classFilter = document.getElementById("class-filter");
  const subjectFilter = document.getElementById("subject-filter");
  const searchBar = document.getElementById("search-bar");

  // Reset their values to default
  if (typeFilter) typeFilter.value = "";
  if (languageFilter) languageFilter.value = "";
  if (classFilter) classFilter.value = "";
  if (subjectFilter) subjectFilter.value = "";
  if (searchBar) searchBar.value = "";

  // Clear the filters and reset the product table
  populateProductTable(products);

  // Optionally, clear saved filter preferences
  // saveFilterPreferences({});
}

// Add event listener to the "Reset Filters" button
const resetButton = document.getElementById("reset-filters");
if (resetButton) {
  resetButton.addEventListener("click", resetFilters);
}

// Save filter preferences
// function saveFilterPreferences(filters) {
//   localStorage.setItem("filterPreferences", JSON.stringify(filters));
// }

// Load filter preferences
// function loadFilterPreferences() {
//   const savedFilters =
//     JSON.parse(localStorage.getItem("filterPreferences")) || {};
//   Object.entries(savedFilters).forEach(([key, value]) => {
//     const element = document.getElementById(`${key}-filter`);
//     if (element) element.value = value;
//   });
//   populateProductTable(products); // Apply the loaded filters
// }

// Update cart UI
function updateCartUI() {
  cartItems.innerHTML = "";
  let total = 0;

  cart.forEach((item, index) => {
    const subtotal = item.quantity > 0 ? item.price * item.quantity : 0;
    total += subtotal;

    const row = document.createElement("tr");
    row.classList.toggle("invalid-item", item.quantity <= 0); // Toggle invalid-item class
    row.innerHTML = `
      <td> ${item.code} - ${item.title}</td>
      <td>₹${item.price}</td>
      <td>
        <input type="number" min="0" value="${item.quantity}" class="cart-quantity" data-index="${index}" />
      </td>
      <td>₹${subtotal}</td>
      <td>
        <button class="delete-from-cart close-svg" data-index="${index}">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 100 100" class="remove-icon">
            <circle cx="50" cy="50" r="50" fill="red"/>
            <line x1="30" y1="30" x2="70" y2="70" stroke="white" stroke-width="10" stroke-linecap="round"/>
            <line x1="70" y1="30" x2="30" y2="70" stroke="white" stroke-width="10" stroke-linecap="round"/>
          </svg>
        </button>
      </td>
    `;
    cartItems.appendChild(row);
  });

  cartTotal.textContent = `Total: ₹${total}`;
  exapndTotal.textContent = `Total: ₹${total}`;
  updateCheckoutButton(total); // Dynamically update checkout button state
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateAddToCartButtons();
}

// Update checkout button dynamically
function updateCheckoutButton(total) {
  const hasInvalidItems = cart.some((item) => item.quantity <= 0);
  checkoutButton.disabled = total < MIN_CART_TOTAL || hasInvalidItems;
}

// Add to cart
// function addToCart(product) {
//   const existingItem = cart.find((item) => item.code === product.code);
//   if (existingItem) {
//     existingItem.quantity += 1;
//   } else {
//     cart.push({ ...product, quantity: 1 });
//   }
//   updateCartUI();
// }

function addToCart(product) {
  const existingItem = cart.find((item) => item.code === product.code);
  if (existingItem) {
    existingItem.quantity += 1;
    existingItem.subtotal = existingItem.quantity * existingItem.price;
  } else {
    cart.push({ ...product, quantity: 1, subtotal: product.price });
  }
  localStorage.setItem(CART_KEY, JSON.stringify(cart)); // Save the updated cart
  updateCartUI();
}

// Remove from cart
function removeFromCart(index) {
  cart.splice(index, 1);
  updateCartUI();
}

// Update Add to Cart button states
function updateAddToCartButtons() {
  document.querySelectorAll(".add-to-cart").forEach((button) => {
    const productCode = button.dataset.id;
    const inCart = cart.some((item) => item.code === productCode);
    button.textContent = inCart ? "Remove" : "Add";
    button.classList.toggle("remove-from-cart", inCart);
  });
}

// Event listeners for cart actions
document.getElementById("product-list").addEventListener("click", (e) => {
  if (e.target.classList.contains("add-to-cart")) {
    const button = e.target;
    const product = {
      code: button.dataset.id,
      title: button.dataset.title,
      price: parseFloat(button.dataset.price),
    };

    if (button.classList.contains("remove-from-cart")) {
      const index = cart.findIndex((item) => item.code === product.code);
      removeFromCart(index);
    } else {
      addToCart(product);
    }
  }
});

cartItems.addEventListener("input", (e) => {
  if (e.target.classList.contains("cart-quantity")) {
    const index = parseInt(e.target.dataset.index, 10);
    const input = e.target;
    const caretPosition = input.selectionStart; // Save caret position
    const quantity = parseInt(input.value, 10) || 0;

    // Update the cart quantity
    cart[index].quantity = quantity;
    cart[index].subtotal = quantity * cart[index].price;

    // Update local storage
    localStorage.setItem(CART_KEY, JSON.stringify(cart));

    // Get the row and update the invalid-item class dynamically
    const row = input.closest("tr");
    if (quantity <= 0) {
      row.classList.add("invalid-item");
    } else {
      row.classList.remove("invalid-item");
    }

    // Update subtotal and total dynamically without full re-render
    const subtotalCell = row.querySelector("td:nth-child(4)");
    const subtotal = quantity * cart[index].price;
    subtotalCell.textContent = `₹${subtotal}`;

    // cartTotal.textContent = `Total: ₹${cart.reduce(
    //   (sum, item) => sum + (item.quantity > 0 ? item.price * item.quantity : 0),
    //   0
    // )}`;
    // exapndTotal.textContent = `Total: ₹${cart.reduce(
    //   (sum, item) => sum + (item.quantity > 0 ? item.price * item.quantity : 0),
    //   0
    // )}`;

    // Update the total and display it
    const total = cart.reduce((sum, item) => sum + item.subtotal, 0);
    cartTotal.textContent = `Total: ₹${total}`;
    exapndTotal.textContent = `Total: ₹${total}`;

    // updateCheckoutButton(
    //   cart.reduce(
    //     (sum, item) =>
    //       sum + (item.quantity > 0 ? item.price * item.quantity : 0),
    //     0
    //   )
    // );

    updateCheckoutButton(total);

    // Refocus and restore caret position
    setTimeout(() => {
      input.focus();
    //   input.setSelectionRange(caretPosition, caretPosition);
    }, 0);
  }
});

cartItems.addEventListener("click", (e) => {
  if (e.target.classList.contains("delete-from-cart")) {
    const index = parseInt(e.target.dataset.index, 10);
    removeFromCart(index);
  }
});

// Validate cart before checkout
function validateCartBeforeCheckout() {
  const invalidItems = cart.filter((item) => item.quantity <= 0);
  if (invalidItems.length > 0) {
    alert("Please ensure all items have a quantity greater than 0.");
    return false;
  }

  const total = cart.reduce((sum, item) => sum + item.quantity * item.price, 0);
  if (total < MIN_CART_TOTAL) {
    alert(`Your cart total must be at least ₹${MIN_CART_TOTAL} to proceed.`);
    return false;
  }

  alert("Checkout successful!");
  return true;
}

// Checkout event listener
checkoutButton.addEventListener("click", () => {
  if (validateCartBeforeCheckout()) {
    localStorage.removeItem(CART_KEY); // Clear the cart after successful checkout
    cart.length = 0;
    updateCartUI();
  }
});

// Get the toggle button and accordion elements
const toggleCartButton = document.getElementById("toggle-cart");
const expandedState = document.querySelector(".expanded-state");
const collapsedState = document.querySelector(".collapsed-state");

// Add event listener for the toggle button
toggleCartButton.addEventListener("click", () => {
  // Check if the accordion is currently expanded
  const isExpanded = expandedState.classList.contains("active");

  if (isExpanded) {
    // Collapse the cart
    expandedState.classList.remove("active");
    collapsedState.classList.remove("hidden");
    toggleCartButton.textContent = "Expand";
    cartTotal.classList.remove("hide");
  } else {
    // Expand the cart
    expandedState.classList.add("active");
    collapsedState.classList.add("hidden");
    toggleCartButton.textContent = "Collapse";
    cartTotal.classList.add("hide");
  }
});

// Initial setup
fetchProducts();
updateCartUI();
