document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Open Invitation & Audio Setup ---
    const btnOpen = document.getElementById('btn-open');
    const cover = document.getElementById('cover');
    const mainContent = document.getElementById('main-content');
    const body = document.body;
    const bgMusic = document.getElementById('bg-music');
    const musicControl = document.getElementById('music-control');
    const musicIcon = musicControl.querySelector('i');
    
    let isPlaying = false;

    // List of gallery image filenames inside assets/images/
    // You can add as many prewed_gallery* files here as you want!
    const galleryFiles = [
        'prewed_gallery1.webp',
        'prewed_gallery2.webp'
    ];

    const renderGallery = () => {
        const galleryGrid = document.getElementById('gallery-grid');
        if (!galleryGrid) return;

        galleryGrid.innerHTML = '';
        galleryFiles.forEach((filename, idx) => {
            const item = document.createElement('div');
            item.className = 'gallery-item fade-up';
            // Stagger animation delays
            item.style.animationDelay = `${(idx % 3) * 0.1}s`;

            const img = document.createElement('img');
            img.src = `assets/images/${filename}`;
            img.alt = `Foto Prewedding ${idx + 1}`;
            img.loading = 'lazy';

            item.appendChild(img);
            galleryGrid.appendChild(item);
        });
    };
    renderGallery();

    // Cover Slideshow Interval
    let coverIntervalId = null;
    const initCoverSlideshow = () => {
        const slides = document.querySelectorAll('.cover-slideshow .cover-slide');
        if (slides.length <= 1) return;

        let currentSlide = 0;
        coverIntervalId = setInterval(() => {
            slides[currentSlide].classList.remove('active');
            currentSlide = (currentSlide + 1) % slides.length;
            slides[currentSlide].classList.add('active');
        }, 3000);
    };
    initCoverSlideshow();

    btnOpen.addEventListener('click', () => {
        // Clear interval to optimize memory
        if (coverIntervalId) {
            clearInterval(coverIntervalId);
        }

        // Slide up cover
        cover.classList.add('slide-up');
        
        // Show main content and unlock scroll
        setTimeout(() => {
            mainContent.classList.remove('hidden');
            body.classList.remove('locked');
            cover.style.display = 'none'; // remove from DOM flow
        }, 800); // Wait for transition to mostly finish
        
        // Play music
        if (bgMusic) {
            bgMusic.play().then(() => {
                isPlaying = true;
                musicIcon.classList.add('fa-spin');
            }).catch(err => {
                console.log("Autoplay prevented or audio file missing:", err);
                musicIcon.classList.remove('fa-spin');
            });
        }
    });

    // Toggle Music
    musicControl.addEventListener('click', () => {
        if (isPlaying) {
            if (bgMusic) bgMusic.pause();
            musicIcon.classList.remove('fa-spin');
        } else {
            if (bgMusic) {
                bgMusic.play().then(() => {
                    musicIcon.classList.add('fa-spin');
                }).catch(err => {
                    console.log("Play failed:", err);
                });
            }
        }
        isPlaying = !isPlaying;
    });


    // --- 2. Countdown Timer ---
    // Set wedding date (e.g., Aug 22, 2026)
    const weddingDate = new Date('Aug 22, 2026 08:00:00').getTime();

    const updateCountdown = () => {
        const now = new Date().getTime();
        const distance = weddingDate - now;

        if (distance < 0) {
            document.getElementById('countdown').innerHTML = "<h3>Acara Sedang Berlangsung / Telah Selesai</h3>";
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        document.getElementById('days').innerText = String(days).padStart(2, '0');
        document.getElementById('hours').innerText = String(hours).padStart(2, '0');
        document.getElementById('minutes').innerText = String(minutes).padStart(2, '0');
        document.getElementById('seconds').innerText = String(seconds).padStart(2, '0');
    };

    // Initial call and interval
    updateCountdown();
    setInterval(updateCountdown, 1000);


    // --- 3. Scroll Animations (Intersection Observer) ---
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15 // trigger when 15% of element is visible
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Optional: stop observing once it's visible
                // observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Select all elements to animate
    const animateElements = document.querySelectorAll('.fade-up, .fade-right, .fade-left');
    animateElements.forEach(el => observer.observe(el));


    // --- 4. RSVP & Guestbook Google Sheets Integration ---
    const scriptURL = 'https://script.google.com/macros/s/AKfycbzqgSEeLC9zV1UspCOVjpaNA-INH22PFQiowAmwJr8OzBUTsaIcZSDac6J6yCLVVCQ3/exec';
    const rsvpForm = document.getElementById('rsvp-form');
    const wishesLoader = document.getElementById('wishes-loader');
    const wishesList = document.getElementById('wishes-list');
    const wishesEmpty = document.getElementById('wishes-empty');

    // Helper: Parse Google Apps Script formatted date (dd/MM/yyyy HH:mm or standard date formats)
    const parseDateString = (str) => {
        if (!str) return null;
        
        // 1. Try native Date parsing first (handles ISO strings, "Sat Jun 20 2026...", etc.)
        const nativeDate = new Date(str);
        if (!isNaN(nativeDate.getTime())) {
            return nativeDate;
        }

        // 2. Fallback: manual parsing for "dd/MM/yyyy HH:mm" format
        try {
            const parts = str.split(' ');
            if (parts.length >= 2) {
                const dateParts = parts[0].split('/');
                const timeParts = parts[1].split(':');
                if (dateParts.length === 3 && timeParts.length >= 2) {
                    return new Date(
                        parseInt(dateParts[2], 10),
                        parseInt(dateParts[1], 10) - 1,
                        parseInt(dateParts[0], 10),
                        parseInt(timeParts[0], 10),
                        parseInt(timeParts[1], 10)
                    );
                }
            }
        } catch (e) {
            console.error("Error parsing custom date format:", e);
        }
        return null;
    };

    // Helper: Format date to premium Indonesian relative time or readable date
    const formatTimeAgo = (dateStr) => {
        const date = parseDateString(dateStr);
        if (!date) return dateStr || '';

        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHr = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHr / 24);

        if (diffSec < 60) {
            return 'Baru saja';
        } else if (diffMin < 60) {
            return `${diffMin} menit yang lalu`;
        } else if (diffHr < 24) {
            return `${diffHr} jam yang lalu`;
        } else if (diffDay === 1) {
            return 'Kemarin';
        } else if (diffDay < 7) {
            return `${diffDay} hari yang lalu`;
        } else {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()} ${hours}:${minutes}`;
        }
    };

    // Helper: Premium Custom Toast Notification
    const showToast = (message, type = 'success') => {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        
        const toast = document.createElement('div');
        toast.className = 'toast-item';
        
        const icon = document.createElement('i');
        if (type === 'success') {
            icon.className = 'fas fa-check-circle toast-icon success';
        } else {
            icon.className = 'fas fa-exclamation-circle toast-icon error';
        }
        
        const text = document.createElement('span');
        text.className = 'toast-text';
        text.innerText = message;
        
        toast.appendChild(icon);
        toast.appendChild(text);
        container.appendChild(toast);
        
        // Auto-remove toast from DOM
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.4s ease forwards';
            setTimeout(() => {
                toast.remove();
                if (container.children.length === 0) {
                    container.remove();
                }
            }, 400);
        }, 3500);
    };

    const loadWishes = () => {
        if (!wishesList) return;
        
        // Show loader, hide others
        wishesLoader.classList.remove('hidden');
        wishesList.classList.add('hidden');
        wishesEmpty.classList.add('hidden');

        fetch(scriptURL)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                wishesLoader.classList.add('hidden');
                
                if (!data || data.length === 0) {
                    wishesEmpty.classList.remove('hidden');
                    return;
                }

                wishesList.innerHTML = '';
                data.forEach(wish => {
                    // Filter empty entries
                    if (!wish.name || !wish.message) return;

                    const item = document.createElement('div');
                    item.className = 'wish-item';

                    // 1. Initial Avatar Circle
                    const avatar = document.createElement('div');
                    avatar.className = 'wish-avatar';
                    avatar.innerText = wish.name.trim().charAt(0).toUpperCase();

                    // 2. Content Wrap
                    const contentWrap = document.createElement('div');
                    contentWrap.className = 'wish-content-wrap';

                    // Wish Header (Name + Attendance Badge)
                    const header = document.createElement('div');
                    header.className = 'wish-header';

                    const nameWrap = document.createElement('div');
                    nameWrap.className = 'wish-name-wrap';

                    const nameEl = document.createElement('span');
                    nameEl.className = 'wish-name';
                    nameEl.innerText = wish.name;

                    const badge = document.createElement('span');
                    const isHadir = wish.attendance === 'hadir';
                    badge.className = `wish-badge ${isHadir ? 'hadir' : 'tidak'}`;
                    badge.innerText = isHadir ? 'Hadir' : 'Tidak Hadir';

                    nameWrap.appendChild(nameEl);
                    nameWrap.appendChild(badge);

                    const timeEl = document.createElement('span');
                    timeEl.className = 'wish-time';
                    timeEl.innerHTML = `<i class="far fa-clock"></i> ${formatTimeAgo(wish.timestamp)}`;

                    header.appendChild(nameWrap);
                    header.appendChild(timeEl);

                    // Wish Message Body
                    const messageEl = document.createElement('p');
                    messageEl.className = 'wish-message';
                    messageEl.innerText = wish.message;

                    contentWrap.appendChild(header);
                    contentWrap.appendChild(messageEl);

                    item.appendChild(avatar);
                    item.appendChild(contentWrap);
                    
                    wishesList.appendChild(item);
                });

                wishesList.classList.remove('hidden');
            })
            .catch(err => {
                console.error('Error fetching wishes:', err);
                wishesLoader.classList.add('hidden');
                wishesEmpty.innerText = 'Gagal memuat ucapan tamu. Silakan coba beberapa saat lagi.';
                wishesEmpty.classList.remove('hidden');
            });
    };

    // Load initial wishes
    loadWishes();

    if (rsvpForm) {
        rsvpForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = rsvpForm.querySelector('button');
            const originalText = btn.innerText;
            
            btn.innerText = 'Mengirim...';
            btn.disabled = true;

            const nameInput = document.getElementById('name');
            const attendanceSelect = document.getElementById('attendance');
            const messageInput = document.getElementById('message');

            const params = new URLSearchParams();
            params.append('name', nameInput.value);
            params.append('attendance', attendanceSelect.value);
            params.append('message', messageInput.value);

            fetch(scriptURL, {
                method: 'POST',
                body: params,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.result === 'success') {
                    showToast('Terima kasih! Ucapan dan konfirmasi Anda telah terkirim.', 'success');
                    rsvpForm.reset();
                    loadWishes(); // Refresh the wishes list
                } else {
                    showToast('Gagal mengirim ucapan: ' + (data.error || 'Terjadi kesalahan.'), 'error');
                }
            })
            .catch(error => {
                console.error('Error submitting RSVP:', error);
                showToast('Terjadi kesalahan koneksi saat mengirim ucapan.', 'error');
            })
            .finally(() => {
                btn.innerText = originalText;
                btn.disabled = false;
            });
        });
    }

    // --- 5. Floating Petals Animation ---
    const createPetals = () => {
        const hero = document.getElementById('hero');
        if (!hero) return;

        const container = document.createElement('div');
        container.className = 'bg-leaves-container';
        hero.appendChild(container);

        const numberOfPetals = 20;
        for (let i = 0; i < numberOfPetals; i++) {
            const petal = document.createElement('span');
            petal.className = 'leaf-petal';
            
            // Randomize styling
            petal.style.left = `${Math.random() * 100}%`;
            const size = Math.random() * 10 + 10;
            petal.style.width = `${size}px`;
            petal.style.height = `${size}px`;
            petal.style.animationDelay = `${Math.random() * 10}s`;
            petal.style.animationDuration = `${Math.random() * 10 + 10}s`;
            
            // Randomize border-radius to vary petal shape
            const r = Math.random();
            if (r > 0.6) {
                petal.style.borderRadius = '50% 0 50% 50%';
            } else if (r > 0.3) {
                petal.style.borderRadius = '0 50% 50% 50%';
            } else {
                petal.style.borderRadius = '50% 50% 0 50%';
            }

            container.appendChild(petal);
        }
    };

    // Attach to the end of the btnOpen handler or trigger it here
    btnOpen.addEventListener('click', () => {
        setTimeout(createPetals, 1000);
    });

    // --- 6. Copy Account Number Functionality ---
    const copyButtons = document.querySelectorAll('.btn-copy');
    copyButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-target');
            const targetEl = document.getElementById(targetId);
            if (!targetEl) return;

            const textToCopy = targetEl.innerText;
            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalContent = button.innerHTML;
                button.innerHTML = '<i class="fas fa-check"></i> Tersalin!';
                button.classList.add('copied');
                
                setTimeout(() => {
                    button.innerHTML = originalContent;
                    button.classList.remove('copied');
                }, 2000);
            }).catch(err => {
                console.error('Gagal menyalin text: ', err);
            });
        });
    });

    // --- 7. Hero Background Slideshow ---
    const initSlideshow = () => {
        const slides = document.querySelectorAll('.hero-slideshow .slide');
        if (slides.length <= 1) return;

        let currentSlide = 0;
        setInterval(() => {
            slides[currentSlide].classList.remove('active');
            currentSlide = (currentSlide + 1) % slides.length;
            slides[currentSlide].classList.add('active');
        }, 3000); // Changes background every 3 seconds
    };
    initSlideshow();

    // --- 8. Lightbox Modal Functionality ---
    const lightbox = document.getElementById('lightbox-modal');
    const lightboxSlider = document.getElementById('lightbox-slider');
    
    let galleryImages = [];
    let currentIndex = 0;
    
    // Function to update gallery images array dynamically (handles "no limits")
    const updateGalleryImages = () => {
        galleryImages = Array.from(document.querySelectorAll('.gallery-grid .gallery-item img'));
    };
    
    const updateSliderPosition = (animate = true) => {
        if (!animate) {
            lightboxSlider.style.transition = 'none';
        } else {
            lightboxSlider.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
        }
        const offset = -currentIndex * 100;
        lightboxSlider.style.transform = `translateX(${offset}%)`;
    };
    
    const openLightbox = (index) => {
        updateGalleryImages();
        
        // Build slides dynamically
        lightboxSlider.innerHTML = '';
        galleryImages.forEach(img => {
            const slide = document.createElement('div');
            slide.className = 'lightbox-slide';
            const slideImg = document.createElement('img');
            slideImg.setAttribute('src', img.getAttribute('src'));
            slide.appendChild(slideImg);
            lightboxSlider.appendChild(slide);
        });
        
        currentIndex = index;
        updateSliderPosition(false); // Move instantly on open
        
        lightbox.classList.add('active');
        body.classList.add('locked'); // Lock background scrolling

        // Hide bottom nav while lightbox is open
        const bnav = document.getElementById('bottom-nav');
        if (bnav) bnav.style.opacity = '0';
        
        // Push State to Browser History (intercept phone back button)
        if (window.history.state === null || !window.history.state.lightbox) {
            window.history.pushState({ lightbox: true }, '');
        }
    };
    
    const closeLightbox = (fromHistoryPop = false) => {
        lightbox.classList.remove('active');
        
        // Check if main content is open to know if we should unlock scrolling
        if (!cover.classList.contains('slide-up')) {
            body.classList.add('locked');
        } else {
            body.classList.remove('locked');
        }

        // Restore bottom nav
        const bnav = document.getElementById('bottom-nav');
        if (bnav) bnav.style.opacity = '';
        
        // If closed manually, sync history stack
        if (!fromHistoryPop && window.history.state && window.history.state.lightbox) {
            window.history.back();
        }
    };
    
    // Listen for mobile back button / browser back (popstate)
    window.addEventListener('popstate', (e) => {
        if (lightbox.classList.contains('active')) {
            closeLightbox(true);
        }
    });
    
    
    // Setup click events on gallery items
    const setupGalleryClick = () => {
        const galleryGrid = document.getElementById('gallery-grid');
        if (!galleryGrid) return;
        
        galleryGrid.addEventListener('click', (e) => {
            const img = e.target.closest('.gallery-item img');
            if (!img) return;
            
            updateGalleryImages();
            const index = galleryImages.indexOf(img);
            if (index !== -1) {
                openLightbox(index);
            }
        });
    };
    setupGalleryClick();
    
    // Close on clicking backdrop/overlay area
    lightbox.addEventListener('click', (e) => {
        // If clicking on the wrapper slide (background around image) or lightbox overlay, close it
        if (e.target.classList.contains('lightbox-slide') || e.target === lightbox) {
            closeLightbox();
        }
    });
    
    // Swipe / Drag logic
    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    const dragThreshold = 50; // pixels to trigger slide change
    
    const handleDragStart = (e) => {
        isDragging = true;
        startX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        lightboxSlider.style.transition = 'none';
    };
    
    const handleDragMove = (e) => {
        if (!isDragging) return;
        currentX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const diffX = currentX - startX;
        
        const baseOffset = -currentIndex * window.innerWidth;
        const totalOffset = baseOffset + diffX;
        lightboxSlider.style.transform = `translateX(${totalOffset}px)`;
    };
    
    const handleDragEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        const diffX = currentX - startX;
        
        if (Math.abs(diffX) > dragThreshold) {
            if (diffX > 0) {
                // Swipe right -> prev
                currentIndex = Math.max(0, currentIndex - 1);
            } else {
                // Swipe left -> next
                currentIndex = Math.min(galleryImages.length - 1, currentIndex + 1);
            }
        }
        
        updateSliderPosition(true);
    };
    
    const sliderContainer = document.querySelector('.lightbox-slider-container');
    if (sliderContainer) {
        // Touch events
        sliderContainer.addEventListener('touchstart', handleDragStart, { passive: true });
        sliderContainer.addEventListener('touchmove', handleDragMove, { passive: true });
        sliderContainer.addEventListener('touchend', handleDragEnd);
        
        // Mouse events
        sliderContainer.addEventListener('mousedown', handleDragStart);
        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('mouseup', handleDragEnd);
    }
    
    // Handle Window Resize
    window.addEventListener('resize', () => {
        if (lightbox.classList.contains('active')) {
            updateSliderPosition(false);
        }
    });
    
    // Keyboard Controls
    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;
        
        if (e.key === 'Escape') {
            closeLightbox();
        } else if (e.key === 'ArrowLeft') {
            currentIndex = Math.max(0, currentIndex - 1);
            updateSliderPosition(true);
        } else if (e.key === 'ArrowRight') {
            currentIndex = Math.min(galleryImages.length - 1, currentIndex + 1);
            updateSliderPosition(true);
        }
    });


    // --- 9. Bottom Navigation ---
    const bottomNav = document.getElementById('bottom-nav');
    const heroSection = document.getElementById('hero');

    // Map of section IDs to nav item IDs
    const navSections = [
        { sectionId: 'hero',   navId: 'nav-hero' },
        { sectionId: 'couple', navId: 'nav-couple' },
        { sectionId: 'story',  navId: 'nav-story' },
        { sectionId: 'event',  navId: 'nav-event' },
        { sectionId: 'gallery',navId: 'nav-gallery' },
        { sectionId: 'gift',   navId: 'nav-gift' },
        { sectionId: 'rsvp',   navId: 'nav-rsvp' },
    ];

    // Show bottom nav once hero is scrolled past (hero leaves viewport)
    const heroObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                // Hero is out of view — show nav
                bottomNav.classList.add('visible');
            } else {
                // Hero back in view — hide nav
                bottomNav.classList.remove('visible');
            }
        });
    }, { threshold: 0.1 });

    // Only observe after main content is opened
    const observeHero = () => heroObserver.observe(heroSection);

    // Hook into the open invitation button
    const btnOpenNav = document.getElementById('btn-open');
    if (btnOpenNav) {
        btnOpenNav.addEventListener('click', () => {
            setTimeout(observeHero, 900); // Wait for hero to be visible first
        });
    }

    // Update active nav item based on scroll position
    const updateActiveNav = () => {
        let currentSection = 'hero';
        const scrollY = window.scrollY + window.innerHeight * 0.4;

        navSections.forEach(({ sectionId }) => {
            const section = document.getElementById(sectionId);
            if (section && section.offsetTop <= scrollY) {
                currentSection = sectionId;
            }
        });

        navSections.forEach(({ sectionId, navId }) => {
            const navItem = document.getElementById(navId);
            if (navItem) {
                navItem.classList.toggle('active', sectionId === currentSection);
            }
        });
    };

    window.addEventListener('scroll', updateActiveNav, { passive: true });

    // Smooth scroll for bottom nav links (offset for nav height)
    navSections.forEach(({ navId, sectionId }) => {
        const navItem = document.getElementById(navId);
        if (!navItem) return;
        navItem.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.getElementById(sectionId);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });


});
