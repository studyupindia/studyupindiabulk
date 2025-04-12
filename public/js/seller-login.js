/**
 * Seller Login JavaScript
 * This file contains specific functionality for the seller login page.
 */

document.addEventListener("DOMContentLoaded", function () {
  // Get form reference
  const loginForm = document.getElementById("seller-login-form");

  // Initialize functionality
  setupPasswordToggle();

  // Form submission handler
  if (loginForm) {
    loginForm.addEventListener("submit", handleSellerLogin);
  }

  // Add input validation on blur
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  if (emailInput) {
    emailInput.addEventListener("blur", function () {
      validateField(this);
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener("blur", function () {
      validateField(this);
    });
  }
});

/**
 * Set up password toggle visibility
 */
function setupPasswordToggle() {
  const togglePasswordBtn = document.querySelector(".toggle-password");
  if (!togglePasswordBtn) return;

  togglePasswordBtn.addEventListener("click", function () {
    const passwordField = this.previousElementSibling;
    const type = passwordField.getAttribute("type");

    if (type === "password") {
      passwordField.setAttribute("type", "text");
      this.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
      passwordField.setAttribute("type", "password");
      this.innerHTML = '<i class="fas fa-eye"></i>';
    }
  });
}

/**
 * Validate a form field
 * @param {HTMLElement} field - The field to validate
 * @returns {boolean} Whether field is valid
 */
function validateField(field) {
  // Skip fields that aren't required and are empty
  if (!field.hasAttribute("required") && !field.value.trim()) {
    field.classList.remove("error");
    return true;
  }

  // Required field is empty
  if (field.hasAttribute("required") && !field.value.trim()) {
    field.classList.add("error");
    return false;
  }

  // Email validation
  if (
    field.type === "email" &&
    field.value.trim() &&
    !isValidEmail(field.value)
  ) {
    field.classList.add("error");
    return false;
  }

  // Field is valid
  field.classList.remove("error");
  return true;
}

/**
 * Handle seller login form submission
 * @param {Event} event - The form submission event
 */
function handleSellerLogin(event) {
  event.preventDefault();

  // Get form data
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const rememberMe = document.getElementById("remember")?.checked || false;

  // Validate form
  const emailValid = validateField(document.getElementById("email"));
  const passwordValid = validateField(document.getElementById("password"));

  if (!emailValid || !passwordValid) {
    showErrorMessage("Please fill in all required fields correctly.");
    return;
  }

  // Show loading state
  const loginButton = document.getElementById("login-button");
  const buttonText = loginButton.querySelector(".btn-text");
  const buttonLoader = loginButton.querySelector(".btn-loader");

  buttonText.style.display = "none";
  buttonLoader.classList.remove("hidden");
  loginButton.disabled = true;

  // Prepare login data
  const loginData = {
    email,
    password,
    rememberMe,
  };

  // Make API call to backend
  fetch("/seller/signin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(loginData),
    credentials: "include", // Include cookies in the request
  })
    .then((response) => {
      if (!response.ok) {
        // Convert non-2xx HTTP responses into errors
        return response.json().then((data) => {
          throw new Error(data.error || "Login failed");
        });
      }
      return response.json();
    })
    .then((data) => {
      // Store user info in localStorage/sessionStorage based on remember me option
      const storageMethod = rememberMe ? localStorage : sessionStorage;
      // storageMethod.setItem("user_id", data.seller.id);
      // storageMethod.setItem("user_name", data.seller.name);
      // storageMethod.setItem("user_email", data.seller.email);
      // storageMethod.setItem("user_role", "seller");
      // storageMethod.setItem("business_name", data.seller.businessName);
      // storageMethod.setItem("publication", data.seller.publication);

      // Tokens are handled by cookies, so we don't need to store them manually

      // Redirect to dashboard
      window.location.href = "/";
    })
    .catch((error) => {
      // Handle errors
      console.error("Login error:", error);

      // Show error message to user
      showErrorMessage(error.message || "Login failed. Please try again.");

      // Add shake animation to form
      const form = document.getElementById("seller-login-form");
      form.classList.add("shake");

      // Remove animation class after it completes
      setTimeout(() => {
        form.classList.remove("shake");
      }, 500);
    })
    .finally(() => {
      // Reset button state regardless of success or failure
      buttonText.style.display = "block";
      buttonLoader.classList.add("hidden");
      loginButton.disabled = false;
    });
}

/**
 * Show error message
 * @param {string} message - The error message to display
 */
function showErrorMessage(message) {
  const errorElement = document.getElementById("error-message");
  if (!errorElement) return;

  const errorTextElement = errorElement.querySelector("span");
  errorTextElement.textContent = message;

  errorElement.classList.remove("hidden");

  // Auto-hide error after 5 seconds
  setTimeout(() => {
    errorElement.classList.add("hidden");
  }, 5000);
}

/**
 * Check if a string is a valid email
 * @param {string} email - The email to validate
 * @returns {boolean} True if email is valid
 */
function isValidEmail(email) {
  const emailRegex =
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return emailRegex.test(email);
}

/**
 * Demo validation function - FOR DEMO PURPOSES ONLY
 * In a real application, authentication would be handled server-side
 * @param {string} email - The email to check
 * @param {string} password - The password to check
 * @returns {boolean} Whether credentials are valid
 */
function isValidDemo(email, password) {
  // For demo purposes only - this allows any email with password "password123"
  // In a real application, NEVER do this
  return password === "password123";
}
