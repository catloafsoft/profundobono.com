(function() {
    'use strict';

    /* Hide menu after click
    ----------------------------------------------*/
    document.querySelectorAll('.navbar-nav .nav-link').forEach(function(link) {
        link.addEventListener('click', function() {
            var navigation = document.getElementById('main-navigation');

            if (navigation && navigation.classList.contains('show')) {
                bootstrap.Collapse.getOrCreateInstance(navigation).hide();
            }
        });
    });

    /* Smooth scroll to section
    ----------------------------------------------*/
    document.querySelectorAll('a.scroll[href*="#"]:not([href="#"])').forEach(function(link) {
        link.addEventListener('click', function(event) {
            var samePage = location.hostname === link.hostname &&
                location.pathname.replace(/^\//, '') === link.pathname.replace(/^\//, '');

            if (!samePage || !link.hash) {
                return;
            }

            var targetName;

            try {
                targetName = decodeURIComponent(link.hash.slice(1));
            } catch (error) {
                targetName = link.hash.slice(1);
            }

            var target = document.getElementById(targetName) || document.getElementsByName(targetName)[0];

            if (target) {
                event.preventDefault();
                window.scrollTo({
                    top: target.getBoundingClientRect().top + window.scrollY - 70,
                    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
                });
            }
        });
    });

    /* Tooltip
    ----------------------------------------------*/
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(function(element) {
        new bootstrap.Tooltip(element);
    });

})();
