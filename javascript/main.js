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
var w;
var x =window.matchMedia("(max-width: 1152px)")
function responsive(x) {
    if(x.matches){
        w=250;
    }
    else{
        w=400;
    }
}
responsive(x);
x.addEventListener("change",function(){
    responsive(x);
});


let swiper = new Swiper('.projectspace', {
    // Optional parameters
    loop: true,
    spaceBetween: 1000,
    width: w,

    // If we need pagination
    pagination: {
      el: '.swiper-pagination',
    },
  
    // Navigation arrows
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
});