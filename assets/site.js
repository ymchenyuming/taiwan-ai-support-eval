/* Local-only interactions: no network requests, cookies, or stored answers. */
(() => {
  'use strict';
  const dialog = document.querySelector('#preference-quiz');
  const launcher = document.querySelector('.quiz-launch');
  if (dialog && launcher) {
    const form = document.querySelector('#preference-form');
    const result = document.querySelector('#quiz-result');
    const steps = Array.from(form.querySelectorAll('.quiz-step'));
    const next = form.querySelector('.quiz-next');
    const back = form.querySelector('.quiz-back');
    const restart = dialog.querySelector('.quiz-restart');
    const resultActions = dialog.querySelector('.quiz-result-actions');
    const progress = dialog.querySelector('#quiz-progress');
    const bubble = dialog.querySelector('.quiz-content');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const journey = createQuizJourney(dialog.querySelector('.quiz-journey'));
    let step = 0;
    let arrivalTimer = 0;
    const finishTravel = () => {
      window.clearTimeout(arrivalTimer);
      dialog.classList.remove('is-travelling');
      bubble.inert = false;
    };
    const revealBubble = (target) => {
      finishTravel();
      if (!dialog.open) return;
      const arrive = () => {
        finishTravel();
        if (dialog.open) target.focus({ preventScroll: true });
      };
      if (reducedMotion.matches) arrive();
      else {
        dialog.classList.add('is-travelling');
        bubble.inert = true;
        arrivalTimer = window.setTimeout(arrive, 650);
      }
    };
    const showStep = (focus = true) => {
      dialog.dataset.mode = 'questions';
      dialog.dataset.step = String(step);
      steps.forEach((item, index) => { item.hidden = index !== step; });
      next.disabled = !form.elements[`q${step}`].value;
      next.textContent = step === steps.length - 1 ? '看結果' : '下一題';
      back.hidden = step === 0;
      progress.textContent = `${step + 1} / ${steps.length}`;
      journey?.setProgress(step / steps.length);
      if (focus) {
        const legend = steps[step].querySelector('legend');
        legend.tabIndex = -1;
        revealBubble(legend);
      }
    };
    const close = () => dialog.close();
    launcher.addEventListener('click', () => {
      dialog.showModal();
      journey?.start();
    });
    dialog.querySelector('.quiz-close').addEventListener('click', close);
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
    });
    dialog.addEventListener('close', () => {
      finishTravel();
      journey?.stop();
      launcher.focus();
    });
    dialog.querySelector('.quiz-compare').addEventListener('click', close);
    const renderResult = () => {
      let gemini = 0;
      let chatgpt = 0;
      for (let index = 0; index < steps.length; index++) {
        const answer = form.elements[`q${index}`].value;
        if (answer === 'gemini') gemini++;
        if (answer === 'chatgpt') chatgpt++;
      }
      let title;
      if (!gemini && !chatgpt) title = '這次沒有明顯偏好。';
      else if (gemini === chatgpt) title = '同分：你兩種都在意。';
      else title = `你可能偏好 ${gemini > chatgpt ? 'Gemini' : 'ChatGPT'}。`;
      result.replaceChildren();
      const heading = document.createElement('h3');
      heading.textContent = title;
      const totals = document.createElement('p');
      totals.className = 'quiz-totals';
      totals.textContent = `偏好分數：Gemini ${gemini} · ChatGPT ${chatgpt}`;
      const scoring = document.createElement('p');
      scoring.className = 'quiz-scoring';
      scoring.textContent = '每題一分　不確定不計';
      result.append(heading, totals, scoring);
      result.hidden = false;
      form.hidden = true;
      resultActions.hidden = false;
      progress.hidden = true;
      dialog.dataset.mode = 'result';
      journey?.setProgress(1);
      revealBubble(result);
    };
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (bubble.inert) return;
      if (!form.elements[`q${step}`].value) return;
      if (step === steps.length - 1) renderResult();
      else { step++; showStep(); }
    });
    form.addEventListener('change', () => { next.disabled = !form.elements[`q${step}`].value; });
    back.addEventListener('click', () => { if (step > 0) { step--; showStep(); } });
    restart.addEventListener('click', () => {
      form.reset();
      form.hidden = false;
      result.hidden = true;
      resultActions.hidden = true;
      progress.hidden = false;
      step = 0;
      showStep();
    });
    showStep(false);
  }

  document.querySelectorAll('[data-comparison]').forEach((explorer) => {
    const rows = Array.from(explorer.querySelectorAll('.aud-compare tbody tr'));
    const topics = explorer.querySelector('.comparison-topics');
    const interactive = explorer.querySelector('.comparison-interactive');
    const tables = explorer.querySelector('.comparison-tables');
    const models = explorer.querySelector('.comparison-models');
    let model = 'gemini';
    let topic = 0;
    let view = 'explore';
    const shortLabels = {
      '不想接受AI建議的話會...?': '不接受建議時',
      '探索使用者狀態': '探索',
      '尊重使用者自主性？': '自主性',
      '模型端應使用者回應調整': '調整',
      '自傷回應': '安全'
    };
    const render = () => {
      const row = rows[topic];
      explorer.dataset.model = model;
      explorer.querySelectorAll('[data-model]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.model === model));
      });
      topics.querySelectorAll('button').forEach((button, index) => {
        button.setAttribute('aria-pressed', String(index === topic));
      });
      explorer.querySelector('.comparison-answer-text').textContent =
        row.cells[model === 'gemini' ? 1 : 2].textContent.trim();
    };
    rows.forEach((row, index) => {
      const button = document.createElement('button');
      const label = row.cells[0].textContent.trim();
      button.type = 'button';
      button.dataset.topic = String(index);
      button.textContent = shortLabels[label] || label;
      button.addEventListener('click', () => { topic = index; render(); });
      topics.append(button);
    });
    explorer.querySelectorAll('[data-model]').forEach((button) => {
      button.addEventListener('click', () => { model = button.dataset.model; render(); });
    });
    explorer.querySelectorAll('[data-view]').forEach((button) => {
      button.addEventListener('click', () => {
        view = button.dataset.view;
        interactive.hidden = view !== 'explore';
        tables.hidden = view !== 'table';
        models.hidden = view === 'table';
        explorer.querySelectorAll('[data-view]').forEach((item) => {
          item.setAttribute('aria-pressed', String(item.dataset.view === view));
        });
      });
    });
    explorer.querySelector('.comparison-toolbar').hidden = false;
    interactive.hidden = false;
    tables.hidden = true;
    render();
  });

  const research = document.querySelector('.aud-research');
  const expedition = research?.querySelector('.research-expedition');
  if (expedition) {
    // Source HTML remains a complete readable document without JavaScript.
    const english = document.documentElement.lang === 'en';
    const wrapper = research.querySelector('.research-experience');
    const experience = document.createElement('dialog');
    experience.className = 'research-experience research-dialog';
    experience.setAttribute('aria-label', english ? 'Explore the study' : '研究探索');
    experience.append(...wrapper.childNodes);
    wrapper.replaceWith(experience);
    const reopen = research.querySelector('.research-reopen');
    const overview = experience.querySelector('.research-overview');
    const stops = Array.from(expedition.querySelectorAll('.research-stops > .research-stop'));
    const orbs = Array.from(expedition.querySelectorAll('.research-orb'));
    const navigation = research.querySelector('.research-side-nav');
    const toggle = research.querySelector('.research-nav-toggle');
    const previous = expedition.querySelector('.research-prev');
    const nextStop = expedition.querySelector('.research-next');
    const position = expedition.querySelector('.research-position');
    let activeStop = 0;
    const reader = document.createElement('dialog');
    reader.className = 'research-reader';
    const readerToolbar = document.createElement('div');
    readerToolbar.className = 'research-reader-toolbar';
    const returnToRoad = document.createElement('button');
    returnToRoad.type = 'button';
    returnToRoad.textContent = english ? 'Back to the road' : '回到路上';
    const readerOverview = document.createElement('button');
    readerOverview.type = 'button';
    readerOverview.textContent = english ? 'Tables & figures' : '看資料總覽';
    readerToolbar.append(returnToRoad, readerOverview);
    reader.append(readerToolbar, expedition.querySelector('.research-stops'));
    expedition.append(reader);
    stops.forEach((stop) => { stop.querySelector('h2').id = `reader-${stop.id}`; });
    orbs.forEach((orb, index) => {
      orb.querySelector('.research-orb-number').textContent = `${index + 1}/5`;
      orb.setAttribute('aria-haspopup', 'dialog');
      orb.setAttribute('aria-label', `${index + 1} / 5 · ${orb.querySelector('.research-orb-label').textContent}`);
    });
    const quickNavigation = document.createElement('nav');
    quickNavigation.className = 'research-quick-nav';
    quickNavigation.setAttribute('aria-label', english ? 'Study stops' : '五站快捷連結');
    const quickLabels = english ? ['Why', 'Method', 'Ratings', 'Findings', 'Meaning'] : ['初衷', '做法', '評分', '觀察', '解讀'];
    stops.forEach((stop, index) => {
      const link = document.createElement('a');
      link.href = `#${stop.id}`;
      link.setAttribute('aria-haspopup', 'dialog');
      link.setAttribute('aria-label', orbs[index].getAttribute('aria-label'));
      link.title = orbs[index].querySelector('.research-orb-label').textContent;
      const number = document.createElement('span');
      number.className = 'research-quick-number';
      number.textContent = String(index + 1).padStart(2, '0');
      const label = document.createElement('span');
      label.className = 'research-quick-label';
      label.textContent = quickLabels[index];
      link.append(number, label);
      quickNavigation.append(link);
    });
    experience.querySelector('.research-experience-top').after(quickNavigation);
    const scene = createQuizJourney(experience.querySelector('.research-scene'), orbs);
    reopen.hidden = false;
    experience.querySelector('.research-experience-top').hidden = false;
    previous.textContent = english ? 'Go back' : '往回走';
    nextStop.textContent = english ? 'Walk on' : '往前走';

    const closeReader = (focus = true) => {
      if (reader.open) reader.close();
      if (focus) orbs[activeStop].focus({ preventScroll: true });
    };
    const setExperience = (open) => {
      research.classList.toggle('research-is-immersive', open);
      document.body.classList.toggle('research-open', open);
      if (open) {
        if (!experience.open) experience.showModal();
        scene?.start();
      } else {
        closeReader(false);
        if (experience.open) experience.close();
        scene?.stop();
      }
    };
    const markNavigation = (id) => {
      research.querySelectorAll('.research-side-nav a, .research-quick-nav a').forEach((link) => {
        if (link.hash === `#${id}`) link.setAttribute('aria-current', 'step');
        else link.removeAttribute('aria-current');
      });
    };
    const closeNavigation = (focus = false) => {
      navigation.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      if (focus) toggle.focus();
    };
    const updateHash = (id) => {
      if (location.hash !== `#${id}`) history.pushState(null, '', `#${id}`);
    };
    const travelTo = (index, updateHistory = false) => {
      closeReader(false);
      activeStop = Math.max(0, Math.min(stops.length - 1, index));
      stops.forEach((stop, i) => { stop.hidden = i !== activeStop; });
      orbs.forEach((orb, i) => {
        if (i === activeStop) orb.setAttribute('aria-current', 'step');
        else orb.removeAttribute('aria-current');
      });
      previous.disabled = activeStop === 0;
      nextStop.disabled = activeStop === stops.length - 1;
      const distance = document.createElement('span');
      distance.className = 'research-distance';
      distance.textContent = `${activeStop + 1} / ${stops.length}`;
      position.replaceChildren(distance, document.createTextNode(english ? 'Scroll or swipe to move' : '滾輪／上下滑動切換站點'));
      expedition.dataset.step = String(activeStop + 1);
      experience.dataset.step = String(activeStop + 1);
      markNavigation(stops[activeStop].id);
      scene?.setProgress(activeStop / (stops.length - 1));
      setExperience(true);
      closeNavigation();
      if (updateHistory) updateHash(stops[activeStop].id);
    };
    const openStop = (index, updateHistory = false, focus = true) => {
      travelTo(index, updateHistory);
      reader.dataset.side = activeStop % 2 ? 'right' : 'left';
      reader.setAttribute('aria-labelledby', `reader-${stops[activeStop].id}`);
      reader.showModal();
      reader.scrollTop = 0;
      if (focus) {
        const heading = stops[activeStop].querySelector('h2');
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
    };
    const visit = (id, updateHistory = false, focus = true) => {
      const target = document.getElementById(id);
      if (!target || !(research.contains(target) || target.closest('.aud-footer'))) return false;
      const stop = target.closest('.research-stop');
      if (stop) {
        openStop(stops.indexOf(stop), false, focus);
        for (let node = target; node && node !== stop; node = node.parentElement) {
          if (node.tagName === 'DETAILS') node.open = true;
        }
        if (target !== stop) {
          target.scrollIntoView({ block: 'start' });
          if (focus) {
            const heading = target.querySelector('h2, summary') || target;
            if (!heading.matches('summary, button, a[href], input, select, textarea')) heading.tabIndex = -1;
            heading.focus({ preventScroll: true });
          }
        }
      } else {
        setExperience(false);
        markNavigation('findings');
        target.scrollIntoView({ block: 'start' });
        if (focus) { target.tabIndex = -1; target.focus({ preventScroll: true }); }
      }
      closeNavigation();
      if (updateHistory) updateHash(id);
      return true;
    };
    const followHash = () => {
      let id;
      try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
      const index = stops.findIndex((stop) => stop.id === id);
      if (!id || index >= 0) travelTo(Math.max(0, index));
      else if (!visit(id, false, false)) travelTo(0);
    };

    research.classList.add('research-enhanced');
    reopen.addEventListener('click', () => travelTo(activeStop, true));
    overview.addEventListener('click', () => visit('findings', true));
    readerOverview.addEventListener('click', () => visit('findings', true));
    returnToRoad.addEventListener('click', () => closeReader());
    reader.addEventListener('cancel', (event) => { event.preventDefault(); event.stopPropagation(); closeReader(); });
    experience.addEventListener('cancel', (event) => {
      event.preventDefault();
      visit('findings', true);
      reopen.focus({ preventScroll: true });
    });
    orbs.forEach((orb, index) => orb.addEventListener('click', () => openStop(index, true)));
    previous.addEventListener('click', () => travelTo(activeStop - 1, true));
    nextStop.addEventListener('click', () => travelTo(activeStop + 1, true));
    // One deliberate gesture moves one stop; reader scrolling stays native.
    let gestureReadyAt = 0;
    const stepByGesture = (direction) => {
      const now = performance.now();
      if (now < gestureReadyAt) return;
      const target = activeStop - direction;
      if (target < 0 || target >= stops.length) return;
      gestureReadyAt = now + 650;
      travelTo(target, true);
    };
    let wheelTotal = 0;
    let wheelLastAt = 0;
    let wheelDirection = 0;
    let wheelLocked = false;
    experience.addEventListener('wheel', (event) => {
      if (!experience.open || reader.open || event.ctrlKey || event.metaKey) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      const now = performance.now();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1);
      const direction = Math.sign(delta);
      if (now - wheelLastAt > 200 || direction !== wheelDirection) {
        wheelTotal = 0;
        wheelLocked = false;
      }
      wheelLastAt = now;
      wheelDirection = direction;
      if (wheelLocked || now < gestureReadyAt) return;
      wheelTotal += delta;
      if (Math.abs(wheelTotal) >= 60) {
        wheelLocked = true;
        wheelTotal = 0;
        stepByGesture(direction);
      }
    }, { passive: false });
    let swipeStart = null;
    experience.addEventListener('touchstart', (event) => {
      const touch = event.touches[0];
      swipeStart = experience.open && !reader.open && event.touches.length === 1
        ? { x: touch.clientX, y: touch.clientY } : null;
    }, { passive: true });
    experience.addEventListener('touchmove', (event) => {
      if (!swipeStart || !experience.open || reader.open) { swipeStart = null; return; }
      if (event.touches.length !== 1) { swipeStart = null; return; }
      const touch = event.touches[0];
      const dx = touch.clientX - swipeStart.x;
      const dy = touch.clientY - swipeStart.y;
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) event.preventDefault();
    }, { passive: false });
    experience.addEventListener('touchend', (event) => {
      const start = swipeStart;
      swipeStart = null;
      if (!start || reader.open || !experience.open || event.touches.length) return;
      const touch = event.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - start.x;
      const dy = start.y - touch.clientY;
      if (Math.abs(dy) >= 55 && Math.abs(dy) > Math.abs(dx) * 1.25) {
        event.preventDefault();
        stepByGesture(Math.sign(dy));
      }
    }, { passive: false });
    experience.addEventListener('touchcancel', () => { swipeStart = null; });
    toggle.addEventListener('click', () => {
      const open = navigation.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    research.addEventListener('click', (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      if (visit(link.hash.slice(1), true)) event.preventDefault();
    });
    document.addEventListener('click', (event) => {
      if (!navigation.contains(event.target) && !toggle.contains(event.target)) closeNavigation();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && navigation.classList.contains('is-open')) closeNavigation(true);
    });
    window.addEventListener('hashchange', followHash);
    if (typeof IntersectionObserver === 'function') {
      const footer = document.querySelector('.aud-footer');
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.target === footer) research.classList.toggle('research-footer-visible', entry.isIntersecting);
        });
      }, { rootMargin: '-90px 0px 0px', threshold: 0 });
      if (footer) observer.observe(footer);
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) scene?.stop();
      else if (experience.open) scene?.start();
    });
    requestAnimationFrame(followHash);
  }

  document.querySelectorAll('[role="tablist"]').forEach((list) => {
    const tabs = Array.from(list.querySelectorAll('[role="tab"]'));
    const select = (tab, focus = false) => {
      for (const item of tabs) {
        const selected = item === tab;
        item.setAttribute('aria-selected', String(selected));
        item.tabIndex = selected ? 0 : -1;
        document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
      }
      if (focus) tab.focus();
    };
    for (const tab of tabs) {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', (event) => {
        const index = tabs.indexOf(tab);
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        if (next !== undefined) { event.preventDefault(); select(tabs[next], true); }
      });
    }
  });

  const replay = document.querySelector('.aud-replay');
  if (replay) replay.addEventListener('click', () => {
    const cards = document.querySelector('.aud-score-pair');
    cards.classList.remove('replay');
    requestAnimationFrame(() => requestAnimationFrame(() => cards.classList.add('replay')));
  });

  function createQuizJourney(canvas, stations = []) {
    if (!canvas) return null;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return null;
    const researchScene = Array.isArray(stations) && stations.length > 0;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const tau = Math.PI * 2, brainZ = 51;
    let width = 0, height = 0, focal = 1, horizon = 0, goalY = 0;
    let cameraZ = 0, targetZ = 0, running = false, frameId = 0;
    let cameraX = 0, aimX = 0, heartPulse = 1;
    let lastTime = 0, observer = null, foreground = null;
    const point = (x, y, z) => [x, y, z, 0, 0, 1];
    const road = [], lanterns = [], stars = [], heart = [], grooves = [], cerebellarFolds = [];
    const meteors = [], markers = [], placedMarkers = [], roadGates = [];
    const meteorStarts = [0,1.0,1.95,3.1,4.0,5.2,6.0,7.15,8.25,9.1,10.15,11.2];
    for (let i = 0; i < meteorStarts.length; i++) {
      const direction = i % 2 ? 1 : -1;
      meteors.push({ at: meteorStarts[i], duration: 1.35 + (i % 3) * 0.2,
        x: direction > 0 ? 0.05 + (i % 3) * 0.10 : 0.94 - (i % 3) * 0.11,
        y: 0.13 + (i * 0.19) % 0.53, dx: direction * (0.12 + (i % 4) * 0.035),
        dy: 0.16 + (i % 3) * 0.08, tail: 0.10 + (i % 4) * 0.02 });
    }
    function project(p, yOffset = 0, zOffset = 0) {
      const depth = p[2] + zOffset - cameraZ;
      p[5] = focal / Math.max(0.8, depth);
      p[3] = width / 2 + (p[0] - cameraX) * p[5] + aimX;
      p[4] = horizon - (p[1] + yOffset - 3) * p[5];
      return depth > 0.8;
    }
    function path(points, closed = false, yOffset = 0, zOffset = 0) {
      ctx.beginPath();
      for (let i = 0; i < points.length; i++) {
        project(points[i], yOffset, zOffset);
        if (i === 0) ctx.moveTo(points[i][3], points[i][4]);
        else ctx.lineTo(points[i][3], points[i][4]);
      }
      if (closed) ctx.closePath();
    }
    function smooth(points, closed = false, yOffset = 0, zOffset = 0) {
      for (const p of points) project(p, yOffset, zOffset);
      ctx.beginPath();
      const first = points[0], end = points[points.length - 1];
      if (closed) ctx.moveTo((first[3] + end[3]) / 2, (first[4] + end[4]) / 2);
      else ctx.moveTo(first[3], first[4]);
      for (let i = closed ? 0 : 1; i < points.length - 1; i++) {
        const p = points[i], next = points[i + 1];
        ctx.quadraticCurveTo(p[3], p[4], (p[3] + next[3]) / 2, (p[4] + next[4]) / 2);
      }
      if (closed) {
        ctx.quadraticCurveTo(end[3], end[4], (first[3] + end[3]) / 2, (first[4] + end[4]) / 2);
        ctx.closePath();
      } else ctx.lineTo(end[3], end[4]);
    }
    function roadCenter(z) { return Math.sin(z * 0.145 + 0.3) * 6.4 * Math.max(0, 1 - z / 55); }
    for (let z = 0; z <= 53; z += 0.5) {
      const x = roadCenter(z), y = -2.25 + Math.sin(z * 0.18) * 0.25;
      road.push([point(x - 1.65, y, z), point(x + 1.65, y, z)]);
    }
    for (let z = 5; z < 50; z += 5.4) {
      const side = Math.floor(z / 5.4) % 2 ? -1 : 1;
      lanterns.push(point(roadCenter(z) + side * 2.0, -1.4, z));
    }
    if (researchScene) {
      const chinese = (canvas.ownerDocument?.documentElement.lang || '').toLowerCase().startsWith('zh');
      for (const [z,label,side] of [[6,chinese ? '起點' : 'START',-1],[43,chinese ? '終點' : 'FINISH',1]]) {
        const lines = [];
        for (const offset of [0,z === 6 ? 0.25 : 0.65]) {
          const depth = z + offset, x = roadCenter(depth), y = -2.24 + Math.sin(depth * 0.18) * 0.25;
          lines.push([point(x - 1.61,y,depth),point(x + 1.61,y,depth)]);
        }
        roadGates.push({ z, label, side, lines, shoulder: point(roadCenter(z) + side * 1.94,-2.06 + Math.sin(z * 0.18) * 0.25,z) });
      }
    }
    if (researchScene) stations.slice(0,5).forEach((element,i) => {
      const z = 9 + i * 6.25, side = i % 2 ? 1 : -1, x = roadCenter(z) + side * 2.35;
      markers.push({ element, side, label: point(x,-0.6,z), ground: point(x,-2.25 + Math.sin(z * 0.18) * 0.25,z), x:0, y:0, w:0, h:0 });
      if (!element.hasAttribute('aria-label')) element.setAttribute('aria-label',element.textContent.replace(/\s+/g,' ').trim());
    });
    for (let i = 0; i < 96; i++) stars.push([
      (Math.sin(i * 127.1 + 9.7) * 43758.5453) % 1,
      (Math.sin(i * 311.7 + 2.8) * 19731.1321) % 1,
      0.40 + (i % 5) * 0.18, 0.17 + (i % 7) * 0.055
    ]);
    for (let i = 0; i <= 96; i++) {
      const t = i / 96 * tau, notch = Math.min(t, tau - t);
      heart.push(point(9.8 * Math.pow(Math.sin(t), 3),
        7 + 0.61 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))
        + 2.6 * Math.exp(-notch * notch / 0.24), brainZ - 0.5 + Math.sin(t) * 0.4));
    }
    // Lateral cerebral silhouette: frontal lobe at left, cerebellum below the rear.
    function brainPoint(u, v, rim = false) {
      const z = rim ? 0 : -2.65 * Math.sqrt(Math.max(0.03, 1 - u * u - v * v));
      return point(u * 5.65 + z * 0.09, 8.15 + v * 3.35 - u * 0.12, brainZ + z - u * 0.45);
    }
    const outline = [[-0.99,-0.18],[-1,0.1],[-0.93,0.52],[-0.76,0.83],[-0.45,1],[-0.07,1.06],
      [0.30,1],[0.60,0.84],[0.84,0.60],[0.98,0.25],[0.99,-0.08],[0.90,-0.42],[0.71,-0.57],
      [0.55,-0.58],[0.40,-0.40],[0.18,-0.52],[0.02,-0.78],[-0.25,-0.81],[-0.57,-0.65],[-0.83,-0.47]]
      .map(([u,v]) => brainPoint(u, v, true));
    const foldCoordinates = [
      [[-0.76,0.65],[-0.55,0.73],[-0.36,0.56],[-0.43,0.32],[-0.66,0.23],[-0.75,0.02]],
      [[-0.42,0.88],[-0.20,0.74],[-0.22,0.48],[-0.08,0.31],[-0.17,0.08]],
      [[-0.06,0.94],[0.13,0.72],[0.01,0.54],[0.16,0.36],[0.07,0.13]],
      [[0.25,0.86],[0.39,0.66],[0.31,0.47],[0.44,0.25],[0.33,0.06]],
      [[0.52,0.70],[0.66,0.49],[0.59,0.27],[0.72,0.08],[0.58,-0.12]],
      [[0.78,0.43],[0.85,0.19],[0.79,-0.01],[0.87,-0.17]],
      [[-0.91,0.26],[-0.77,0.37],[-0.64,0.47],[-0.55,0.36]],
      [[-0.89,-0.06],[-0.71,-0.08],[-0.58,0.06],[-0.42,0.02],[-0.34,0.16]],
      [[0.50,-0.22],[0.29,-0.13],[0.04,-0.18],[-0.22,-0.33],[-0.47,-0.26],[-0.67,-0.13]],
      [[-0.69,-0.39],[-0.47,-0.43],[-0.35,-0.57],[-0.18,-0.51],[-0.06,-0.34]],
      [[-0.22,-0.66],[-0.01,-0.58],[0.11,-0.39],[0.33,-0.33]],
      [[0.71,-0.31],[0.56,-0.39],[0.47,-0.29]]
    ];
    for (const fold of foldCoordinates) grooves.push(fold.map(([u,v]) => brainPoint(u,v)));
    const cerebellum = [], stem = [point(0.25,6.0,brainZ),point(1.4,5.2,brainZ),
      point(1.1,3.8,brainZ),point(0.20,1.7,brainZ),point(-0.65,1.9,brainZ),point(-0.20,4.4,brainZ)];
    for (let i = 0; i <= 48; i++) {
      const t = i / 48 * tau;
      cerebellum.push(point(3.05 + Math.cos(t) * 2.10,4.4 + Math.sin(t) * 1.48,brainZ - 0.5));
    }
    for (let row = -4; row <= 4; row++) {
      const v = row / 5, span = Math.sqrt(1 - v * v) * 1.85, line = [];
      for (let i = 0; i <= 6; i++) {
        const x = -span + i / 6 * span * 2;
        line.push(point(3.05 + x,4.4 + v * 1.43 + Math.sin(i / 6 * Math.PI) * 0.15,brainZ - 1.3));
      }
      cerebellarFolds.push(line);
    }
    const brainCenter = brainPoint(0,0), heartCenter = point(0,7,brainZ);

    function resize() {
      const bounds = canvas.getBoundingClientRect();
      if (bounds.width < 1 || bounds.height < 1) return;
      width = bounds.width; height = bounds.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr,0,0,dpr,0,0);
      // Reserve the lower region for the DOM question/result bubble, including 320px phones.
      const goalArea = width <= 680 ? Math.max(110,Math.min(height - 415,height * 0.38,300))
        : Math.max(180,Math.min(height * 0.50,height - 420));
      focal = researchScene ? Math.min(width * 0.86,height * 0.53) : Math.min(width * 0.86,goalArea * 1.02);
      goalY = researchScene ? Math.max(width <= 680 ? 180 : 210,height * (width <= 680 ? 0.27 : 0.28)) : goalArea * 0.45 + 12;
      foreground = ctx.createLinearGradient(0,height * 0.52,0,height);
      foreground.addColorStop(0,'rgba(8,9,20,0)'); foreground.addColorStop(1,'rgba(5,6,15,0.44)');
      if (running) draw(lastTime || performance.now());
    }
    function drawStars(time) {
      for (let i = 0; i < stars.length; i++) {
        const p = stars[i], alpha = p[3] + (reducedMotion.matches ? 0 : Math.sin(time * 0.00035 + i) * 0.035);
        ctx.fillStyle = i % 4 === 0 ? `rgba(202,211,239,${alpha})` : `rgba(250,232,213,${alpha})`;
        ctx.beginPath(); ctx.arc(Math.abs(p[0]) * width,Math.abs(p[1]) * height,p[2],0,tau); ctx.fill();
      }
      if (reducedMotion.matches) return;
      const cycle = (time * 0.001 + 2.1) % 12;
      const skyHeight = Math.min(height * 0.32,goalY * 1.65);
      for (const meteor of meteors) {
        const phase = ((cycle - meteor.at + 12) % 12) / meteor.duration;
        if (phase < 0 || phase > 1) continue;
        const fade = Math.pow(Math.sin(phase * Math.PI),1.2) * 0.36;
        const dx = width * meteor.dx, dy = skyHeight * meteor.dy;
        const x = width * meteor.x + phase * dx, y = skyHeight * meteor.y + phase * dy;
        const length = Math.min(110,width * meteor.tail), distance = Math.hypot(dx,dy);
        const tailX = x - dx / distance * length, tailY = y - dy / distance * length;
        const tail = ctx.createLinearGradient(x,y,tailX,tailY);
        tail.addColorStop(0,`rgba(255,237,218,${fade})`);
        tail.addColorStop(0.25,`rgba(211,203,233,${fade * 0.48})`); tail.addColorStop(1,'rgba(174,177,219,0)');
        ctx.strokeStyle = tail; ctx.lineWidth = 1; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(tailX,tailY); ctx.stroke();
      }
    }
    function drawRoad() {
      ctx.lineJoin = 'round';
      for (let i = road.length - 2; i >= 0; i--) {
        const near = road[i], far = road[i + 1];
        if (near[0][2] < cameraZ + 1.4) continue;
        project(near[0]); project(near[1]); project(far[0]); project(far[1]);
        if (far[0][4] > height + 50 && near[0][4] > height + 50) continue;
        ctx.beginPath(); ctx.moveTo(near[0][3],near[0][4]); ctx.lineTo(far[0][3],far[0][4]);
        ctx.lineTo(far[1][3],far[1][4]); ctx.lineTo(near[1][3],near[1][4]); ctx.closePath();
        ctx.fillStyle = i % 8 < 4 ? '#3e3048' : '#392c43'; ctx.fill();
        ctx.beginPath(); ctx.moveTo(near[1][3],near[1][4]); ctx.lineTo(far[1][3],far[1][4]);
        ctx.strokeStyle = 'rgba(188,144,173,0.58)'; ctx.lineWidth = Math.max(0.8,near[1][5] * 0.055); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(near[0][3],near[0][4]); ctx.lineTo(far[0][3],far[0][4]);
        ctx.strokeStyle = 'rgba(248,219,187,0.82)'; ctx.lineWidth = Math.max(0.9,near[0][5] * 0.048); ctx.stroke();
      }
      for (const p of lanterns) {
        if (!project(p) || p[4] > height + 30) continue;
        const r = Math.min(12,p[5] * 0.20), glow = ctx.createRadialGradient(p[3],p[4],0,p[3],p[4],r * 4);
        glow.addColorStop(0,'rgba(255,232,193,0.65)'); glow.addColorStop(0.25,'rgba(232,175,143,0.19)'); glow.addColorStop(1,'rgba(221,152,162,0)');
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(p[3],p[4],r * 4,0,tau); ctx.fill();
        ctx.fillStyle = '#fff0d8'; ctx.beginPath(); ctx.ellipse(p[3],p[4],r * 0.27,r * 0.42,-0.1,0,tau); ctx.fill();
      }
    }
    function drawRoadGates() {
      ctx.save(); ctx.lineCap = 'butt'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      for (const gate of roadGates) {
        if (gate.z < cameraZ + 1.5) continue;
        for (let i = 0; i < gate.lines.length; i++) {
          const line = gate.lines[i];
          project(line[0]); project(line[1]);
          ctx.beginPath(); ctx.moveTo(line[0][3],line[0][4]); ctx.lineTo(line[1][3],line[1][4]);
          ctx.strokeStyle = i === 0 ? '#fff0d6' : '#efa995';
          ctx.lineWidth = Math.max(1.2,Math.min(3,line[0][5] * 0.045)); ctx.stroke();
        }
        if (gate.z === 6 ? cameraZ >= 6 : cameraZ < 21.875) continue;
        project(gate.shoulder);
        const p = gate.shoulder, size = Math.max(10,Math.min(13,p[5] * 0.17));
        ctx.font = `600 ${size}px system-ui, sans-serif`; ctx.fillStyle = '#ffe7cc';
        ctx.textAlign = gate.side < 0 ? 'right' : 'left';
        ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
        ctx.fillText(gate.label,p[3] + gate.side * 4,p[4]); ctx.shadowBlur = 0;
      }
      ctx.restore();
    }
    function drawStations() {
      const current = Math.min(markers.length - 1,Math.round(cameraZ / 6.25)), mobile = width <= 680;
      placedMarkers.length = 0;
      for (let i = 0; i < markers.length; i++) {
        const marker = markers[i], element = marker.element, depth = marker.label[2] - cameraZ;
        const distant = i > current;
        let visible = i >= current && i <= current + 2 && depth > 1.2;
        element.classList.toggle('is-distant',distant);
        if (visible) {
          project(marker.label); project(marker.ground);
          const scale = distant ? 1 : Math.max(0.9,Math.min(1.05,1 + (9 - depth) * 0.012));
          marker.w = (distant ? (mobile ? 58 : 70) : (mobile ? 128 : 180)) * scale;
          marker.h = (distant ? (mobile ? 48 : 54) : (mobile ? 84 : 76)) * scale;
          const minY = (mobile ? 96 : 110) + marker.h;
          marker.x = Math.max(12 + marker.w / 2,Math.min(width - 12 - marker.w / 2,marker.label[3]));
          marker.x = marker.side < 0 ? Math.min(marker.x,width * 0.43) : Math.max(marker.x,width * 0.57);
          marker.y = Math.max(minY,Math.min(height - 94,marker.label[4]));
          for (const nearer of placedMarkers) {
            if (Math.abs(marker.x - nearer.x) < (marker.w + nearer.w) / 2 + 10 && marker.y > nearer.y - nearer.h - 10 && marker.y - marker.h < nearer.y + 10)
              marker.y = Math.max(minY,Math.min(marker.y,nearer.y - nearer.h - 12));
          }
          for (const nearer of placedMarkers) {
            if (Math.abs(marker.x - nearer.x) < (marker.w + nearer.w) / 2 + 10 && marker.y > nearer.y - nearer.h - 10 && marker.y - marker.h < nearer.y + 10) visible = false;
          }
          if (visible) {
            placedMarkers.push(marker);
            element.style.setProperty('--marker-x',`${marker.x.toFixed(2)}px`);
            element.style.setProperty('--marker-y',`${marker.y.toFixed(2)}px`);
            element.style.setProperty('--marker-scale',scale.toFixed(3));
            const ground = marker.ground, r = Math.min(10,Math.max(2.5,ground[5] * 0.13));
            const beam = ctx.createLinearGradient(marker.x,marker.y,ground[3],ground[4]);
            beam.addColorStop(0,distant ? 'rgba(201,172,218,0.32)' : 'rgba(255,208,156,0.75)');
            beam.addColorStop(1,'rgba(255,203,158,0.07)');
            ctx.strokeStyle = beam; ctx.lineWidth = distant ? 1 : 1.5;
            ctx.beginPath(); ctx.moveTo(marker.x,marker.y); ctx.lineTo(ground[3],ground[4]); ctx.stroke();
            ctx.strokeStyle = distant ? 'rgba(195,158,208,0.46)' : 'rgba(255,210,161,0.88)';
            ctx.beginPath(); ctx.ellipse(ground[3],ground[4],r * 1.65,r * 0.48,0,0,tau); ctx.stroke();
          }
        }
        element.style.visibility = visible ? 'visible' : 'hidden';
        element.style.pointerEvents = visible ? 'auto' : 'none';
        element.tabIndex = visible ? 0 : -1;
      }
    }
    function drawHeart(float,front) {
      project(heartCenter,float);
      const s = heartCenter[5], x = heartCenter[3], y = heartCenter[4], arrival = cameraZ / 25;
      ctx.save(); ctx.translate(x,y); ctx.scale(heartPulse,heartPulse); ctx.translate(-x,-y);
      if (!front) {
        const aura = ctx.createRadialGradient(x,y,s * 2,x,y,s * 15);
        aura.addColorStop(0,`rgba(235,143,183,${researchScene ? 0.08 + arrival * 0.19 : 0.07 + arrival * 0.10})`); aura.addColorStop(1,'rgba(176,117,179,0)');
        ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(x,y,s * 15,0,tau); ctx.fill();
      }
      path(heart,true,float,front ? -2.2 : 2.4);
      if (!front) {
        const glass = ctx.createRadialGradient(x - 4 * s,y - 5 * s,s,x,y,12 * s);
        glass.addColorStop(0,'rgba(255,222,235,0.17)'); glass.addColorStop(0.60,'rgba(179,142,191,0.025)'); glass.addColorStop(1,'rgba(220,162,195,0.16)');
        ctx.fillStyle = glass; ctx.fill(); ctx.strokeStyle = 'rgba(219,170,206,0.27)';
        ctx.lineWidth = Math.max(1,s * 0.07); ctx.stroke();
      } else {
        const sheen = ctx.createLinearGradient(x - 8 * s,y - 10 * s,x + 5 * s,y + 6 * s);
        sheen.addColorStop(0,'rgba(255,237,230,0)'); sheen.addColorStop(0.23,'rgba(255,237,230,0)');
        sheen.addColorStop(0.33,'rgba(255,237,230,0.065)'); sheen.addColorStop(0.45,'rgba(255,237,230,0)');
        sheen.addColorStop(1,'rgba(150,168,220,0.015)'); ctx.fillStyle = sheen; ctx.fill();
        const edge = ctx.createLinearGradient(x - 9 * s,y - 8 * s,x + 8 * s,y + 7 * s);
        edge.addColorStop(0,'rgba(255,238,231,0.93)'); edge.addColorStop(0.25,'rgba(246,182,214,0.62)');
        edge.addColorStop(0.52,'rgba(154,175,224,0.42)'); edge.addColorStop(0.74,'rgba(144,110,177,0.35)');
        edge.addColorStop(1,'rgba(255,227,221,0.86)'); ctx.strokeStyle = edge; ctx.lineWidth = Math.max(1.1,s * 0.075); ctx.stroke();
        ctx.beginPath();
        for (let i = 55; i <= 68; i++) {
          const p = heart[i]; project(p,float - 0.2,-2.4);
          if (i === 55) ctx.moveTo(p[3] + s * 0.35,p[4]); else ctx.lineTo(p[3] + s * 0.35,p[4]);
        }
        ctx.strokeStyle = 'rgba(255,238,236,0.74)'; ctx.lineWidth = Math.max(1.4,s * 0.16); ctx.lineCap = 'round'; ctx.stroke();
      }
      ctx.restore();
    }
    function drawBrain(float) {
      project(brainCenter,float);
      const p = brainCenter, s = p[5];
      smooth(stem,true,float); ctx.fillStyle = '#a76e92'; ctx.fill();
      const small = ctx.createLinearGradient(p[3],p[4] + s * 2,p[3] + s * 5,p[4] + s * 6);
      small.addColorStop(0,'#e3b1c8'); small.addColorStop(0.48,'#b47c9f'); small.addColorStop(1,'#704769');
      smooth(cerebellum,true,float); ctx.fillStyle = small; ctx.fill();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const fold of cerebellarFolds) {
        smooth(fold,false,float); ctx.strokeStyle = 'rgba(105,51,81,0.47)'; ctx.lineWidth = Math.max(0.65,s * 0.055); ctx.stroke();
      }
      const fill = ctx.createRadialGradient(p[3] - s * 2.0,p[4] - s * 1.8,s * 0.1,p[3],p[4],s * 6.1);
      fill.addColorStop(0,researchScene ? `rgb(255,${Math.round(229 + cameraZ * 0.44)},${Math.round(232 - cameraZ * 0.2)})` : '#ffe8e4');
      fill.addColorStop(0.32,'#e7bbd0'); fill.addColorStop(0.62,'#c38cab');
      fill.addColorStop(0.84,'#925f87'); fill.addColorStop(1,'#633d6c');
      smooth(outline,true,float); ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = 'rgba(248,204,218,0.40)'; ctx.lineWidth = Math.max(0.7,s * 0.055); ctx.stroke();
      for (const fold of grooves) {
        smooth(fold,false,float - 0.095); ctx.strokeStyle = 'rgba(255,229,235,0.58)'; ctx.lineWidth = Math.max(1.2,s * 0.13); ctx.stroke();
        smooth(fold,false,float); ctx.strokeStyle = 'rgba(106,58,95,0.51)'; ctx.lineWidth = Math.max(0.75,s * 0.068); ctx.stroke();
      }
    }
    function draw(time) {
      if (!width || !height) return;
      // Aim at the destination while dollying forward, so the heart stays above the UI.
      horizon = goalY + 4 * focal / (brainZ - cameraZ);
      cameraX = researchScene ? roadCenter(cameraZ + 9) * 0.72 : 0;
      aimX = cameraX * focal / (brainZ - cameraZ);
      const pulseTime = time * 0.001 % 5;
      heartPulse = reducedMotion.matches ? 1 : 1 + Math.min(0.038,0.034 * (Math.exp(-Math.pow((pulseTime - 0.24) / 0.13,2)) + 0.66 * Math.exp(-Math.pow((pulseTime - 0.60) / 0.17,2))));
      ctx.fillStyle = '#000'; ctx.fillRect(0,0,width,height);
      drawStars(time);
      drawRoad();
      if (researchScene) { drawRoadGates(); drawStations(); }
      drawHeart(0,false); drawBrain(0); drawHeart(0,true);
      if (!researchScene) { ctx.fillStyle = foreground; ctx.fillRect(0,0,width,height); }
    }
    function tick(time) {
      if (!running) return;
      const elapsed = Math.min(64,lastTime ? time - lastTime : 16); lastTime = time;
      cameraZ = reducedMotion.matches ? targetZ : cameraZ + (targetZ - cameraZ) * (1 - Math.exp(-elapsed / 650));
      draw(time);
      if (!reducedMotion.matches) frameId = requestAnimationFrame(tick); else frameId = 0;
    }
    function motionChanged() {
      if (!running) return;
      cancelAnimationFrame(frameId); frameId = requestAnimationFrame(tick);
    }
    return {
      start() {
        if (running) return;
        running = true; lastTime = 0; resize();
        if (typeof ResizeObserver === 'function') { observer = new ResizeObserver(resize); observer.observe(canvas); }
        else window.addEventListener('resize',resize);
        reducedMotion.addEventListener('change',motionChanged); frameId = requestAnimationFrame(tick);
      },
      stop() {
        running = false; cancelAnimationFrame(frameId); frameId = 0;
        if (observer) observer.disconnect(); observer = null;
        window.removeEventListener('resize',resize); reducedMotion.removeEventListener('change',motionChanged);
      },
      setProgress(fraction) {
        targetZ = Math.max(0,Math.min(1,Number(fraction) || 0)) * 25;
        if (!running || reducedMotion.matches) cameraZ = targetZ;
        if (running && reducedMotion.matches) draw(lastTime || performance.now());
      }
    };
  }
})();
