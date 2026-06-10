import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import VariableProximity from './VariableProximity';
import { useMediaQuery } from '../hooks/useMediaQuery';
import './StaggeredMenu.css';

export interface StaggeredMenuItem {
  label: string;
  ariaLabel: string;
  link: string;
}

export interface StaggeredMenuProps {
  position?: 'left' | 'right';
  colors?: string[];
  items?: StaggeredMenuItem[];
  displayItemNumbering?: boolean;
  className?: string;
  menuButtonColor?: string;
  openMenuButtonColor?: string;
  accentColor?: string;
  changeMenuColorOnOpen?: boolean;
  closeOnClickAway?: boolean;
  onMenuOpen?: () => void;
  onMenuClose?: () => void;
  isFixed?: boolean;
  /** Controlled open state. When provided the menu is driven by the parent. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Custom panel content (e.g. node details). Replaces the default item list. */
  body?: React.ReactNode;
}

export const StaggeredMenu: React.FC<StaggeredMenuProps> = ({
  position = 'left',
  colors = ['#B497CF', '#5227FF'],
  items = [],
  displayItemNumbering = true,
  className,
  menuButtonColor = '#fff',
  openMenuButtonColor = '#fff',
  changeMenuColorOnOpen = true,
  accentColor = '#5227FF',
  isFixed = false,
  closeOnClickAway = true,
  onMenuOpen,
  onMenuClose,
  open: controlledOpen,
  onOpenChange,
  body
}: StaggeredMenuProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = useCallback(
    (v: boolean) => {
      if (onOpenChange) onOpenChange(v);
      else setInternalOpen(v);
    },
    [onOpenChange]
  );

  const panelRef = useRef<HTMLDivElement | null>(null);
  const preLayersRef = useRef<HTMLDivElement | null>(null);
  const preLayerElsRef = useRef<HTMLElement[]>([]);
  const plusHRef = useRef<HTMLSpanElement | null>(null);
  const plusVRef = useRef<HTMLSpanElement | null>(null);
  const iconRef = useRef<HTMLSpanElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);

  const openTlRef = useRef<gsap.core.Timeline | null>(null);
  const closeTweenRef = useRef<gsap.core.Tween | null>(null);
  const spinTweenRef = useRef<gsap.core.Tween | null>(null);
  const colorTweenRef = useRef<gsap.core.Tween | null>(null);
  const toggleBtnRef = useRef<HTMLButtonElement | null>(null);
  const busyRef = useRef(false);
  const itemEntranceTweenRef = useRef<gsap.core.Tween | null>(null);

  // ---- Mobile bottom-sheet state & drag ---------------------------------
  // On mobile the Info panel is a persistent bottom sheet with two snap points:
  // 'peek' (always visible, tall enough to show the node's description) and
  // 'full' (dragged up to reveal everything). It is never fully hidden, and
  // selecting a node never auto-expands it — the flowchart stays visible behind.
  type Snap = 'peek' | 'full';
  // Height (px) left visible at the peek snap — just enough for the drag notch,
  // the node header and its description; actions stay hidden until pulled up.
  const PEEK_VISIBLE = 200;
  // The bottom sheet is portrait-only; landscape (incl. mobile landscape) keeps
  // the desktop-style side panel.
  const isBottomSheet = useMediaQuery('(max-width: 640px) and (orientation: portrait)');
  const [sheetSnap, setSheetSnap] = useState<Snap>('peek');
  const [dragTranslate, setDragTranslate] = useState<number | null>(null);
  const dragTranslateRef = useRef<number | null>(null);
  const dragRef = useRef({ active: false, startY: 0, base: 0, height: 0, lastY: 0, lastT: 0, vel: 0 });

  const setDT = useCallback((v: number | null) => {
    dragTranslateRef.current = v;
    setDragTranslate(v);
  }, []);

  // px offset (from fully open) for each snap point, given the sheet height.
  const snapToPx = (snap: Snap, h: number) => (snap === 'full' ? 0 : Math.max(0, h - PEEK_VISIBLE));

  const onHandleDown = useCallback(
    (e: React.PointerEvent) => {
      const panel = panelRef.current;
      if (!panel) return;
      const h = panel.offsetHeight;
      const d = dragRef.current;
      d.active = true;
      d.startY = e.clientY;
      d.base = snapToPx(sheetSnap, h);
      d.height = h;
      d.lastY = e.clientY;
      d.lastT = performance.now();
      d.vel = 0;
      setDT(d.base);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [sheetSnap, setDT]
  );

  const onHandleMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d.active) return;
      const now = performance.now();
      let t = d.base + (e.clientY - d.startY);
      // clamp between fully open (0) and the peek floor — never below peek
      t = Math.max(0, Math.min(Math.max(0, d.height - PEEK_VISIBLE), t));
      const dt = now - d.lastT;
      if (dt > 0) {
        d.vel = (e.clientY - d.lastY) / dt; // px/ms, positive = downward
        d.lastY = e.clientY;
        d.lastT = now;
      }
      setDT(t);
    },
    [setDT]
  );

  const onHandleUp = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d.active) return;
      d.active = false;
      const h = d.height || 1;
      const peekPx = Math.max(0, h - PEEK_VISIBLE);
      const t = dragTranslateRef.current ?? d.base;
      const v = d.vel;
      let next: Snap;
      if (v < -0.55) next = 'full'; // flick up
      else if (v > 0.55) next = 'peek'; // flick down
      else next = t < peekPx / 2 ? 'full' : 'peek'; // otherwise nearest
      setDT(null);
      setSheetSnap(next);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* pointer already released */
      }
    },
    [setDT]
  );

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const panel = panelRef.current;
      const preContainer = preLayersRef.current;
      const plusH = plusHRef.current;
      const plusV = plusVRef.current;
      const icon = iconRef.current;
      if (!panel || !plusH || !plusV || !icon) return;

      gsap.set(plusH, { transformOrigin: '50% 50%', rotate: 0 });
      gsap.set(plusV, { transformOrigin: '50% 50%', rotate: 90 });
      gsap.set(icon, { rotate: 0, transformOrigin: '50% 50%' });
      if (toggleBtnRef.current) gsap.set(toggleBtnRef.current, { color: menuButtonColor });

      // Mobile uses the CSS bottom-sheet (transform driven by React), so skip
      // the GSAP side-panel positioning entirely.
      if (isBottomSheet) return;

      let preLayers: HTMLElement[] = [];
      if (preContainer) {
        preLayers = Array.from(preContainer.querySelectorAll('.sm-prelayer')) as HTMLElement[];
      }
      preLayerElsRef.current = preLayers;

      const offscreen = position === 'left' ? -100 : 100;
      gsap.set([panel, ...preLayers], { xPercent: offscreen, opacity: 1 });
      if (preContainer) {
        gsap.set(preContainer, { xPercent: 0, opacity: 1 });
      }
    });
    return () => ctx.revert();
  }, [menuButtonColor, position, isBottomSheet]);

  const buildOpenTimeline = useCallback(() => {
    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return null;

    openTlRef.current?.kill();
    if (closeTweenRef.current) {
      closeTweenRef.current.kill();
      closeTweenRef.current = null;
    }
    itemEntranceTweenRef.current?.kill();

    const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel')) as HTMLElement[];
    const numberEls = Array.from(
      panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item')
    ) as HTMLElement[];

    const offscreen = position === 'left' ? -100 : 100;

    if (itemEls.length) {
      gsap.set(itemEls, { yPercent: 140, rotate: 10 });
    }
    if (numberEls.length) {
      gsap.set(numberEls, { '--sm-num-opacity': 0 });
    }

    const tl = gsap.timeline({ paused: true });

    // Single slide: the panel and its colour layers move in together as one
    // motion (no staggered pre-layers), so it reads as one panel opening.
    const panelInsertTime = 0;
    const panelDuration = 0.5;
    tl.fromTo(
      [panel, ...layers],
      { xPercent: offscreen },
      { xPercent: 0, duration: panelDuration, ease: 'power4.out' },
      panelInsertTime
    );

    if (itemEls.length) {
      const itemsStartRatio = 0.15;
      const itemsStart = panelInsertTime + panelDuration * itemsStartRatio;
      tl.to(
        itemEls,
        {
          yPercent: 0,
          rotate: 0,
          duration: 1,
          ease: 'power4.out',
          stagger: { each: 0.1, from: 'start' }
        },
        itemsStart
      );
      if (numberEls.length) {
        tl.to(
          numberEls,
          {
            duration: 0.6,
            ease: 'power2.out',
            '--sm-num-opacity': 1,
            stagger: { each: 0.08, from: 'start' }
          },
          itemsStart + 0.1
        );
      }
    }

    openTlRef.current = tl;
    return tl;
  }, [position]);

  const playOpen = useCallback(() => {
    if (busyRef.current) return;
    busyRef.current = true;
    const tl = buildOpenTimeline();
    if (tl) {
      tl.eventCallback('onComplete', () => {
        busyRef.current = false;
      });
      tl.play(0);
    } else {
      busyRef.current = false;
    }
  }, [buildOpenTimeline]);

  const playClose = useCallback(() => {
    openTlRef.current?.kill();
    openTlRef.current = null;
    itemEntranceTweenRef.current?.kill();

    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return;

    const all: HTMLElement[] = [...layers, panel];
    closeTweenRef.current?.kill();
    const offscreen = position === 'left' ? -100 : 100;
    closeTweenRef.current = gsap.to(all, {
      xPercent: offscreen,
      duration: 0.32,
      ease: 'power3.in',
      overwrite: 'auto',
      onComplete: () => {
        busyRef.current = false;
      }
    });
  }, [position]);

  const animateIcon = useCallback((opening: boolean) => {
    const icon = iconRef.current;
    if (!icon) return;
    spinTweenRef.current?.kill();
    if (opening) {
      spinTweenRef.current = gsap.to(icon, { rotate: 225, duration: 0.8, ease: 'power4.out', overwrite: 'auto' });
    } else {
      spinTweenRef.current = gsap.to(icon, { rotate: 0, duration: 0.35, ease: 'power3.inOut', overwrite: 'auto' });
    }
  }, []);

  const animateColor = useCallback(
    (opening: boolean) => {
      const btn = toggleBtnRef.current;
      if (!btn) return;
      colorTweenRef.current?.kill();
      if (changeMenuColorOnOpen) {
        const targetColor = opening ? openMenuButtonColor : menuButtonColor;
        colorTweenRef.current = gsap.to(btn, { color: targetColor, delay: 0.18, duration: 0.3, ease: 'power2.out' });
      } else {
        gsap.set(btn, { color: menuButtonColor });
      }
    },
    [openMenuButtonColor, menuButtonColor, changeMenuColorOnOpen]
  );

  // Run open/close animations whenever the (possibly controlled) open changes.
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (isBottomSheet) {
      if (open) onMenuOpen?.();
      else onMenuClose?.();
    } else if (open) {
      onMenuOpen?.();
      playOpen();
    } else {
      onMenuClose?.();
      playClose();
    }
    animateIcon(open);
    animateColor(open);
  }, [open, isBottomSheet, playOpen, playClose, animateIcon, animateColor, onMenuOpen, onMenuClose]);

  const toggleMenu = useCallback(() => setOpen(!open), [setOpen, open]);
  const closeMenu = useCallback(() => {
    if (open) setOpen(false);
  }, [setOpen, open]);

  useEffect(() => {
    if (!closeOnClickAway || !open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        toggleBtnRef.current &&
        !toggleBtnRef.current.contains(event.target as Node)
      ) {
        closeMenu();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeOnClickAway, open, closeMenu]);

  const sheetTranslate =
    dragTranslate != null
      ? `${dragTranslate}px`
      : sheetSnap === 'full'
        ? '0%'
        : `calc(100% - ${PEEK_VISIBLE}px)`;

  const panelStyle: React.CSSProperties | undefined = isBottomSheet
    ? {
        transform: `translateY(${sheetTranslate})`,
        transition: dragTranslate != null ? 'none' : 'transform 0.34s cubic-bezier(0.32, 0.72, 0, 1)'
      }
    : undefined;

  return (
    <div
      className={(className ? className + ' ' : '') + 'staggered-menu-wrapper' + (isFixed ? ' fixed-wrapper' : '')}
      style={accentColor ? { ['--sm-accent' as any]: accentColor } : undefined}
      data-position={position}
      data-open={open || undefined}
    >
      <div ref={preLayersRef} className="sm-prelayers" aria-hidden="true">
        {(() => {
          const raw = colors && colors.length ? colors.slice(0, 4) : ['#1e1e22', '#35353c'];
          let arr = [...raw];
          if (arr.length >= 3) {
            const mid = Math.floor(arr.length / 2);
            arr.splice(mid, 1);
          }
          return arr.map((c, i) => <div key={i} className="sm-prelayer" style={{ background: c }} />);
        })()}
      </div>

      <header className="staggered-menu-header" aria-label="Main navigation header">
        <button
          ref={toggleBtnRef}
          className="sm-toggle"
          aria-label={open ? 'Close info' : 'Open info'}
          aria-expanded={open}
          aria-controls="staggered-menu-panel"
          onClick={toggleMenu}
          type="button"
        >
          <span ref={iconRef} className="sm-icon" aria-hidden="true">
            <span ref={plusHRef} className="sm-icon-line" />
            <span ref={plusVRef} className="sm-icon-line sm-icon-line-v" />
          </span>
          <span ref={labelRef} className="sm-toggle-label">
            <VariableProximity
              label={open ? 'Close' : 'Info'}
              className="sm-toggle-vp"
              fromFontVariationSettings="'wght' 400"
              toFontVariationSettings="'wght' 700"
              containerRef={labelRef}
              radius={70}
              falloff="linear"
            />
          </span>
        </button>
      </header>

      <aside
        id="staggered-menu-panel"
        ref={panelRef}
        className="staggered-menu-panel"
        aria-hidden={isBottomSheet ? false : !open}
        style={panelStyle}
      >
        <div
          className="sm-drag-handle"
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
          onPointerCancel={onHandleUp}
          aria-hidden="true"
        />
        <div className="sm-panel-inner">
          {body ? <div className="sm-body">{body}</div> : null}

          {!body && items && items.length > 0 && (
            <ul className="sm-panel-list" role="list" data-numbering={displayItemNumbering || undefined}>
              {items.map((it, idx) => (
                <li className="sm-panel-itemWrap" key={it.label + idx}>
                  <a className="sm-panel-item" href={it.link} aria-label={it.ariaLabel} data-index={idx + 1}>
                    <span className="sm-panel-itemLabel">{it.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}

        </div>
      </aside>
    </div>
  );
};

export default StaggeredMenu;
