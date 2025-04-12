/**
 * Seller Registration JavaScript
 * This file contains specific functionality for the seller registration page.
 */

document.addEventListener("DOMContentLoaded", function () {
  // Form reference
  const sellerSignupForm = document.getElementById("seller-signup-form");

  // Initialize functionality
  setupPasswordToggle();
  setupPasswordStrengthMeter();
  setupPublicationTypeHandler();
  setupMultiStepForm();

  // Form submission handler
  if (sellerSignupForm) {
    sellerSignupForm.addEventListener("submit", handleSellerSignup);
  }

  // Success redirect handler
  const goToLoginBtn = document.getElementById("go-to-login");
  if (goToLoginBtn) {
    goToLoginBtn.addEventListener("click", function () {
      window.location.href = "seller-login.html";
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
 * Set up password strength meter
 */
function setupPasswordStrengthMeter() {
  const passwordField = document.getElementById("password");
  if (!passwordField) return;

  const strengthMeter = document.querySelector(".meter-bar");
  const strengthText = document.querySelector(".strength-text span");

  passwordField.addEventListener("input", function () {
    const password = this.value;
    const strength = calculatePasswordStrength(password);

    // Update the strength meter
    strengthMeter.setAttribute("data-strength", strength);

    // Update the strength text
    const strengthLabels = ["Weak", "Fair", "Good", "Strong"];
    strengthText.textContent = strengthLabels[strength - 1] || "Weak";

    // Update meter width based on strength
    strengthMeter.style.width = strength * 25 + "%";

    // Update meter color based on strength
    const colors = ["#dc3545", "#ffc107", "#17a2b8", "#28a745"];
    strengthMeter.style.backgroundColor = colors[strength - 1];
  });
}

/**
 * Calculate password strength on a scale of 1-4
 * @param {string} password - The password to evaluate
 * @returns {number} Strength score (1-4)
 */
function calculatePasswordStrength(password) {
  // Return early for empty or very short passwords
  if (!password || password.length < 4) return 1;

  let score = 0;

  // Length check
  if (password.length >= 8) score += 1;
  if (password.length >= 10) score += 1;

  // Complexity checks
  if (/[A-Z]/.test(password)) score += 1; // Has uppercase
  if (/[a-z]/.test(password)) score += 1; // Has lowercase
  if (/[0-9]/.test(password)) score += 1; // Has number
  if (/[^A-Za-z0-9]/.test(password)) score += 1; // Has special char

  // Map score to 1-4 scale
  if (score <= 2) return 1; // Weak
  if (score <= 4) return 2; // Fair
  if (score <= 6) return 3; // Good
  return 4; // Strong
}

/**
 * Set up publication type change handler
 */
function setupPublicationTypeHandler() {
  const publicationSelect = document.getElementById("publication");
  const otherPublicationDiv = document.getElementById("otherPublication");
  const otherPublicationInput = document.getElementById("otherPublicationName");

  if (!publicationSelect || !otherPublicationDiv || !otherPublicationInput)
    return;

  publicationSelect.addEventListener("change", function () {
    if (this.value === "Other") {
      otherPublicationDiv.classList.remove("hidden");
      otherPublicationInput.setAttribute("required", "required");
    } else {
      otherPublicationDiv.classList.add("hidden");
      otherPublicationInput.removeAttribute("required");
      otherPublicationInput.value = ""; // Clear value when hidden
    }
  });
}

/**
 * Set up multi-step form navigation
 */
function setupMultiStepForm() {
  const form = document.getElementById("seller-signup-form");
  if (!form) return;

  const nextButtons = form.querySelectorAll(".btn-next");
  const prevButtons = form.querySelectorAll(".btn-back");
  const steps = form.querySelectorAll(".form-step");
  const stepIndicators = document.querySelectorAll(".step");

  // Next button handler
  nextButtons.forEach((button) => {
    button.addEventListener("click", function () {
      // Get current step
      const currentStep = this.closest(".form-step");
      const currentStepNum = parseInt(currentStep.dataset.step);

      // Validate current step fields
      if (!validateStep(currentStep)) {
        showValidationErrors(currentStep);
        return; // Don't proceed if validation fails
      }

      // Hide current step
      currentStep.classList.remove("active");

      // Show next step
      const nextStep = form.querySelector(
        `.form-step[data-step="${currentStepNum + 1}"]`
      );
      nextStep.classList.add("active");

      // Update step indicators
      updateStepIndicators(currentStepNum + 1);

      // Scroll to top of form
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  // Previous button handler
  prevButtons.forEach((button) => {
    button.addEventListener("click", function () {
      // Get current step
      const currentStep = this.closest(".form-step");
      const currentStepNum = parseInt(currentStep.dataset.step);

      // Hide current step
      currentStep.classList.remove("active");

      // Show previous step
      const prevStep = form.querySelector(
        `.form-step[data-step="${currentStepNum - 1}"]`
      );
      prevStep.classList.add("active");

      // Update step indicators
      updateStepIndicators(currentStepNum - 1);

      // Scroll to top of form
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  // Input fields validation on change/blur
  form.querySelectorAll("input, select").forEach((field) => {
    field.addEventListener("blur", function () {
      validateField(this);
    });
  });
}

/**
 * Update step indicators
 * @param {number} activeStep - The current active step number
 */
function updateStepIndicators(activeStep) {
  const stepIndicators = document.querySelectorAll(".step");

  stepIndicators.forEach((indicator) => {
    const stepNum = parseInt(indicator.dataset.step);

    // Remove all classes first
    indicator.classList.remove("active", "completed");

    // Add appropriate class
    if (stepNum === activeStep) {
      indicator.classList.add("active");
    } else if (stepNum < activeStep) {
      indicator.classList.add("completed");
    }
  });
}

/**
 * Validate a single form field
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

  // Pattern validation (for tel, etc.)
  if (
    field.pattern &&
    field.value.trim() &&
    !new RegExp(field.pattern).test(field.value)
  ) {
    field.classList.add("error");
    return false;
  }

  // Password length validation
  if (
    field.type === "password" &&
    field.minLength &&
    field.value.trim().length < field.minLength
  ) {
    field.classList.add("error");
    return false;
  }

  // Field is valid
  field.classList.remove("error");
  return true;
}

/**
 * Validate all fields in a step
 * @param {HTMLElement} step - The form step to validate
 * @returns {boolean} Whether all fields in the step are valid
 */
function validateStep(step) {
  const fields = step.querySelectorAll("input, select, textarea");
  let isValid = true;

  fields.forEach((field) => {
    if (!validateField(field)) {
      isValid = false;
    }
  });

  return isValid;
}

/**
 * Show validation error styling and messages
 * @param {HTMLElement} step - The form step with errors
 */
function showValidationErrors(step) {
  // Find first error field and focus it
  const firstErrorField = step.querySelector(".error");
  if (firstErrorField) {
    firstErrorField.focus();
  }

  // Add a small shake animation to the form
  step.style.animation = "none";
  setTimeout(() => {
    step.style.animation = "shake 0.5s";
  }, 10);
}

/**
 * Handle seller signup form submission
 * @param {Event} event - The form submission event
 */
function handleSellerSignup(event) {
  event.preventDefault();

  // Show loading state
  const submitButton = document.querySelector(".btn-submit");
  const originalButtonText = submitButton.textContent;
  submitButton.innerHTML =
    '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
  submitButton.disabled = true;

  // Get form data
  const formData = new FormData(event.target);
  const formDataObj = {};
  formData.forEach((value, key) => {
    formDataObj[key] = value;
  });

  // Check if terms checkbox is checked
  if (!formDataObj.terms) {
    // Display error for terms agreement
    const termsCheckbox = document.getElementById("terms");
    termsCheckbox.closest(".form-group").classList.add("error");

    // Reset button state
    submitButton.innerHTML = originalButtonText;
    submitButton.disabled = false;

    // Show validation error with shake animation
    const step = document.querySelector('.form-step[data-step="3"]');
    step.style.animation = "none";
    setTimeout(() => {
      step.style.animation = "shake 0.5s";
    }, 10);

    return;
  }

  // Add role
  formDataObj.role = "seller";

  // Handle 'Other' publication type
  if (formDataObj.publication === "Other" && formDataObj.otherPublicationName) {
    formDataObj.publication = formDataObj.otherPublicationName;
    delete formDataObj.otherPublicationName;
  }

  // Construct API request data
  const apiData = {
    name: formDataObj.name,
    email: formDataObj.email,
    phone: formDataObj.phone,
    password: formDataObj.password,
    businessName: formDataObj.businessName,
    publication: formDataObj.publication,
    gstin: formDataObj.gstin || null,
    address: formDataObj.address,
    city: formDataObj.city,
    state: formDataObj.state,
    pincode: formDataObj.pincode,
    role: formDataObj.role,
  };

  // Make the actual API call to the backend
  fetch("/seller/signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(apiData),
    credentials: "include", // Include cookies in the request
  })
    .then((response) => {
      if (!response.ok) {
        // Convert non-2xx HTTP responses into errors
        return response.json().then((data) => {
          throw new Error(data.error || "Registration failed");
        });
      }
      return response.json();
    })
    .then((data) => {
      // Show success message
      const successOverlay = document.getElementById("success-overlay");
      if (successOverlay) {
        successOverlay.classList.add("active");
      }

      // Reset form
      event.target.reset();

      // Reset form steps to first step
      const allSteps = document.querySelectorAll(".form-step");
      allSteps.forEach((step) => step.classList.remove("active"));

      const firstStep = document.querySelector('.form-step[data-step="1"]');
      if (firstStep) {
        firstStep.classList.add("active");
      }

      // Reset step indicators
      updateStepIndicators(1);
    })
    .catch((error) => {
      // Handle errors
      console.error("Registration error:", error);

      // Show error message to user
      const errorMessage =
        error.message || "Registration failed. Please try again.";
      // Show error message to user
      showErrorMessage(error.message);
    })
    .finally(() => {
      // Reset button state regardless of success or failure
      submitButton.innerHTML = originalButtonText;
      submitButton.disabled = false;
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

  // Show error with animation
  errorElement.style.animation = "none";
  setTimeout(() => {
    errorElement.style.animation = "shake 0.5s";
  }, 10);

  // Remove error message after 5 seconds
  setTimeout(() => {
    if (errorElement) {
      errorElement.classList.add("hidden");
    }
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

// Add a small shake animation for form validation errors
document.head.insertAdjacentHTML(
  "beforeend",
  `
    <style>
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
    </style>
`
);
