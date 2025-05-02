const navLinks = [
    { text: 'read&watch', href: '#' },
    { text: 'radio', href: '#' },
    { text: 'about', href: '#' },
    { text: 'shop', href: 'huindex.html' },
    { text: 'my 043', href: 'index.html' }
];
  
document.addEventListener('DOMContentLoaded', function() {
  injectHeader();
}, { once: true });

if (document.body) {
  injectHeader();
} else {
  const observer = new MutationObserver(function(mutations, obs) {
    if (document.body) {
      injectHeader();
      obs.disconnect(); 
    }
  });
  
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}

function injectHeader() {
  if (document.querySelector('.main-header')) return;
  
  const header = document.createElement('header');
  header.className = 'main-header';
  
  const logo = document.createElement('div');
  logo.className = 'text-white font-bold glitch-text';
  logo.textContent = '043';
  
  const nav = document.createElement('nav');
  nav.className = 'header-nav';
  
  navLinks.forEach(link => {
    const a = document.createElement('a');
    a.href = link.href;
    a.className = 'nav-link';
    a.textContent = link.text;
    nav.appendChild(a);
  });
  
  header.appendChild(logo);
  header.appendChild(nav);
  
  if (document.body.firstChild) {
    document.body.insertBefore(header, document.body.firstChild);
  } else {
    document.body.appendChild(header);
  }
  
  const links = document.querySelectorAll('.nav-link');
  links.forEach(link => {
    link.addEventListener('mouseenter', function() {
      this.style.color = 'white';
      this.style.transform = 'translateY(-1px)';
    });
    
    link.addEventListener('mouseleave', function() {
      this.style.color = '';
      this.style.transform = '';
    });
  });
}