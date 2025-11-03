// Color Theme Transition on Scroll
// Add this to your main.js or create a separate file

(function() {
    // Define color themes for each section
    const themes = {
        intro: { hue: 335 },
        myself: { hue: 200 },
        qualifications: { hue: 200 },
        projects: { hue: 140 },
        blog: { hue: 0 }
    };

    const root = document.documentElement;

    // Wait for DOM to be fully loaded
    function init() {
        // Map sections to their themes and positions
        const sectionThemes = [
            { selector: '#group1', theme: 'intro' },
            { selector: '#layer3', theme: 'myself' },
            { selector: '#layer4', theme: 'qualifications' },
            { selector: '#layer5', theme: 'projects' },
            { selector: '#blog', theme: 'blog' }
        ];

        // Get elements after DOM is loaded
        const sections = sectionThemes.map(s => ({
            element: document.querySelector(s.selector),
            theme: s.theme
        })).filter(s => s.element !== null);

        if (sections.length === 0) {
            console.error('No sections found for color transition');
            return;
        }

        // Interpolate between two hue values
        function interpolateHue(hue1, hue2, progress) {
            let diff = hue2 - hue1;
            if (diff > 180) diff -= 360;
            if (diff < -180) diff += 360;
            return (hue1 + diff * progress + 360) % 360;
        }

        // Get scroll progress between sections
        function getScrollProgress() {
            const scrollY = window.scrollY + window.innerHeight / 2;
            
            // Check if we're before the first section
            if (scrollY < sections[0].element.offsetTop) {
                return {
                    fromHue: themes[sections[0].theme].hue,
                    toHue: themes[sections[0].theme].hue,
                    progress: 0
                };
            }
            
            // Check between sections
            for (let i = 0; i < sections.length - 1; i++) {
                const current = sections[i].element;
                const next = sections[i + 1].element;
                
                const currentTop = current.offsetTop;
                const nextTop = next.offsetTop;
                
                if (scrollY >= currentTop && scrollY < nextTop) {
                    const progress = (scrollY - currentTop) / (nextTop - currentTop);
                    return {
                        fromHue: themes[sections[i].theme].hue,
                        toHue: themes[sections[i + 1].theme].hue,
                        progress: Math.min(Math.max(progress, 0), 1)
                    };
                }
            }
            
            // After last section
            return {
                fromHue: themes[sections[sections.length - 1].theme].hue,
                toHue: themes[sections[sections.length - 1].theme].hue,
                progress: 1
            };
        }

        // Update colors based on scroll
        function updateColors() {
            const { fromHue, toHue, progress } = getScrollProgress();
            const hue = interpolateHue(fromHue, toHue, progress);
            
            // Just update the hue variable - CSS will handle the rest
            root.style.setProperty('--hue', Math.round(hue));
        }

        // Throttled scroll listener
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    updateColors();
                    ticking = false;
                });
                ticking = true;
            }
        });

        // Initial update
        updateColors();
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();