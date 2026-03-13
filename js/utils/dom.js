// js/utils/dom.js
export const DOM = {
  get: (id) => document.getElementById(id),
  getAll: (sel) => document.querySelectorAll(sel),
  create: (tag, className = '', innerHTML = '') => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (innerHTML) el.innerHTML = innerHTML;
    return el;
  },
  
  show: (el) => {
    if (el) el.classList.remove('hidden');
  },
  
  hide: (el) => {
    if (el) el.classList.add('hidden');
  },
  
  toggle: (el) => {
    if (el) el.classList.toggle('hidden');
  },
  
  fadeOut: (el, duration = 400) => {
    if (!el) return Promise.resolve();
    el.style.transition = `opacity ${duration}ms ease`;
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    
    return new Promise(resolve => {
      setTimeout(() => {
        el.classList.add('hidden');
        el.style.opacity = '';
        el.style.transition = '';
        el.style.pointerEvents = '';
        resolve();
      }, duration);
    });
  },
  
  fadeIn: (el, duration = 400) => {
    if (!el) return Promise.resolve();
    el.classList.remove('hidden');
    el.style.opacity = '0';
    el.style.transition = `opacity ${duration}ms ease`;
    
    return new Promise(resolve => {
      setTimeout(() => {
        el.style.opacity = '1';
        setTimeout(() => {
          el.style.opacity = '';
          el.style.transition = '';
          resolve();
        }, duration);
      }, 10);
    });
  }
};