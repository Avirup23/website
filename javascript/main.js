// menu settings
const menu = document.getElementById('menu')
const menulogo = document.getElementById("menu-logo")
const closelogo = document.getElementById('close-logo')
const wrapper = document.getElementById('wrapper')
let links = document.getElementsByClassName('menu-options')

if(menulogo){
    menulogo.addEventListener('click',()=>{
        menulogo.classList.add('vanish')
        menu.classList.add('slide-right')
        wrapper.classList.add('freeze')
    })
}
if(closelogo){
    closelogo.addEventListener('click',()=>{
        menulogo.classList.remove('vanish')
        menu.classList.remove('slide-right')
        wrapper.classList.remove('freeze')
    })
}
for (let link of links) {
    if(link){
        link.addEventListener('click',()=>{
            menulogo.classList.remove('vanish')
            menu.classList.remove('slide-right')
            wrapper.classList.remove('freeze')
        })
    }
}


// swiper class settings
// Swiper configuration for 3 cards per view
let swiper = new Swiper('.projectspace', {
    // Show 3 cards side by side on desktop
    slidesPerView: 1,
    spaceBetween: 20,
    loop: true,
    grabCursor: true,
    
    // Responsive breakpoints
    breakpoints: {
        // When window width is >= 640px (tablets)
        640: {
            slidesPerView: 2,
            spaceBetween: 25,
        },
        // When window width is >= 1024px (desktop)
        1024: {
            slidesPerView: 3,
            spaceBetween: 30,
        },
    },
    
    // Pagination
    pagination: {
        el: '.swiper-pagination',
        clickable: true,
    },
    
    // Navigation arrows
    navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
    },
    
    // Smooth transition
    speed: 600,
    effect: 'slide',
});

// Intersection Observer for scroll animations
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if(entry.isIntersecting){
            entry.target.classList.add('show');
        } else {
            entry.target.classList.remove('show');
        }
    });
});

const hiddenElements = document.querySelectorAll('.hidden');
hiddenElements.forEach((el) => observer.observe(el));