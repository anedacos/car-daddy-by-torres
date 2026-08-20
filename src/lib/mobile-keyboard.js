const EDITABLE_SELECTOR = [
  'input:not([type="hidden"]):not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[contenteditable="true"]',
].join(',');

const NON_TYPING_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
]);

function getEditableElement(target) {
  if (!(target instanceof Element)) return null;
  const element = target.closest(EDITABLE_SELECTOR);
  if (!element) return null;
  if (element instanceof HTMLInputElement && NON_TYPING_INPUT_TYPES.has(element.type)) return null;
  return element;
}

function getScrollableParent(element) {
  let current = element.parentElement;
  while (current && current !== document.body) {
    const style = window.getComputedStyle(current);
    if (/(auto|scroll)/.test(style.overflowY) && current.scrollHeight > current.clientHeight) return current;
    current = current.parentElement;
  }
  return null;
}

export function installMobileKeyboardGuard() {
  const root = document.documentElement;
  const viewport = window.visualViewport;
  const timers = new Set();
  let frame = 0;
  let baselineHeight = viewport?.height ?? window.innerHeight;

  const currentViewportHeight = () => viewport?.height ?? window.innerHeight;

  const syncKeyboardState = () => {
    const focused = getEditableElement(document.activeElement);
    const currentHeight = currentViewportHeight();

    if (!focused) baselineHeight = currentHeight;
    else baselineHeight = Math.max(baselineHeight, currentHeight);

    const keyboardInset = focused ? Math.max(0, baselineHeight - currentHeight) : 0;
    root.style.setProperty('--keyboard-inset', `${Math.round(keyboardInset)}px`);
    root.classList.toggle('keyboard-open', keyboardInset > 100);
  };

  const keepFocusedFieldVisible = (forceUpperPosition = false) => {
    syncKeyboardState();
    const focused = getEditableElement(document.activeElement);
    if (!focused) return;

    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportHeight = currentViewportHeight();
    const viewportBottom = viewportTop + viewportHeight;
    const safeTop = viewportTop + 88;
    const safeBottom = viewportBottom - 24;
    const rect = focused.getBoundingClientRect();
    const targetTop = viewportTop + Math.min(170, Math.max(112, viewportHeight * 0.2));

    root.style.setProperty('--keyboard-safe-top', `${Math.round(targetTop)}px`);
    if (rect.top < safeTop || rect.bottom > safeBottom || (forceUpperPosition && rect.top > targetTop + 20)) {
      const scrollParent = getScrollableParent(focused);
      const correction = rect.top - targetTop;
      if (scrollParent) scrollParent.scrollTop += correction;
      else window.scrollBy({ top: correction, left: 0, behavior: 'auto' });
    }
  };

  const scheduleVisibilityCheck = (delay = 0, forceUpperPosition = false) => {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => keepFocusedFieldVisible(forceUpperPosition));
    }, delay);
    timers.add(timer);
  };

  const handleFocus = (event) => {
    if (!getEditableElement(event.target)) return;
    syncKeyboardState();
    scheduleVisibilityCheck(60, true);
    scheduleVisibilityCheck(280, true);
    scheduleVisibilityCheck(620, true);
    scheduleVisibilityCheck(950, true);
  };

  const handleViewportChange = () => scheduleVisibilityCheck(0, true);
  const handleBlur = () => scheduleVisibilityCheck(180);
  const handleOrientationChange = () => {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      baselineHeight = currentViewportHeight();
      scheduleVisibilityCheck();
    }, 350);
    timers.add(timer);
  };

  document.addEventListener('focusin', handleFocus);
  document.addEventListener('focusout', handleBlur);
  window.addEventListener('resize', handleViewportChange);
  window.addEventListener('orientationchange', handleOrientationChange);
  viewport?.addEventListener('resize', handleViewportChange);
  viewport?.addEventListener('scroll', handleViewportChange);
  syncKeyboardState();

  return () => {
    document.removeEventListener('focusin', handleFocus);
    document.removeEventListener('focusout', handleBlur);
    window.removeEventListener('resize', handleViewportChange);
    window.removeEventListener('orientationchange', handleOrientationChange);
    viewport?.removeEventListener('resize', handleViewportChange);
    viewport?.removeEventListener('scroll', handleViewportChange);
    timers.forEach((timer) => window.clearTimeout(timer));
    window.cancelAnimationFrame(frame);
    root.classList.remove('keyboard-open');
    root.style.removeProperty('--keyboard-inset');
    root.style.removeProperty('--keyboard-safe-top');
  };
}
