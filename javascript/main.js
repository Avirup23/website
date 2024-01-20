const menu = document.getElementById('menu')
const menulogo = document.getElementById("menu-logo")
const closelogo = document.getElementById('close-logo')
console.log("in");

if(menulogo){
    menulogo.addEventListener('click',()=>{
        menulogo.classList.add('vanish')
        menu.classList.add('slide-right')
    })
}
if(closelogo){
    closelogo.addEventListener('click',()=>{
        menulogo.classList.remove('vanish')
        menu.classList.remove('slide-right')
    })
}

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