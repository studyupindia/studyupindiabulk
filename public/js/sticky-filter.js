// Add this to a new file: stick-filter.js
// Or integrate it into your existing script.js file

document.addEventListener("DOMContentLoaded", function () {
  // DOM elements
//   const filtersWrapper = document.querySelector(".filters-container-wrapper");
//   const filtersContainer = document.querySelector(".filters-container");
//   const accordion = document.querySelector(".accordion");
  const booksSection = document.querySelector(".books-section");
  let floatBtn = document.getElementById("filter-float-btn");

  // Create float button if it doesn't exist
  if (!floatBtn) {
    floatBtn = document.createElement("div");
    floatBtn.id = "filter-float-btn";
    floatBtn.className = "filter-float-btn";
    floatBtn.innerHTML = '<i class="fas fa-filter"></i>';
    document.body.appendChild(floatBtn);
  }

  // Scroll event listener for sticky behavior
  window.addEventListener("scroll", handleScroll);

  // Click event for float button
  floatBtn.addEventListener("click", scrollToFilters);

  /**
   * Handle scroll events for sticky behavior
   */
  function handleScroll() {
    const scrollPosition = window.scrollY;
    const isMobile = window.innerWidth <= 768;

    // For desktop: Handle filter container stickiness
    // if (filtersWrapper && !isMobile) {
    //   if (scrollPosition > 100) {
    //     filtersWrapper.classList.add("sticky");
    //     filtersContainer.classList.add("compact");
    //   } else {
    //     filtersWrapper.classList.remove("sticky");
    //     filtersContainer.classList.remove("compact");
    //   }
    // }

    // For mobile: Handle accordion stickiness
    // if (accordion && isMobile) {
    //   if (scrollPosition > 100) {
    //     accordion.classList.add("sticky");
    //   } else {
    //     accordion.classList.remove("sticky");
    //   }
    // }

    // Show/hide float button based on scroll distance
    const booksRect = booksSection?.getBoundingClientRect();
    const isDeepScroll = scrollPosition > 500;
    const isPassedFilters = booksRect && booksRect.top < -200;

    if (isDeepScroll || isPassedFilters) {
      floatBtn.classList.add("visible");
    } else {
      floatBtn.classList.remove("visible");
    }
  }

  /**
   * Scroll to filters section when float button is clicked
   */
  function scrollToFilters() {
    const isMobile = window.innerWidth <= 768;
    const targetElement = isMobile ? accordion : filtersWrapper;

    if (!targetElement) return;

    // Calculate the scroll position
    const targetPosition = targetElement.offsetTop - 100;

    // Scroll smoothly to filters
    window.scrollTo({
      top: targetPosition,
      behavior: "smooth",
    });

    // For mobile, open the accordion if it's closed
    // if (isMobile) {
    //   const accordionContent = accordion.querySelector(".accordion-content");
    //   const accordionArrow = accordion.querySelector(".accordion-arrow");

    //   if (accordionContent && !accordionContent.classList.contains("open")) {
    //     accordionContent.classList.add("open");
    //     accordionArrow.classList.add("open");
    //   }
    // }
  }

  // Additional optimization for better user experience
  // Debounce function to prevent excessive calculations during scroll
  function debounce(func, wait = 20) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // Replace the scroll event with debounced version
  window.removeEventListener("scroll", handleScroll);
  window.addEventListener("scroll", debounce(handleScroll, 10));
});
