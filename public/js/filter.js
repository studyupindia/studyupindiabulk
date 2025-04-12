/**
 * Enhanced filter.js - Complete solution for filter functionality
 *
 * Features:
 * - Responsive filter positioning between desktop and mobile views
 * - Accordion toggle for mobile filters
 * - Floating filter button that appears when scrolled
 * - Smooth scroll-to-top functionality
 * - Performance optimized with debouncing
 */

document.addEventListener("DOMContentLoaded", function () {
  // Cache DOM elements to improve performance
  const filtersContainer = document.querySelector(".filters-container");
  const filtersWrapper = document.querySelector(".filters-container-wrapper");
  const accordion = document.querySelector(".accordion");
  const accordionContent = document.querySelector(".accordion-content");
  const accordionButton = document.querySelector(".accordion-button");
  const accordionArrow = document.querySelector(".accordion-arrow");
  const booksSection = document.querySelector(".books-section");

  // Create or get float button for quick filter access
  let floatBtn = document.getElementById("filter-float-btn");
  if (!floatBtn) {
    floatBtn = document.createElement("div");
    floatBtn.id = "filter-float-btn";
    floatBtn.className = "filter-float-btn";
    floatBtn.setAttribute("aria-label", "Scroll to filters");
    floatBtn.setAttribute("title", "Scroll to filters");
    floatBtn.innerHTML = '<i class="fas fa-filter"></i>';
    document.body.appendChild(floatBtn);
  }

  /**
   * Repositions filters based on screen size
   * - Desktop: Filters appear in the top wrapper
   * - Mobile: Filters move inside the accordion
   */
  function handleResponsiveFilters() {
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      // Mobile view: Move filters to accordion if needed
      if (
        filtersContainer &&
        accordionContent &&
        !accordionContent.contains(filtersContainer)
      ) {
        accordionContent.appendChild(filtersContainer);
      }
    } else {
      // Desktop view: Move filters back to wrapper if needed
      if (
        filtersContainer &&
        filtersWrapper &&
        !filtersWrapper.contains(filtersContainer)
      ) {
        filtersWrapper.appendChild(filtersContainer);
      }
    }
  }

  /**
   * Toggles the mobile accordion open/closed
   * Controls animation of content and arrow rotation
   */
  function toggleAccordion() {
    if (!accordionContent || !accordionArrow) return;

    // Toggle active class to control max-height
    accordionContent.classList.toggle("active");

    // Rotate arrow icon based on state
    if (accordionContent.classList.contains("active")) {
      accordionArrow.style.transform = "rotate(180deg)";
    } else {
      accordionArrow.style.transform = "rotate(0deg)";
    }
  }

  /**
   * Manages float button visibility based on scroll position
   * Shows button when user has scrolled past the filters
   */
  function handleScroll() {
    const scrollPosition = window.scrollY;

    // Calculate when to show the float button
    const booksRect = booksSection?.getBoundingClientRect();
    const isDeepScroll = scrollPosition > 300; // Threshold for showing button
    const isPassedFilters = booksRect && booksRect.top < -150;

    if (isDeepScroll || isPassedFilters) {
      floatBtn.classList.add("visible");
    } else {
      floatBtn.classList.remove("visible");
    }
  }

  /**
   * Scrolls user back to filters when float button is clicked
   * Handles different behavior for mobile vs desktop
   */
  function scrollToFilters() {
    const isMobile = window.innerWidth <= 768;
    const targetElement = isMobile ? accordion : filtersWrapper;

    if (!targetElement) return;

    // Calculate scroll position with offset for better positioning
    const headerOffset = 100;
    const targetPosition =
      targetElement.getBoundingClientRect().top +
      window.pageYOffset -
      headerOffset;

    // Smooth scroll to filters area
    window.scrollTo({
      top: targetPosition,
      behavior: "smooth",
    });

    // For mobile, open the accordion if it's closed
    if (
      isMobile &&
      accordionContent &&
      !accordionContent.classList.contains("active")
    ) {
      toggleAccordion();
    }
  }

  /**
   * Debounce function to improve performance
   * Prevents excessive function calls during scrolling and resizing
   */
  function debounce(func, wait = 20) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // Set up event listeners with performance optimizations
  window.addEventListener("resize", debounce(handleResponsiveFilters, 100));
  window.addEventListener("scroll", debounce(handleScroll, 10));

  if (accordionButton) {
    accordionButton.addEventListener("click", toggleAccordion);
  }

  if (floatBtn) {
    floatBtn.addEventListener("click", scrollToFilters);
  }

  // Initialize on page load
  handleResponsiveFilters();
  handleScroll(); // Check initial scroll position

  // Add class to accordion content if open by default
  if (
    accordionContent &&
    getComputedStyle(accordionContent).maxHeight !== "0px"
  ) {
    accordionContent.classList.add("active");
    if (accordionArrow) {
      accordionArrow.style.transform = "rotate(180deg)";
    }
  }
});
