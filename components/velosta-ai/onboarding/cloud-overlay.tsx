"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Compass } from "lucide-react";

/**
 * CloudOverlay — reusable animated cloud component.
 *
 * mode: "landing"  → full CTA landing screen
 *       "loading"  → translucent overlay with loading message
 *       "crafting" → blurred-map backdrop while AI crafts; shows live
 *                    day-by-day typewriter stream (ChatGPT-style).
 */
interface CloudOverlayProps {
  visible: boolean;
  mode?: "landing" | "loading" | "crafting";
  message?: string;
  /** Optional rotating sublines (used in `crafting` mode) */
  sublines?: string[];
  /**
   * When provided the overlay parses the raw JSON token buffer coming from the
   * `/generate-stream` SSE endpoint and shows REAL day/theme lines as they are
   * typed out by the model.  When undefined the dummy typewriter fallback runs.
   */
  liveTokenBuffer?: string;
}

/** Individual cloud element with radial gradient for visible contrast */
function Cloud({
  width,
  height,
  color,
  top,
  left,
  right,
  bottom,
  driftX,
  driftY = [0, 0, 0],
  duration,
  blur,
}: {
  width: number;
  height: number;
  color: string;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  driftX: number[];
  driftY?: number[];
  duration: number;
  blur: string;
}) {
  return (
    <motion.div
      className={`absolute rounded-full ${blur}`}
      style={{
        width,
        height,
        background: color,
        top,
        left,
        right,
        bottom,
        willChange: "transform",
      }}
      animate={{ x: driftX, y: driftY }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function CloudLayers() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <Cloud
        width={600} height={240}
        color="radial-gradient(ellipse, rgba(255,225,180,0.55) 0%, rgba(255,240,220,0.2) 60%, transparent 100%)"
        top="2%" left="-8%"
        driftX={[0, 100, 0]} driftY={[0, -10, 0]}
        duration={22} blur="blur-3xl"
      />
      <Cloud
        width={700} height={280}
        color="radial-gradient(ellipse, rgba(255,220,170,0.5) 0%, rgba(255,235,210,0.15) 60%, transparent 100%)"
        top="0%" right="-10%"
        driftX={[0, -80, 0]} driftY={[0, 15, 0]}
        duration={26} blur="blur-3xl"
      />
      <Cloud
        width={450} height={180}
        color="radial-gradient(ellipse, rgba(255,215,160,0.6) 0%, rgba(255,230,200,0.2) 55%, transparent 100%)"
        top="18%" left="10%"
        driftX={[0, 60, 0]} driftY={[0, -8, 0]}
        duration={18} blur="blur-2xl"
      />
      <Cloud
        width={400} height={160}
        color="radial-gradient(ellipse, rgba(255,210,155,0.55) 0%, rgba(255,225,190,0.15) 55%, transparent 100%)"
        top="28%" right="5%"
        driftX={[0, -55, 0]} driftY={[0, 12, 0]}
        duration={20} blur="blur-2xl"
      />
      <Cloud
        width={350} height={140}
        color="radial-gradient(ellipse, rgba(255,200,140,0.5) 0%, transparent 60%)"
        top="40%" left="25%"
        driftX={[0, 45, 0]}
        duration={17} blur="blur-2xl"
      />
      <Cloud
        width={320} height={130}
        color="radial-gradient(ellipse, rgba(255,205,150,0.5) 0%, transparent 55%)"
        bottom="30%" left="0%"
        driftX={[0, 80, 0]}
        duration={13} blur="blur-xl"
      />
      <Cloud
        width={380} height={150}
        color="radial-gradient(ellipse, rgba(255,195,130,0.45) 0%, transparent 55%)"
        bottom="22%" right="-5%"
        driftX={[0, -60, 0]} driftY={[0, 8, 0]}
        duration={15} blur="blur-xl"
      />
      <Cloud
        width={250} height={100}
        color="radial-gradient(ellipse, rgba(255,210,160,0.4) 0%, transparent 55%)"
        bottom="45%" left="40%"
        driftX={[0, 50, 0]}
        duration={12} blur="blur-xl"
      />
    </div>
  );
}

/* ── Live stream parser ───────────────────────────────────────────── */

const DAY_PALETTE = [
  "#D97757", "#2F6F73", "#B85F44", "#0B1F2A",
  "#A88452", "#7A4A36", "#3A6A4E", "#2A3A52",
];
function _dayColor(i: number) { return DAY_PALETTE[i % DAY_PALETTE.length]; }

interface _ParsedActivity {
  time?: string;
  name: string;
  complete: boolean;
}
interface _ParsedDay {
  dayNum: number;
  theme: string;
  themeComplete: boolean;
  activities: _ParsedActivity[];
}

/** Parse the raw streaming JSON buffer into structured day data. */
function _parseStreamBuffer(buffer: string): _ParsedDay[] {
  const days: _ParsedDay[] = [];

  // Find every "day": N block boundary
  const dayRx = /\{\s*"day"\s*:\s*(\d+)/g;
  const boundaries: { idx: number; dayNum: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = dayRx.exec(buffer)) !== null) {
    boundaries.push({ idx: m.index, dayNum: parseInt(m[1]) });
  }

  for (let d = 0; d < boundaries.length; d++) {
    const { idx: start, dayNum } = boundaries[d];
    const end = d + 1 < boundaries.length ? boundaries[d + 1].idx : buffer.length;
    const block = buffer.slice(start, end);

    // Theme
    const themeM = /"theme"\s*:\s*"([^"]*)"/.exec(block)
                 ?? /"theme"\s*:\s*"([^"]*)$/.exec(block);
    const theme = themeM ? themeM[1] : "";
    const themeComplete = /"theme"\s*:\s*"[^"]*"/.test(block);

    // Activities from rows array
    const activities: _ParsedActivity[] = [];
    const rowsStart = block.indexOf('"rows"');
    if (rowsStart >= 0) {
      const rowsBlock = block.slice(rowsStart);

      // Extract all time values (appear before their activity in the JSON object)
      const times: { pos: number; val: string }[] = [];
      const timeRx = /"time"\s*:\s*"([^"]+)"/g;
      let tm: RegExpExecArray | null;
      while ((tm = timeRx.exec(rowsBlock)) !== null) {
        times.push({ pos: tm.index, val: tm[1] });
      }

      // Extract activity fields
      const actRx = /"activity"\s*:\s*"([^"]*)("|$)/g;
      let am: RegExpExecArray | null;
      while ((am = actRx.exec(rowsBlock)) !== null) {
        const actPos = am.index;
        const actText = am[1];
        const complete = am[2] === '"';
        // Find the closest preceding time
        const preceding = times.filter((t) => t.pos < actPos);
        const time = preceding[preceding.length - 1]?.val;
        activities.push({ time, name: actText, complete });
      }
    }

    days.push({ dayNum, theme, themeComplete, activities });
  }

  return days;
}

/* ── Typing cursor ────────────────────────────────────────────────── */
function _Cursor() {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: "2px",
        height: "0.85em",
        backgroundColor: "#D97757",
        marginLeft: "2px",
        verticalAlign: "text-bottom",
        borderRadius: "1px",
        animation: "blink 0.9s step-end infinite",
      }}
    />
  );
}

/* ── Styled day card for streaming view ──────────────────────────── */
function _StreamDayCard({
  day,
  dayIdx,
  isCurrent,
}: {
  day: _ParsedDay;
  dayIdx: number;
  isCurrent: boolean;
}) {
  const color = _dayColor(dayIdx);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="mb-4"
    >
      {/* Day pill */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-[0.08em]"
          style={{
            background: color + "18",
            color,
            border: `1px solid ${color}30`,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: color }}
          />
          Day {day.dayNum}
        </span>
        {day.themeComplete && day.theme ? (
          <span className="text-[12px] font-serif font-medium text-[#0B1F2A]/80 leading-snug">
            {day.theme}
          </span>
        ) : day.theme ? (
          <span className="text-[12px] font-serif font-medium text-[#0B1F2A]/80 leading-snug">
            {day.theme}
            {isCurrent && !day.themeComplete && <_Cursor />}
          </span>
        ) : isCurrent ? (
          <_Cursor />
        ) : null}
      </div>

      {/* Activity rows */}
      {day.activities.length > 0 && (
        <div className="space-y-1 pl-1">
          {day.activities.map((act, ai) => {
            const isLastAct = ai === day.activities.length - 1;
            const showCursor = isCurrent && isLastAct && !act.complete;
            return (
              <motion.div
                key={ai}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: ai * 0.04 }}
                className="flex items-start gap-2.5 px-2.5 py-1.5 rounded-lg"
                style={{
                  background: isLastAct && isCurrent
                    ? `${color}08`
                    : "rgba(11,31,42,0.025)",
                  border: isLastAct && isCurrent
                    ? `1px solid ${color}20`
                    : "1px solid transparent",
                }}
              >
                <span
                  className="mt-[3px] w-1 h-1 rounded-full shrink-0"
                  style={{ background: color + "80" }}
                />
                <div className="min-w-0 flex-1">
                  {act.time && (
                    <span
                      className="text-[9px] font-semibold uppercase tracking-[0.18em] mr-1.5 tabular-nums"
                      style={{ color: color + "90" }}
                    >
                      {act.time}
                    </span>
                  )}
                  <span className="text-[11.5px] text-[#0B1F2A]/75 leading-snug">
                    {act.name}
                    {showCursor && <_Cursor />}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

/* ── Live-stream panel (real OpenAI tokens) ──────────────────────── */
function LiveStreamDays({ buffer }: { buffer: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const days = _parseStreamBuffer(buffer);

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [days.length, days[days.length - 1]?.activities.length]);

  if (days.length === 0) {
    return (
      <div className="flex items-center gap-2 py-4 px-2">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block w-1.5 h-1.5 rounded-full bg-[#D97757]/50"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
          />
        ))}
        <span className="text-[11px] text-[#0B1F2A]/40">Connecting to Velosta AI…</span>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="w-full overflow-y-auto"
      style={{
        maskImage: "linear-gradient(to bottom, transparent 0%, black 6%, black 90%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 6%, black 90%, transparent 100%)",
      }}
    >
      {days.map((day, di) => (
        <_StreamDayCard
          key={day.dayNum}
          day={day}
          dayIdx={di}
          isCurrent={di === days.length - 1}
        />
      ))}
    </div>
  );
}

/* ── Dummy typewriter (fallback when no live stream) ─────────────── */
const DUMMY_DAYS: { theme: string; activities: { time: string; name: string }[] }[] = [
  {
    theme: "Arrival & city orientation",
    activities: [
      { time: "09:00 AM", name: "Check in at hotel" },
      { time: "12:00 PM", name: "Heritage walk through old city" },
      { time: "07:00 PM", name: "Dinner at local restaurant" },
    ],
  },
  {
    theme: "Landmarks & local flavours",
    activities: [
      { time: "09:00 AM", name: "Morning sightseeing" },
      { time: "01:00 PM", name: "Street food lunch" },
      { time: "03:00 PM", name: "Museum visit" },
    ],
  },
  {
    theme: "Nature & scenic trails",
    activities: [
      { time: "06:30 AM", name: "Sunrise viewpoint" },
      { time: "09:00 AM", name: "Café breakfast" },
      { time: "02:00 PM", name: "Afternoon at leisure" },
    ],
  },
  {
    theme: "Culture, markets & evening show",
    activities: [
      { time: "10:00 AM", name: "Local bazaar" },
      { time: "02:00 PM", name: "Artisan quarter" },
      { time: "07:30 PM", name: "Dinner with a view" },
    ],
  },
];

function DummyStreamDays({ active }: { active: boolean }) {
  const [visibleDays, setVisibleDays] = useState(0);
  const [currentActIdx, setCurrentActIdx] = useState(0);
  const [currentCharIdx, setCurrentCharIdx] = useState(0);
  const [themeCharIdx, setThemeCharIdx] = useState(0);
  const [typingTheme, setTypingTheme] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Total typing state machine: theme first, then activities one by one
  useEffect(() => {
    if (!active || visibleDays >= DUMMY_DAYS.length) return;
    const day = DUMMY_DAYS[visibleDays];

    if (typingTheme) {
      if (themeCharIdx < day.theme.length) {
        const t = setTimeout(() => setThemeCharIdx((c) => c + 1), 45);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setTypingTheme(false), 350);
        return () => clearTimeout(t);
      }
    } else {
      if (currentActIdx >= day.activities.length) {
        // Move to next day
        const t = setTimeout(() => {
          setVisibleDays((d) => d + 1);
          setCurrentActIdx(0);
          setCurrentCharIdx(0);
          setThemeCharIdx(0);
          setTypingTheme(true);
        }, 500);
        return () => clearTimeout(t);
      }
      const act = day.activities[currentActIdx];
      const full = act.name;
      if (currentCharIdx < full.length) {
        const t = setTimeout(() => setCurrentCharIdx((c) => c + 1), 28);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => {
          setCurrentActIdx((a) => a + 1);
          setCurrentCharIdx(0);
        }, 120);
        return () => clearTimeout(t);
      }
    }
  }, [active, visibleDays, typingTheme, themeCharIdx, currentActIdx, currentCharIdx]);

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [visibleDays, currentActIdx, currentCharIdx, themeCharIdx]);

  const completedDays = DUMMY_DAYS.slice(0, visibleDays);
  const currentDay = visibleDays < DUMMY_DAYS.length ? DUMMY_DAYS[visibleDays] : null;

  // Build current-day parsed form for the card
  const buildCurrentDay = (): _ParsedDay | null => {
    if (!currentDay) return null;
    const completedActs: _ParsedActivity[] = currentDay.activities
      .slice(0, currentActIdx)
      .map((a) => ({ time: a.time, name: a.name, complete: true }));
    const partialAct: _ParsedActivity | undefined = currentActIdx < currentDay.activities.length
      ? {
          time: currentDay.activities[currentActIdx].time,
          name: currentDay.activities[currentActIdx].name.slice(0, currentCharIdx),
          complete: false,
        }
      : undefined;
    return {
      dayNum: visibleDays + 1,
      theme: typingTheme ? currentDay.theme.slice(0, themeCharIdx) : currentDay.theme,
      themeComplete: !typingTheme,
      activities: partialAct ? [...completedActs, partialAct] : completedActs,
    };
  };

  const currentParsed = buildCurrentDay();

  return (
    <div
      ref={scrollRef}
      className="w-full overflow-y-auto"
      style={{
        maskImage: "linear-gradient(to bottom, transparent 0%, black 6%, black 90%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 6%, black 90%, transparent 100%)",
      }}
    >
      {completedDays.map((d, di) => (
        <_StreamDayCard
          key={di}
          day={{ dayNum: di + 1, theme: d.theme, themeComplete: true, activities: d.activities.map((a) => ({ ...a, name: a.name, complete: true })) }}
          dayIdx={di}
          isCurrent={false}
        />
      ))}
      {currentParsed && (
        <_StreamDayCard
          key={visibleDays}
          day={currentParsed}
          dayIdx={visibleDays}
          isCurrent={true}
        />
      )}
    </div>
  );
}

/* ── Dispatcher ──────────────────────────────────────────────────── */
function StreamingDays({
  active,
  liveTokenBuffer,
}: {
  active: boolean;
  liveTokenBuffer?: string;
}) {
  if (liveTokenBuffer !== undefined) {
    return <LiveStreamDays buffer={liveTokenBuffer} />;
  }
  return <DummyStreamDays active={active} />;
}

/* ── Main export ─────────────────────────────────────────────────── */
export default function CloudOverlay({
  visible,
  mode = "loading",
  message = "Discovering amazing places...",
  sublines,
  liveTokenBuffer,
}: CloudOverlayProps) {
  // Rotate sublines every 2.4s (only in crafting mode)
  const [sublineIdx, setSublineIdx] = useState(0);
  useEffect(() => {
    if (!visible || mode !== "crafting" || !sublines || sublines.length === 0) return;
    const t = setInterval(() => {
      setSublineIdx((i) => (i + 1) % sublines.length);
    }, 2400);
    return () => clearInterval(t);
  }, [visible, mode, sublines]);

  /* ── Crafting mode: centered card floating over a softly blurred map ── */
  if (mode === "crafting") {
    return (
      <AnimatePresence>
        {visible && (
          /*
           * Full-screen blur — map stays visible but softened, and
           * pointer-events-auto blocks map marker popups from activating.
           */
          <motion.div
            className="fixed inset-0 flex pointer-events-auto"
            style={{
              zIndex: 9999,
              background: "rgba(11,31,42,0.15)",
              backdropFilter: "blur(10px) saturate(0.80)",
              WebkitBackdropFilter: "blur(10px) saturate(0.80)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >

            {/* ═══ LEFT — itinerary stream panel (same 340px as post-gen panel) ═══ */}
            <motion.div
              className="relative flex flex-col h-full shrink-0 overflow-hidden"
              style={{
                width: "340px",
                background: "#FBF8F3",
                borderRight: "1px solid rgba(11,31,42,0.08)",
                boxShadow: "4px 0 40px -8px rgba(11,31,42,0.18)",
              }}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.38, ease: "easeOut" }}
            >
              {/* Shimmer bar */}
              <div
                className="absolute top-0 left-0 right-0 h-[2.5px] overflow-hidden"
                style={{ zIndex: 2 }}
              >
                <motion.div
                  className="absolute inset-y-0 w-[55%]"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, #D97757, #B85F44, transparent)",
                  }}
                  animate={{ x: ["-55%", "210%"] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>

              {/* Panel header */}
              <div className="shrink-0 px-5 pt-8 pb-3">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="block w-1 h-1 rounded-full bg-[#D97757]"
                        animate={{ opacity: [0.25, 1, 0.25], scale: [0.7, 1.2, 0.7] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                      />
                    ))}
                  </div>
                  <span className="text-[9.5px] uppercase tracking-[0.26em] text-[#0B1F2A]/35 font-semibold">
                    Building itinerary
                  </span>
                </div>
                <div
                  className="w-full h-px"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(217,119,87,0.30) 0%, rgba(217,119,87,0.06) 60%, transparent 100%)",
                  }}
                />
              </div>

              {/* Streaming day cards — fills remaining height */}
              <div
                className="flex-1 min-h-0 overflow-y-auto px-4 pb-4"
                style={{ scrollbarWidth: "none" }}
              >
                <StreamingDays active={visible} liveTokenBuffer={liveTokenBuffer} />
              </div>

              {/* Footer */}
              <div className="shrink-0 px-5 pb-5 pt-2 flex items-center justify-center">
                <motion.p
                  className="text-[9px] uppercase tracking-[0.2em] text-[#0B1F2A]/28"
                  animate={{ opacity: [0.35, 0.75, 0.35] }}
                  transition={{ duration: 2.4, repeat: Infinity }}
                >
                  Please don't close this tab
                </motion.p>
              </div>
            </motion.div>

            {/* ═══ RIGHT — compass + message, centered in remaining space ═══ */}
            <div className="flex-1 flex flex-col items-center justify-center gap-0 px-8">
              {/* Compass */}
              <div className="relative mb-6">
                <motion.div
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{
                    background:
                      "radial-gradient(circle at 32% 28%, rgba(251,248,243,0.18) 0%, rgba(217,119,87,0.14) 60%, transparent 100%)",
                    border: "1.5px solid rgba(251,248,243,0.30)",
                    boxShadow:
                      "0 16px 48px -12px rgba(217,119,87,0.35), 0 0 0 8px rgba(251,248,243,0.06)",
                  }}
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
                >
                  <Compass size={32} strokeWidth={1.4} className="text-[#FBF8F3]" />
                </motion.div>

                {/* Pulse ring */}
                <motion.div
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{ border: "1.5px solid rgba(251,248,243,0.22)" }}
                  animate={{ scale: [1, 1.75, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "easeOut" }}
                />

                {/* Orbiting dot */}
                <motion.span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
                  style={{
                    marginTop: -4,
                    background: "#D97757",
                    boxShadow: "0 0 10px rgba(217,119,87,0.8)",
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                />
              </div>

              {/* Kicker */}
              <motion.p
                className="text-[10px] font-semibold uppercase tracking-[0.36em] text-[#FBF8F3]/50 mb-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
              >
                AI Planner
              </motion.p>

              {/* Title */}
              <motion.h2
                className="font-serif text-[22px] font-semibold text-[#FBF8F3] text-center leading-snug mb-3"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                {message}
              </motion.h2>

              {/* Rotating subline */}
              <div className="h-5 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={sublines?.[sublineIdx] ?? "thinking"}
                    className="text-[12px] text-[#FBF8F3]/45 text-center"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.28 }}
                  >
                    {sublines?.[sublineIdx] ?? "Velosta AI is thinking…"}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  /* ── Loading / Landing modes (unchanged) ──────────────────────────────── */
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 overflow-hidden"
          style={{
            zIndex: 9999,
            background:
              mode === "landing"
                ? "linear-gradient(to bottom, #fdf7ee, #fff5e6, #ffecd2)"
                : "rgba(253,247,238,0.96)",
            backdropFilter: mode === "loading" ? "blur(8px)" : undefined,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
        >
          <CloudLayers />

          {/* Ground mist */}
          <div
            className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
            style={{
              background:
                "linear-gradient(to top, rgba(255,236,210,0.9), transparent)",
            }}
          />

          {/* ── Loading mode ─────────────────────────── */}
          {mode === "loading" && (
            <div className="relative z-10 flex flex-col items-center justify-center h-full">
              <motion.div
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg mb-6"
                style={{
                  background: "linear-gradient(135deg, #d97757, #d97757)",
                }}
                animate={{ y: [0, -8, 0], rotate: [0, 3, -3, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles className="text-white" size={28} />
              </motion.div>

              <motion.p
                className="text-gray-700 font-semibold text-base mb-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {message}
              </motion.p>

              <div className="flex gap-1.5 mt-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-[#E89378]"
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
