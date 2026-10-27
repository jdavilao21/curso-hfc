/* ================== login-mascota.js — reacciones de la mascota del login (08-oct-2026) ==================
   Reemplaza el useState de React del diseño de ChatGPT (Inicio-de-sesion-GEA.zip). No toca el login: solo observa
   los mismos elementos que usa doLogin() en js/01-core.js (#inp-user, #inp-pass, #btn-login, #login-err).
     · foco en usuario / contraseña → la mascota se inclina / escucha;
     · #btn-login deshabilitado (verificando) → respira rápido; #login-err visible → niega con la cabeza;
     · clic en la mascota → 5 animaciones en orden, cada una con su mensaje;
     · el mouse sobre la escena la mueve un poco (paralaje); aviso de Bloq Mayús; botón para ver la contraseña.
   Formulario oculto al entrar (Jose, 08-oct-2026: «al primer clic del bot aparezca el formulario… luego cuando den otros clic el
   formulario haga alguna animación»): .gl-shell empieza con .gl-cerrado (en index.html) y el primer clic lo abre. Para que nadie
   quede sin poder entrar, también se abre con Enter / Espacio / Tab, al volver al login tras cerrar sesión y si hay un mensaje de error. */
(function(){
  const $ = id => document.getElementById(id);
  const scene = $('gl-scene'), mascota = $('gl-mascota'), burbuja = $('gl-burbuja');
  const shell = scene && scene.closest('.gl-shell'), card = $('login-form');
  window.__glMascota = true;   // la red de seguridad de index.html no abre el formulario si este archivo cargó
  const user = $('inp-user'), pass = $('inp-pass'), btn = $('btn-login'), err = $('login-err');
  if(!scene || !mascota || !burbuja || !user || !pass) return;

  const cerrado = () => !!(shell && shell.classList.contains('gl-cerrado'));
  const celular = () => window.matchMedia && window.matchMedia('(max-width:900px)').matches;
  const MSG = {
    abrir:'¡Haz clic en mí para iniciar! 👆',
    idle:'¡Listos para atender!', user:'¡Hola! Escribe tu usuario E.', pass:'Tu contraseña está protegida 🔒',
    verif:'Verificando tus datos…', error:'Revisemos esos datos 🤔'
  };
  const ACCIONES = [
    ['giro','¡Qué vuelta! 🔄'], ['salto','¡Vamos con energía! ⚡'], ['saludo','¡Hola, equipo GEA! 👋'],
    ['baile','¡Listos para atender! 🎵'], ['soporte','Planificación y Métricas: damos soporte a la operación 📊']
  ];
  let estado = 'idle', accion = 0, enAccion = false;
  const quieto = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function setEstado(e){
    estado = e;
    scene.classList.remove('st-user','st-pass','st-verif','st-error');
    if(e !== 'idle') scene.classList.add('st-' + e);
    if(!enAccion) burbuja.textContent = (e === 'idle' && cerrado()) ? MSG.abrir : (MSG[e] || MSG.idle);
  }

  // Abre el formulario (una sola vez): la columna crece y la tarjeta entra deslizándose desde el bot.
  function abrirFormulario(enfocar){
    if(!cerrado()) return;
    shell.classList.remove('gl-cerrado'); shell.classList.add('gl-abriendo');
    mascota.setAttribute('aria-expanded','true'); mascota.setAttribute('aria-label','Animar a la mascota GEA');
    setTimeout(()=>shell.classList.remove('gl-abriendo'), 750);
    if(celular() && card) setTimeout(()=>card.scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', block:'start' }), 60);
    if(enfocar) setTimeout(()=>user.focus({ preventScroll: celular() }), quieto ? 0 : 450);
  }
  const porFoco = () => document.activeElement === user ? 'user' : document.activeElement === pass ? 'pass' : 'idle';

  user.addEventListener('focus', ()=>setEstado('user'));
  pass.addEventListener('focus', ()=>setEstado('pass'));
  [user, pass].forEach(i=>{
    i.addEventListener('blur', ()=>setTimeout(()=>{ if(estado === 'user' || estado === 'pass') setEstado(porFoco()); }, 0));
    i.addEventListener('input', ()=>{ if(estado === 'error'){ err && err.classList.remove('show'); setEstado(porFoco()); } });
  });

  // Verificando / error: se leen del botón y del mensaje que maneja doLogin().
  if(btn) new MutationObserver(()=>{ if(btn.disabled) setEstado('verif'); else if(estado === 'verif') setEstado(err && err.classList.contains('show') ? 'error' : porFoco()); })
    .observe(btn, { attributes:true, attributeFilter:['disabled'] });
  if(err) new MutationObserver(()=>{ if(err.classList.contains('show') && err.textContent.trim()){ abrirFormulario(false); setEstado('error'); } })
    .observe(err, { attributes:true, attributeFilter:['class'], childList:true, characterData:true, subtree:true });
  // Al volver al login (cerrar sesión), la mascota vuelve a su estado inicial.
  const pantalla = $('pantalla-login');
  if(pantalla) new MutationObserver(()=>{ if(pantalla.style.display !== 'none'){ abrirFormulario(false); if(estado !== 'error') setEstado('idle'); } })
    .observe(pantalla, { attributes:true, attributeFilter:['style'] });

  // Clic: 5 animaciones en orden.
  function animar(clase, texto, conTarjeta){
    [mascota, card].forEach(el=>{ if(el) ACCIONES.forEach(([c])=>el.classList.remove('ac-' + c)); });
    void mascota.offsetWidth;   // reinicia la animación aunque se repita la misma
    mascota.classList.add('ac-' + clase); enAccion = true; burbuja.textContent = texto;
    if(conTarjeta && card){ void card.offsetWidth; card.classList.add('ac-' + clase); }
  }
  // Primer clic: abre el formulario y saluda. Clics siguientes: el bot y la tarjeta hacen la misma animación.
  mascota.addEventListener('click', ()=>{
    if(cerrado()){ abrirFormulario(true); animar('saludo', celular() ? '¡Bienvenido! Ingresa tus datos 👇' : '¡Bienvenido! Ingresa tus datos 👉', false); return; }
    const [clase, texto] = ACCIONES[accion++ % ACCIONES.length];
    animar(clase, texto, true);
  });
  if(card) card.addEventListener('animationend', e=>{
    if(e.target === card && /gl-card-(giro|salto|saludo|baile|soporte)/.test(e.animationName)) ACCIONES.forEach(([c])=>card.classList.remove('ac-' + c));
  });
  // Teclado: Enter o Espacio (fuera de un campo) y Tab también abren el formulario.
  document.addEventListener('keydown', e=>{
    if(!cerrado() || !pantalla || pantalla.style.display === 'none') return;
    if(e.target === mascota && (e.key === 'Enter' || e.key === ' ')) return;   // ya lo maneja el clic del botón
    if(e.key === 'Enter' || e.key === ' ' || e.key === 'Tab'){ if(e.key !== 'Tab') e.preventDefault(); abrirFormulario(true); }
  });
  mascota.addEventListener('animationend', e=>{
    if(!e.animationName.match(/gl-(giro|salto|saludo|baile|soporte)/)) return;
    ACCIONES.forEach(([c])=>mascota.classList.remove('ac-' + c));
    enAccion = false; setTimeout(()=>{ if(!enAccion) setEstado(estado); }, 1400);
  });

  // Paralaje suave con el mouse (no con «reducir movimiento»).
  if(!quieto){
    scene.addEventListener('pointermove', e=>{
      const r = scene.getBoundingClientRect();
      scene.style.setProperty('--mx', (((e.clientX - r.left) / r.width - .5) * 18).toFixed(1) + 'px');
      scene.style.setProperty('--my', (((e.clientY - r.top) / r.height - .5) * 12).toFixed(1) + 'px');
    });
    scene.addEventListener('pointerleave', ()=>{ scene.style.setProperty('--mx','0px'); scene.style.setProperty('--my','0px'); });
  }

  // Ver / ocultar contraseña.
  const ojo = $('btn-ver-pass');
  if(ojo) ojo.addEventListener('click', ()=>{
    const ver = pass.type === 'password';
    pass.type = ver ? 'text' : 'password';
    ojo.setAttribute('aria-pressed', ver); ojo.setAttribute('aria-label', ver ? 'Ocultar contraseña' : 'Mostrar contraseña');
    pass.focus();
  });

  // Aviso de Bloq Mayús en la contraseña.
  const mayus = $('gl-mayus');
  if(mayus) ['keydown','keyup'].forEach(t=>pass.addEventListener(t, e=>{
    if(typeof e.getModifierState === 'function') mayus.hidden = !e.getModifierState('CapsLock');
  }));
  pass.addEventListener('blur', ()=>{ if(mayus) mayus.hidden = true; });
  setEstado('idle');   // mensaje inicial («Haz clic en mí para iniciar»)

  // Descripción con efecto máquina de escribir, sin sonido (Jose, 08-oct-2026). El texto completo queda para lectores
  // de pantalla (aria-label); con «reducir movimiento» se muestra entero de una vez.
  const tw = $('gl-escribe');
  if(tw && !quieto){
    const texto = tw.textContent.trim();
    tw.setAttribute('aria-label', texto);
    tw.innerHTML = '<span class="gl-tw-hecho" aria-hidden="true"></span><span class="gl-tw-cursor" aria-hidden="true"></span><span class="gl-tw-resto" aria-hidden="true"></span>';
    const hecho = tw.children[0], cursor = tw.children[1], resto = tw.children[2];
    resto.textContent = texto;
    let i = 0;
    const paso = ()=>{
      i++; hecho.textContent = texto.slice(0, i); resto.textContent = texto.slice(i);
      if(i < texto.length) setTimeout(paso, /[ ,.]/.test(texto[i-1]) ? 90 : 38);
      else cursor.classList.add('fin');
    };
    setTimeout(paso, 600);
  }
})();
