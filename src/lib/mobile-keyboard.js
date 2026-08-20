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

  const keepFocusedFieldVisible = () => {
    syncKeyboardState();
    const focused = getEditableElement(document.activeElement);
    if (!focused) return;

    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportBottom = viewportTop + currentViewportHeight();
    const safeTop = viewportTop + 88;
    const safeBottom = viewportBottom - 24;
    const rect = focused.getBoundingClientRect();

    if (rect.top < safeTop || rect.bottom > safeBottom) {
      focused.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    }
  };

  const scheduleVisibilityCheck = (delay = 0) => {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(keepFocusedFieldVisible);
    }, delay);
    timers.add(timer);
  };

  const handleFocus = (event) => {
    if (!getEditableElement(event.target)) return;
    syncKeyboardState();
    scheduleVisibilityCheck(60);
    scheduleVisibilityCheck(260);
    scheduleVisibilityCheck(520);
  };

  const handleViewportChange = () => scheduleVisibilityCheck();
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
  };
}
