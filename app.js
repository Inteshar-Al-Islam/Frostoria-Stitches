/**
 * Frostoria Stitches - Handmade Crochet Showcase
 * Dynamic Local Image Scanning & Product Parsing System
 */

// 1. Scanned local image files directly from the project directory
const LOCAL_IMAGE_FILES = [
  'Black cat with fish keychain(200).jpg',
  'Cat with fish keychain(200).jpg',
  'Couple penguin(250 each).jpg',
  'Flower coaster(500).jpg',
  'Mini duck(150).jpg',
  'Reversible octopus(200).jpg',
  'Small strawberry hat mashroom (150).jpg',
  'Tulip keychain(150).jpg'
];

// Configuration
const CONFIG = {
  currencySymbol: '৳', // Default currency symbol (can be changed to '$' or 'Tk ' if desired)
  brandName: 'Frostoria Stitches',
  tagline: 'We stitch your memories.',
  phone: '+8801310316869',
  socialLinks: {
    instagram: 'https://instagram.com',
    whatsapp: 'https://wa.me/8801310316869?text='
  }
};

/**
 * Convert string to clean Title Case while respecting common conjunctions & prepositions
 */
function toTitleCase(str) {
  const minorWords = new Set(['with', 'and', 'or', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'a', 'an']);
  return str
    .split(/\s+/)
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && minorWords.has(lower)) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

/**
 * Automatically extracts Product Name and Price directly from image filenames.
 * Handles formats:
 * - "Black cat with fish keychain(200).jpg" -> Name: Black Cat with Fish Keychain, Price: 200
 * - "Couple penguin(250 each).jpg" -> Name: Couple Penguin, Price: 250 each
 * - "Flower Coaster - 350.png" -> Name: Flower Coaster, Price: 350
 * - "strawberry-mushroom-250.jpg" -> Name: Strawberry Mushroom, Price: 250
 */
function parseProductFromFilename(filename, index) {
  // Strip image file extension
  let raw = filename.replace(/\.(jpe?g|png|webp|gif|svg)$/i, '').trim();
  let priceStr = '';
  let rawName = raw;

  // Pattern 1: Parentheses at the end, e.g. "Name (200)" or "Name(500 each)"
  const parenMatch = raw.match(/\(([^)]+)\)$/);
  if (parenMatch) {
    priceStr = parenMatch[1].trim();
    rawName = raw.slice(0, raw.lastIndexOf('(')).trim();
  } else {
    // Pattern 2: Hyphen or dash followed by price, e.g. "Name - 350" or "strawberry-mushroom-250"
    const dashMatch = raw.match(/[-–—]\s*(\d+(?:\s*[a-zA-Z]+)?)$/);
    if (dashMatch) {
      priceStr = dashMatch[1].trim();
      rawName = raw.slice(0, raw.lastIndexOf(dashMatch[0])).trim();
    } else {
      // Pattern 3: Trailing space and number, e.g. "Product Name 150"
      const spaceNumMatch = raw.match(/\s+(\d+(?:\s*[a-zA-Z]+)?)$/);
      if (spaceNumMatch) {
        priceStr = spaceNumMatch[1].trim();
        rawName = raw.slice(0, raw.lastIndexOf(spaceNumMatch[0])).trim();
      }
    }
  }

  // Convert kebab-case or snake_case to natural words
  if (rawName.includes('-') && !rawName.includes(' ')) {
    rawName = rawName.replace(/-/g, ' ');
  }
  if (rawName.includes('_')) {
    rawName = rawName.replace(/_/g, ' ');
  }

  // Polish common typos if appropriate (e.g., 'mashroom' -> 'Mushroom')
  rawName = rawName.replace(/\bmashroom\b/gi, 'mushroom');

  const titleName = toTitleCase(rawName);

  // Extract numeric price value for sorting
  const numericMatch = priceStr.match(/\d+/);
  const numericPrice = numericMatch ? parseInt(numericMatch[0], 10) : 0;

  // Format display price
  const formattedPrice = priceStr
    ? `${CONFIG.currencySymbol}${priceStr}`
    : 'Inquire for Price';

  // Category classification based on keywords
  let category = 'plushie';
  let categoryLabel = 'Plushie & Amigurumi';
  const lowerName = titleName.toLowerCase();

  if (lowerName.includes('keychain')) {
    category = 'keychain';
    categoryLabel = 'Keychain';
  } else if (lowerName.includes('coaster') || lowerName.includes('mat')) {
    category = 'coaster';
    categoryLabel = 'Coaster & Decor';
  }

  return {
    id: `crochet-${index + 1}`,
    filename: filename,
    imageSrc: encodeURI(filename),
    name: titleName,
    rawPrice: priceStr,
    numericPrice: numericPrice,
    price: formattedPrice,
    category: category,
    categoryLabel: categoryLabel,
    details: 'Hand-crocheted with 100% soft premium milk cotton yarn, hypo-allergenic fiberfill, and stitched with love.'
  };
}

// 2. State Management
let products = LOCAL_IMAGE_FILES.map((filename, idx) => parseProductFromFilename(filename, idx));
let currentFilteredProducts = [...products];
let currentLightboxIndex = -1;
let activeCategory = 'all';
let searchQuery = '';
let activeSort = 'featured';

// 3. DOM Elements
const elements = {
  productGrid: document.getElementById('productGrid'),
  itemCount: document.getElementById('itemCount'),
  searchInput: document.getElementById('searchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  filterToggleBtn: document.getElementById('filterToggleBtn'),
  searchFilterContainer: document.getElementById('searchFilterContainer'),
  categoryPills: document.querySelectorAll('.category-btn'),
  sortSelect: document.getElementById('sortSelect'),
  emptyState: document.getElementById('emptyState'),
  
  // Lightbox Modal
  lightbox: document.getElementById('lightboxModal'),
  lightboxBackdrop: document.getElementById('lightboxBackdrop'),
  lightboxClose: document.getElementById('lightboxClose'),
  lightboxImg: document.getElementById('lightboxImg'),
  lightboxTitle: document.getElementById('lightboxTitle'),
  lightboxPrice: document.getElementById('lightboxPrice'),
  lightboxCategory: document.getElementById('lightboxCategory'),
  lightboxDetails: document.getElementById('lightboxDetails'),
  lightboxPrev: document.getElementById('lightboxPrev'),
  lightboxNext: document.getElementById('lightboxNext'),
  lightboxInquireBtn: document.getElementById('lightboxInquireBtn'),
  lightboxCopyBtn: document.getElementById('lightboxCopyBtn'),

  // Toast
  toast: document.getElementById('toast'),
  toastMessage: document.getElementById('toastMessage')
};

// 4. Render Product Showcase Cards
function renderProductGrid() {
  if (!elements.productGrid) return;

  // Filter products by category and search
  currentFilteredProducts = products.filter(product => {
    const matchesCategory = activeCategory === 'all' || product.category === activeCategory;
    const matchesSearch = !searchQuery || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.price.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  // Sort products
  if (activeSort === 'price-low') {
    currentFilteredProducts.sort((a, b) => a.numericPrice - b.numericPrice);
  } else if (activeSort === 'price-high') {
    currentFilteredProducts.sort((a, b) => b.numericPrice - a.numericPrice);
  } else if (activeSort === 'name-asc') {
    currentFilteredProducts.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Update item counter
  if (elements.itemCount) {
    const count = currentFilteredProducts.length;
    elements.itemCount.textContent = `${count} ${count === 1 ? 'Piece' : 'Pieces'} Available`;
  }

  // Toggle Empty State
  if (currentFilteredProducts.length === 0) {
    elements.productGrid.innerHTML = '';
    elements.emptyState.classList.remove('hidden');
    return;
  } else {
    elements.emptyState.classList.add('hidden');
  }

  // Generate Cards
  elements.productGrid.innerHTML = currentFilteredProducts.map((product, index) => {
    return `
      <article 
        class="product-card group bg-white rounded-2xl overflow-hidden border border-[#EFE8E1] cursor-pointer flex flex-col justify-between"
        onclick="openLightbox(${index})"
        role="button"
        tabindex="0"
        aria-label="View details for ${product.name}"
        onkeydown="if(event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openLightbox(${index}); }"
      >
        <!-- Product Photo Container -->
        <div class="product-image-wrap aspect-square w-full relative overflow-hidden bg-[#FAF7F2]">
          <img 
            src="${product.imageSrc}" 
            alt="${product.name}" 
            loading="lazy"
            class="product-image w-full h-full object-cover object-center"
            onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'400\\' height=\\'400\\' viewBox=\\'0 0 400 400\\'%3E%3Crect width=\\'100%25\\' height=\\'100%25\\' fill=\\'%23F5ECE3\\'/ %3E%3Ctext x=\\'50%25\\' y=\\'50%25\\' dominant-baseline=\\'middle\\' text-anchor=\\'middle\\' fill=\\'%2373655A\\' font-family=\\'sans-serif\\' font-size=\\'18\\'%3EImage Not Found%3C/text%3E%3C/svg%3E';"
          />
          
          <!-- Subtle Category Badge -->
          <span class="absolute top-3 left-3 px-2.5 py-1 text-xs font-medium tracking-wide bg-white/90 backdrop-blur-sm text-[#587352] rounded-full border border-[#E3ECE1] shadow-xs">
            ${product.categoryLabel}
          </span>

          <!-- Hover View Indicator -->
          <div class="absolute inset-0 bg-[#26201B]/20 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <span class="px-4 py-2 bg-white/95 text-[#26201B] rounded-full text-xs font-semibold tracking-wider uppercase shadow-md transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5 text-[#6E8B68]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View Piece
            </span>
          </div>
        </div>

        <!-- Clean Product Info -->
        <div class="p-4 sm:p-5 flex items-center justify-between gap-3 bg-white">
          <div class="min-w-0 flex-1">
            <h3 class="font-serif text-base sm:text-lg font-medium text-[#26201B] truncate group-hover:text-[#6E8B68] transition-colors">
              ${product.name}
            </h3>
            <p class="text-xs text-[#73655A] mt-0.5">Handmade crochet</p>
          </div>
          
          <div class="shrink-0 text-right">
            <span class="inline-block px-3 py-1 bg-[#FAF7F2] text-[#6E8B68] font-semibold text-sm sm:text-base rounded-lg border border-[#EFE8E1]">
              ${product.price}
            </span>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// 5. Lightbox Modal Controls
function openLightbox(index) {
  if (index < 0 || index >= currentFilteredProducts.length) return;
  currentLightboxIndex = index;
  const product = currentFilteredProducts[currentLightboxIndex];

  elements.lightboxImg.src = product.imageSrc;
  elements.lightboxImg.alt = product.name;
  elements.lightboxTitle.textContent = product.name;
  elements.lightboxPrice.textContent = product.price;
  elements.lightboxCategory.textContent = product.categoryLabel;
  elements.lightboxDetails.textContent = product.details;

  // Open modal
  elements.lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Update navigation button states
  elements.lightboxPrev.disabled = currentLightboxIndex === 0;
  elements.lightboxNext.disabled = currentLightboxIndex === currentFilteredProducts.length - 1;
  elements.lightboxPrev.classList.toggle('opacity-30', currentLightboxIndex === 0);
  elements.lightboxNext.classList.toggle('opacity-30', currentLightboxIndex === currentFilteredProducts.length - 1);
}

function closeLightbox() {
  elements.lightbox.classList.remove('active');
  document.body.style.overflow = '';
  currentLightboxIndex = -1;
}

function nextLightboxImage() {
  if (currentLightboxIndex < currentFilteredProducts.length - 1) {
    openLightbox(currentLightboxIndex + 1);
  }
}

function prevLightboxImage() {
  if (currentLightboxIndex > 0) {
    openLightbox(currentLightboxIndex - 1);
  }
}

// Toast helper
function showToast(message) {
  if (!elements.toast || !elements.toastMessage) return;
  elements.toastMessage.textContent = message;
  elements.toast.classList.add('show');
  setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 2600);
}

// Inquire or Copy Product Details
function handleInquiry() {
  if (currentLightboxIndex < 0) return;
  const product = currentFilteredProducts[currentLightboxIndex];
  const message = `Hello Frostoria Stitches! I am interested in purchasing the handcrafted "${product.name}" (${product.price}). Is it currently available?`;

  // Open WhatsApp direct message redirect to +8801310316869
  const whatsappUrl = `${CONFIG.socialLinks.whatsapp}${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
}

function copyProductDetails() {
  if (currentLightboxIndex < 0) return;
  const product = currentFilteredProducts[currentLightboxIndex];
  const text = `Frostoria Stitches ("We stitch your memories.") - ${product.name} (${product.price})`;
  
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Copied product details to clipboard!');
    }).catch(() => {
      showToast(`Selected: ${product.name} (${product.price})`);
    });
  } else {
    showToast(`Selected: ${product.name} (${product.price})`);
  }
}

// 6. Event Listeners Initialization
function initEventListeners() {
  // Search Input
  if (elements.searchInput) {
    elements.searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      if (elements.clearSearchBtn) {
        elements.clearSearchBtn.classList.toggle('hidden', searchQuery.length === 0);
      }
      renderProductGrid();
    });
  }

  // Clear Search
  if (elements.clearSearchBtn) {
    elements.clearSearchBtn.addEventListener('click', () => {
      elements.searchInput.value = '';
      searchQuery = '';
      elements.clearSearchBtn.classList.add('hidden');
      renderProductGrid();
      elements.searchInput.focus();
    });
  }

  // Header Filter Toggle (Minimalist low-clutter design)
  if (elements.filterToggleBtn && elements.searchFilterContainer) {
    elements.filterToggleBtn.addEventListener('click', () => {
      const isExpanded = !elements.searchFilterContainer.classList.contains('hidden');
      if (isExpanded) {
        elements.searchFilterContainer.classList.add('hidden');
        elements.filterToggleBtn.setAttribute('aria-expanded', 'false');
      } else {
        elements.searchFilterContainer.classList.remove('hidden');
        elements.filterToggleBtn.setAttribute('aria-expanded', 'true');
        elements.searchInput?.focus();
      }
    });
  }

  // Category Filter Pills
  elements.categoryPills.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.categoryPills.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.getAttribute('data-category');
      renderProductGrid();
    });
  });

  // Sort Selection
  if (elements.sortSelect) {
    elements.sortSelect.addEventListener('change', (e) => {
      activeSort = e.target.value;
      renderProductGrid();
    });
  }

  // Lightbox Modal Controls
  if (elements.lightboxClose) {
    elements.lightboxClose.addEventListener('click', closeLightbox);
  }

  if (elements.lightboxBackdrop) {
    elements.lightboxBackdrop.addEventListener('click', closeLightbox);
  }

  if (elements.lightboxPrev) {
    elements.lightboxPrev.addEventListener('click', prevLightboxImage);
  }

  if (elements.lightboxNext) {
    elements.lightboxNext.addEventListener('click', nextLightboxImage);
  }

  if (elements.lightboxInquireBtn) {
    elements.lightboxInquireBtn.addEventListener('click', handleInquiry);
  }

  if (elements.lightboxCopyBtn) {
    elements.lightboxCopyBtn.addEventListener('click', copyProductDetails);
  }

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (!elements.lightbox.classList.contains('active')) return;

    if (e.key === 'Escape') {
      closeLightbox();
    } else if (e.key === 'ArrowRight') {
      nextLightboxImage();
    } else if (e.key === 'ArrowLeft') {
      prevLightboxImage();
    }
  });
}

// 7. Initial Mount
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  renderProductGrid();
});
