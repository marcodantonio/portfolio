"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { Anchor, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, Check, Compass, FileDown, Map, Moon, MoveUp, Play, Sun, Volume2, VolumeX, X } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import IslandContent from "@/components/island-content";
import KineticHeading from "@/components/kinetic-heading";
import { useLanguage } from "@/context/language-context";
import { useTheme } from "@/context/theme-context";
import { useBootReady } from "@/lib/boot-state";
import { CONNECTIONS, getIsland, getShoreRadius, ISLANDS, MAP_SCALE, TERRITORIES, TRAVEL_ROUTES, WORLD_BOUNDS, type IslandId, type PortfolioIslandId } from "@/lib/island-map";
import { getCvDownloadPath } from "@/lib/cv";
import { buildExhibitCopy } from "@/lib/island-exhibit-copy";
import type { IslandGame } from "@/lib/island-game";

type Panel = PortfolioIslandId | "map" | null;
const DESTINATIONS = ISLANDS.filter((island) => island.id !== "welcome");
const MAP_OUTLINES = TERRITORIES.map((island) => Array.from({ length: 64 }, (_, index) => {
  const angle = index / 64 * Math.PI * 2;
  const radius = getShoreRadius(island, angle);
  return `${index ? "L" : "M"}${(island.x + Math.cos(angle) * radius).toFixed(2)},${(island.z + Math.sin(angle) * radius).toFixed(2)}`;
}).join(" ") + " Z");

function ArchipelagoMap({ visited, playerRef }: { visited: Set<IslandId>; playerRef?: React.RefObject<SVGCircleElement | null> }) {
  return (
    <svg viewBox={`${WORLD_BOUNDS.minX - 4} ${WORLD_BOUNDS.minZ - 4} ${WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX + 8} ${WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ + 8}`} aria-hidden="true" className="island-map-drawing">
      {CONNECTIONS.map(({ from, to, kind }, index) => {
        const a = getIsland(from), b = getIsland(to);
        return <line key={index} x1={a.x} y1={a.z} x2={b.x} y2={b.z} className={`island-map-path island-map-path--${kind}`} />;
      })}
      {TERRITORIES.map((island, index) => <path key={island.id} d={MAP_OUTLINES[index]} fill={island.color} opacity={island.floating ? 0.65 : 0.9} />)}
      {ISLANDS.map((island, index) => <g key={island.id}>
        <circle cx={island.x} cy={island.z} r={4.5} fill={visited.has(island.id) ? "#ffe0a0" : "#fff9e6"} />
        <text x={island.x} y={island.z + 2} textAnchor="middle">{index === 0 ? "M" : String(index + 1).padStart(2, "0")}</text>
      </g>)}
      {playerRef ? <circle ref={playerRef} cx={0} cy={8 * MAP_SCALE} r={3.8} className="island-map-player" /> : null}
    </svg>
  );
}

export default function IslandPortfolio() {
  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const reduced = useReducedMotion();
  const bootReady = useBootReady();
  const exhibitCopy = useMemo(() => buildExhibitCopy(t, lang), [t, lang]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [sound, setSound] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [currentIsland, setCurrentIsland] = useState<IslandId | null>("welcome");
  const [selectedIndex, setSelectedIndex] = useState<number | undefined>();
  const [presentation, setPresentation] = useState<"world" | "reader">("reader");
  const [travelState, setTravelState] = useState<{ id: string | null; running: boolean }>({ id: null, running: false });
  const [stationState, setStationState] = useState<{ id: string | null; inspecting: boolean }>({ id: null, inspecting: false });
  const [visited, setVisited] = useState<Set<IslandId>>(() => new Set());
  const worldRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<SVGCircleElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogBodyRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<IslandGame | null>(null);
  const live = useRef({ playing, panel, theme, reduced, bootReady, chatOpen, currentIsland, exhibits: exhibitCopy, label: t.game.canvasLabel });
  const openPanel = useCallback((next: Panel, index?: number, mode: "world" | "reader" = "reader") => {
    if (mode === "reader") gameRef.current?.leaveStation(false);
    setSelectedIndex(index); setPresentation(mode); setPanel(next);
  }, []);

  useEffect(() => {
    live.current = { playing, panel, theme, reduced, bootReady, chatOpen, currentIsland, exhibits: exhibitCopy, label: t.game.canvasLabel };
    const game = gameRef.current;
    game?.setNight(theme === "dark");
    game?.setReduced(Boolean(reduced));
    game?.setPaused(Boolean(panel) || chatOpen || !bootReady);
    game?.canvas.setAttribute("aria-label", t.game.canvasLabel);
  }, [playing, panel, theme, reduced, bootReady, chatOpen, currentIsland, exhibitCopy, t.game.canvasLabel]);

  useEffect(() => { gameRef.current?.setExhibits(exhibitCopy); }, [exhibitCopy]);

  useEffect(() => {
    let cancelled = false;
    const host = worldRef.current;
    if (!host) return;
    import("@/lib/island-game").then(async ({ createIslandGame }) => {
      if (cancelled) return;
      const game = await createIslandGame(host, {
        label: live.current.label,
        exhibits: live.current.exhibits,
        markers: Array.from(labelRef.current?.querySelectorAll<HTMLElement>("[data-island]") ?? []),
        onIsland(id) {
          setCurrentIsland(id);
          if (live.current.playing && id && id !== "welcome") {
            setVisited((previous) => previous.has(id) ? previous : new Set([...previous, id]));
          }
        },
        onPosition(x, z) {
          playerRef.current?.setAttribute("cx", String(x));
          playerRef.current?.setAttribute("cy", String(z));
          if (rootRef.current) {
            rootRef.current.dataset.playerX = x.toFixed(2);
            rootRef.current.dataset.playerZ = z.toFixed(2);
          }
        },
        onStation(id, inspecting) { setStationState({ id, inspecting }); },
        onOpenObject(id, index) { openPanel(id, index, "world"); },
        onTravel(id, running) { setTravelState({ id, running }); },
        onMap() { openPanel("map"); },
        onError() { setFailed(true); },
      });
      if (cancelled) { game.dispose(); return; }
      gameRef.current = game;
      game.setNight(live.current.theme === "dark");
      game.setReduced(Boolean(live.current.reduced));
      game.setPaused(!live.current.bootReady || Boolean(live.current.panel) || live.current.chatOpen);
      game.setExhibits(live.current.exhibits);
      if (live.current.playing) { game.start(); game.travelTo(live.current.currentIsland ?? "welcome"); }
      setStationState({ id: null, inspecting: false });
      setReady(true);
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; gameRef.current?.dispose(); gameRef.current = null; };
  }, [openPanel]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (panel) {
      if (!dialog.open) dialog.showModal();
      dialogBodyRef.current?.scrollTo({ top: 0 });
      const heading = dialogBodyRef.current?.querySelector<HTMLElement>("h2, h1");
      const selected = selectedIndex !== undefined ? dialogBodyRef.current?.querySelector<HTMLElement>(`[data-object-index="${selectedIndex}"]`) : null;
      const focusTarget = selected?.querySelector<HTMLElement>("summary, h3") ?? heading;
      if (selected) selected.scrollIntoView({ block: "start", behavior: "instant" });
      if (focusTarget) { focusTarget.tabIndex = -1; focusTarget.focus({ preventScroll: true }); }
    } else if (dialog.open) dialog.close();
  }, [panel, selectedIndex]);

  useEffect(() => {
    const openFromHash = () => {
      const id = window.location.hash.slice(1);
      if (DESTINATIONS.some((island) => island.id === id)) openPanel(id as PortfolioIslandId);
    };
    const timer = window.setTimeout(openFromHash, 0);
    const onIslandRequest = (event: Event) => {
      const detail = (event as CustomEvent<string | { id: string; index?: number }>).detail;
      const id = typeof detail === "string" ? detail : detail?.id;
      if (id === "home" || id === "welcome") openPanel("map");
      else if (DESTINATIONS.some((island) => island.id === id)) openPanel(id as PortfolioIslandId, typeof detail === "string" ? undefined : detail.index);
    };
    const onChat = () => { gameRef.current?.leaveStation(false); dialogRef.current?.close(); setPanel(null); };
    const onChatState = (event: Event) => setChatOpen(Boolean((event as CustomEvent<{open:boolean}>).detail.open));
    const onWrap = (event: Event) => { const color = (event as CustomEvent<{ color: string }>).detail?.color; if (typeof color === "string") gameRef.current?.setCarColor(color); };
    window.addEventListener("hashchange", openFromHash);
    window.addEventListener("island:open", onIslandRequest);
    window.addEventListener("personai:open", onChat);
    window.addEventListener("personai:state", onChatState);
    window.addEventListener("island:wrap", onWrap);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("hashchange", openFromHash);
      window.removeEventListener("island:open", onIslandRequest);
      window.removeEventListener("personai:open", onChat);
      window.removeEventListener("personai:state", onChatState);
      window.removeEventListener("island:wrap", onWrap);
    };
  }, [openPanel]);

  function start() {
    setPlaying(true); setPanel(null);
    gameRef.current?.start();
    window.requestAnimationFrame(() => gameRef.current?.focus());
  }
  function closePanel() {
    setPanel(null);
    gameRef.current?.leaveStation(false);
    if (playing) window.requestAnimationFrame(() => gameRef.current?.focus());
  }
  function travel(id: IslandId) {
    setPlaying(true); setPanel(null);
    gameRef.current?.start(); gameRef.current?.travelTo(id);
    window.requestAnimationFrame(() => gameRef.current?.focus());
    if (id !== "welcome") setVisited((previous) => new Set([...previous, id]));
  }
  function touchStart(event: PointerEvent<HTMLButtonElement>, x: number, y: number) {
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    gameRef.current?.setTouch(x, y);
  }
  function touchEnd() { gameRef.current?.setTouch(0, 0); }

  const destination = currentIsland ? t.game.islands[currentIsland] : null;
  const stationCopy = stationState.id ? exhibitCopy[stationState.id] : null;
  const activeRoute = TRAVEL_ROUTES.find((route) => route.id === travelState.id);
  const routeLabel = activeRoute ? t.archipelago.travel[activeRoute.kind === "boat" && activeRoute.to === "welcome" ? "boatReturn" : activeRoute.kind] : "";
  const readerArea = currentIsland && currentIsland !== "welcome" ? currentIsland : "about";
  return (
    <main ref={rootRef} className={`island-experience ${playing ? "is-playing" : "is-welcome"} ${stationState.inspecting ? "is-inspecting" : ""}`} data-ready={ready} data-failed={failed} data-station={stationState.id ?? ""} data-inspecting={stationState.inspecting} data-area={currentIsland ?? ""} data-transit={travelState.running ? travelState.id : ""}>
      <div ref={worldRef} className="island-world" />
      <div className="island-vignette" aria-hidden="true" />
      <div ref={labelRef} className="island-world-labels" aria-label={t.game.map} hidden={!ready || failed}>
        {ISLANDS.map((island, index) => <Button variant="ghost" key={island.id} data-island={island.id}
          className={`island-world-label ${island.id === currentIsland ? "is-current" : ""}`}
          onClick={() => travel(island.id)}>
          <span>{visited.has(island.id) ? <Check size={11} /> : index === 0 ? <Anchor size={13} /> : String(index + 1).padStart(2, "0")}</span>
          {t.game.islands[island.id].name}
        </Button>)}
      </div>

      <header className="island-header">
        <a href={lang === "it" ? "/" : "/en"} className="island-brand" aria-label="Marco D'Antonio">MD<span>✳</span></a>
        <nav className="island-quicklinks" aria-label={t.game.contentLabel}>
          <Button variant="ghost" onClick={() => openPanel("projects")}>{t.archipelago.quickProjects}</Button>
          <Button variant="ghost" onClick={() => openPanel("contact")}>{t.archipelago.quickContact}</Button>
          <a href={getCvDownloadPath(lang)} target="_blank" rel="noopener noreferrer"><FileDown size={13} />{t.archipelago.quickCv}</a>
        </nav>
        <nav className="island-header__actions" aria-label={t.game.controls}>
          <Button variant="ghost" className="island-header__read" aria-label={t.game.read} onClick={() => openPanel(readerArea)}><BookOpen size={15} /><span>{t.game.read}</span></Button>
          <Button variant="ghost" size="icon" aria-label={t.game.map} onClick={() => openPanel("map")}><Map size={16} /></Button>
          <Button variant="ghost" size="icon" disabled={!ready || failed} aria-label={sound ? t.game.soundOff : t.game.soundOn} aria-pressed={sound} onClick={() => { gameRef.current?.setSound(!sound); setSound(!sound); }}>{sound ? <Volume2 size={16} /> : <VolumeX size={16} />}</Button>
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={theme === "dark" ? t.game.day : t.game.night}>{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}</Button>
          <Button variant="ghost" className="island-language" onClick={() => setLang(lang === "it" ? "en" : "it")} aria-label={lang === "it" ? "English" : "Italiano"}>{lang === "it" ? "EN" : "IT"}</Button>
        </nav>
      </header>

      {!playing && <section className="island-welcome" id="island-welcome" aria-labelledby="island-title">
        <p className="island-kicker"><span />{t.hero.badge}</p>
        <h1 id="island-title" tabIndex={-1}>Marco<br /><span>D’Antonio.</span></h1>
        <p className="island-welcome__title">{t.game.title}</p>
        <p className="island-welcome__description">{t.game.description}</p>
        <div className="island-welcome__actions">
          <Button className="island-primary" onClick={failed ? () => openPanel("projects") : start} disabled={!failed && (!ready || !bootReady)}>
            {failed ? <BookOpen size={16} /> : ready ? <Play size={16} fill="currentColor" /> : <span className="island-loader" />}{failed ? t.game.read : ready ? t.game.start : t.game.loading}<ArrowRight size={17} />
          </Button>
          <Button variant="ghost" className="island-read-link" onClick={() => openPanel("projects")}>{t.archipelago.quickProjects}<ArrowRight size={14} /></Button>
        </div>
        {failed && <p className="island-fallback" role="status">{t.game.unavailable}</p>}
        <div className="island-welcome__coordinates"><Compass size={15} /><span>{t.journey.profile.location}</span><span className="island-coordinate-rule" />42.46° N · 14.21° E</div>
      </section>}

      {playing && failed && <section className="island-runtime-failure" role="status">
        <p>{t.game.unavailable}</p><Button className="island-primary" onClick={() => openPanel("map")}>{t.game.read}<ArrowRight size={16} /></Button>
      </section>}
      {playing && !failed && <>
        <div className="island-location" aria-live="polite">
          <span className="island-kicker">{t.game.currentIsland}</span>
          <strong>{destination?.name ?? t.game.map}</strong>
          <p>{destination?.subtitle ?? t.game.welcomeHint}</p>
        </div>
        <Button variant="ghost" className="island-minimap" onClick={() => openPanel("map")} aria-label={t.game.map}>
          <ArchipelagoMap visited={visited} playerRef={playerRef} />
          <span><Compass size={13} />{visited.size} / {DESTINATIONS.length}<span>{t.game.discovered}</span></span>
        </Button>
        {travelState.running && <div className="island-transit" role="status"><Anchor size={19} /><span>{routeLabel}</span><Button variant="ghost" onClick={() => gameRef.current?.skipTransit()}>{t.archipelago.travel.skip}<ArrowRight size={15} /></Button></div>}
        {activeRoute && !travelState.running && <Button className="island-interact" onClick={() => gameRef.current?.beginTransit(activeRoute.id)}><kbd>E</kbd><span>{t.game.exploreIsland}<strong>{routeLabel}</strong></span><ArrowRight size={17} /></Button>}
        {!activeRoute && !travelState.running && !stationState.inspecting && stationCopy && <Button className="island-interact" onClick={() => gameRef.current?.inspect()}>
          <kbd>E</kbd><span>{t.game.readStation}<strong>{stationCopy.title}</strong></span><ArrowRight size={17} />
        </Button>}
        {!stationCopy && !activeRoute && !travelState.running && <p className="island-field-hint"><Compass size={14} />{currentIsland === "welcome" ? t.archipelago.exploreHint : t.game.stationHint}</p>}
        <div className="island-touch" aria-label={t.game.touchLabel}>
          {[[0,1,ArrowUp,"up"],[-1,0,ArrowLeft,"left"],[0,-1,ArrowDown,"down"],[1,0,ArrowRight,"right"]].map(([x,y,Icon,direction]) => {
            const Arrow = Icon as typeof ArrowUp;
            return <Button variant="ghost" key={String(direction)} className={`island-touch__${direction}`} aria-label={t.game.directions[direction as "up" | "left" | "down" | "right"]}
              onPointerDown={(event) => touchStart(event, x as number, y as number)} onPointerUp={touchEnd} onPointerCancel={touchEnd} onLostPointerCapture={touchEnd}>
              <Arrow size={23} />
            </Button>;
          })}
        </div>
        <Button variant="ghost" className="island-touch-jump" aria-label={t.game.jump}
          onPointerDown={(event) => { event.preventDefault(); gameRef.current?.jump(); }}
          onClick={(event) => { if (event.detail === 0) gameRef.current?.jump(); }}><MoveUp size={24} /></Button>
      </>}

      <footer className="island-controls" id="island-controls">
        <span className="island-controls__keys"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span>{t.game.move}</span></span>
        <span><kbd>SHIFT</kbd>{t.game.sprint}</span><span><kbd>SPACE</kbd>{t.game.jump}</span>
        <span className="island-controls__mobile">{t.game.touchLabel}</span>
      </footer>

      <dialog ref={dialogRef} className={`island-panel island-panel--${panel ?? "closed"} island-panel--${presentation}`} aria-label={panel === "map" ? t.game.map : panel ? t.game.islands[panel].name : t.game.contentLabel}
        onCancel={(event) => { event.preventDefault(); closePanel(); }}
        onClick={(event) => { if (event.target === event.currentTarget) closePanel(); }}>
        <div className="island-panel__inner">
          <div className="island-panel__toolbar">
            <Button variant="ghost" onClick={() => openPanel("map")}><Compass size={17} />{t.game.map}</Button>
            <Button variant="ghost" size="icon" onClick={closePanel} aria-label={t.game.close}><X size={21} /></Button>
          </div>
          <div ref={dialogBodyRef} className="island-panel__body" data-lenis-prevent>
            {panel === "map" ? <>
              <p className="island-kicker">{t.game.kicker}</p>
              <KineticHeading text={t.game.map} className="island-map-heading" />
              <p className="island-map-intro">{t.game.mapHint}</p>
              <ArchipelagoMap visited={visited} />
              <nav className="island-directory" aria-label={t.game.contentLabel}>
                {DESTINATIONS.map((island, index) => <div className="island-directory__row" key={island.id}><Button variant="ghost" onClick={() => openPanel(island.id as PortfolioIslandId)}>
                  <span className="island-directory__number" style={{ background: island.color }}>{visited.has(island.id) ? <Check size={15} /> : String(index + 2).padStart(2, "0")}</span>
                  <span><strong>{t.game.islands[island.id].name}</strong><small>{t.game.islands[island.id].subtitle}</small></span><ArrowRight size={17} />
                </Button>{ready && !failed && <Button variant="ghost" className="island-directory__travel" aria-label={`${t.game.exploreIsland}: ${t.game.islands[island.id].name}`} onClick={() => travel(island.id)}><Compass size={19} /></Button>}</div>)}
              </nav>
              {ready && !failed && <Button className="island-primary island-panel__resume" onClick={playing ? closePanel : start}><Play size={15} />{playing ? t.game.resume : t.game.start}</Button>}
              {playing && <Button variant="ghost" className="island-panel__reset" onClick={() => travel("welcome")}>{t.game.reset}</Button>}
            </> : panel ? <>
              <IslandContent key={`${panel}-${selectedIndex ?? "all"}`} island={panel} selectedIndex={selectedIndex} presentation={presentation} />
              {ready && !failed && <Button className="island-primary island-panel__travel" onClick={() => travel(panel)}><Compass size={16} />{t.game.exploreIsland}<ArrowRight size={17} /></Button>}
              <nav className="island-panel__chapters" aria-label={t.game.contentLabel}>{DESTINATIONS.map((island) => <Button key={island.id} variant="ghost" aria-current={island.id === panel ? "page" : undefined} onClick={() => openPanel(island.id as PortfolioIslandId)}>{t.game.islands[island.id].name}</Button>)}</nav>
            </> : null}
          </div>
        </div>
      </dialog>
      <noscript><div className="island-noscript">{DESTINATIONS.map((island) => <IslandContent key={island.id} island={island.id as PortfolioIslandId} />)}</div></noscript>
    </main>
  );
}
