/* Efeitos de rolagem da landing page.
   Sem JavaScript, tudo aparece normal (a classe "js" só entra quando o script roda). */
(function () {
  const raiz = document.documentElement;
  const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.addEventListener('DOMContentLoaded', () => {
    const ano = document.getElementById('ano');
    if (ano) ano.textContent = new Date().getFullYear();

    const topo = document.querySelector('.topo');
    const barra = document.querySelector('.progresso span');
    const hero = document.querySelector('.hero');

    /* 1. Topo que muda ao descer + barra de progresso + leve paralaxe no hero */
    let agendado = false;
    function aoRolar() {
      agendado = false;
      const y = window.scrollY;
      const total = raiz.scrollHeight - window.innerHeight;
      if (topo) topo.classList.toggle('rolado', y > 24);
      if (barra) barra.style.transform = `scaleX(${total > 0 ? Math.min(y / total, 1) : 0})`;
      if (hero && !semMovimento && y < window.innerHeight * 1.2) {
        hero.style.setProperty('--desloca', `${y * 0.25}px`);
        hero.style.setProperty('--some', Math.max(1 - y / (window.innerHeight * 0.9), 0).toFixed(3));
      }
    }
    window.addEventListener('scroll', () => {
      if (!agendado) { agendado = true; requestAnimationFrame(aoRolar); }
    }, { passive: true });
    aoRolar();

    /* 2. Elementos aparecem ao entrar na tela, em cascata dentro do mesmo grupo */
    const itens = document.querySelectorAll('[data-revelar]');
    if (!('IntersectionObserver' in window) || semMovimento) {
      itens.forEach((el) => el.classList.add('visivel'));
    } else {
      const pais = new Map();
      itens.forEach((el) => {
        const pai = el.parentElement;
        const i = pais.get(pai) || 0;
        el.style.setProperty('--atraso', `${Math.min(i, 5) * 90}ms`);
        pais.set(pai, i + 1);
      });
      const obs = new IntersectionObserver((entradas) => {
        entradas.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add('visivel'); obs.unobserve(e.target); }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
      itens.forEach((el) => obs.observe(el));
    }

    /* 3. Números que contam até o valor */
    const numeros = document.querySelectorAll('[data-contar]');
    function contar(el) {
      const fim = Number(el.dataset.contar);
      if (semMovimento) { el.textContent = fim; return; }
      const dur = 1400, ini = performance.now();
      function passo(t) {
        const p = Math.min((t - ini) / dur, 1);
        const suave = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(fim * suave);
        if (p < 1) requestAnimationFrame(passo);
      }
      el.textContent = '0';
      requestAnimationFrame(passo);
    }
    if ('IntersectionObserver' in window) {
      const obsN = new IntersectionObserver((entradas) => {
        entradas.forEach((e) => { if (e.isIntersecting) { contar(e.target); obsN.unobserve(e.target); } });
      }, { threshold: 0.6 });
      numeros.forEach((el) => obsN.observe(el));
    }

    /* 4. Pilha de telas: gira como um objeto só, seguindo o mouse em todo o hero.
       Cada quadro chega 10% mais perto do alvo (suavização), e o laço só roda enquanto há movimento. */
    const pilha = document.querySelector('.pilha');
    if (pilha && hero && !semMovimento && window.matchMedia('(pointer: fine) and (min-width: 861px)').matches) {
      const MAX_X = 10, MAX_Y = 16;
      const alvo = { rx: 0, ry: 0, abre: 0, gx: 50, gy: 30 };
      const atual = { ...alvo };
      let rodando = false;
      const passo = () => {
        let parado = true;
        for (const k in alvo) {
          const d = alvo[k] - atual[k];
          atual[k] += d * (k === 'abre' ? 0.12 : 0.1);
          if (Math.abs(d) > 0.01) parado = false;
        }
        pilha.style.setProperty('--rx', atual.rx.toFixed(3));
        pilha.style.setProperty('--ry', atual.ry.toFixed(3));
        pilha.style.setProperty('--abre', atual.abre.toFixed(3));
        pilha.style.setProperty('--gx', `${atual.gx.toFixed(1)}%`);
        pilha.style.setProperty('--gy', `${atual.gy.toFixed(1)}%`);
        if (parado) { rodando = false; return; }
        requestAnimationFrame(passo);
      };
      const mexer = () => { if (!rodando) { rodando = true; requestAnimationFrame(passo); } };
      hero.addEventListener('pointermove', (e) => {
        const r = pilha.getBoundingClientRect();
        // posição relativa ao centro da pilha, limitada a -1..1 (funciona em qualquer ponto do hero)
        const nx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width * 0.75)));
        const ny = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height * 0.75)));
        alvo.ry = nx * MAX_Y;
        alvo.rx = -ny * MAX_X;
        alvo.gx = 50 + nx * 45;
        alvo.gy = 40 + ny * 45;
        mexer();
      });
      hero.addEventListener('pointerleave', () => { alvo.rx = 0; alvo.ry = 0; alvo.gx = 50; alvo.gy = 30; mexer(); });
      pilha.addEventListener('pointerenter', () => { alvo.abre = 1; mexer(); });
      pilha.addEventListener('pointerleave', () => { alvo.abre = 0; mexer(); });
      pilha.addEventListener('focus', () => { alvo.abre = 1; mexer(); });
      pilha.addEventListener('blur', () => { alvo.abre = 0; mexer(); });
    }

    /* 5. Menu marca a seção em que a pessoa está */
    const links = [...document.querySelectorAll('nav a[href^="#"]')];
    const secoes = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
    if ('IntersectionObserver' in window && secoes.length) {
      const obsS = new IntersectionObserver((entradas) => {
        entradas.forEach((e) => {
          if (e.isIntersecting) {
            links.forEach((a) => a.classList.toggle('ativo', a.getAttribute('href') === `#${e.target.id}`));
          }
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      secoes.forEach((s) => obsS.observe(s));
    }
  });
})();
