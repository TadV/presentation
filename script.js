(function () {
  'use strict';
  var slides = window.PRESENTATION_SLIDES;
  if (!slides || !slides.length) { return; }
  var root = document.getElementById('presentation');
  var screen = document.getElementById('screen');
  var controls = document.getElementById('controls');
  var front = document.getElementById('slide-a');
  var back = document.getElementById('slide-b');
  var rotateButton = document.getElementById('rotate');
  var fullButton = document.getElementById('fullscreen');
  var message = document.getElementById('message');
  var error = document.getElementById('error');
  var index = 0, requested = 0, serial = 0, rotated = false, webp = false;
  var width = 0, height = 0, quiet = false, hideTimer, loadTimer, messageTimer;
  var touch = null, lastTouch = 0, preload = null, keyboardMode = false;

  function on(target, event, handler) {
    if (target.addEventListener) { target.addEventListener(event, handler, false); }
    else if (target.attachEvent) { target.attachEvent('on' + event, handler); }
  }
  function pad(value) { return value < 10 ? '0' + value : String(value); }
  function classes() {
    root.className = (width < 520 ? 'compact ' : '') + (height < 420 ? 'short ' : '') + (quiet ? 'quiet' : '');
  }
  function fit(image, slide) {
    var scale = Math.min(width / slide.width, height / slide.height);
    var w = Math.round(slide.width * scale), h = Math.round(slide.height * scale);
    image.style.width = w + 'px'; image.style.height = h + 'px';
    image.style.left = Math.round((width - w) / 2) + 'px';
    image.style.top = Math.round((height - h) / 2) + 'px';
  }
  function layout() {
    var w = window.innerWidth || document.documentElement.clientWidth;
    var h = window.innerHeight || document.documentElement.clientHeight;
    width = rotated ? h : w; height = rotated ? w : h;
    root.style.width = width + 'px'; root.style.height = height + 'px';
    root.style.left = (w - width) / 2 + 'px'; root.style.top = (h - height) / 2 + 'px';
    var transform = rotated ? 'rotate(90deg)' : 'none';
    root.style.transform = transform; root.style.webkitTransform = transform; root.style.msTransform = transform;
    fit(front, slides[index]); fit(back, slides[requested]); classes();
  }
  function contains(parent, node) {
    while (node) { if (node === parent) { return true; } node = node.parentNode; }
    return false;
  }
  function reveal() {
    quiet = false; classes(); window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(function () {
      if (keyboardMode && contains(controls, document.activeElement)) { return; }
      quiet = true; classes();
    }, 3200);
  }
  function notice(text) {
    window.clearTimeout(messageTimer); message.innerHTML = text; message.style.display = 'block';
    messageTimer = window.setTimeout(function () { message.style.display = 'none'; }, 2400);
  }
  function update() {
    document.getElementById('current').innerHTML = pad(index + 1);
    document.getElementById('total').innerHTML = pad(slides.length);
    document.getElementById('progress-fill').style.width = ((index + 1) * 100 / slides.length) + '%';
    if (window.history && window.history.replaceState) {
      try { window.history.replaceState(null, '', '#slide-' + (index + 1)); } catch (ignore) {}
    }
    document.title = 'Мафия — ' + (index + 1) + ' / ' + slides.length;
  }
  function load(number) {
    requested = (number + slides.length) % slides.length;
    var target = requested, token = ++serial, slide = slides[target], loader = new Image();
    var source = webp && slide.webp ? slide.webp : slide.png;
    error.setAttribute('hidden', 'hidden'); error.style.display = 'none';
    window.clearTimeout(loadTimer); window.clearTimeout(messageTimer); message.style.display = 'none';
    loadTimer = window.setTimeout(function () { message.innerHTML = 'Загрузка…'; message.style.display = 'block'; }, 350);
    loader.onload = function () {
      if (token !== serial) { return; }
      window.clearTimeout(loadTimer); message.style.display = 'none';
      back.onload = function () {
        if (token !== serial) { return; }
        back.onload = null;
        var old = front; front = back; back = old;
        index = target; front.alt = slide.title || ('Слайд ' + (index + 1));
        front.className = 'slide'; back.className = 'slide standby';
        fit(front, slide); update();
        var next = slides[(index + 1) % slides.length];
        preload = new Image(); preload.src = webp && next.webp ? next.webp : next.png;
      };
      fit(back, slide); back.src = loader.src;
    };
    loader.onerror = function () {
      if (token !== serial) { return; }
      if (source !== slide.png) { source = slide.png; loader.src = source; return; }
      window.clearTimeout(loadTimer); message.style.display = 'none';
      error.removeAttribute('hidden'); error.style.display = 'block'; reveal();
    };
    loader.src = source; reveal();
  }
  function move(amount) { load(requested + amount); }
  function rotate() {
    rotated = !rotated; rotateButton.setAttribute('aria-pressed', rotated ? 'true' : 'false');
    layout(); reveal();
  }
  function fullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
  }
  function fullscreen() {
    var active = fullscreenElement();
    var target = active ? document : document.documentElement;
    var method = active ? (document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen) :
      (target.requestFullscreen || target.webkitRequestFullscreen || target.mozRequestFullScreen || target.msRequestFullscreen);
    if (!method) { notice('Используйте полноэкранный режим браузера'); return; }
    try {
      var result = method.call(target);
      if (result && result['catch']) { result['catch'](function () { notice('Полноэкранный режим недоступен'); }); }
    } catch (ignore) { notice('Полноэкранный режим недоступен'); }
    reveal();
  }
  function fullscreenChanged() {
    var active = !!fullscreenElement();
    fullButton.setAttribute('aria-pressed', active ? 'true' : 'false');
    fullButton.setAttribute('aria-label', active ? 'Выйти из полноэкранного режима' : 'На весь экран');
    layout(); reveal();
  }
  on(document.getElementById('previous'), 'click', function () { move(-1); });
  on(document.getElementById('next'), 'click', function () { move(1); });
  on(document.getElementById('retry'), 'click', function () { load(requested); });
  on(rotateButton, 'click', rotate); on(fullButton, 'click', fullscreen);
  on(window, 'resize', layout);
  on(window, 'orientationchange', function () { layout(); window.setTimeout(layout, 250); });
  on(front, 'load', function () { fit(front, slides[index]); });
  on(document, 'fullscreenchange', fullscreenChanged); on(document, 'webkitfullscreenchange', fullscreenChanged);
  on(document, 'mozfullscreenchange', fullscreenChanged); on(document, 'MSFullscreenChange', fullscreenChanged);
  on(root, 'mousemove', reveal); on(controls, 'focusin', reveal); on(controls, 'focusout', reveal);
  on(root, 'mousedown', function () { keyboardMode = false; });
  on(root, 'touchstart', function () { keyboardMode = false; });
  on(screen, 'click', function () { if (new Date().getTime() - lastTouch > 500) { reveal(); } });
  on(document, 'keydown', function (event) {
    event = event || window.event;
    keyboardMode = true;
    var key = event.keyCode, target = event.target || event.srcElement;
    if (event.altKey || event.ctrlKey || event.metaKey || /INPUT|TEXTAREA|SELECT/.test(target.tagName)) { return; }
    if (key === 9) { reveal(); return; }
    if ((key === 32 || key === 13) && target.tagName === 'BUTTON') { return; }
    if (key === 37 || key === 38 || key === 33) { move(-1); }
    else if (key === 39 || key === 40 || key === 34 || key === 32) { move(1); }
    else if (key === 36) { load(0); }
    else if (key === 35) { load(slides.length - 1); }
    else if (key === 82) { rotate(); }
    else if (key === 70) { fullscreen(); }
    else if (key === 27) { if (rotated) { rotate(); } reveal(); }
    else { return; }
    if (event.preventDefault) { event.preventDefault(); } else { event.returnValue = false; }
  });
  on(screen, 'touchstart', function (event) {
    if (event.touches.length !== 1) { touch = null; return; }
    touch = { x: event.touches[0].clientX, y: event.touches[0].clientY, time: new Date().getTime() };
  });
  on(screen, 'touchcancel', function () { touch = null; });
  on(screen, 'touchend', function (event) {
    lastTouch = new Date().getTime();
    if (!touch || !event.changedTouches.length) { return; }
    var dx = event.changedTouches[0].clientX - touch.x, dy = event.changedTouches[0].clientY - touch.y;
    var along = rotated ? dy : dx, across = rotated ? dx : dy;
    if (lastTouch - touch.time < 1200 && Math.abs(along) > 45 && Math.abs(along) > Math.abs(across) * 1.3) {
      move(along < 0 ? 1 : -1);
    } else { reveal(); }
    touch = null;
  });
  var start = /^#slide-(\d+)$/.exec(window.location.hash);
  layout(); reveal();
  /* Проверяется декодирование именно lossless WebP. Старые браузеры получают PNG. */
  var probe = new Image(), started = false;
  function begin() {
    if (started) { return; }
    started = true;
    if (start && +start[1] >= 1 && +start[1] <= slides.length) { load(+start[1] - 1); }
    else { load(0); }
  }
  probe.onload = function () { webp = probe.width === 1; begin(); };
  probe.onerror = begin;
  probe.src = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
  window.setTimeout(begin, 200);
}());
