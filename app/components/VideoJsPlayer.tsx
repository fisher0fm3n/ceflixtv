// app/components/VideoJsPlayer.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import videojs from "video.js";
import {
  AUTO_LABEL,
  Quality,
  autoDisplayLabel,
  autoQualityIndex,
  normalizeQualities,
  qualitiesForMenu,
  qualityDisplayLabel,
  readAutoContext,
  readPreferredQuality,
  resolveInitialQuality,
  resolveInitialSelection,
  storePreferredQuality,
} from "@/app/lib/quality";

type Props = {
  src: string | null;
  poster?: string;
  autoplay?: boolean;
  muted?: boolean; // IMPORTANT: if autoplay=true, you almost always want muted=true
  playsInline?: boolean;
  startTime?: number | null;
  onProgress?: (currentTime: number, duration: number) => void;
  onLoadedMetadata?: (duration: number) => void;
  onEnded?: () => void;
  /**
   * Selectable renditions from the API. The quality button only appears when
   * there is more than one — a single entry is just the video's own URL.
   */
  qualities?: Quality[] | null;
  onQualityChange?: (quality: Quality) => void;
  loading?: boolean;
  className?: string;
};

const QUALITY_COMPONENT = "CeflixQualityButton";

type QualityButtonOptions = {
  qualities: Quality[];
  /** The viewer's mode: a rung label, or AUTO_LABEL. */
  selection: string | null;
  /** The rung actually playing — under Auto this is what Auto settled on. */
  activeQuality: Quality | null;
  onSelect: (selection: string) => void;
};

/**
 * Registers the control-bar quality menu with video.js. Idempotent — video.js
 * keeps one global component registry, so this runs once per page load no
 * matter how many players mount.
 */
function ensureQualityComponent() {
  if (videojs.getComponent(QUALITY_COMPONENT)) return;

  const MenuButton = videojs.getComponent("MenuButton") as any;
  const MenuItem = videojs.getComponent("MenuItem") as any;

  class QualityMenuItem extends MenuItem {
    constructor(player: any, options: any) {
      super(player, { ...options, selectable: true, multiSelectable: false });
    }

    handleClick() {
      super.handleClick();
      this.options_.onSelect?.(this.options_.value);
    }
  }

  class QualityMenuButton extends MenuButton {
    private labelEl_: HTMLElement | null = null;

    constructor(player: any, options: any) {
      super(player, options);
      this.controlText("Quality");
      this.addClass("vjs-quality-button");

      // The label lives inside the <button> so it inherits the control bar's
      // hover/focus states; `el()` on a MenuButton is the wrapping div.
      const host: HTMLElement =
        (this as any).menuButton_?.el?.() ?? (this.el() as HTMLElement);

      this.labelEl_ = videojs.dom.createEl("span", {
        className: "vjs-quality-label",
      }) as HTMLElement;

      host.appendChild(this.labelEl_);
      this.updateLabel(options?.selectedLabel ?? null);
    }

    buildCSSClass() {
      return `vjs-quality-button ${super.buildCSSClass()}`;
    }

    updateLabel(label: string | null) {
      if (this.labelEl_) this.labelEl_.textContent = label ?? "";
    }

    createItems() {
      const opts = this.options_ as QualityButtonOptions;
      const qualities = opts?.qualities ?? [];

      const rungs = qualitiesForMenu(qualities).map(
        (q) =>
          new QualityMenuItem(this.player(), {
            label: qualityDisplayLabel(q),
            value: q.label,
            selected: q.label === opts.selection,
            onSelect: opts.onSelect,
          }),
      );

      // Auto sits on top, and names the rung it settled on so the viewer can
      // see what they are actually getting.
      const auto = new QualityMenuItem(this.player(), {
        label: autoDisplayLabel(
          opts.selection === AUTO_LABEL ? opts.activeQuality : null,
        ),
        value: AUTO_LABEL,
        selected: opts.selection === AUTO_LABEL,
        onSelect: opts.onSelect,
      });

      auto.addClass("vjs-quality-auto-item");

      return [auto, ...rungs];
    }
  }

  videojs.registerComponent(QUALITY_COMPONENT, QualityMenuButton as any);
}

export default function VideoJsPlayer({
  src,
  poster,
  autoplay = true,
  muted,
  playsInline = true,
  startTime,
  onProgress,
  onLoadedMetadata,
  onEnded,
  qualities,
  onQualityChange,
  loading = false,
  className = "",
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const didSeekRef = useRef(false);

  const getType = (u: string) =>
    u.endsWith(".m3u8") ? "application/x-mpegURL" : "video/mp4";

  const qualityList = useMemo(() => normalizeQualities(qualities), [qualities]);

  // Where playback starts. Deliberately keyed off `qualityList` only:
  // switching quality afterwards is imperative (below) so it never re-runs the
  // src effects, which would restart the video from zero.
  //
  // The context here is read without the player element, which does not exist
  // yet — `syncAuto` corrects the pick once the real width is measurable.
  const initial = useMemo(() => {
    const remembered = readPreferredQuality();
    return {
      selection: resolveInitialSelection(qualityList, remembered),
      quality: resolveInitialQuality(qualityList, remembered, readAutoContext()),
    };
  }, [qualityList]);

  const effectiveSrc = initial.quality?.url ?? src;

  // Everything the viewer (or Auto) has changed since this source loaded. Keyed
  // to the source it applies to, so it resets itself when the video changes
  // rather than needing an effect to clear it.
  const [override, setOverride] = useState<{
    src: string;
    selection: string;
    label: string | null;
  } | null>(null);

  const live = override?.src === effectiveSrc ? override : null;

  /** The viewer's mode: a rung label, or AUTO_LABEL. */
  const selection = live?.selection ?? initial.selection;
  /** The rung actually playing. */
  const activeLabel = live?.label ?? initial.quality?.label ?? null;
  const activeQuality =
    qualityList.find((q) => q.label === activeLabel) ?? initial.quality ?? null;

  // Read by video.js event handlers, which outlive the render that made them.
  const selectionRef = useRef(selection);
  const activeLabelRef = useRef(activeLabel);
  const qualityListRef = useRef(qualityList);
  const effectiveSrcRef = useRef(effectiveSrc);

  // How many rungs below Auto's own ceiling stalls have pushed us.
  const autoPenaltyRef = useRef(0);
  const stallCountRef = useRef(0);
  const lastStallAtRef = useRef(0);
  const lastSwapAtRef = useRef(0);

  useEffect(() => {
    selectionRef.current = selection;
    activeLabelRef.current = activeLabel;
    qualityListRef.current = qualityList;
    effectiveSrcRef.current = effectiveSrc;
  });

  // Quality switching is a source swap: capture position and play state,
  // replace the source, restore both. The renditions are separate MP4s, not an
  // HLS ladder, so there is no track to select.
  const swapTo = (quality: Quality) => {
    const player = playerRef.current;
    if (!player) return;

    const resumeAt = player.currentTime() || 0;
    const wasPaused = player.paused();

    lastSwapAtRef.current = Date.now();
    player.src({ src: quality.url, type: getType(quality.url) });

    player.one("loadedmetadata", () => {
      try {
        if (resumeAt > 0) player.currentTime(resumeAt);
      } catch {}

      if (wasPaused) player.pause();
      else player.play()?.catch(() => {});
    });

    activeLabelRef.current = quality.label;
    onQualityChange?.(quality);
  };

  /**
   * Re-run Auto's choice and switch if it landed somewhere new. Cheap enough to
   * call on any signal — it no-ops when Auto is off or already on target.
   */
  const syncAuto = () => {
    if (selectionRef.current !== AUTO_LABEL) return;

    const list = qualityListRef.current;
    if (list.length < 2) return;

    const ceiling = autoQualityIndex(list, readAutoContext(containerRef.current));
    const target = list[Math.max(0, ceiling - autoPenaltyRef.current)];
    if (!target || target.label === activeLabelRef.current) return;

    swapTo(target);
    setOverride({
      src: effectiveSrcRef.current ?? "",
      selection: AUTO_LABEL,
      label: target.label,
    });
  };

  const select = (next: string) => {
    const list = qualityListRef.current;
    storePreferredQuality(next);

    if (next === AUTO_LABEL) {
      // A fresh opt-in to Auto starts from a clean slate: past stalls were
      // measured against a rung the viewer had pinned by hand.
      autoPenaltyRef.current = 0;
      stallCountRef.current = 0;

      setOverride({
        src: effectiveSrcRef.current ?? "",
        selection: AUTO_LABEL,
        label: activeLabelRef.current,
      });

      selectionRef.current = AUTO_LABEL;
      syncAuto();
      return;
    }

    const quality = list.find((q) => q.label === next);
    if (!quality) return;

    setOverride({
      src: effectiveSrcRef.current ?? "",
      selection: next,
      label: next,
    });

    if (quality.label !== activeLabelRef.current) swapTo(quality);
  };

  // Menu items and player events are rebuilt/attached out of band, so the
  // handlers they close over have to stay current without recreating the
  // player.
  const selectRef = useRef(select);
  const syncAutoRef = useRef(syncAuto);

  useEffect(() => {
    selectRef.current = select;
    syncAutoRef.current = syncAuto;
  });

  /** Seconds of continuously buffered video ahead of the playhead. */
  const bufferedAhead = (player: any) => {
    try {
      const buffered = player.buffered();
      const t = player.currentTime() || 0;
      for (let i = 0; i < buffered.length; i++) {
        if (buffered.start(i) <= t && t <= buffered.end(i)) {
          return buffered.end(i) - t;
        }
      }
    } catch {}
    return 0;
  };

  /**
   * Climb back up after a rough patch: a long clean stretch with a healthy
   * buffer earns back one of the rungs stalls took away.
   */
  const autoRecover = (player: any) => {
    if (selectionRef.current !== AUTO_LABEL) return;
    if (autoPenaltyRef.current <= 0) return;

    const now = Date.now();
    if (now - lastStallAtRef.current < 90_000) return;
    if (bufferedAhead(player) < 15) return;

    autoPenaltyRef.current -= 1;
    lastStallAtRef.current = now; // one step at a time
    syncAutoRef.current();
  };

  const autoRecoverRef = useRef(autoRecover);

  useEffect(() => {
    autoRecoverRef.current = autoRecover;
  });

  // Create player once (when src becomes available)
  useEffect(() => {
    if (!containerRef.current) return;
    if (playerRef.current) return;
    if (!effectiveSrc) return;

    const videoEl = document.createElement("video");
    videoEl.className = "video-js vjs-big-play-centered vjs-ceflix";
    videoEl.style.width = "100%";
    videoEl.style.height = "100%";

    // ✅ playsinline for iOS/Safari
    if (playsInline) {
      videoEl.setAttribute("playsinline", "true");
      videoEl.setAttribute("webkit-playsinline", "true");
    }

    // ✅ MUST be muted at the element level for autoplay to work in browsers
    // If you're trying to autoplay, force muted true (otherwise many browsers block)
    const shouldMuteForAutoplay = !!muted;

    videoEl.muted = shouldMuteForAutoplay;
    if (shouldMuteForAutoplay) videoEl.setAttribute("muted", "");
    else videoEl.removeAttribute("muted");

    containerRef.current.appendChild(videoEl);

    const player = (playerRef.current = videojs(videoEl, {
      autoplay, // we'll still call play() manually after we set muted
      muted: shouldMuteForAutoplay, // ✅ also tell video.js
      controls: true,
      preload: "auto",
      playsinline: playsInline,
      fluid: false,
      responsive: false,
      sources: [{ src: effectiveSrc, type: getType(effectiveSrc) }],
      poster,
    }));

    // ✅ Ensure player is muted BEFORE any play attempt
    player.muted(shouldMuteForAutoplay);

    player.on("timeupdate", () => {
      onProgress?.(player.currentTime() || 0, player.duration() || 0);
    });

    player.on("loadedmetadata", () => {
      const dur = player.duration() || 0;
      onLoadedMetadata?.(dur);

      if (!didSeekRef.current && startTime && startTime > 0) {
        didSeekRef.current = true;
        try {
          player.currentTime(startTime);
        } catch {}
      }

      // ✅ attempt autoplay after metadata (most reliable moment)
      if (autoplay) {
        // keep muted true for autoplay compliance
        // some browsers need BOTH element + player muted before play
        try {
          const el = player.el()?.querySelector("video") as HTMLVideoElement | null;
          if (el) {
          }
        } catch {}

        player.play().catch(() => {
          // Autoplay may still be blocked if browser requires user gesture in some edge cases.
          // In that case, the big play button will still work.
        });
      }
    });

    player.on("ended", () => onEnded?.());

    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveSrc]);

  // Update src/poster/autoplay/muted after player exists
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    if (!effectiveSrc) return;

    didSeekRef.current = false;

    const shouldMuteForAutoplay = !!muted;

    // ✅ sync poster + src
    player.poster(poster || "");
    player.src({ src: effectiveSrc, type: getType(effectiveSrc) });

    // ✅ sync muted state (player + underlying element)
    player.muted(shouldMuteForAutoplay);
    try {
      const el = player.el()?.querySelector("video") as HTMLVideoElement | null;
      if (el) {
        el.muted = shouldMuteForAutoplay;
        if (shouldMuteForAutoplay) el.setAttribute("muted", "");
        else el.removeAttribute("muted");
      }
    } catch {}

    // ✅ attempt autoplay after src change
    if (autoplay) {
      player.play().catch(() => {});
    }
  }, [effectiveSrc, poster, autoplay, muted]);

  // Add / refresh / remove the control-bar quality menu.
  //
  // `effectiveSrc` is a dependency so this re-runs in the same commit that
  // creates the player — effects fire in declaration order, so by the time this
  // one runs `playerRef` is populated.
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const controlBar = player.getChild("controlBar");
    if (!controlBar) return;

    const existing = controlBar.getChild(QUALITY_COMPONENT);

    // One quality is not a choice — pre-ladder videos and live streams land
    // here, and a menu with a single row is just noise.
    if (qualityList.length < 2) {
      if (existing) {
        controlBar.removeChild(existing);
        existing.dispose();
      }
      return;
    }

    if (existing) {
      existing.options_.qualities = qualityList;
      existing.options_.selectedLabel = selectedLabel;
      existing.options_.onSelect = (q: Quality) => applyQualityRef.current(q);
      existing.updateLabel(selectedLabel);
      existing.update(); // rebuilds the items, refreshing the checkmark
      return;
    }

    ensureQualityComponent();

    // Sit just left of fullscreen, where viewers expect settings to be.
    const children = controlBar.children() || [];
    const fullscreenIndex = children.findIndex(
      (c: any) => c?.name?.() === "FullscreenToggle",
    );

    controlBar.addChild(
      QUALITY_COMPONENT,
      {
        qualities: qualityList,
        selectedLabel,
        onSelect: (q: Quality) => applyQualityRef.current(q),
      },
      fullscreenIndex >= 0 ? fullscreenIndex : children.length,
    );
  }, [qualityList, selectedLabel, effectiveSrc]);

  // Dispose on unmount
  useEffect(() => {
    return () => {
      const player = playerRef.current;
      if (player) {
        player.dispose();
        playerRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, []);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      <div ref={containerRef} className="absolute inset-0" />
      {loading && (
        <div className="absolute inset-0 animate-pulse bg-neutral-800/80" />
      )}
    </div>
  );
}
