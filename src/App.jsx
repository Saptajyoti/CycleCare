
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Heart,
  LayoutDashboard,
  CalendarDays,
  Activity,
  BookOpen,
  Settings,
  Plus,
  Droplets,
  Sparkles,
  Menu,
  X,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  Search,
  ArrowLeft,
  ExternalLink,
  Clock,
  Stethoscope,
  BarChart3,
  MessageCircle,
  Bell,
  Baby,
  Globe2,
  LockKeyhole,
  Laptop,
  Upload,
  Download,
  Smartphone,
  Volume2,
  Trash2,
  Send,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { healthLessons } from "./content/healthLessons";
import { CareGuidancePage } from "./pages/CareGuidancePage";
import { InsightsPage } from "./pages/InsightsPage";
import { SelfCareSection } from "./pages/SelfCareSection";
import {
  addDays,
  daysBetween,
  getCycleEstimate,
  localDateStringForDate,
  parseDateOnly,
} from "./utils/cycle";
import { getCrossCyclePatterns } from "./utils/insights";
import { validateImportData } from "./utils/importData";
import { normalizeSelfCareData } from "./utils/selfCare";
import { upsertPeriodRecord, upsertSymptomRecord } from "./utils/trackingRecords";
import { createVaultEnvelope, encryptVaultData, openVaultEnvelope } from "./utils/vault";
import { CycleCareLogo } from "./components/CycleCareLogo";
import { AssistantMarkdown } from "./components/AssistantMarkdown";
import {
  hasAiConsent,
  protectAssistantAnswer,
  requestAssistantResponse,
  setAiConsent,
} from "./utils/assistant";
import { getHealthSafetyGuidance } from "../shared/healthSafety.js";

import "./App.css";
import "./assistant.css";

const encryptedStorageKeys = [
  "cyclecare_periods",
  "cyclecare_symptoms",
  "cyclecare_daily_logs",
  "cyclecare_self_care",
  "cyclecare_reminders",
  "cyclecare_pregnancy_mode",
  "cyclecare_age_group",
  "cyclecare_tracked_symptoms",
  "cyclecare_pregnancy_info_visible",
  "cyclecare_fertility_info_visible",
];
let vaultKey = null;
let vaultData = null;
let vaultMetadata = null;
let vaultWriteQueue = Promise.resolve();

const navigation = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "My Calendar", icon: CalendarDays },
  { name: "My Symptoms", icon: Activity },
  { name: "Insights", icon: BarChart3 },
  { name: "Learn", icon: BookOpen },
  { name: "Offline answers", icon: MessageCircle },
  { name: "When to see a doctor", icon: Stethoscope },
  { name: "Reminders", icon: Bell },
  { name: "Pregnancy", icon: Baby },
];

function AnimatedSelect({ id, value, onChange, children, className = "" }) {
  const [open, setOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef(null);
  const optionRefs = useRef([]);
  const closeTimer = useRef(null);
  const options = React.Children.toArray(children).filter(
    (child) => React.isValidElement(child) && child.type === "option"
  );
  const selectedIndex = Math.max(0, options.findIndex((option) => String(option.props.value) === String(value)));
  const selectedOption = options[selectedIndex];

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) hideMenu();
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") hideMenu();
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  function showMenu() {
    window.clearTimeout(closeTimer.current);
    setActiveIndex(selectedIndex);
    setMenuVisible(true);
    setOpen(true);
  }

  function hideMenu() {
    setOpen(false);
    closeTimer.current = window.setTimeout(() => setMenuVisible(false), 150);
  }

  function chooseOption(option) {
    onChange({ target: { value: String(option.props.value) } });
    hideMenu();
  }

  function handleKeyDown(event) {
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      if (!open) {
        showMenu();
        return;
      }
      const nextIndex = event.key === "Home" ? 0
        : event.key === "End" ? options.length - 1
          : (activeIndex + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
      setActiveIndex(nextIndex);
      optionRefs.current[nextIndex]?.scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) chooseOption(options[activeIndex]);
      else showMenu();
    }
  }

  return (
    <div className={`animated-select ${className}`.trim()} ref={rootRef}>
      <button
        id={id}
        type="button"
        className={`animated-select-trigger ${open ? "is-open" : ""}`}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        aria-activedescendant={open ? `${id}-option-${activeIndex}` : undefined}
        onClick={() => (open ? hideMenu() : showMenu())}
        onKeyDown={handleKeyDown}
      >
        <span>{selectedOption?.props.children}</span>
        <ChevronDown size={18} aria-hidden="true" />
      </button>
      {menuVisible && (
        <div className={`animated-select-menu ${open ? "is-open" : "is-closing"}`} id={`${id}-options`} role="listbox" aria-labelledby={id}>
          {options.map((option, index) => (
            <div
              key={option.props.value}
              id={`${id}-option-${index}`}
              ref={(element) => { optionRefs.current[index] = element; }}
              className={`animated-select-option ${index === selectedIndex ? "is-selected" : ""} ${index === activeIndex ? "is-active" : ""}`}
              role="option"
              aria-selected={index === selectedIndex}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => chooseOption(option)}
            >
              {option.props.children}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnimatedTimeSelect({ id, value, onChange }) {
  const intervals = Array.from({ length: 48 }, (_, index) => {
    const hours = String(Math.floor(index / 2)).padStart(2, "0");
    const minutes = String((index % 2) * 30).padStart(2, "0");
    return `${hours}:${minutes}`;
  });
  const options = intervals.includes(value) ? intervals : [value, ...intervals];

  return (
    <AnimatedSelect id={id} value={value} onChange={onChange} className="animated-time-select">
      {options.map((time) => {
        const [hours, minutes] = time.split(":").map(Number);
        const label = new Date(2000, 0, 1, hours, minutes).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        });
        return <option key={time} value={time}>{label}</option>;
      })}
    </AnimatedSelect>
  );
}

function SelectionCards({ legend, value, onChange, options, className = "" }) {
  return (
    <fieldset className={`selection-card-fieldset ${className}`.trim()}>
      <legend>{legend}</legend>
      <div className="selection-card-grid">
        {options.map((option) => (
          <button
            className={`selection-card ${String(value) === String(option.value) ? "is-selected" : ""}`}
            type="button"
            key={option.value}
            aria-pressed={String(value) === String(option.value)}
            onClick={() => onChange(option.selectValue ?? option.value)}
          >
            <strong>{option.label}</strong>
            {option.description && <span>{option.description}</span>}
          </button>
        ))}
      </div>
    </fieldset>
  );
}


function App() {
  const [activePage, setActivePage] = useState("Overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [devicePreview, setDevicePreview] = useState(
    () => window.matchMedia("(max-width: 700px)").matches ? "mobile" : "desktop"
  );
  const [devicePreviewTransitioning, setDevicePreviewTransitioning] = useState(false);
  const devicePreviewTimer = useRef(null);
  const [vaultUnlocking, setVaultUnlocking] = useState(false);
  const vaultUnlockTimer = useRef(null);
  const [symptomEditRecord, setSymptomEditRecord] = useState(null);
  const [discreetMode, setDiscreetMode] = useState(() => getDiscreetMode());
  const [showDiaryModeTransition, setShowDiaryModeTransition] = useState(false);
  const [transitioningToDiary, setTransitioningToDiary] = useState(true);
  const discreetTransitionTimers = useRef([]);
  const [language, setLanguage] = useState(
    () => localStorage.getItem("cyclecare_language") || "en"
  );
  const [ageGroup, setAgeGroup] = useState(
    () => getHealthItem("cyclecare_age_group") || "adult"
  );
  const [pregnancyVisible, setPregnancyVisible] = useState(
    () => getHealthItem("cyclecare_pregnancy_info_visible") === "true"
  );
  const [showOnboarding, setShowOnboarding] = useState(
    () => !isOnboardingComplete()
  );
  const [vaultLocked, setVaultLocked] = useState(
    () => hasEncryptedVault() && !vaultKey
  );
  const [storageError, setStorageError] = useState("");

  function navigateTo(page) {
    setActivePage(page);
    setMenuOpen(false);
  }

  useEffect(() => {
    const handleNavigation = (event) => navigateTo(event.detail);
    const handleSymptomEdit = (event) => {
      setSymptomEditRecord(event.detail);
      navigateTo("My Symptoms");
    };

    window.addEventListener("cyclecare-navigate", handleNavigation);
    window.addEventListener("cyclecare-edit-symptom", handleSymptomEdit);
    return () => {
      window.removeEventListener("cyclecare-navigate", handleNavigation);
      window.removeEventListener("cyclecare-edit-symptom", handleSymptomEdit);
    };
  }, []);

  useEffect(() => {
    document.title = discreetMode ? "Diary" : "CycleCare";
    document.documentElement.lang = language;
    document.documentElement.dataset.textSize =
      localStorage.getItem("cyclecare_text_size") || "default";
    document.documentElement.classList.toggle(
      "high-contrast",
      localStorage.getItem("cyclecare_high_contrast") === "true"
    );
  }, [discreetMode, language]);

  useEffect(() => {
    const handleVaultError = () =>
      setStorageError("Encrypted storage could not be updated. Export your data and review browser storage availability.");
    window.addEventListener("cyclecare-vault-error", handleVaultError);
    return () => window.removeEventListener("cyclecare-vault-error", handleVaultError);
  }, []);

  useEffect(() => {
    const syncDiscreetMode = (event) => {
      if (event.key === "cyclecare_discreet_mode") {
        setDiscreetMode(getDiscreetMode());
      }
    };

    window.addEventListener("storage", syncDiscreetMode);
    return () => window.removeEventListener("storage", syncDiscreetMode);
  }, []);

  useEffect(() => () => {
    discreetTransitionTimers.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  useEffect(() => () => {
    window.clearTimeout(devicePreviewTimer.current);
    window.clearTimeout(vaultUnlockTimer.current);
  }, []);

  function changeDevicePreview(nextPreview) {
    if (nextPreview === devicePreview) return;
    window.clearTimeout(devicePreviewTimer.current);
    setDevicePreviewTransitioning(true);
    setDevicePreview(nextPreview);
    devicePreviewTimer.current = window.setTimeout(
      () => setDevicePreviewTransitioning(false),
      360
    );
  }

  function updateDiscreetMode(enabled) {
    discreetTransitionTimers.current.forEach((timer) => window.clearTimeout(timer));
    discreetTransitionTimers.current = [];
    localStorage.setItem("cyclecare_discreet_mode", String(enabled));
    setTransitioningToDiary(enabled);
    setShowDiaryModeTransition(true);
    discreetTransitionTimers.current = [
      window.setTimeout(() => setDiscreetMode(enabled), 610),
      window.setTimeout(() => setShowDiaryModeTransition(false), 2000),
    ];
  }

  function chooseLanguage(value) {
    localStorage.setItem("cyclecare_language", value);
    setLanguage(value);
  }

  function finishOnboarding(useDemo) {
    if (useDemo) {
      const demo = createDemoData();
      setHealthItem("cyclecare_periods", JSON.stringify(demo.periods));
      setHealthItem("cyclecare_symptoms", JSON.stringify(demo.symptoms));
      setHealthItem("cyclecare_daily_logs", JSON.stringify(demo.logs));
      window.dispatchEvent(new Event("cyclecare-data-updated"));
      window.dispatchEvent(new Event("cyclecare-symptoms-updated"));
    }
    localStorage.setItem("cyclecare_setup_complete", "true");
    setShowOnboarding(false);
  }

  function unlockVault(secret) {
    return openHealthVault(secret).then(() => {
      setAgeGroup(getHealthItem("cyclecare_age_group") || "adult");
      setPregnancyVisible(
        getHealthItem("cyclecare_pregnancy_info_visible") === "true"
      );
      setVaultUnlocking(true);
      setVaultLocked(false);
      window.clearTimeout(vaultUnlockTimer.current);
      vaultUnlockTimer.current = window.setTimeout(() => setVaultUnlocking(false), 1180);
    });
  }

  function lockVault() {
    return vaultWriteQueue.then(() => {
      vaultKey = null;
      vaultData = null;
      vaultMetadata = null;
      setSymptomEditRecord(null);
      setAgeGroup("adult");
      setPregnancyVisible(false);
      setVaultLocked(true);
    });
  }

  function enableVault(pin) {
    return createHealthVault(pin).then(() => setVaultLocked(false));
  }

  function changeVaultPin(pin) {
    return changeHealthVaultPin(pin);
  }

  function updateAgeGroup(value) {
    setAgeGroup(value);
    setHealthItem("cyclecare_age_group", value);
  }

  function updatePregnancyVisibility(value) {
    setPregnancyVisible(value);
    setHealthItem("cyclecare_pregnancy_info_visible", String(value));
  }

  return (
    <div className={`app-container ${language === "hi" ? "language-hi" : ""} ${devicePreview === "mobile" ? "device-preview-mobile" : ""} ${devicePreviewTransitioning ? "device-preview-transitioning" : ""} ${vaultUnlocking ? "vault-unlocking" : ""}`}>
      {vaultLocked ? (
        <VaultUnlockDialog onUnlock={unlockVault} />
      ) : (
      <>
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <button className="brand-home" type="button" onClick={() => navigateTo("Overview")} aria-label={discreetMode ? "Diary home" : "CycleCare home"}>
            {discreetMode ? (
              <><span className="brand-icon"><BookOpen size={23} /></span><span>Diary</span></>
            ) : (
              <CycleCareLogo size={44} showWordmark decorative />
            )}
          </button>

          <button
            className="close-menu"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <p className="nav-label">YOUR SPACE</p>

        <nav className="navigation">
          {navigation
            .filter((item) => item.name !== "Pregnancy" || ageGroup !== "under18" || pregnancyVisible)
            .map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-item ${
                activePage === name ? "active" : ""
              }`}
              onClick={() => navigateTo(name)}
            >
              <Icon size={19} />
              <span>{name}</span>
              {activePage === name && <span className="active-dot" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="privacy-card">
            <div className="privacy-icon">
              <ShieldCheck size={19} />
            </div>

            <h4>Your privacy matters</h4>

            <p>
              Your health records are stored locally in this browser.
            </p>
          </div>

          <button
            className={`nav-item ${
              activePage === "Settings" ? "active" : ""
            }`}
            onClick={() => navigateTo("Settings")}
          >
            <Settings size={19} />
            <span>Settings</span>
          </button>

          <p className="sidebar-footer">A little care, every day ♡</p>
        </div>
      </aside>

      {menuOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-heading">
            <button
              className="menu-button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>

            <div>
              <p className="topbar-date">YOUR PERSONAL WELLNESS SPACE</p>
              <h2 className="page-heading" key={activePage}>{activePage}</h2>
            </div>
          </div>

        </header>

        <div className="page-transition" key={activePage}>
        {activePage === "Overview" ? (
          <Dashboard discreetMode={discreetMode} />
        ) : activePage === "My Calendar" ? (
          <CalendarPage />
        ) : activePage === "My Symptoms" ? (
          <SymptomsPage
            key={symptomEditRecord?.id || "new"}
            editRecord={symptomEditRecord}
            onEditComplete={() => setSymptomEditRecord(null)}
          />
        ) : activePage === "Learn" ? (
          <LearnPage key={language} language={language} />
        ) : activePage === "When to see a doctor" ? (
          <CareGuidancePage
            entries={getPeriodEntries()}
            symptoms={getSymptomEntries()}
            getCareGuidance={getCareGuidance}
            formatDate={formatDate}
            localDateString={localDateString}
            sortSymptomRecords={sortSymptomRecords}
          />
        ) : activePage === "Insights" ? (
          <InsightsPage
            periods={getPeriodEntries()}
            symptoms={getSymptomEntries()}
            formatDate={formatDate}
            daysBetween={daysBetween}
          />
        ) : activePage === "Offline answers" ? (
          <AskPage language={language} />
        ) : activePage === "Reminders" ? (
          <RemindersPage discreetMode={discreetMode} />
        ) : activePage === "Pregnancy" ? (
          <PregnancyPage language={language} />
        ) : (
          <SettingsPage
            discreetMode={discreetMode}
            onDiscreetModeChange={updateDiscreetMode}
            language={language}
            onLanguageChange={chooseLanguage}
            onEnableVault={enableVault}
            onChangeVaultPin={changeVaultPin}
            onLockVault={lockVault}
            ageGroup={ageGroup}
            onAgeGroupChange={updateAgeGroup}
            pregnancyVisible={pregnancyVisible}
            onPregnancyVisibilityChange={updatePregnancyVisibility}
            devicePreview={devicePreview}
            onDevicePreviewChange={changeDevicePreview}
          />
        )}
        </div>
      </main>
      {!showOnboarding && !discreetMode && <FloatingAssistant />}
      <nav className="mobile-navigation" aria-label="Primary navigation">
        {[
          { name: "Overview", icon: LayoutDashboard, label: "Home" },
          { name: "My Calendar", icon: CalendarDays, label: "Calendar" },
          { name: "My Symptoms", icon: Activity, label: "Symptoms" },
          { name: "Learn", icon: BookOpen, label: "Learn" },
          { name: "Settings", icon: Settings, label: "Settings" },
        ].map(({ name, icon: Icon, label }) => (
          <button
            key={name}
            type="button"
            className={activePage === name ? "active" : ""}
            aria-current={activePage === name ? "page" : undefined}
            onClick={() => navigateTo(name)}
          >
            <Icon size={19} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      </>
      )}
      {showOnboarding && !vaultLocked && (
        <OnboardingDialog
          onChoose={finishOnboarding}
          onLanguageChange={chooseLanguage}
          language={language}
        />
      )}
      {storageError && <div className="storage-error" role="alert">{storageError}</div>}
      {showDiaryModeTransition && (
        <div className="diary-mode-transition" role="status" aria-live="polite">
          <div className="diary-transition-content">
            <span>{transitioningToDiary ? "Diary mode" : "Normal mode"}</span>
            <div className="diary-loading-track" aria-hidden="true">
              <span />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FloralDecoration({ className = "" }) {
  return (
    <svg
      className={`floral-decoration ${className}`}
      viewBox="0 0 120 120"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M18 112c22-20 40-38 49-62 5-13 7-24 8-39" fill="none" stroke="#9b8a91" strokeWidth="2" strokeLinecap="round" />
      <path d="M42 85c-17 1-25-5-28-17 14-2 23 3 28 17Zm17-25c14-2 22-9 22-21-13 0-21 7-22 21Zm13-31c-10-7-12-16-7-26 10 6 13 14 7 26Z" fill="#aab59b" />
      <g fill="#e9b6c7">
        <ellipse cx="62" cy="45" rx="5" ry="11" />
        <ellipse cx="62" cy="45" rx="5" ry="11" transform="rotate(72 62 45)" />
        <ellipse cx="62" cy="45" rx="5" ry="11" transform="rotate(144 62 45)" />
        <ellipse cx="62" cy="45" rx="5" ry="11" transform="rotate(216 62 45)" />
        <ellipse cx="62" cy="45" rx="5" ry="11" transform="rotate(288 62 45)" />
      </g>
      <circle cx="62" cy="45" r="4" fill="#c88b9f" />
      <g fill="#d7a3b8">
        <ellipse cx="84" cy="27" rx="4" ry="8" />
        <ellipse cx="84" cy="27" rx="4" ry="8" transform="rotate(72 84 27)" />
        <ellipse cx="84" cy="27" rx="4" ry="8" transform="rotate(144 84 27)" />
        <ellipse cx="84" cy="27" rx="4" ry="8" transform="rotate(216 84 27)" />
        <ellipse cx="84" cy="27" rx="4" ry="8" transform="rotate(288 84 27)" />
      </g>
      <circle cx="84" cy="27" r="3" fill="#c88b9f" />
    </svg>
  );
}

function RefreshmentIllustration({ kind, label }) {
  if (kind === "fruit") {
    return (
      <svg className={`refreshment-art refreshment-art-${kind}`} viewBox="0 0 160 110" role="img" aria-label={label}>
        <ellipse cx="80" cy="92" rx="47" ry="7" fill="#eadce0" />
        <path d="M43 63c8 22 22 31 37 31s29-9 37-31H43Z" fill="#f7e7eb" stroke="#b98798" strokeWidth="2" />
        <path d="M47 63h66" stroke="#b98798" strokeWidth="2" strokeLinecap="round" />
        <circle cx="62" cy="52" r="13" fill="#cf7890" />
        <circle cx="82" cy="45" r="14" fill="#bb6681" />
        <circle cx="101" cy="53" r="13" fill="#d79567" />
        <path d="M81 30c4-9 11-12 18-10-2 7-8 11-18 10Zm-1 1c-4-8-10-11-16-9 2 7 8 10 16 9Z" fill="#94a987" />
        <circle cx="58" cy="48" r="2" fill="#f8d9e2" />
        <circle cx="78" cy="40" r="2" fill="#f8d9e2" />
      </svg>
    );
  }

  const drinkColors = {
    ginger: "#d9a05e",
    peppermint: "#a4b58c",
    lemon: "#e8c96f",
    water: "#a9d8df",
    milk: "#f3e8d7",
  };

  return (
    <svg className={`refreshment-art refreshment-art-${kind}`} viewBox="0 0 160 110" role="img" aria-label={label}>
      <ellipse cx="78" cy="94" rx="42" ry="6" fill="#eadce0" />
      <path d="M49 43h57l-5 39c-1 7-5 11-12 11H66c-7 0-11-4-12-11l-5-39Z" fill="#fffaf7" stroke="#b98798" strokeWidth="2" />
      <path d="M106 53h9c12 0 12 21 0 21h-11" fill="none" stroke="#b98798" strokeWidth="3" strokeLinecap="round" />
      <path d="M53 59h49l-3 23c-1 5-4 8-10 8H66c-6 0-9-3-10-8l-3-23Z" fill={drinkColors[kind]} opacity=".88" />
      <path d="M65 30c-6-7 5-9 0-16m16 16c-6-7 5-9 0-16m16 16c-6-7 5-9 0-16" fill="none" stroke="#bc9ca8" strokeWidth="2" strokeLinecap="round" />
      {kind === "lemon" && (
        <>
          <circle cx="119" cy="37" r="13" fill="#f2d780" stroke="#d6b966" strokeWidth="2" />
          <circle cx="119" cy="37" r="8" fill="#fff4c6" />
          <path d="M119 29v16m-7-8h14m-12-6 10 12m0-12-10 12" stroke="#d6b966" strokeWidth="1" />
        </>
      )}
      {kind === "ginger" && <path d="M43 83c-7-5-11-1-10 5 1 4 6 5 10 2 4 4 9 1 8-4-1-4-5-5-8-3Z" fill="#d2a06d" stroke="#b98761" strokeWidth="1.5" />}
      {kind === "peppermint" && <path d="M113 82c2-15 11-24 24-25-1 13-9 22-24 25Zm0 0c-9-12-8-23 0-31 8 10 8 20 0 31Z" fill="#9eb18d" stroke="#829776" strokeWidth="1.5" />
      }
    </svg>
  );
}

const selfCareRefreshments = [
  {
    kind: "ginger",
    name: "Ginger tea",
    description: "A warming drink that some people find comforting.",
    note: "Comfort is personal; this is a self-care option, not a treatment.",
    alt: "Illustration of a cup of warm ginger tea",
  },
  {
    kind: "peppermint",
    name: "Peppermint tea",
    description: "A fresh, soothing herbal drink to enjoy warm or cool.",
    note: "Check the ingredients if you have allergies or sensitivities.",
    alt: "Illustration of a cup of peppermint tea with mint leaves",
  },
  {
    kind: "lemon",
    name: "Lemon water",
    description: "A bright twist if it makes drinking water more enjoyable.",
    note: "Choose the taste and temperature that feel good to you.",
    alt: "Illustration of lemon water with a fresh lemon slice",
  },
  {
    kind: "water",
    name: "Fresh water",
    description: "Keep a glass or bottle nearby as a gentle hydration reminder.",
    note: "Drink to thirst; fluid needs differ from person to person.",
    alt: "Illustration of a refreshing glass of water",
  },
  {
    kind: "fruit",
    name: "Fresh fruit",
    description: "A simple snack idea to enjoy as part of varied meals.",
    note: "Pick fruit you like and that is easy for you to access.",
    alt: "Illustration of a bowl of fresh fruit and berries",
  },
  {
    kind: "milk",
    name: "Warm milk",
    description: "A familiar, comforting beverage for a quiet moment.",
    note: "Dairy or a suitable alternative can be chosen to fit your needs.",
    alt: "Illustration of a warm cup of milk",
  },
];

/* -------------------- DASHBOARD -------------------- */

function Dashboard({ discreetMode }) {
  const [showLogForm, setShowLogForm] = useState(false);
  const [periodStart, setPeriodStart] = useState("");
  const [periodLength, setPeriodLength] = useState("5");
  const [flow, setFlow] = useState("medium");
  const [changesEveryHour, setChangesEveryHour] = useState(false);
  const [largeClots, setLargeClots] = useState(false);
  const [message, setMessage] = useState("");

  const entries = getPeriodEntries();
  const latestEntry = entries.length
    ? entries[entries.length - 1]
    : null;
  const cycleEstimate = getCycleEstimate(entries);
  const pregnancyMode = getHealthItem("cyclecare_pregnancy_mode") === "true";
  const getSelfCareData = useCallback(
    () => getHealthItem("cyclecare_self_care"),
    []
  );
  const saveSelfCareData = useCallback(
    (value) => setHealthItem("cyclecare_self_care", value),
    []
  );

  function handleLogPeriod(event) {
    event.preventDefault();

    if (!periodStart) {
      setMessage("Please select the first day of your period.");
      return;
    }

    if (periodStart > localDateString()) {
      setMessage("Please select today or a date in the past.");
      return;
    }

    if (entries.some((entry) => entry.startDate === periodStart)) {
      setMessage("This period start date is already recorded.");
      return;
    }
    let updatedEntries;
    try {
      updatedEntries = upsertPeriodRecord(entries, {
        startDate: periodStart,
        periodLength: Number(periodLength),
        flow,
        changesEveryHour,
        largeClots,
      }, { today: localDateString() });
    } catch (error) {
      setMessage(error.message);
      return;
    }

    setHealthItem(
      "cyclecare_periods",
      JSON.stringify(updatedEntries)
    );

    setPeriodStart("");
    setPeriodLength("5");
    setFlow("medium");
    setChangesEveryHour(false);
    setLargeClots(false);
    setShowLogForm(false);
    setMessage("Your period entry has been saved on this device.");

    window.dispatchEvent(new Event("cyclecare-data-updated"));
  }

  const cycleLength =
    entries.length >= 2
      ? daysBetween(
          entries[entries.length - 2].startDate,
          entries[entries.length - 1].startDate
        )
      : null;

  return (
    <>
      <section className="welcome-section">
        <div className="welcome-copy">
          <span className="eyebrow">
            <Sparkles size={15} />
            YOUR JOURNEY, YOUR PACE
          </span>

          <h1>
            A little more in tune
            <br />
            with <span>yourself.</span>
          </h1>

          <p>
            Understand your cycle, follow how you feel, and find supportive
            care that fits your day.
          </p>

          <button
            type="button"
            className="primary-button dashboard-log-cta"
            onClick={() => window.dispatchEvent(new CustomEvent("cyclecare-navigate", { detail: "My Symptoms" }))}
          >
            <Activity size={18} />
            Log Today’s Symptoms
          </button>

          <div className="welcome-highlights" aria-label="CycleCare benefits">
            <span><Heart size={15} />Care that centers you</span>
            <span><ShieldCheck size={15} />Private by design</span>
          </div>
        </div>

        <div className="welcome-logo-watermark">
          <img src="/cyclecare-letter-c.png" alt="" />
          <span className="welcome-brand-motto">Care for you, every cycle.</span>
        </div>
        <FloralDecoration className="floral-decoration-hero" />
        <FloralDecoration className="floral-decoration-hero-secondary" />
      </section>

      <section className="section-heading">
        <div>
          <h2>Your cycle at a glance</h2>
          <p>A gentle overview of your personal journey.</p>
        </div>

        <span className="private-badge">
          <ShieldCheck size={14} />
          Private
        </span>
      </section>

      <section className="stats-grid">
        <article className="stat-card period-card">
          <div className="stat-top">
            <div className="stat-icon">
              <Droplets size={20} />
            </div>
            <span className="stat-caption">YOUR RECORD</span>
          </div>

          <h3>
            {discreetMode
              ? "Details hidden"
              : latestEntry
                ? "Period recorded"
                : "Not yet logged"}
          </h3>

          <p>
            {discreetMode
              ? "Turn off Discreet Mode in Settings to view personal cycle details."
              : latestEntry
              ? `Last recorded period began ${latestEntry.startDate}.`
              : "Start by recording your last period."}
          </p>
          <button
            className="stat-card-link"
            onClick={() => window.dispatchEvent(new CustomEvent("cyclecare-navigate", { detail: "My Calendar" }))}
          >
            {latestEntry ? "View period records" : "Record a period"}
          </button>
        </article>

        <article className="stat-card">
          <div className="stat-top">
            <div className="stat-icon soft-icon">
              <CalendarDays size={20} />
            </div>
            <span className="stat-caption">CYCLE LENGTH</span>
          </div>

          <h3>
            {discreetMode
              ? "Details hidden"
              : cycleLength !== null
              ? `${cycleLength} days between starts`
              : "Getting to know you"}
          </h3>

          <p>
            {discreetMode
              ? "Your health records remain stored locally on this device."
              : cycleLength !== null
              ? "Based on your two most recent recorded period starts."
              : "Record at least two period start dates to explore your pattern."}
          </p>
          <button
            className="stat-card-link"
            onClick={() => window.dispatchEvent(new CustomEvent("cyclecare-navigate", { detail: "Insights" }))}
          >
            Explore insights
          </button>
        </article>

        <article className="stat-card">
          <div className="stat-top">
            <div className="stat-icon soft-icon">
              <Activity size={20} />
            </div>
            <span className="stat-caption">HOW YOU FEEL</span>
          </div>

          <h3>Check in with yourself</h3>
          <p>Make a little time to notice how you feel today.</p>
          <button
            className="stat-card-link"
            onClick={() => window.dispatchEvent(new CustomEvent("cyclecare-navigate", { detail: "My Symptoms" }))}
          >
            Log symptoms
          </button>
        </article>
      </section>

      {!discreetMode && !pregnancyMode && (
        <section className="dashboard-cycle-card" aria-labelledby="dashboard-estimate-heading">
          <div className="dashboard-cycle-copy">
            <span className="eyebrow">YOUR CYCLE AT A GLANCE</span>
            <h2 id="dashboard-estimate-heading">Next estimated period</h2>
            {cycleEstimate && !cycleEstimate.needsReview ? (
              <>
                <strong className="dashboard-estimate-date">{formatDate(cycleEstimate.nextStart)}</strong>
                <p>Likely window: {formatDateRange(cycleEstimate.windowStart, cycleEstimate.windowEnd)}</p>
                <p>
                  {cycleEstimate.historyStatus === "limited"
                    ? `Limited history: based on ${cycleEstimate.cyclesUsed} recorded cycles.`
                    : `Sufficient history for a broader tracking estimate: based on ${cycleEstimate.cyclesUsed} recent recorded cycles.`}
                </p>
                <p>Method: the median of recent start-to-start intervals, projected from your latest recorded start.</p>
              </>
            ) : cycleEstimate?.needsReview ? (
              <p>A recent gap needs review before showing an estimate.</p>
            ) : (
              <p>Log three period starts to see a date estimate based on your recorded history.</p>
            )}
          </div>
          {latestEntry && (
            <div className="dashboard-cycle-progress">
              <div className="dashboard-cycle-progress-label">
                <span>Cycle day {Math.max(1, daysBetween(latestEntry.startDate, localDateString()) + 1)}</span>
                {cycleEstimate && !cycleEstimate.needsReview && <span>Typical cycle: {cycleEstimate.medianCycleLength} days</span>}
              </div>
              <div
                className="dashboard-cycle-progress-track"
                role="progressbar"
                aria-label="Calendar progress through typical recorded cycle"
                aria-valuemin={0}
                aria-valuemax={cycleEstimate && !cycleEstimate.needsReview ? cycleEstimate.medianCycleLength : 100}
                aria-valuenow={cycleEstimate && !cycleEstimate.needsReview
                  ? Math.min(cycleEstimate.medianCycleLength, Math.max(0, daysBetween(latestEntry.startDate, localDateString()) + 1))
                  : 0}
              >
                <span style={{ width: cycleEstimate && !cycleEstimate.needsReview
                  ? `${Math.min(100, Math.max(0, ((daysBetween(latestEntry.startDate, localDateString()) + 1) / cycleEstimate.medianCycleLength) * 100))}%`
                  : "0%" }} />
              </div>
              <p>Calendar estimate only; cycle day is counted from your recorded start date.</p>
            </div>
          )}
          <button
            type="button"
            className="secondary-button dashboard-calendar-link"
            onClick={() => window.dispatchEvent(new CustomEvent("cyclecare-navigate", { detail: "My Calendar" }))}
          >
            {cycleEstimate?.needsReview ? "Review dates" : "View calendar"}
          </button>
        </section>
      )}

      <section className="personal-insight-card">
        <span className="eyebrow">A PERSONAL RECORD PATTERN</span>
        {discreetMode ? (
          <p>Personal details are hidden while Discreet Mode is on.</p>
        ) : (() => {
          const patterns = getCrossCyclePatterns(entries, getSymptomEntries());
          return patterns.length ? (
            <p>
              {patterns[0].symptom} was recorded in {patterns[0].cycleCount} of
              your last {patterns[0].cyclesChecked} complete logged cycles.
              This describes your notes; it does not explain why it happened.
            </p>
          ) : (
            <p>
              Keep recording only what feels useful to you. A personal pattern
              will appear after the same symptom has been noted across at least
              three complete cycles.
            </p>
          );
        })()}
        <button
          className="secondary-button"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("cyclecare-navigate", { detail: "My Symptoms" })
            )
          }
        >
          Log today
        </button>
      </section>

      <SelfCareSection
        getData={getSelfCareData}
        setData={saveSelfCareData}
        localDateString={localDateString}
        Illustration={RefreshmentIllustration}
        refreshmentItems={selfCareRefreshments}
      />

      <section className="pregnancy-info-teaser">
        <div>
          <span className="eyebrow">OPTIONAL INFORMATION</span>
          <h2>Pregnancy &amp; baby information</h2>
          <p>Find pregnancy guidance and links about baby movements. This section is optional and does not confirm pregnancy.</p>
        </div>
        <button className="secondary-button" onClick={() => window.dispatchEvent(new CustomEvent("cyclecare-navigate", { detail: "Pregnancy" }))}>
          View information <ChevronRight size={16} />
        </button>
      </section>
      <section className="bottom-grid">
        <article className="action-card">
          <div className="action-card-heading">
            <div>
              <span className="eyebrow">A MOMENT FOR YOU</span>
              <h2>Let's check in</h2>
            </div>

            <div className="action-icon">
              <Heart size={23} />
            </div>
          </div>

          <p>
            Record your period to start building your personal
            cycle history.
          </p>

          <button
            className="primary-button"
            onClick={() => {
              setShowLogForm((value) => !value);
              setMessage("");
            }}
          >
            <Plus size={18} />
            Log your period
          </button>

          {showLogForm && (
            <form className="log-form" onSubmit={handleLogPeriod}>
              <label htmlFor="period-start">
                First day of your period
              </label>

              <input
                id="period-start"
                type="date"
                value={periodStart}
                max={localDateString()}
                onChange={(event) => setPeriodStart(event.target.value)}
                required
              />

              <label htmlFor="period-length">Period duration</label>

              <AnimatedSelect
                id="period-length"
                value={periodLength}
                onChange={(event) => setPeriodLength(event.target.value)}
              >
                {Array.from({ length: 10 }, (_, index) => index + 1).map(
                  (day) => (
                    <option key={day} value={day}>
                      {day} {day === 1 ? "day" : "days"}
                    </option>
                  )
                )}
              </AnimatedSelect>

              <label htmlFor="period-flow">Flow intensity</label>
              <AnimatedSelect
                id="period-flow"
                value={flow}
                onChange={(event) => setFlow(event.target.value)}
              >
                <option value="spotting">Spotting</option>
                <option value="light">Light</option>
                <option value="medium">Medium</option>
                <option value="heavy">Heavy</option>
              </AnimatedSelect>

              {flow === "heavy" && (
                <fieldset className="heavy-flow-questions">
                  <legend>Optional heavy-flow check-in</legend>
                  <label>
                    <input
                      type="checkbox"
                      checked={changesEveryHour}
                      onChange={(event) => setChangesEveryHour(event.target.checked)}
                    />
                    I needed to change a pad every 1–2 hours
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={largeClots}
                      onChange={(event) => setLargeClots(event.target.checked)}
                    />
                    I noticed clots larger than a ₹10 coin
                  </label>
                  <p>
                    These are personal observations, not a diagnosis. You can
                    discuss them with a healthcare professional.
                  </p>
                </fieldset>
              )}

              <button className="primary-button" type="submit">
                Save entry
              </button>
            </form>
          )}

          {message && (
            <p className="form-message" role="status">
              {message}
            </p>
          )}
        </article>

        <article className="insight-card">
          <div className="insight-icon">
            <Sparkles size={21} />
          </div>

          <span className="eyebrow">A GENTLE REMINDER</span>

          <h2>Your body deserves kindness.</h2>

          <p>
            Cycles can vary from person to person and from month to
            month. Your records help you notice patterns; they are
            not a diagnosis.
          </p>

          <button
            className="text-button"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("cyclecare-navigate", {
                  detail: "Learn",
                })
              )
            }
          >
            Explore wellness tips <ChevronRight size={17} />
          </button>
        </article>
      </section>

      <footer className="dashboard-footer">
        <Heart size={14} />
        <span>Made with care, just for you.</span>
        <span className="footer-note">Estimates are not medical advice.</span>
      </footer>
    </>
  );
}

/* -------------------- CALENDAR + PERIOD HISTORY -------------------- */

function CalendarPage() {
  const [monthOffset, setMonthOffset] = useState(0);
  const [, setRefresh] = useState(0);
  const [confirmedGap, setConfirmedGap] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedPeriodStart, setSelectedPeriodStart] = useState("");
  const [selectedPeriodEnd, setSelectedPeriodEnd] = useState("");
  const [selectedFlow, setSelectedFlow] = useState("medium");
  const [selectedIsPeriod, setSelectedIsPeriod] = useState(false);
  const [calendarMessage, setCalendarMessage] = useState("");
  const [initialMonth] = useState(() => {
    const date = new Date();
    return { year: date.getFullYear(), month: date.getMonth() };
  });

  useEffect(() => {
    const updateCalendar = () => {
      setRefresh((value) => value + 1);
      setConfirmedGap("");
    };

    window.addEventListener("cyclecare-data-updated", updateCalendar);

    return () =>
      window.removeEventListener(
        "cyclecare-data-updated",
        updateCalendar
      );
  }, []);

  const currentMonth = new Date(
    initialMonth.year,
    initialMonth.month + monthOffset,
    1
  );

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = currentMonth.getDay();
  const numberOfDays = new Date(year, month + 1, 0).getDate();
  const entries = getPeriodEntries();
  const estimate = getCycleEstimate(entries, confirmedGap);
  const fertilityVisible =
    getHealthItem("cyclecare_age_group") !== "under18" ||
    getHealthItem("cyclecare_fertility_info_visible") === "true";
  const fertilityEstimate =
    estimate && !estimate.needsReview && !estimate.isIrregular && fertilityVisible
      ? {
          ovulationStart: addDays(estimate.nextStart, -16),
          ovulationEnd: addDays(estimate.nextStart, -12),
          fertileStart: addDays(estimate.nextStart, -21),
          fertileEnd: addDays(estimate.nextStart, -12),
        }
      : null;

  const periodDates = new Set();
  const periodStartDates = new Set();
  const periodEndDates = new Set();
  const estimatedDates = new Set();
  const symptomDates = new Set(
    getSymptomEntries()
      .filter((record) => {
        const date = parseDateOnly(record.date);
        return date && date.getFullYear() === year && date.getMonth() === month;
      })
      .map((record) => Number(record.date.slice(-2)))
  );

  entries.forEach((entry) => {
    const start = parseDateOnly(entry.startDate);

    if (!start) return;
    if (start.getFullYear() === year && start.getMonth() === month) {
      periodStartDates.add(start.getDate());
    }

    const end = addDays(start, entry.periodLength - 1);
    if (end.getFullYear() === year && end.getMonth() === month) {
      periodEndDates.add(end.getDate());
    }

    for (let i = 0; i < entry.periodLength; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);

      if (
        date.getFullYear() === year &&
        date.getMonth() === month
      ) {
        periodDates.add(date.getDate());
      }
    }
  });

  if (estimate && !estimate.needsReview) {
    for (let i = -estimate.spreadDays; i <= estimate.spreadDays; i++) {
      const date = addDays(estimate.nextStart, i);
      if (date.getFullYear() === year && date.getMonth() === month) {
        estimatedDates.add(date.getDate());
      }
    }
  }

  return (
    <section className="page-card">
      <span className="eyebrow">YOUR PERSONAL HISTORY</span>
      <h2>My Calendar</h2>

      <p className="page-description">
        Review your recorded period dates and any approximate future
        estimate based on your history.
      </p>

      <div className="calendar-controls">
        <button
          className="secondary-button"
          onClick={() => setMonthOffset((value) => value - 1)}
        >
          Previous
        </button>

        <h3>
          {currentMonth.toLocaleDateString("en-IN", {
            month: "long",
            year: "numeric",
          })}
        </h3>

        <button
          className="secondary-button"
          onClick={() => setMonthOffset((value) => value + 1)}
        >
          Next
        </button>
      </div>

      <div className="calendar-grid" key={`${year}-${month}`} aria-live="polite">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
          (day) => (
            <div key={day} className="calendar-weekday">
              {day}
            </div>
          )
        )}

        {Array.from({ length: firstDay }, (_, index) => (
          <div key={`empty-${index}`} />
        ))}

        {Array.from({ length: numberOfDays }, (_, index) => {
          const day = index + 1;
          const isPeriodDay = periodDates.has(day);
          const isPeriodStart = periodStartDates.has(day);
          const isPeriodEnd = periodEndDates.has(day);
          const isEstimatedDay = estimatedDates.has(day);
          const hasSymptomLog = symptomDates.has(day);
          const dateString = localDateStringForDate(new Date(year, month, day));

          return (
            <button
              key={day}
              type="button"
              disabled={dateString > localDateString()}
              aria-pressed={selectedDate === dateString}
              className={`calendar-day ${
                isPeriodDay ? "period-day" : ""
              } ${isPeriodStart ? "period-start-day" : ""} ${isPeriodEnd ? "period-end-day" : ""} ${isEstimatedDay && !isPeriodDay ? "estimated-day" : ""} ${hasSymptomLog ? "symptom-day" : ""} ${selectedDate === dateString ? "selected-calendar-day" : ""}`}
              aria-label={`${formatDate(dateString)}${isPeriodStart ? ", period start" : isPeriodEnd ? ", last recorded period day" : isPeriodDay ? ", recorded period day" : ""}${isEstimatedDay ? ", estimated window" : ""}${hasSymptomLog ? ", symptom check-in" : ""}`}
              title={
                isPeriodDay
                  ? "Recorded period day"
                  : isEstimatedDay
                    ? "Estimated period day"
                    : ""
              }
              onClick={() => {
                const record = entries.find((entry) => entry.startDate === dateString);
                setSelectedDate(dateString);
                setSelectedPeriodStart(dateString);
                setCalendarMessage("");
                setSelectedPeriodEnd(record
                  ? localDateStringForDate(addDays(parseDateOnly(dateString), record.periodLength - 1))
                  : dateString);
                setSelectedFlow(record?.flow || "medium");
                setSelectedIsPeriod(Boolean(record));
              }}
            >
              {day}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <section className="calendar-day-editor" key={selectedDate}>
          <h3>{formatDate(selectedDate)}</h3>
          <label className="check-field">
            <input type="checkbox" checked={selectedIsPeriod} onChange={(event) => {
              setSelectedIsPeriod(event.target.checked);
              if (event.target.checked && !selectedPeriodEnd) setSelectedPeriodEnd(selectedDate);
            }} />
            Period started on this date
          </label>
          {selectedIsPeriod && (
            <>
              <label className="field-label" htmlFor="calendar-period-start">First day of this period</label>
              <input
                id="calendar-period-start"
                className="animated-date-input"
                type="date"
                value={selectedPeriodStart}
                max={localDateString()}
                onChange={(event) => {
                  const nextStart = event.target.value;
                  const oldDuration = parseDateOnly(selectedPeriodStart) &&
                    parseDateOnly(selectedPeriodEnd) &&
                    selectedPeriodEnd >= selectedPeriodStart
                    ? daysBetween(selectedPeriodStart, selectedPeriodEnd) + 1
                    : 1;
                  setSelectedPeriodStart(nextStart);
                  if (parseDateOnly(nextStart)) {
                    const nextEnd = addDays(parseDateOnly(nextStart), oldDuration - 1);
                    setSelectedPeriodEnd(
                      localDateStringForDate(nextEnd) > localDateString()
                        ? localDateString()
                        : localDateStringForDate(nextEnd)
                    );
                  }
                }}
                required
              />
              <label className="field-label" htmlFor="calendar-period-end">Last day of this period</label>
              <input
                id="calendar-period-end"
                className="animated-date-input"
                type="date"
                value={selectedPeriodEnd}
                min={selectedPeriodStart || undefined}
                max={parseDateOnly(selectedPeriodStart) &&
                  localDateStringForDate(addDays(parseDateOnly(selectedPeriodStart), 9)) < localDateString()
                  ? localDateStringForDate(addDays(parseDateOnly(selectedPeriodStart), 9))
                  : localDateString()}
                onChange={(event) => setSelectedPeriodEnd(event.target.value)}
                required
              />
              <p className="privacy-hint">{selectedPeriodStart && selectedPeriodEnd && selectedPeriodEnd >= selectedPeriodStart
                ? `${daysBetween(selectedPeriodStart, selectedPeriodEnd) + 1} day${daysBetween(selectedPeriodStart, selectedPeriodEnd) === 0 ? "" : "s"} recorded`
                : "Choose a last day on or after the start date."}</p>
              <label className="field-label" htmlFor="calendar-flow">Flow</label>
              <AnimatedSelect id="calendar-flow" className="calendar-flow-select" value={selectedFlow} onChange={(event) => setSelectedFlow(event.target.value)}>
                <option value="spotting">Spotting</option><option value="light">Light</option><option value="medium">Medium</option><option value="heavy">Heavy</option>
              </AnimatedSelect>
            </>
          )}
          <div className="calendar-editor-actions">
            <button className="primary-button" onClick={() => {
              if (selectedDate > localDateString()) {
                setCalendarMessage("Future dates cannot be saved as period starts.");
                return;
              }
              if (selectedIsPeriod && (
                !parseDateOnly(selectedPeriodStart) ||
                selectedPeriodStart > localDateString() ||
                !selectedPeriodEnd ||
                selectedPeriodEnd < selectedPeriodStart ||
                selectedPeriodEnd > localDateString()
              )) {
                setCalendarMessage("Choose a valid last day on or after the period start.");
                return;
              }
              const periodLength = selectedIsPeriod ? daysBetween(selectedPeriodStart, selectedPeriodEnd) + 1 : null;
              if (selectedIsPeriod && (periodLength < 1 || periodLength > 10)) {
                setCalendarMessage("The recorded period must be between 1 and 10 days.");
                return;
              }
              const editingEntry = entries.find((entry) => entry.startDate === selectedDate);
              let updated;
              if (selectedIsPeriod) {
                try {
                  updated = upsertPeriodRecord(entries, {
                    ...(editingEntry || {}),
                    startDate: selectedPeriodStart || selectedDate,
                    periodLength,
                    flow: selectedFlow,
                  }, {
                    today: localDateString(),
                    replacingStartDate: selectedDate,
                  });
                } catch (error) {
                  setCalendarMessage(error.message);
                  return;
                }
              } else {
                updated = entries.filter((entry) => entry.startDate !== selectedDate);
              }
              setHealthItem("cyclecare_periods", JSON.stringify(updated));
              window.dispatchEvent(new Event("cyclecare-data-updated"));
              setCalendarMessage("Calendar record saved.");
            }}>Save date</button>
            <button className="secondary-button" onClick={() => {
              setSelectedDate("");
              setCalendarMessage("");
            }}>Close</button>
          </div>
          {calendarMessage && <p className="form-message" role="status">{calendarMessage}</p>}
          <h4>Symptom check-ins for this date</h4>
          {getSymptomEntries().filter((record) => record.date === selectedDate).length ? (
            getSymptomEntries().filter((record) => record.date === selectedDate).map((record) => (
              <div className="calendar-symptom-entry" key={record.id}>
                <p>{record.symptoms.join(", ") || "No symptoms selected"} · pain {record.pain}/10 {record.note && `· ${record.note}`}</p>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("cyclecare-edit-symptom", { detail: record }))}
                >
                  Edit check-in
                </button>
              </div>
            ))
          ) : (
            <p>No symptom check-in recorded for this date.</p>
          )}
        </section>
      )}

      <div className="calendar-legend" aria-label="Calendar legend">
        <span><i className="legend-dot period-start-dot" />Period start</span>
        <span><i className="legend-dot" />Recorded period days</span>
        <span><i className="legend-dot estimated-dot" />Estimated period window</span>
        <span><i className="legend-dot symptom-dot" />Symptom check-in day</span>
      </div>

      <section className="estimate-card" aria-labelledby="estimate-heading">
        <span className="eyebrow">PATTERN-BASED ESTIMATE</span>
        <h3 id="estimate-heading">Next Period Estimate</h3>
        {estimate ? (
          estimate.needsReview ? (
            <div className="estimate-review">
              <p>
                One logged cycle is much longer than your earlier pattern.
                Did you forget to log a period?
              </p>
              <p>
                Check your period history first. If a start date is missing,
                add it from Overview before using an estimate. If your dates
                are correct, you can still view a cautious estimate based on
                all logged cycles.
              </p>
              <button
                className="secondary-button"
                onClick={() => setConfirmedGap(estimate.gapKey)}
              >
                My logged dates are correct
              </button>
            </div>
          ) : (
          <>
            <p className="estimate-range">{formatDateRange(estimate.windowStart, estimate.windowEnd)}</p>
            <p>
              Estimate based on the median of {estimate.cyclesUsed} recent
              cycles: {estimate.medianCycleLength} days.
            </p>
            <p>
              {estimate.historyStatus === "limited"
                ? "Limited history: this estimate uses only two recorded cycle intervals and may shift as you add dates."
                : "Sufficient history for a broader tracking estimate: this uses at least three recorded cycle intervals. Additional dates can still change the estimate."}
            </p>
            <p>Calculation: median start-to-start interval projected from the latest recorded period start; the date range reflects variation in those intervals.</p>
            {estimate.isIrregular && (
              <p>
                This app labels your pattern irregular because recent cycle
                lengths varied by more than 7 days. This is a tracking label,
                not a diagnosis. The estimate has a wider range and may be less
                reliable; cycle timing can be more variable in the first years
                after periods start. Consider discussing a pattern that
                concerns you with a healthcare professional.
              </p>
            )}
          </>
          )
        ) : (
          <p>
            Log at least three period starts to see an estimate. Cycle
            estimates are based only on the dates you record.
          </p>
        )}
        <p className="estimate-disclaimer">Predictions are estimates, not guarantees. Cycles can vary naturally; this cannot confirm ovulation or be used as contraception.</p>
        {estimate && !estimate.needsReview && estimate.isIrregular && fertilityVisible && (
          <p>
            Ovulation and fertile-window estimates are not shown because your
            recent cycle lengths vary; a calendar estimate may be especially
            unreliable.
          </p>
        )}
        {fertilityEstimate && (
          <div className="fertility-estimates">
            <h4>Optional ovulation and fertile-window estimates</h4>
            <p>
              Estimated ovulation range:{" "}
              {formatDateRange(
                fertilityEstimate.ovulationStart,
                fertilityEstimate.ovulationEnd
              )}
            </p>
            <p>
              Estimated fertile-window range:{" "}
              {formatDateRange(
                fertilityEstimate.fertileStart,
                fertilityEstimate.fertileEnd
              )}
            </p>
            <p className="estimate-disclaimer">
              This is an estimate. It can't be used to prevent pregnancy.
            </p>
            <a
              href="https://www.nhs.uk/conditions/periods/fertility-in-the-menstrual-cycle/"
              target="_blank"
              rel="noreferrer"
            >
              Source: NHS, Fertility in the menstrual cycle
              <ExternalLink size={14} />
            </a>
          </div>
        )}
        {!fertilityVisible && getHealthItem("cyclecare_age_group") === "under18" && (
          <p>Fertility-window information is hidden for your selected age group. You can change this in Settings.</p>
        )}
      </section>

      <div className="history-section">
        <h3>Period history</h3>

        {entries.length === 0 ? (
          <p className="page-description">
            No periods recorded yet. Start by logging your period
            from the Overview page.
          </p>
        ) : (
          <div className="history-list">
            {[...entries].reverse().map((entry) => (
              <div className="history-item" key={entry.startDate}>
                <div className="history-icon">
                  <Droplets size={18} />
                </div>

                <div className="history-details">
                  <h4>
                    {formatDate(entry.startDate)} – {formatDate(localDateStringForDate(
                      addDays(parseDateOnly(entry.startDate), entry.periodLength - 1)
                    ))}
                  </h4>

                  <p>
                    {entry.periodLength}{" "}
                    {entry.periodLength === 1 ? "day" : "days"} recorded · {entry.flow} flow
                  </p>
                  <button
                    type="button"
                    className="stat-card-link"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("cyclecare-navigate", { detail: "My Calendar" }));
                    }}
                  >
                    Edit dates in calendar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* -------------------- CARE GUIDANCE -------------------- */



const frequentlyAskedQuestions = [
  { q: "What counts as day one?", hi: "पहला दिन किसे माना जाता है?", a: "Cycle day 1 is the first day bleeding starts. Record the date as a local calendar date.", ahi: "चक्र का पहला दिन वह है जिस दिन रक्तस्राव शुरू होता है। तारीख को स्थानीय कैलेंडर की तारीख के रूप में लिखें।", k: "day one first day cycle day", url: "https://www.nhs.uk/symptoms/irregular-periods/" },
  { q: "Why can periods be irregular?", hi: "पीरियड अनियमित क्यों हो सकते हैं?", a: "Timing can vary for many reasons. Stress, pregnancy, weight changes, some medicines, PCOS, and thyroid conditions are among possible causes. Only a clinician can assess your situation.", ahi: "समय कई कारणों से बदल सकता है। तनाव, गर्भावस्था, वजन में बदलाव, कुछ दवाएँ, PCOS और थायरॉइड की समस्याएँ संभावित कारणों में शामिल हैं। आपकी स्थिति का आकलन केवल स्वास्थ्यकर्मी कर सकते हैं।", k: "irregular late causes", url: "https://www.nhs.uk/symptoms/irregular-periods/" },
  { q: "When should I seek care for irregular periods?", hi: "अनियमित पीरियड में डॉक्टर से कब मिलें?", a: "Consider speaking with a healthcare professional if your periods are irregular, this is a new change, or it worries you. Seek urgent care for severe pain or heavy bleeding with faintness.", ahi: "यदि पीरियड अनियमित हों, यह नया बदलाव हो या आपको चिंता हो, तो स्वास्थ्यकर्मी से बात करें। तेज दर्द या चक्कर/बेहोशी के साथ बहुत अधिक रक्तस्राव हो तो तुरंत मदद लें।", k: "doctor irregular care", url: "https://www.nhs.uk/symptoms/irregular-periods/" },
  { q: "Does a late period mean I am pregnant?", hi: "क्या देर से पीरियड का मतलब गर्भावस्था है?", a: "A late period can have several causes, including pregnancy. If pregnancy is possible, use a pregnancy test according to its instructions and seek care if you need advice.", ahi: "पीरियड देर से आने के कई कारण हो सकते हैं, जिनमें गर्भावस्था भी शामिल है। यदि गर्भावस्था संभव है, तो निर्देशानुसार परीक्षण करें और सलाह के लिए स्वास्थ्यकर्मी से बात करें।", k: "late missed pregnancy", url: "https://www.nhs.uk/symptoms/missed-or-late-periods/" },
  { q: "Can this app predict my exact next period?", hi: "क्या ऐप अगला पीरियड बिल्कुल सही बता सकता है?", a: "No. A date range is an estimate based on dates you logged. It may be wrong, especially when cycles vary or records are incomplete.", ahi: "नहीं। तारीखों की सीमा आपके दर्ज किए गए रिकॉर्ड पर आधारित अनुमान है। चक्र बदलने या रिकॉर्ड अधूरे होने पर यह गलत हो सकता है।", k: "estimate prediction exact", url: "https://www.nhs.uk/symptoms/irregular-periods/" },
  { q: "Can cycle estimates prevent pregnancy?", hi: "क्या चक्र का अनुमान गर्भावस्था रोक सकता है?", a: "No. Cycle estimates and fertile-window calculations cannot be used as contraception. Ask a qualified healthcare professional about contraception options.", ahi: "नहीं। चक्र या उपजाऊ समय के अनुमान को गर्भनिरोधक के रूप में इस्तेमाल नहीं किया जा सकता। गर्भनिरोध के विकल्पों के लिए योग्य स्वास्थ्यकर्मी से पूछें।", k: "fertile ovulation contraception prevent pregnancy", url: "https://www.nhs.uk/conditions/periods/fertility-in-the-menstrual-cycle/" },
  { q: "What is PCOS?", hi: "PCOS क्या है?", a: "PCOS is a health condition that can affect the ovaries and hormone levels. Symptoms and diagnosis vary; a clinician assesses more than one factor. This app cannot diagnose PCOS.", ahi: "PCOS एक स्वास्थ्य स्थिति है जो अंडाशय और हार्मोन स्तरों को प्रभावित कर सकती है। लक्षण और जाँच अलग-अलग होते हैं; स्वास्थ्यकर्मी कई बातों का आकलन करते हैं। यह ऐप PCOS की जाँच नहीं कर सकता।", k: "pcos pcod", url: "https://www.nhs.uk/conditions/polycystic-ovary-syndrome-pcos/" },
  { q: "Is PCOD a different condition from PCOS?", hi: "क्या PCOD, PCOS से अलग है?", a: "The terms are used differently in some settings. Ask a clinician to explain the diagnosis and terminology used for your care; this app does not determine either.", ahi: "कुछ जगहों पर इन शब्दों का उपयोग अलग तरीके से होता है। अपनी देखभाल में इस्तेमाल हुए नाम और जाँच को स्वास्थ्यकर्मी से समझें; यह ऐप कोई निदान नहीं करता।", k: "pcod pcos difference", url: "https://www.nhs.uk/conditions/polycystic-ovary-syndrome-pcos/" },
  { q: "What are common period symptoms?", hi: "पीरियड के आम लक्षण क्या हैं?", a: "People may experience cramps, bloating, headache, breast tenderness, or mood changes. Experiences differ. Symptoms that are severe, persistent, or disrupt daily life deserve professional advice.", ahi: "कुछ लोगों को ऐंठन, पेट फूलना, सिरदर्द, स्तनों में संवेदनशीलता या मनोदशा में बदलाव हो सकते हैं। अनुभव अलग-अलग होते हैं। तेज, लगातार या दैनिक जीवन रोकने वाले लक्षणों पर पेशेवर सलाह लें।", k: "common symptoms cramps bloating headache", url: "https://www.nhs.uk/conditions/periods/" },
  { q: "What can I do about cramps?", hi: "ऐंठन में क्या कर सकती हूँ?", a: "A warm bath or a wrapped heat pad may help some people. Ask a pharmacist or clinician which pain medicine is suitable for you. Seek care when pain is severe, worsening, or affects daily activities.", ahi: "गर्म पानी से नहाना या कपड़े में लपेटा हीट पैड कुछ लोगों को राहत दे सकता है। कौन-सी दर्द की दवा आपके लिए ठीक है, यह फार्मासिस्ट या स्वास्थ्यकर्मी से पूछें। तेज, बढ़ते या दैनिक जीवन प्रभावित करने वाले दर्द पर सलाह लें।", k: "cramps pain relief", url: "https://www.nhs.uk/symptoms/period-pain/" },
  { q: "Is heavy bleeding worth discussing?", hi: "क्या अधिक रक्तस्राव पर बात करनी चाहिए?", a: "Consider seeking medical advice if bleeding affects daily life, lasts more than 7 days, or you often need to change period products every 1 to 2 hours. Faintness with very heavy bleeding needs urgent care.", ahi: "यदि रक्तस्राव दैनिक जीवन प्रभावित करे, 7 दिन से अधिक चले या हर 1–2 घंटे में उत्पाद बदलना पड़े, तो चिकित्सा सलाह लें। बहुत अधिक रक्तस्राव के साथ बेहोशी जैसा लगे तो तुरंत मदद लें।", k: "heavy bleeding pad hours", url: "https://www.nhs.uk/conditions/heavy-periods/" },
  { q: "What does a cycle length mean?", hi: "चक्र की अवधि का क्या अर्थ है?", a: "Cycle length is the number of days from the first day of one period to the first day of the next. Missing or incorrect dates can change the calculation.", ahi: "चक्र की अवधि एक पीरियड के पहले दिन से अगले पीरियड के पहले दिन तक के दिनों की संख्या है। छूटी या गलत तारीखें गणना बदल सकती हैं।", k: "cycle length calculate", url: "https://www.nhs.uk/symptoms/irregular-periods/" },
  { q: "Why is a date missing from my estimate?", hi: "अनुमान में तारीख क्यों नहीं दिखती?", a: "The app waits for enough recorded starts and asks you to check a very long gap for a missed log. It cannot know whether an unrecorded period happened.", ahi: "ऐप पर्याप्त रिकॉर्ड का इंतज़ार करता है और बहुत लंबे अंतर पर छूटी तारीख जाँचने को कहता है। यह नहीं जान सकता कि कोई पीरियड दर्ज करना छूट गया या नहीं।", k: "estimate missing log gap", url: "https://www.nhs.uk/symptoms/irregular-periods/" },
  { q: "Can stress affect periods?", hi: "क्या तनाव पीरियड को प्रभावित कर सकता है?", a: "Stress is one of several possible reasons for a late or irregular period. It is not possible to identify the cause from a period log alone.", ahi: "तनाव देर से या अनियमित पीरियड के कई संभावित कारणों में से एक है। केवल पीरियड रिकॉर्ड से कारण पता नहीं चल सकता।", k: "stress period late", url: "https://www.nhs.uk/symptoms/missed-or-late-periods/" },
  { q: "Can weight change affect periods?", hi: "क्या वजन में बदलाव पीरियड बदल सकता है?", a: "Weight changes are among possible reasons for a missed or irregular period. If you notice a change or are concerned, discuss it with a clinician.", ahi: "वजन में बदलाव पीरियड छूटने या अनियमित होने के संभावित कारणों में शामिल है। बदलाव दिखे या चिंता हो तो स्वास्थ्यकर्मी से बात करें।", k: "weight change missed period", url: "https://www.nhs.uk/symptoms/missed-or-late-periods/" },
  { q: "Can exercise change my period?", hi: "क्या व्यायाम से पीरियड बदल सकता है?", a: "A lot of exercise is listed among possible contributors to missed periods. An app cannot establish the reason; discuss persistent changes with a healthcare professional.", ahi: "बहुत अधिक व्यायाम पीरियड छूटने के संभावित कारणों में शामिल है। ऐप कारण तय नहीं कर सकता; लगातार बदलाव पर स्वास्थ्यकर्मी से बात करें।", k: "exercise missed period", url: "https://www.nhs.uk/symptoms/missed-or-late-periods/" },
  { q: "What if I miss several periods?", hi: "कई पीरियड छूट जाएँ तो क्या करें?", a: "If you have missed 3 periods in a row, the NHS advises seeing a doctor. If pregnancy is possible, consider a pregnancy test and seek appropriate advice.", ahi: "NHS लगातार 3 पीरियड छूटने पर डॉक्टर से मिलने की सलाह देता है। यदि गर्भावस्था संभव है, तो परीक्षण और उचित सलाह लें।", k: "missed three periods", url: "https://www.nhs.uk/symptoms/missed-or-late-periods/" },
  { q: "What if bleeding happens between periods?", hi: "पीरियड के बीच रक्तस्राव हो तो?", a: "Bleeding between periods should be discussed with a healthcare professional. Seek urgent assessment if it is very heavy or you feel faint or severely unwell.", ahi: "पीरियड के बीच रक्तस्राव होने पर स्वास्थ्यकर्मी से बात करें। बहुत अधिक रक्तस्राव हो या बेहोशी/गंभीर अस्वस्थता हो तो तुरंत जाँच कराएँ।", k: "bleeding between periods", url: "https://www.nhs.uk/conditions/periods/" },
  { q: "What if pain stops my usual activities?", hi: "दर्द से रोज़ के काम रुकें तो?", a: "Period pain that stops usual daily activities is a reason to seek medical advice. Severe or much-worse-than-usual pain needs urgent assessment.", ahi: "पीरियड का दर्द रोज़ के काम रोकता हो तो चिकित्सा सलाह लें। बहुत तेज या सामान्य से बहुत अधिक दर्द पर तुरंत जाँच कराएँ।", k: "pain daily activities", url: "https://www.nhs.uk/symptoms/period-pain/" },
  { q: "Can symptoms diagnose a condition?", hi: "क्या लक्षणों से बीमारी का पता चलता है?", a: "No. Symptoms can have many causes. Diagnosis requires an appropriate assessment by a qualified healthcare professional.", ahi: "नहीं। लक्षणों के कई कारण हो सकते हैं। निदान के लिए योग्य स्वास्थ्यकर्मी द्वारा उचित जाँच आवश्यक है।", k: "symptoms diagnose condition", url: "https://www.nhs.uk/conditions/polycystic-ovary-syndrome-pcos/" },
  { q: "Is my health data sent to a server?", hi: "क्या मेरा स्वास्थ्य डेटा सर्वर पर जाता है?", a: "CycleCare is designed to store records in this browser and has no CycleCare account or health-record server. Browser storage is not encrypted by default; anyone with access to this browser profile may see it.", ahi: "CycleCare रिकॉर्ड इसी ब्राउज़र में रखता है; इसका कोई CycleCare खाता या स्वास्थ्य-रिकॉर्ड सर्वर नहीं है। ब्राउज़र स्टोरेज डिफ़ॉल्ट रूप से एन्क्रिप्टेड नहीं होता; इस प्रोफ़ाइल तक पहुँच रखने वाला व्यक्ति इसे देख सकता है।", k: "privacy data server storage", url: "" },
  { q: "How can I export my records?", hi: "रिकॉर्ड कैसे निर्यात करूँ?", a: "Open Settings and choose a JSON or CSV export. Exports are readable files; store them somewhere private and delete them when no longer needed.", ahi: "Settings में JSON या CSV निर्यात चुनें। निर्यात फ़ाइलें पढ़ी जा सकती हैं; इन्हें निजी जगह रखें और ज़रूरत न रहने पर मिटा दें।", k: "export json csv records", url: "" },
  { q: "How can I delete my records?", hi: "अपने रिकॉर्ड कैसे मिटाऊँ?", a: "Open Settings and choose Delete everything. Review the confirmation before proceeding. This removes CycleCare data saved in this browser, but cannot remove exported copies.", ahi: "Settings में Delete everything चुनें और पुष्टि ध्यान से पढ़ें। इससे इस ब्राउज़र में सहेजा CycleCare डेटा मिटेगा, पर निर्यात की गई प्रतियाँ नहीं।", k: "delete remove data", url: "" },
  { q: "Can I use the calendar as birth control?", hi: "क्या कैलेंडर को गर्भनिरोधक मान सकते हैं?", a: "No. Period predictions and cycle estimates are uncertain and cannot be used to prevent pregnancy. Seek advice about effective contraception from a qualified professional.", ahi: "नहीं। पीरियड और चक्र के अनुमान अनिश्चित हैं और गर्भावस्था रोकने के लिए उपयोग नहीं किए जा सकते। गर्भनिरोध के लिए योग्य स्वास्थ्यकर्मी से सलाह लें।", k: "birth control contraception", url: "https://www.nhs.uk/conditions/periods/fertility-in-the-menstrual-cycle/" },
  { q: "What should I track before a doctor visit?", hi: "डॉक्टर से मिलने से पहले क्या लिखूँ?", a: "You may record period start dates, duration, symptoms, pain and how it affects daily life, and questions you want to ask. Share only what you feel comfortable sharing.", ahi: "आप पीरियड शुरू होने की तारीख, अवधि, लक्षण, दर्द और रोज़मर्रा पर असर, तथा अपने सवाल लिख सकती हैं। केवल वही साझा करें जिसमें आप सहज हों।", k: "doctor visit prepare track", url: "https://www.nhs.uk/symptoms/irregular-periods/" },
  { q: "What is a period?", hi: "पीरियड क्या है?", a: "A period is bleeding that happens as part of the menstrual cycle. People can have different experiences of timing, flow and symptoms.", ahi: "पीरियड मासिक चक्र के हिस्से के रूप में होने वाला रक्तस्राव है। समय, प्रवाह और लक्षणों का अनुभव अलग-अलग हो सकता है।", k: "period menstruation", url: "https://www.nhs.uk/conditions/periods/" },
  { q: "What if this is my first period?", hi: "अगर यह मेरा पहला पीरियड है?", a: "Periods can start at different ages. If you have concerns about starting, bleeding, or pain, speak with a trusted adult and a qualified healthcare professional.", ahi: "पीरियड अलग-अलग उम्र में शुरू हो सकते हैं। शुरुआत, रक्तस्राव या दर्द को लेकर चिंता हो तो भरोसेमंद बड़े और योग्य स्वास्थ्यकर्मी से बात करें।", k: "first period puberty", url: "https://www.nhs.uk/conditions/periods/starting-periods/" },
  { q: "Are cycle lengths the same for everyone?", hi: "क्या सबका चक्र एक जैसा होता है?", a: "No. Timing can differ between people and can vary over time. A personal record can help describe your own dates but cannot diagnose a cause.", ahi: "नहीं। समय अलग-अलग लोगों में अलग हो सकता है और बदल भी सकता है। रिकॉर्ड आपकी तारीखें बताने में मदद करता है, कारण का निदान नहीं करता।", k: "cycle lengths vary", url: "https://www.nhs.uk/symptoms/irregular-periods/" },
  { q: "When is period pain urgent?", hi: "पीरियड का दर्द कब तुरंत मदद माँगता है?", a: "Seek urgent medical help for severe or much-worse-than-usual pelvic pain, especially if pain relief has not helped, or if pregnancy is possible and you have severe pain or bleeding.", ahi: "तेज या सामान्य से बहुत अधिक पेट/पेल्विक दर्द पर तुरंत मदद लें, खासकर दर्द की दवा से राहत न मिले, या गर्भावस्था संभव हो और तेज दर्द/रक्तस्राव हो।", k: "urgent severe pain pregnancy", url: "https://www.nhs.uk/symptoms/period-pain/" },
  { q: "Can this app tell me I am healthy?", hi: "क्या ऐप बता सकता है कि मैं स्वस्थ हूँ?", a: "No. The app organizes records and offers general information. It cannot assess your health or rule out a problem.", ahi: "नहीं। ऐप रिकॉर्ड व्यवस्थित करता है और सामान्य जानकारी देता है। यह स्वास्थ्य का आकलन या समस्या से इंकार नहीं कर सकता।", k: "healthy health assessment", url: "" },
  { q: "Who can I contact for emotional support in India?", hi: "भारत में मानसिक स्वास्थ्य सहायता कहाँ मिलेगी?", a: "Tele-MANAS can be reached at 14416. If you may act on thoughts of self-harm or are in immediate danger, seek emergency help now.", ahi: "Tele-MANAS से 14416 पर संपर्क किया जा सकता है। स्वयं को नुकसान पहुँचाने का खतरा हो या तुरंत संकट हो तो अभी आपात मदद लें।", k: "mental health self harm support tele manas", url: "https://telemanas.mohfw.gov.in/" },
];

function AskPage({ language }) {
  const [question, setQuestion] = useState("");
  const normalized = question.trim().toLocaleLowerCase(language === "hi" ? "hi" : "en");
  const urgent = /self.harm|hurt myself|kill myself|आत्महत्या|खुद को नुकसान|मरना चाहती/i.test(question);
  const match = frequentlyAskedQuestions.find((item) => {
    const searchable = `${item.q} ${item.hi} ${item.k}`.toLocaleLowerCase();
    return normalized && normalized.split(/\s+/).some((word) => word.length > 2 && searchable.includes(word));
  });

  return (
    <section className="page-card">
      <span className="eyebrow">PRIVATE HEALTH EDUCATION</span>
      <h2>{language === "hi" ? "अपना सवाल पूछें" : "Ask a question"}</h2>
      <p className="page-description">
        {language === "hi" ? "उत्तर इस डिवाइस पर उपलब्ध जानकारी से मिलते हैं। यह निदान नहीं करता।" : "Find answers from this device's offline, sourced information. No question is sent to a server, and this is not diagnosis."}
      </p>
      <label className="field-label" htmlFor="faq-question">
        {language === "hi" ? "लक्षण या सवाल लिखें" : "Enter a topic or question"}
      </label>
      <input id="faq-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={language === "hi" ? "उदाहरण: अनियमित पीरियड" : "For example: irregular periods"} />
      {urgent ? (
        <article className="wellbeing-support" role="alert">
          <h3>Support is available now</h3>
          <p>Tele-MANAS: call 14416 in India. If you may act on thoughts of self-harm or are in immediate danger, contact local emergency services or go to an emergency department.</p>
          <a href="https://telemanas.mohfw.gov.in/" target="_blank" rel="noreferrer">Ministry of Health and Family Welfare: Tele-MANAS</a>
        </article>
      ) : match ? (
        <article className="faq-answer" aria-live="polite">
          <h3>{language === "hi" ? match.hi : match.q}</h3>
          <p>{language === "hi" ? match.ahi : match.a}</p>
          <p className="article-disclaimer">General information only. Seek professional advice for personal concerns.</p>
          {match.url && <a href={match.url} target="_blank" rel="noreferrer">Read the source <ExternalLink size={14} /></a>}
        </article>
      ) : question ? (
        <article className="faq-answer" role="status">
          <p>{language === "hi" ? "मुझे इसका उत्तर नहीं पता। डॉक्टर या योग्य स्वास्थ्यकर्मी मदद कर सकते हैं।" : "I don't know that one. A doctor or qualified healthcare professional can help."}</p>
        </article>
      ) : (
        <div className="faq-suggestions">
          <h3>{language === "hi" ? "लोकप्रिय सवाल" : "Suggested questions"}</h3>
          {frequentlyAskedQuestions.slice(0, 8).map((item) => (
            <button className="faq-suggestion" key={item.q} onClick={() => setQuestion(language === "hi" ? item.hi : item.q)}>
              {language === "hi" ? item.hi : item.q}
            </button>
          ))}
        </div>
      )}
      <p className="privacy-hint">{frequentlyAskedQuestions.length} offline answers are always available. For a cloud-generated educational response, open the floating AI assistant and review its consent options.</p>
    </section>
  );
}

function FloatingAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [aiConsent, setAiConsentState] = useState(() => hasAiConsent());
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [aiError, setAiError] = useState("");
  const [isAskingAi, setIsAskingAi] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenMotion, setFullscreenMotion] = useState("");
  const [showConsentOptions, setShowConsentOptions] = useState(false);
  const closeTimer = useRef(null);
  const openingTimer = useRef(null);
  const fullscreenTimer = useRef(null);
  const launcherRef = useRef(null);
  const inputRef = useRef(null);
  const transcriptRef = useRef(null);

  const closeAssistant = useCallback(() => {
    if (isClosing) return;
    window.clearTimeout(openingTimer.current);
    setIsOpening(false);
    setIsClosing(true);
    setShowConsentOptions(false);
    closeTimer.current = window.setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      setIsFullscreen(false);
      setFullscreenMotion("");
      window.requestAnimationFrame(() => launcherRef.current?.focus());
    }, 220);
  }, [isClosing]);

  useEffect(() => {
    if (!isOpen) return undefined;
    inputRef.current?.focus();
    const closeOnEscape = (event) => {
      if (event.key === "Escape") closeAssistant();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, closeAssistant]);

  useEffect(() => () => {
    window.clearTimeout(closeTimer.current);
    window.clearTimeout(openingTimer.current);
    window.clearTimeout(fullscreenTimer.current);
  }, []);

  function openAssistant() {
    window.clearTimeout(closeTimer.current);
    window.clearTimeout(openingTimer.current);
    setIsOpening(true);
    setIsClosing(false);
    setIsOpen(true);
    openingTimer.current = window.setTimeout(() => setIsOpening(false), 420);
  }

  function toggleFullscreen() {
    window.clearTimeout(fullscreenTimer.current);
    window.clearTimeout(openingTimer.current);
    setIsOpening(false);
    const motion = isFullscreen ? "restoring" : "expanding";
    setFullscreenMotion(motion);
    setIsFullscreen((fullscreen) => !fullscreen);
    fullscreenTimer.current = window.setTimeout(() => setFullscreenMotion(""), 420);
  }

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages, isAskingAi]);

  useEffect(() => {
    if (!aiError) return undefined;
    const errorTimer = window.setTimeout(() => setAiError(""), 2600);
    return () => window.clearTimeout(errorTimer);
  }, [aiError]);

  function updateConsent(consented) {
    setAiConsent(consented);
    setAiConsentState(consented);
    if (!consented) {
      setMessages([]);
      setAiError("");
      setDraft("");
    }
  }

  async function sendMessage(event) {
    event.preventDefault();
    const message = draft.trim();
    const safetyGuidance = getHealthSafetyGuidance(message);
    if (!message || isAskingAi || (!aiConsent && !safetyGuidance)) return;

    setDraft("");
    setAiError("");
    if (safetyGuidance) {
      setMessages((current) => [...current,
        { role: "user", content: message },
        {
          role: "safety",
          title: safetyGuidance.title,
          category: safetyGuidance.category,
          content: safetyGuidance.message,
        },
      ]);
      return;
    }

    setMessages((current) => [...current, { role: "user", content: message }]);
    setIsAskingAi(true);
    try {
      const answer = await requestAssistantResponse(message);
      setMessages((current) => [...current, protectAssistantAnswer(answer)]);
    } catch (error) {
      setAiError(error.message || "The AI assistant is temporarily unavailable.");
    } finally {
      setIsAskingAi(false);
    }
  }

  return (
    <div className="floating-assistant">
      {isOpen && (
        <section className={`assistant-popover ${isOpening ? "is-opening" : ""} ${isFullscreen ? "is-fullscreen" : ""} ${fullscreenMotion ? `is-${fullscreenMotion}` : ""} ${isClosing ? "is-closing" : ""}`} id="assistant-popover" role="dialog" aria-labelledby="assistant-popover-title">
          <header className="assistant-popover-header">
            <div>
              <span className="assistant-popover-kicker">Health Assistance</span>
              <h2 id="assistant-popover-title">Cycle Care</h2>
            </div>
            <div className="assistant-header-actions">
              <button
                className="assistant-expand-button"
                type="button"
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? "Exit full screen" : "Expand AI assistant to full screen"}
                title={isFullscreen ? "Exit full screen" : "Full screen"}
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              {aiConsent && (
                <div className="assistant-consent-menu-wrap">
                  <button
                    className="assistant-consent-menu-trigger"
                    type="button"
                    aria-label="AI consent options"
                    aria-haspopup="menu"
                    aria-expanded={showConsentOptions}
                    onClick={() => setShowConsentOptions((open) => !open)}
                  >
                    <ShieldCheck size={16} />
                  </button>
                  {showConsentOptions && (
                    <div className="assistant-consent-menu" role="menu">
                      <button
                        className="assistant-consent-menu-item"
                        type="button"
                        role="menuitem"
                        disabled={isAskingAi}
                        onClick={() => {
                          updateConsent(false);
                          setShowConsentOptions(false);
                        }}
                      >
                        Revoke AI consent
                      </button>
                    </div>
                  )}
                </div>
              )}
              <button
                className="assistant-close-button"
                type="button"
                onClick={closeAssistant}
                aria-label="Close AI assistant"
              >
                <X size={15} />
              </button>
            </div>
          </header>
          <div className="assistant-transcript" ref={transcriptRef} aria-live="polite">
            {messages.length === 0 ? (
              <p className="assistant-welcome">Ask an educational question. Please do not include personal health records or identifying details.</p>
            ) : messages.map((message, index) => (
              <article
                className={`assistant-message assistant-message-${message.role}`}
                aria-label={message.role === "safety"
                  ? message.category === "urgent" ? "Urgent safety guidance" : "Medical guidance"
                  : undefined}
                key={`${message.role}-${index}`}
              >
                {message.role === "assistant" ? (
                  <AssistantMarkdown content={message.content} />
                ) : message.role === "safety" ? (
                  <>
                    <strong>{message.title}</strong>
                    <p>{message.content}</p>
                    {message.title === "Immediate support is available" && (
                      <a href="https://telemanas.mohfw.gov.in/" target="_blank" rel="noreferrer">Tele-MANAS support</a>
                    )}
                    {message.category === "urgent" && (
                      <a href="https://112.gov.in/" target="_blank" rel="noreferrer">India emergency help (112)</a>
                    )}
                  </>
                ) : (
                  <p>{message.content}</p>
                )}
              </article>
            ))}
            {isAskingAi && (
              <p className="assistant-thinking" role="status">
                <span className="assistant-typing-dots" aria-hidden="true"><i /><i /><i /></span>
                Gemini is thinking
              </p>
            )}
          </div>
          {aiError && (
            <div className="assistant-error-toast" role="alert">
              <p>{aiError}</p>
              <p>
                This app cannot assess symptoms or diagnose a condition. Do not
                start or stop medication based on AI. For sudden severe pain,
                very heavy bleeding with faintness, or severe pain or bleeding
                when pregnancy is possible, seek urgent medical care now.
              </p>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("cyclecare-navigate", { detail: "Offline answers" }))}
              >
                Open offline answers
              </button>
            </div>
          )}
          <p className="assistant-medical-disclaimer">
            AI answers are general education only—not diagnosis or treatment.
            Do not start or stop medication based on an AI response. Urgent
            safety guidance takes priority over AI.
          </p>
          {!aiConsent && (
            <>
              <label className="ai-consent assistant-popover-consent">
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => updateConsent(true)}
                />
                <span>I agree to send a question I type here for a cloud-generated educational response.</span>
              </label>
              <p className="assistant-consent-details">
                The question is sent through CycleCare's server to Google Gemini. Saved CycleCare records and this chat history are not sent. These services may process standard connection details, such as your IP address. Do not include names, contact details, or other identifying or sensitive information. Your choice is saved in this browser until you revoke it.
                {" "}<a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noreferrer">Google Gemini API terms</a>
              </p>
            </>
          )}
          {aiConsent ? (
            <form className="assistant-chat-form" onSubmit={sendMessage}>
              <textarea
                ref={inputRef}
                value={draft}
                maxLength={2000}
                rows={2}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask a health education question…"
                aria-label="Your question for Gemini AI"
              />
              <button type="submit" disabled={!draft.trim() || isAskingAi} aria-label="Send question">
                <Send size={18} />
              </button>
            </form>
          ) : (
            <p className="assistant-consent-prompt">Select “I agree” above to open the question box.</p>
          )}
        </section>
      )}
      <button
        ref={launcherRef}
        className={`assistant-launcher ${isOpen ? "is-open" : ""} ${isFullscreen || fullscreenMotion === "restoring" ? "is-hidden" : ""}`}
        type="button"
        onClick={() => (isOpen && !isClosing ? closeAssistant() : openAssistant())}
        aria-expanded={isOpen}
        aria-controls="assistant-popover"
        aria-label={isOpen ? "Close AI assistant panel" : "Open AI assistant chat"}
      >
        {isOpen ? <X className="assistant-launcher-icon" size={22} /> : <MessageCircle className="assistant-launcher-icon" size={23} />}
        {!isOpen && <span>Ask AI</span>}
      </button>
    </div>
  );
}

function RemindersPage({ discreetMode }) {
  const [reminders, setReminders] = useState(() => getReminders());
  const [permission, setPermission] = useState(
    () => ("Notification" in window ? Notification.permission : "unsupported")
  );
  const [customText, setCustomText] = useState("");
  const [customTime, setCustomTime] = useState("09:00");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const inspectReminders = () => {
      const current = getReminders();
      const now = new Date();
      const today = localDateString();
      const fired = getFiredReminders();
      const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const estimate = getCycleEstimate(getPeriodEntries());
      const matching = current.filter((reminder) => {
        if (!reminder.enabled || reminder.time !== time || fired[reminder.id] === today) return false;
        if (reminder.id !== "expected-period") return true;
        return estimate &&
          !estimate.needsReview &&
          daysBetween(localDateStringForDate(estimate.windowStart), today) >= 0 &&
          daysBetween(localDateStringForDate(estimate.windowEnd), today) <= 0;
      });

      if (!matching.length) return;

      const title = discreetMode ? "Diary" : "CycleCare";
      const bodies = [];
      matching.forEach((reminder) => {
        const body = discreetMode ? "Time to check in." : reminder.message;
        try {
          if (permission === "granted") {
            new Notification(title, { body, tag: `cyclecare-${reminder.id}` });
          }
          bodies.push(body);
          fired[reminder.id] = today;
        } catch {
          bodies.push(`${body} (shown here because the browser notification could not be displayed)`);
          fired[reminder.id] = today;
        }
      });
      try {
        localStorage.setItem("cyclecare_reminder_fired", JSON.stringify(fired));
      } catch {
        bodies.push("CycleCare could not save the delivery status, so a reminder may appear again.");
      }
      if (bodies.length) setMessage(bodies.join(" "));
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") inspectReminders();
    };
    const timer = window.setInterval(inspectReminders, 10000);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", inspectReminders);
    inspectReminders();
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", inspectReminders);
    };
  }, [discreetMode, permission]);

  function save(next) {
    setReminders(next);
    try {
      setHealthItem("cyclecare_reminders", JSON.stringify(next));
      setMessage("Reminder settings saved on this device.");
    } catch {
      setMessage("Could not save reminder settings. Check browser storage and try again.");
    }
  }

  function deliverTestReminder() {
    const title = discreetMode ? "Diary" : "CycleCare";
    const body = discreetMode ? "Time to check in." : "This is a test reminder.";
    if (permission === "granted") {
      try {
        new Notification(title, { body, tag: "cyclecare-test" });
        setMessage("Test notification sent. Scheduled reminders are checked while this page is open.");
        return;
      } catch {
        setMessage(`${body} Browser notification could not be displayed.`);
        return;
      }
    }
    setMessage(body);
  }

  async function requestPermission() {
    if (!("Notification" in window)) {
      setMessage("Notifications are unavailable in this browser. In-app reminders work while this page is open.");
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      setMessage(result === "granted" ? "Browser reminders enabled while the app is open." : "Permission was not granted; in-app reminders remain available while the app is open.");
    } catch {
      setMessage("The browser could not request notification permission. In-app reminders remain available while this page is open.");
    }
  }

  const defaults = [
    { id: "daily", title: "Daily check-in", message: "Time for a gentle check-in.", time: "20:00" },
    { id: "expected-period", title: "Estimated period window", message: "Your estimated period window begins today.", time: "09:00" },
    { id: "medicines", title: "Medicine reminder", message: "Time for your medicine reminder.", time: "09:00" },
  ];

  return (
    <section className="page-card">
      <span className="eyebrow">OPTIONAL, CONTROLLED BY YOU</span>
      <h2>Reminders</h2>
      <p className="page-description">
        All reminders start off. They are checked only while this app is open;
        browsers do not reliably schedule reminders after the page is closed.
        Discreet Mode uses neutral wording.
      </p>
      <button className="secondary-button" onClick={requestPermission}>Enable browser notifications</button>
      <p className="privacy-hint">Notification permission: {permission}</p>
      <button className="secondary-button" type="button" onClick={deliverTestReminder}>
        Send test reminder
      </button>
      {defaults.map((item) => {
        const current = reminders.find((reminder) => reminder.id === item.id) || { ...item, enabled: false };
        return (
          <div className="reminder-row" key={item.id}>
            <label><input type="checkbox" checked={current.enabled} onChange={(event) => save([...reminders.filter((reminder) => reminder.id !== item.id), { ...current, enabled: event.target.checked }])} /> {item.title}</label>
            <AnimatedTimeSelect id={`reminder-time-${item.id}`} value={current.time} onChange={(event) => save([...reminders.filter((reminder) => reminder.id !== item.id), { ...current, time: event.target.value }])} />
          </div>
        );
      })}
      <label className="field-label" htmlFor="custom-reminder">Custom reminder</label>
      <div className="custom-reminder-row">
        <input id="custom-reminder" value={customText} onChange={(event) => setCustomText(event.target.value)} maxLength={80} placeholder="Reminder name" />
        <label className="sr-only" htmlFor="custom-reminder-time">Reminder time</label>
        <AnimatedTimeSelect id="custom-reminder-time" value={customTime} onChange={(event) => setCustomTime(event.target.value)} />
        <button className="secondary-button" onClick={() => {
          if (!customText.trim()) return;
          save([...reminders, { id: `custom-${Date.now()}`, title: customText.trim(), message: customText.trim(), time: customTime, enabled: false }]);
          setCustomText("");
        }}>Add</button>
      </div>
      {reminders.filter((item) => item.id.startsWith("custom-")).map((item) => (
        <div className="reminder-row" key={item.id}>
          <label><input type="checkbox" checked={item.enabled} onChange={(event) => save(reminders.map((reminder) => reminder.id === item.id ? { ...reminder, enabled: event.target.checked } : reminder))} /> {item.title}</label>
          <AnimatedTimeSelect id={`reminder-time-${item.id}`} value={item.time} onChange={(event) => save(reminders.map((reminder) => reminder.id === item.id ? { ...reminder, time: event.target.value } : reminder))} />
          <button
            type="button"
            className="reminder-remove"
            aria-label={`Remove ${item.title} reminder`}
            title="Remove reminder"
            onClick={() => save(reminders.filter((reminder) => reminder.id !== item.id))}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      {message && <p className="form-message" role="status">{message}</p>}
    </section>
  );
}

function PregnancyPage({ language }) {
  const [enabled, setEnabled] = useState(
    () => getHealthItem("cyclecare_pregnancy_mode") === "true"
  );
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  const periods = getPeriodEntries();
  const lastStart = periods.length ? parseDateOnly(periods[periods.length - 1].startDate) : null;
  const elapsedDays = lastStart
    ? Math.max(0, daysBetween(localDateStringForDate(lastStart), localDateString()))
    : null;
  const weeks = elapsedDays === null ? null : Math.floor(elapsedDays / 7);
  const dueDate = lastStart ? addDays(lastStart, 280) : null;

  function toggleMode() {
    if (!enabled) {
      if (!confirmed) {
        setMessage("Only enable this mode after a positive pregnancy test or confirmation from a healthcare professional.");
        return;
      }
      setHealthItem("cyclecare_pregnancy_mode", "true");
      setEnabled(true);
      setMessage("Pregnancy mode is on. Period estimates are paused.");
    } else if (window.confirm("Turn off pregnancy mode? Your records will remain. You can turn it on again later.")) {
      removeHealthItem("cyclecare_pregnancy_mode");
      setEnabled(false);
      setMessage("Pregnancy mode is off. No assumptions are made about why.");
    }
  }

  return (
    <section className="page-card pregnancy-page">
      <span className="eyebrow">OPTIONAL LIFE-STAGE INFORMATION</span>
      <h2>{language === "hi" ? "गर्भावस्था जानकारी" : "Pregnancy information"}</h2>
      <p className="page-description">This optional information is not confirmation of pregnancy or a substitute for prenatal care.</p>
      {!enabled ? (
        <div className="care-guidance-card">
          <p>Pregnancy mode remains off unless you have a positive pregnancy test or a healthcare professional has confirmed pregnancy.</p>
          <label className="check-field"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> I have a positive test or professional confirmation</label>
          <button className="primary-button" onClick={toggleMode}>Turn on pregnancy mode</button>
        </div>
      ) : (
        <>
          {lastStart ? (
            <article className="estimate-card">
              <h3>Estimated pregnancy timing</h3>
              <p>{weeks === null ? "" : `About ${weeks} weeks from the last recorded period start.`}</p>
              <p>Estimated due date: {formatDate(dueDate)} (estimate only; dating must be confirmed by a clinician).</p>
            </article>
          ) : (
            <p>No last-period date is recorded. Ask a healthcare professional about pregnancy dating.</p>
          )}
          <article className="care-urgent-note">
            <h3>Get medical help now for concerning symptoms</h3>
            <p>Seek urgent medical assessment for bleeding or severe belly pain; severe headache, blurred vision or sudden swelling of the face or hands; fever; fluid leaking; or baby movement that is less than usual later in pregnancy. Do not wait for this app; contact your maternity or local emergency service.</p>
            <div className="care-guidance-sources">
              <a href="https://www.nhs.uk/pregnancy/common-symptoms/vaginal-bleeding/" target="_blank" rel="noreferrer">NHS: bleeding in pregnancy <ExternalLink size={14} /></a>
              <a href="https://www.nhs.uk/conditions/pre-eclampsia/" target="_blank" rel="noreferrer">NHS: pre-eclampsia warning signs <ExternalLink size={14} /></a>
              <a href="https://www.nhs.uk/pregnancy/keeping-well/your-babys-movements/" target="_blank" rel="noreferrer">NHS: baby's movements <ExternalLink size={14} /></a>
              <a href="https://www.nhs.uk/pregnancy/labour-and-birth/signs-that-labour-has-begun/" target="_blank" rel="noreferrer">NHS: waters breaking <ExternalLink size={14} /></a>
            </div>
          </article>
          <article className="care-guidance-card">
            <h3>Weekly information</h3>
            <p>Pregnancy development and recommended care vary. Arrange antenatal care with a qualified provider for information matched to your situation.</p>
            <a href="https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/" target="_blank" rel="noreferrer">NHS week-by-week guide <ExternalLink size={14} /></a>
          </article>
          <button className="secondary-button" onClick={toggleMode}>Turn off pregnancy mode</button>
        </>
      )}
      {message && <p className="form-message" role="status">{message}</p>}
    </section>
  );
}

function OnboardingDialog({ onChoose, onLanguageChange, language }) {
  const hi = language === "hi";
  return (
    <div className="onboarding-backdrop">
      <section className="onboarding-dialog" role="dialog" aria-modal="true" aria-labelledby="onboarding-heading">
        <div className="language-control">
          <Globe2 size={18} />
          <button onClick={() => onLanguageChange("en")} aria-pressed={!hi}>English</button>
          <button onClick={() => onLanguageChange("hi")} aria-pressed={hi}>हिंदी</button>
        </div>
        <span className="eyebrow">{hi ? "आपका निजी स्वास्थ्य साथी" : "YOUR PRIVATE HEALTH COMPANION"}</span>
        <h2 id="onboarding-heading">{hi ? "CycleCare में आपका स्वागत है" : "Welcome to CycleCare"}</h2>
        <p>{hi ? "आपका डेटा इस ब्राउज़र में रहता है। शुरू करने के लिए डेमो डेटा आज़माएँ या खाली रिकॉर्ड से शुरू करें।" : "Your records stay in this browser. Try sample records to explore the app, or start with an empty diary."}</p>
        <p className="privacy-hint">{hi ? "डेमो रिकॉर्ड काल्पनिक हैं। ऐप निदान या आपातकालीन देखभाल का विकल्प नहीं है।" : "Demo records are fictional. This app does not diagnose or replace emergency or professional care."}</p>
        <div className="onboarding-actions">
          <button className="primary-button" onClick={() => onChoose(true)}>{hi ? "डेमो डेटा आज़माएँ" : "Try with demo data"}</button>
          <button className="secondary-button" onClick={() => onChoose(false)}>{hi ? "नई शुरुआत करें" : "Start fresh"}</button>
        </div>
      </section>
    </div>
  );
}

function VaultUnlockDialog({ onUnlock }) {
  const [secret, setSecret] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [pinRejected, setPinRejected] = useState(false);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [showWrongPassword, setShowWrongPassword] = useState(false);
  const pinFallTimer = useRef(null);

  useEffect(() => () => window.clearTimeout(pinFallTimer.current), []);

  async function submit(event) {
    event.preventDefault();
    const vaultVersion = getEncryptedVaultVersion();
    if (vaultVersion === 1 && !/^\d{4}$/.test(secret)) {
      setMessage("Enter your existing four-digit PIN.");
      return;
    }
    if (vaultVersion === 3 && !/^\d{5}$/.test(secret)) {
      setMessage("Enter your five-digit PIN.");
      return;
    }
    setBusy(true);
    setMessage("");
    setShowWrongPassword(false);
    try {
      await onUnlock(secret);
    } catch {
      setIsRebuilding(false);
      setPinRejected(true);
      pinFallTimer.current = window.setTimeout(() => {
        setSecret("");
        setPinRejected(false);
        setMessage("");
        setShowWrongPassword(true);
        setIsRebuilding(false);
        setIsRebuilding(true);
        pinFallTimer.current = window.setTimeout(() => setShowWrongPassword(false), 700);
      }, 1150);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="onboarding-backdrop vault-unlock-backdrop">
      <div className="vault-lock-brand">CycleCare</div>
      {showWrongPassword && <div className="vault-wrong-password-toast" role="alert">That credential could not unlock your vault. Check it and try again.</div>}
      <section className={`onboarding-dialog vault-unlock-dialog ${message ? "has-error" : ""} ${pinRejected ? "is-breaking" : ""} ${isRebuilding ? "is-rebuilding" : ""}`} role="dialog" aria-modal="true" aria-labelledby="vault-heading">
        <div className="vault-lock-icon"><LockKeyhole size={25} aria-hidden="true" /></div>
        <h2 id="vault-heading">CycleCare is locked</h2>
        <p>{getEncryptedVaultVersion() === 1
          ? "Your existing vault uses a four-digit PIN. Enter it to unlock, then set a new five-digit PIN in Settings. A forgotten PIN cannot be recovered."
          : getEncryptedVaultVersion() === 2
            ? "This vault uses an older credential format. Enter the credential you set previously, then set a new five-digit PIN in Settings."
            : "Your health records are encrypted on this device. Enter your five-digit PIN to unlock. A forgotten PIN cannot be recovered."}</p>
        <form className="vault-unlock-form" onSubmit={submit}>
          <label className="field-label" htmlFor="vault-pin">{getEncryptedVaultVersion() === 1
            ? "Existing four-digit PIN"
            : getEncryptedVaultVersion() === 2 ? "Existing vault credential" : "Five-digit PIN"}</label>
          <div className={`vault-pin-entry ${getEncryptedVaultVersion() === 2 ? "is-passphrase" : getEncryptedVaultVersion() === 1 ? "is-legacy-pin" : "is-pin"}`}>
            <input id="vault-pin" className="vault-pin-input" type="password" inputMode={getEncryptedVaultVersion() === 2 ? "text" : "numeric"} autoComplete="current-password" maxLength={getEncryptedVaultVersion() === 1 ? 4 : getEncryptedVaultVersion() === 2 ? 256 : 5} value={secret} onChange={(event) => {
              setSecret(getEncryptedVaultVersion() === 2 ? event.target.value : event.target.value.replace(/\D/g, "").slice(0, getEncryptedVaultVersion() === 1 ? 4 : 5));
              setMessage("");
              setPinRejected(false);
              window.clearTimeout(pinFallTimer.current);
            }} required disabled={busy || pinRejected} />
            {getEncryptedVaultVersion() !== 2 && <div className={`vault-pin-slots ${getEncryptedVaultVersion() === 1 ? "is-legacy-pin" : ""}`} aria-hidden="true">
              {Array.from({ length: getEncryptedVaultVersion() === 1 ? 4 : 5 }, (_, index) => (
                <span
                  className={`vault-pin-slot ${pinRejected ? "is-rejected" : ""}`}
                  key={`${index}-${Boolean(secret[index])}-${pinRejected}`}
                  style={{ "--pin-index": index }}
                >
                  {secret[index] && <span className="vault-pin-dot" />}
                </span>
              ))}
            </div>}
          </div>
          <button className="primary-button" type="submit" disabled={busy || pinRejected}>
            {busy && <span className="vault-loading-spinner" aria-hidden="true" />}
            {busy ? "Unlocking..." : "Unlock"}
          </button>
        </form>
        {message && (
          <p className={`form-message vault-error-message ${pinRejected ? "is-falling" : ""}`} role="alert">
            {pinRejected
              ? [...message].map((character, index) => (
                  <span key={`${index}-${character}`} style={{ "--letter-index": index }}>
                    {character === " " ? "\u00a0" : character}
                  </span>
                ))
              : message}
          </p>
        )}
      </section>
    </div>
  );
}

/* -------------------- SYMPTOMS -------------------- */

function SymptomsPage({ editRecord, onEditComplete }) {
  const [selectedSymptoms, setSelectedSymptoms] = useState(editRecord?.symptoms || []);
  const [entryDate, setEntryDate] = useState(editRecord?.date || localDateString());
  const [note, setNote] = useState(editRecord?.note || "");
  const [flow, setFlow] = useState(editRecord?.flow || "");
  const [pain, setPain] = useState(editRecord?.pain || 0);
  const [painStopsActivities, setPainStopsActivities] = useState(editRecord?.painStopsActivities || false);
  const [bleedingBetweenPeriods, setBleedingBetweenPeriods] = useState(editRecord?.bleedingBetweenPeriods || false);
  const [suddenSevereLowerPain, setSuddenSevereLowerPain] = useState(editRecord?.suddenSevereLowerPain || false);
  const [veryHeavyWithFaintness, setVeryHeavyWithFaintness] = useState(editRecord?.veryHeavyWithFaintness || false);
  const [pregnancyPossibleWithSymptoms, setPregnancyPossibleWithSymptoms] = useState(editRecord?.pregnancyPossibleWithSymptoms || false);
  const [mood, setMood] = useState(editRecord?.mood || "okay");
  const [energy, setEnergy] = useState(editRecord?.energy || "usual");
  const [sleepHours, setSleepHours] = useState(editRecord?.sleepHours == null ? "" : String(editRecord.sleepHours));
  const [medicines, setMedicines] = useState(editRecord?.medicines || "");
  const [selfHarmConcern, setSelfHarmConcern] = useState(editRecord?.selfHarmConcern || false);
  const [message, setMessage] = useState(
    editRecord ? `Editing check-in from ${formatDate(editRecord.date)}.` : ""
  );
  const [records, setRecords] = useState(() => getSymptomEntries());

  const symptoms = getTrackedSymptoms();
  const summary = getSymptomSummary(records);
  const painBand = Number(pain) === 0 ? "none" : Number(pain) <= 3 ? "mild" : Number(pain) <= 6 ? "moderate" : "severe";

  useEffect(() => {
    const refreshRecords = () => setRecords(getSymptomEntries());
    const handleStorageChange = (event) => {
      if (event.key === "cyclecare_symptoms") refreshRecords();
    };

    window.addEventListener("cyclecare-symptoms-updated", refreshRecords);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(
        "cyclecare-symptoms-updated",
        refreshRecords
      );
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  function toggleSymptom(symptom) {
    setSelectedSymptoms((current) =>
      current.includes(symptom)
        ? current.filter((item) => item !== symptom)
        : [...current, symptom]
    );
  }

  function saveSymptoms(event) {
    event.preventDefault();

    if (!parseDateOnly(entryDate) || entryDate > localDateString()) {
      setMessage("Choose a valid date that is not in the future.");
      return;
    }

    const savedRecord = {
      id: editRecord?.id || `${Date.now()}`,
      date: entryDate,
      symptoms: selectedSymptoms,
      note,
      flow,
      pain: Number(pain),
      painStopsActivities,
      bleedingBetweenPeriods,
      suddenSevereLowerPain,
      veryHeavyWithFaintness,
      pregnancyPossibleWithSymptoms,
      mood,
      energy,
      sleepHours: sleepHours === "" ? null : Number(sleepHours),
      medicines,
      selfHarmConcern,
    };
    let updatedRecords;
    try {
      updatedRecords = upsertSymptomRecord(records, savedRecord, {
        today: localDateString(),
        editingId: editRecord?.id,
      });
    } catch (error) {
      setMessage(error.message);
      return;
    }

    setHealthItem(
      "cyclecare_symptoms",
      JSON.stringify(updatedRecords)
    );

    setRecords(updatedRecords);
    setSelectedSymptoms([]);
    setNote("");
    setFlow("");
    setPain(0);
    setPainStopsActivities(false);
    setBleedingBetweenPeriods(false);
    setSuddenSevereLowerPain(false);
    setVeryHeavyWithFaintness(false);
    setPregnancyPossibleWithSymptoms(false);
    setMood("okay");
    setEnergy("usual");
    setSleepHours("");
    setMedicines("");
    setSelfHarmConcern(false);
    setMessage(editRecord
      ? "Your symptom check-in was updated on this device."
      : "Your symptom check-in was saved on this device.");
    onEditComplete?.();
    window.dispatchEvent(new Event("cyclecare-symptoms-updated"));
  }

  function deleteSymptomRecord(record) {
    if (!window.confirm(`Delete the symptom check-in from ${formatDate(record.date)}? This cannot be undone.`)) return;
    const updatedRecords = records.filter((item) => item.id !== record.id);
    setHealthItem("cyclecare_symptoms", JSON.stringify(updatedRecords));
    setRecords(updatedRecords);
    setMessage("Symptom check-in deleted from this device.");
    if (editRecord?.id === record.id) {
      onEditComplete?.();
      setEntryDate(localDateString());
      setSelectedSymptoms([]);
      setNote("");
      setFlow("");
      setPain(0);
      setPainStopsActivities(false);
      setBleedingBetweenPeriods(false);
      setSuddenSevereLowerPain(false);
      setVeryHeavyWithFaintness(false);
      setPregnancyPossibleWithSymptoms(false);
      setMood("okay");
      setEnergy("usual");
      setSleepHours("");
      setMedicines("");
      setSelfHarmConcern(false);
    }
    window.dispatchEvent(new Event("cyclecare-symptoms-updated"));
  }

  return (
    <section className="page-card">
      <span className="eyebrow">LISTEN TO YOUR BODY</span>
      <h2>My Symptoms</h2>

      <p className="page-description">
        Record how you feel today. Symptoms alone cannot diagnose a
        medical condition.
      </p>

      <form className="symptoms-form" onSubmit={saveSymptoms}>
        <div className="symptom-form-section symptom-date-section">
          <label className="field-label" htmlFor="symptom-entry-date">Check-in date</label>
          <input
            id="symptom-entry-date"
            type="date"
            value={entryDate}
            max={localDateString()}
            onChange={(event) => setEntryDate(event.target.value)}
            required
          />
        </div>
        <section className="symptom-form-section" aria-labelledby="symptom-selection-heading">
          <h3 className="form-section-title" id="symptom-selection-heading">
            What are you experiencing?
          </h3>
          <p className="symptom-section-hint">Choose any that feel relevant today.</p>
          <div className="symptom-options">
            {symptoms.map((symptom) => (
              <button
                type="button"
                key={symptom}
                className={`symptom-option ${
                  selectedSymptoms.includes(symptom) ? "selected" : ""
                }`}
                onClick={() => toggleSymptom(symptom)}
                aria-pressed={selectedSymptoms.includes(symptom)}
              >
                {symptom}
              </button>
            ))}
          </div>
        </section>

        <section className="symptom-form-section" aria-labelledby="pain-heading">
          <SelectionCards
            legend="Bleeding flow today (optional)"
            value={flow}
            onChange={setFlow}
            className="flow-selection-cards"
            options={[
              { value: "", label: "Skip", description: "Not tracking" },
              { value: "spotting", label: "Spotting" },
              { value: "light", label: "Light" },
              { value: "medium", label: "Medium" },
              { value: "heavy", label: "Heavy" },
            ]}
          />
          <div className="pain-level-control">
            <label className="field-label" htmlFor="pain-level" id="pain-heading">
              Pain level <span>{pain} / 10</span>
            </label>
            <SelectionCards
              legend="Choose a pain range"
              value={painBand}
              onChange={(value) => setPain(value)}
              className="pain-selection-cards"
              options={[
                { value: "none", selectValue: 0, label: "None", description: "0" },
                { value: "mild", selectValue: 2, label: "Mild", description: "1–3" },
                { value: "moderate", selectValue: 5, label: "Moderate", description: "4–6" },
                { value: "severe", selectValue: 8, label: "Severe", description: "7–10" },
              ]}
            />
            <input
              id="pain-level"
              type="range"
              min="0"
              max="10"
              value={pain}
              style={{ "--pain-progress": `${Number(pain) * 10}%` }}
              onChange={(event) => setPain(event.target.value)}
            />
          </div>
          <label className="check-field">
            <input
              type="checkbox"
              checked={painStopsActivities}
              onChange={(event) => setPainStopsActivities(event.target.checked)}
            />
            Pain stopped me doing usual activities
          </label>
          <label className="check-field">
            <input
              type="checkbox"
              checked={bleedingBetweenPeriods}
              onChange={(event) => setBleedingBetweenPeriods(event.target.checked)}
            />
            I noticed bleeding between periods or after sex
          </label>
        </section>
        <fieldset className="urgent-symptom-questions">
          <legend>Urgent symptoms (only select if this applies now)</legend>
          <label className="check-field">
            <input type="checkbox" checked={suddenSevereLowerPain} onChange={(event) => setSuddenSevereLowerPain(event.target.checked)} />
            Sudden severe pain in my lower belly
          </label>
          <label className="check-field">
            <input type="checkbox" checked={veryHeavyWithFaintness} onChange={(event) => setVeryHeavyWithFaintness(event.target.checked)} />
            Very heavy bleeding with dizziness or fainting
          </label>
          <label className="check-field">
            <input type="checkbox" checked={pregnancyPossibleWithSymptoms} onChange={(event) => setPregnancyPossibleWithSymptoms(event.target.checked)} />
            Pregnancy is possible and I have severe pain or bleeding
          </label>
        </fieldset>

        <section className="symptom-form-section symptom-wellbeing-fields">
          <SelectionCards
            legend="Mood today"
            value={mood}
            onChange={setMood}
            className="mood-selection-cards"
            options={[
              { value: "very-low", label: "Very low" },
              { value: "low", label: "Low" },
              { value: "okay", label: "Okay" },
              { value: "good", label: "Good" },
              { value: "very-good", label: "Very good" },
            ]}
          />
          <SelectionCards
            legend="Energy today"
            value={energy}
            onChange={setEnergy}
            className="energy-selection-cards"
            options={[
              { value: "low", label: "Low" },
              { value: "usual", label: "Usual" },
              { value: "high", label: "High" },
            ]}
          />
          <div className="symptom-field">
            <label className="field-label" htmlFor="sleep-hours">Sleep (hours, optional)</label>
            <input
              id="sleep-hours"
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={sleepHours}
              onChange={(event) => setSleepHours(event.target.value)}
            />
          </div>
          <div className="symptom-field symptom-field-wide">
            <label className="field-label" htmlFor="medicines">Medicines taken (optional)</label>
            <input
              id="medicines"
              type="text"
              value={medicines}
              maxLength={250}
              onChange={(event) => setMedicines(event.target.value)}
              placeholder="Only include what you choose to record"
            />
          </div>
        </section>

        <section className="symptom-form-section">
          <label className="field-label" htmlFor="symptom-note">
            Additional notes <span>(optional)</span>
          </label>
          <textarea
            id="symptom-note"
            className="notes-input"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="How have you been feeling?"
            rows={4}
            maxLength={1000}
          />
        </section>

        <section className="symptom-wellbeing-prompt">
          <label className="check-field wellbeing-check">
            <input
              type="checkbox"
              checked={selfHarmConcern}
              onChange={(event) => setSelfHarmConcern(event.target.checked)}
            />
            I have thoughts about harming myself and would like support
          </label>
          <p className="privacy-hint">
            This is stored only in this browser. If you might act on these
            thoughts or are in immediate danger, contact emergency help now.
          </p>
        </section>

        <button type="submit" className="primary-button">
          {editRecord ? "Update check-in" : "Save check-in"}
        </button>
        {editRecord && (
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              onEditComplete?.();
              setEntryDate(localDateString());
              setSelectedSymptoms([]);
              setNote("");
              setFlow("");
              setPain(0);
              setPainStopsActivities(false);
              setBleedingBetweenPeriods(false);
              setSuddenSevereLowerPain(false);
              setVeryHeavyWithFaintness(false);
              setPregnancyPossibleWithSymptoms(false);
              setMood("okay");
              setEnergy("usual");
              setSleepHours("");
              setMedicines("");
              setSelfHarmConcern(false);
              setMessage("");
            }}
          >
            Cancel edit
          </button>
        )}
      </form>

      {message && (
        <p className="form-message" role="status">
          {message}
        </p>
      )}

      {(records.some((record) => record.date === localDateString() && record.selfHarmConcern) ||
        hasThreeConsecutiveLowMoodDays(records)) && (
        <aside className="wellbeing-support" role="alert">
          <h3>You deserve support</h3>
          <p>
            Consider talking with someone you trust or a qualified mental
            health professional. In India, Tele-MANAS can be reached at 14416.
            If you may act on thoughts of self-harm or are in immediate danger,
            contact local emergency services now.
          </p>
          <a href="https://telemanas.mohfw.gov.in/" target="_blank" rel="noreferrer">
            Ministry of Health and Family Welfare: Tele-MANAS <ExternalLink size={14} />
          </a>
          <p>
            This app cannot provide crisis monitoring or emergency support.
          </p>
        </aside>
      )}
      {(suddenSevereLowerPain ||
        veryHeavyWithFaintness ||
        pregnancyPossibleWithSymptoms ||
        records.some((record) =>
          record.date === localDateString() && (
          record.suddenSevereLowerPain ||
          record.veryHeavyWithFaintness ||
          record.pregnancyPossibleWithSymptoms
          )
        )) && (
        <aside className="urgent-help-card" role="alert">
          <h3>Get medical help now</h3>
          <p>
            These symptoms need urgent medical assessment. If you are in India,
            call 112 for emergency help. Ambulance number 108 may be available
            in your state; use your local emergency service if it is not.
            Do not wait for an app or an estimate.
          </p>
          <a href="https://112.gov.in/" target="_blank" rel="noreferrer">India Emergency Response Support System (112) <ExternalLink size={14} /></a>
        </aside>
      )}

      <section className="symptom-insights" aria-labelledby="insights-heading">
        <div className="insights-heading">
          <div>
            <span className="eyebrow">YOUR RECORDED PATTERNS</span>
            <h3 id="insights-heading">Symptom Insights</h3>
          </div>
          <Activity size={20} aria-hidden="true" />
        </div>

        {summary.totalEntries === 0 ? (
          <p className="page-description">
            Save a few check-ins to see a private summary of the symptoms you record.
          </p>
        ) : (
          <>
            <div className="symptom-stat-grid">
              <article className="symptom-stat-card">
                <span>CHECK-INS</span>
                <strong>{summary.totalEntries}</strong>
                <p>symptom entries recorded</p>
              </article>
              <article className="symptom-stat-card purple-stat">
                <span>SYMPTOM TYPES</span>
                <strong>{summary.distinctSymptoms}</strong>
                <p>distinct types recorded</p>
              </article>
            </div>

            {summary.frequencies.length > 0 ? (
              <div className="symptom-frequency" aria-label="Symptom frequency">
                <h4>Frequency by symptom</h4>
                {summary.frequencies.map(({ symptom, count }) => (
                  <div className="frequency-row" key={symptom}>
                    <span>{symptom}</span>
                    <div
                      className="frequency-track"
                      role="progressbar"
                      aria-label={`${symptom}: ${count} recorded entries`}
                      aria-valuemin="0"
                      aria-valuemax={summary.highestFrequency}
                      aria-valuenow={count}
                    >
                      <span
                        className="frequency-bar"
                        style={{
                          width: `${(count / summary.highestFrequency) * 100}%`,
                        }}
                      />
                    </div>
                    <strong>{count}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="insight-empty">
                Your check-ins are saved. Select symptoms in future entries to build a frequency summary.
              </p>
            )}

            <div className="pattern-insight" role="status">
              <Sparkles size={17} aria-hidden="true" />
              <p>
                You have recorded {summary.totalEntries} symptom {summary.totalEntries === 1 ? "entry" : "entries"} so far.
                {summary.mostFrequent.length > 0 &&
                  ` ${summary.mostFrequent.join(" and ")} ${summary.mostFrequent.length === 1 ? "is" : "are"} your most frequently recorded ${summary.mostFrequent.length === 1 ? "symptom" : "symptoms"} (${summary.highestFrequency} ${summary.highestFrequency === 1 ? "entry" : "entries"}).`}
              </p>
            </div>
          </>
        )}
      </section>

      <div className="history-section">
        <h3>Previous check-ins</h3>

        {records.length === 0 ? (
          <p className="page-description">
            Your saved symptom check-ins will appear here.
          </p>
        ) : (
          <div className="history-list">
            {sortSymptomRecords(records).map((record) => (
              <div className="history-item" key={record.id}>
                <div className="history-icon">
                  <Activity size={18} />
                </div>

                <div className="history-details">
                  <h4>{formatDate(record.date)}</h4>

                  <p>
                    {record.symptoms.length
                      ? record.symptoms.join(", ")
                      : "No symptoms selected"}
                  </p>
                  <p className="history-meta">
                    {record.flow && `Flow: ${record.flow} · `}Pain: {record.pain}/10 · Mood: {record.mood.replaceAll("-", " ")} · Energy: {record.energy}
                  </p>

                  {record.note && (
                    <p className="history-note">{record.note}</p>
                  )}
                </div>
                <div className="symptom-record-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent("cyclecare-edit-symptom", { detail: record }))}
                  >
                    Edit
                  </button>
                  <button
                    className="danger-button"
                    type="button"
                    onClick={() => deleteSymptomRecord(record)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* -------------------- LEARN -------------------- */

const learningArticles = [
  { title: "Understanding Your Menstrual Cycle", category: "Basics", minutes: "3 min read", keywords: "cycle menstruation period ovulation tracking", description: "A simple overview of periods and why timing can vary.", intro: "A menstrual cycle is counted from the first day of one period to the first day of the next.", sections: [["The basics", "Periods and cycle timing vary from person to person and can change over time. Tracking can help you notice your own pattern, but an app cannot confirm ovulation or predict every period."], ["Use tracking as a record", "Note period starts, symptoms and changes that matter to you. Bring a record to a healthcare appointment if you want help discussing a change."]], takeaway: "Variation can happen. A significant or concerning change is worth discussing with a healthcare professional.", source: { organisation: "WHO", title: "Menstrual health", url: "https://www.who.int/news-room/fact-sheets/detail/menstrual-health" } },
  { title: "Periods and What to Expect", category: "Basics", minutes: "3 min read", keywords: "bleeding period cycle changes irregular", description: "Understand normal variation and when a change deserves attention.", intro: "A period is bleeding from the uterus that is part of the menstrual cycle.", sections: [["Your own baseline matters", "Flow, duration and timing can differ between people. Notice what is usual for you and any changes that persist or affect your life."], ["Changes to check", "Bleeding between periods or after sex should be checked by a doctor. If periods stop unexpectedly and you are concerned, seek medical advice."]], takeaway: "A change does not automatically mean something is wrong, but it can be worth getting checked.", source: { organisation: "NHS", title: "Periods", url: "https://www.nhs.uk/conditions/periods/" } },
  { title: "Managing Menstrual Cramps", category: "Wellbeing", minutes: "3 min read", keywords: "cramps pain heat exercise period self care", description: "Gentle self-care ideas and signs to seek professional assessment.", intro: "Menstrual pain can be disruptive; support should match how it affects you.", sections: [["Comfort measures", "The NHS suggests options such as a warm bath or shower, a wrapped heat pad or hot water bottle, gentle movement, and rest. Ask a pharmacist or clinician which pain relief is suitable for you."], ["When to ask for help", "Seek urgent medical advice for severe or worse-than-usual pelvic pain that does not improve with pain relief. Arrange a routine assessment if pain affects everyday activities or changes noticeably."]], takeaway: "Severe, worsening, or life-limiting pain deserves professional assessment.", source: { organisation: "NHS", title: "Period pain", url: "https://www.nhs.uk/symptoms/period-pain/" } },
  { title: "Menstrual Hygiene and Period Products", category: "Hygiene", minutes: "3 min read", keywords: "hygiene pads tampons cups underwear washing disposal", description: "Choose products that suit you and support safe, dignified care.", intro: "Menstrual health includes access to materials, water, sanitation, privacy and safe disposal.", sections: [["Choose what works for you", "Pads, tampons, menstrual cups and period underwear are among the products people may choose. Follow the product instructions for use, cleaning, changing and disposal."], ["Plan for comfort and privacy", "Keep supplies available where possible, wash hands when you can, and use clean, private facilities. Menstruation is a natural process and not something to be ashamed of."]], takeaway: "Safe, comfortable menstrual care depends on your preferences, product guidance and access to clean facilities.", source: { organisation: "WHO", title: "Menstrual health", url: "https://www.who.int/news-room/fact-sheets/detail/menstrual-health" } },
  { title: "Premenstrual Symptoms: PMS", category: "Symptoms", minutes: "3 min read", keywords: "PMS mood fatigue bloating headache breast tenderness", description: "Learn about symptoms that may occur before a period and how to track them.", intro: "PMS describes symptoms some people experience in the weeks before a period.", sections: [["Symptoms differ", "Possible symptoms include mood changes, tiredness, bloating, cramps, headaches and breast tenderness. Experiences and severity can vary from month to month."], ["Keep a useful record", "A symptom diary can help you describe timing and impact to a healthcare professional. Seek advice if symptoms affect daily life or you are worried about them."]], takeaway: "Tracking describes your experience; it does not diagnose PMS or another condition.", source: { organisation: "NHS", title: "PMS (premenstrual syndrome)", url: "https://www.nhs.uk/conditions/pre-menstrual-syndrome/" } },
  { title: "Tracking Symptoms and Recognizing Patterns", category: "Symptoms", minutes: "2 min read", keywords: "track symptoms diary patterns notes cycle appointments", description: "Make records that can support conversations about your health.", intro: "A record can make it easier to remember what happened and when.", sections: [["What to note", "You might record dates, bleeding, symptoms, daily impact and anything you want to discuss. Keep entries factual and use them as a personal record."], ["Use patterns carefully", "A repeated pattern can be useful to share with a clinician, but it does not prove a cause. This app's estimates and insights are not diagnoses or contraception guidance."]], takeaway: "Your records can support a conversation; they cannot replace an individual assessment.", source: { organisation: "NHS", title: "Period problems", url: "https://www.nhs.uk/conditions/periods/period-problems/" } },
  { title: "When to Seek Medical Advice", category: "Medical Guidance", minutes: "4 min read", keywords: "doctor urgent heavy bleeding severe pain pregnancy bleeding between periods", description: "Know situations where professional assessment may be appropriate.", intro: "This app cannot determine whether you are medically safe. If you are worried, contact an appropriate healthcare service.", sections: [["Arrange medical advice", "Seek assessment for unusually heavy bleeding, severe or worsening pain, bleeding between periods or after sex, periods that stop unexpectedly, significant changes, or symptoms that substantially interfere with daily life."], ["Urgent care", "Seek urgent medical care for severe pelvic pain, especially if it is worse than usual or not helped by pain relief. Possible pregnancy with pain or bleeding also needs prompt professional assessment. If symptoms are severe or you feel unsafe, use local emergency services."], ["Prepare for a visit", "A short record of dates, bleeding, pain, symptoms and their impact can help you explain what has changed."]], takeaway: "Professional assessment is appropriate for concerning, severe, persistent or life-disrupting symptoms.", source: { organisation: "NHS", title: "Period problems", url: "https://www.nhs.uk/conditions/periods/period-problems/" } },
  { title: "Menstrual Health: Common Myths and Facts", category: "Basics", minutes: "3 min read", keywords: "myths facts stigma hygiene normal dirty fertility", description: "Replace stigma with practical, evidence-informed information.", intro: "Menstruation is a natural bodily process, not something dirty or shameful.", sections: [["Myth: periods are the same for everyone", "Fact: timing, flow, symptoms and experiences vary. Comparing yourself to someone else cannot tell you whether a change needs care."], ["Myth: tracking predicts everything", "Fact: a calendar can help organize records, but it cannot confirm ovulation, guarantee a future period date, or serve as contraception."], ["Myth: silence is safer", "Fact: accurate information and timely care can make it easier to seek support for symptoms that concern you."]], takeaway: "Choose reliable sources, ask questions, and seek professional advice for individual concerns.", source: { organisation: "WHO", title: "Menstrual health", url: "https://www.who.int/news-room/fact-sheets/detail/menstrual-health" } },
];

function LearnPage({ language }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("All");
  const [openedArticle, setOpenedArticle] = useState(null);
  const [isReading, setIsReading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const categories = ["All", "Basics", "Symptoms", "Hygiene", "Wellbeing", "Medical Guidance"];
  const query = searchTerm.trim().toLocaleLowerCase();
  const filteredArticles = [...learningArticles, ...healthLessons].filter((article) =>
    (category === "All" || article.category === category) &&
    (!query || query.split(/\s+/).every((term) => {
      const searchable = [
        article.title,
        article.description,
        article.keywords,
        article.intro,
        article.takeaway,
        article.sections.flat().join(" "),
        article.source.title,
        article.hindi?.title,
        article.hindi?.description,
        article.hindi?.intro,
        article.hindi?.takeaway,
        article.hindi?.sections.flat().join(" "),
      ].filter(Boolean).join(" ").toLocaleLowerCase();
      return searchable.includes(term);
    }))
  );

  useEffect(() => () => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, [openedArticle, language]);

  if (openedArticle) {
    const article = language === "hi" && openedArticle.hindi
      ? { ...openedArticle, ...openedArticle.hindi }
      : openedArticle;
    const speechSupported = "speechSynthesis" in window;
    const toggleReading = () => {
      if (!speechSupported) return;
      if (isReading && !isPaused) {
        window.speechSynthesis.pause();
        setIsPaused(true);
        return;
      }
      if (isPaused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
        return;
      }
      const speechText = [
        article.title,
        article.intro,
        ...article.sections.flatMap(([heading, body]) => [heading, body]),
        article.takeaway,
      ].join(". ");
      const speech = new SpeechSynthesisUtterance(speechText);
      speech.lang = language === "hi" ? "hi-IN" : "en-IN";
      applyPreferredSpeechVoice(speech);
      speech.onend = () => {
        setIsReading(false);
        setIsPaused(false);
      };
      speech.onerror = (event) => {
        if (event.error === "canceled" || event.error === "interrupted") return;
        setIsReading(false);
        setIsPaused(false);
        setSpeechError(language === "hi"
          ? "पढ़कर सुनाना शुरू नहीं हो पाया। कृपया अपने ब्राउज़र की आवाज़ सेटिंग जाँचें।"
          : "Read-aloud could not start. Check your browser's speech settings and try again.");
      };
      setSpeechError("");
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(speech);
      setIsReading(true);
    };
    const stopReading = () => {
      if (speechSupported) window.speechSynthesis.cancel();
      setIsReading(false);
      setIsPaused(false);
    };
    return (
      <section className="page-card article-reader">
        <button className="back-button" type="button" onClick={() => {
          setIsReading(false);
          setIsPaused(false);
          setSpeechError("");
          setOpenedArticle(null);
        }}>
          <ArrowLeft size={17} /> {language === "hi" ? "लेखों पर वापस जाएँ" : "Back to articles"}
        </button>
        <span className="article-category">{language === "hi" ? ({
          Basics: "बुनियादी जानकारी",
          Symptoms: "लक्षण",
          Hygiene: "स्वच्छता",
          Wellbeing: "सेहत",
          "Medical Guidance": "चिकित्सा सलाह",
        })[article.category] : article.category}</span>
        <h2>{article.title}</h2>
        {language === "hi" && !openedArticle.hindi && <p className="article-language-note" role="note">यह लेख अभी केवल अंग्रेज़ी में उपलब्ध है।</p>}
        <p className="article-intro">{article.intro}</p>
        {article.illustration === "cycle" && <CycleDiagram language={language} />}
        {article.sections.map(([heading, body]) => <section className="article-section" key={heading}><h3>{heading}</h3><p>{body}</p></section>)}
        <div className="article-takeaway"><h3>{language === "hi" ? "मुख्य बात" : "Key takeaway"}</h3><p>{article.takeaway}</p></div>
        <div className="read-aloud-controls">
          <button className="secondary-button read-aloud-button" type="button" onClick={toggleReading} disabled={!speechSupported}>
            <Volume2 size={16} /> {!speechSupported
              ? (language === "hi" ? "पढ़कर सुनाना उपलब्ध नहीं" : "Read-aloud unavailable")
              : isPaused
                ? (language === "hi" ? "फिर से शुरू करें" : "Resume")
                : isReading
                  ? (language === "hi" ? "रोकें" : "Pause")
                  : (language === "hi" ? "सुनें" : "Listen")}
          </button>
          {isReading && <button className="secondary-button read-aloud-button" type="button" onClick={stopReading}>
            {language === "hi" ? "बंद करें" : "Stop"}
          </button>}
        </div>
        {speechError && <p className="article-disclaimer" role="status">{speechError}</p>}
        <p className="article-disclaimer">{language === "hi"
          ? "यह सामान्य शैक्षिक जानकारी है, निदान या व्यक्तिगत उपचार सलाह नहीं। सामग्री की योग्य स्वास्थ्यकर्मी द्वारा समीक्षा अभी बाकी है।"
          : "This is general educational information, not a diagnosis or individualized treatment advice. Review by a qualified healthcare professional is still pending."}</p>
        <a className="article-source" href={article.source.url} target="_blank" rel="noreferrer"><ExternalLink size={16} /><span><strong>{article.source.organisation}</strong><br />{article.source.title}</span></a>
      </section>
    );
  }

  return (
    <section className="page-card learn-hub">
      <span className="eyebrow">{language === "hi" ? "जानकारी भी देखभाल है" : "KNOWLEDGE IS CARE"}</span>
      <h2>{language === "hi" ? "अपने स्वास्थ्य के बारे में जानें" : "Learn about your health"}</h2>
      <p className="page-description">{language === "hi"
        ? "मासिक स्वास्थ्य की स्पष्ट, स्रोत-आधारित जानकारी। यह व्यक्तिगत चिकित्सा सलाह का विकल्प नहीं है। सामग्री की योग्य स्वास्थ्यकर्मी द्वारा समीक्षा अभी बाकी है।"
        : "Clear, source-linked reading about menstrual health. It is not a substitute for personal medical advice. Review by a qualified healthcare professional is still pending."}</p>
      {language === "hi" && <p className="article-language-note" role="note">मुख्य विषय हिंदी में उपलब्ध हैं; कुछ अतिरिक्त लेख अभी केवल अंग्रेज़ी में हैं।</p>}
      <label className="article-search"><Search size={18} aria-hidden="true" /><span className="sr-only">{language === "hi" ? "लेख खोजें" : "Search articles"}</span><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={language === "hi" ? "अंग्रेज़ी या हिंदी में खोजें" : "Search in English or Hindi"} /></label>
      <div className="category-filters" aria-label={language === "hi" ? "लेख श्रेणियाँ" : "Article categories"}>{categories.map((item) => <button key={item} className={category === item ? "selected" : ""} onClick={() => setCategory(item)} aria-pressed={category === item}>{language === "hi" ? ({
        All: "सभी",
        Basics: "बुनियादी जानकारी",
        Symptoms: "लक्षण",
        Hygiene: "स्वच्छता",
        Wellbeing: "सेहत",
        "Medical Guidance": "चिकित्सा सलाह",
      })[item] : item}</button>)}</div>
      <p className="article-result-count" role="status">{language === "hi" ? `${filteredArticles.length} लेख` : `${filteredArticles.length} ${filteredArticles.length === 1 ? "article" : "articles"}`}</p>
      {filteredArticles.length === 0 ? <div className="article-empty"><h3>{language === "hi" ? "कोई लेख नहीं मिला" : "No articles found"}</h3><p>{language === "hi" ? "दूसरा शब्द खोजें या कोई अन्य श्रेणी चुनें।" : "Try a different search term or choose another category."}</p></div> : <div className="article-grid">{filteredArticles.map((rawArticle) => {
        const article = language === "hi" && rawArticle.hindi ? { ...rawArticle, ...rawArticle.hindi } : rawArticle;
        return <article className="article-card" key={rawArticle.title}><span className="article-category">{language === "hi" ? ({
          Basics: "बुनियादी जानकारी",
          Symptoms: "लक्षण",
          Hygiene: "स्वच्छता",
          Wellbeing: "सेहत",
          "Medical Guidance": "चिकित्सा सलाह",
        })[article.category] : article.category}</span><h3>{article.title}</h3><p>{article.description}</p>{language === "hi" && !rawArticle.hindi && <small className="article-card-language-note">केवल अंग्रेज़ी</small>}<div><span className="reading-time"><Clock size={14} />{article.minutes}</span><button type="button" onClick={() => {
          setIsReading(false);
          setIsPaused(false);
          setSpeechError("");
          setOpenedArticle(rawArticle);
        }} aria-label={`${language === "hi" ? "पढ़ें" : "Read"} ${article.title}`}>{language === "hi" ? "लेख पढ़ें" : "Read article"} <ChevronRight size={16} /></button></div></article>;
      })}</div>}
    </section>
  );
}

function CycleDiagram({ language }) {
  const hindi = language === "hi";
  return (
    <figure className="cycle-diagram">
      <svg viewBox="0 0 560 180" role="img" aria-labelledby="cycle-diagram-title cycle-diagram-description">
        <title id="cycle-diagram-title">{hindi ? "मासिक चक्र के चरण" : "Stages of the menstrual cycle"}</title>
        <desc id="cycle-diagram-description">{hindi
          ? "मासिक रक्तस्राव, गर्भाशय की परत का बनना, अंडा निकलना और अगले पीरियड की तैयारी का सरल चक्र। समय हर व्यक्ति में अलग हो सकता है।"
          : "A simplified cycle of menstruation, rebuilding of the uterine lining, possible egg release and preparation for the next period. Timing varies."}</desc>
        <path className="cycle-diagram-path" d="M 82 84 C 125 20, 224 20, 266 84 S 408 148, 478 84" fill="none" strokeWidth="5" strokeLinecap="round" />
        <path className="cycle-diagram-path cycle-diagram-path-return" d="M 478 96 C 420 158, 140 158, 82 96" fill="none" strokeWidth="3" strokeDasharray="7 8" strokeLinecap="round" />
        {[82, 214, 346, 478].map((x, index) => <circle key={x} cx={x} cy={index === 0 || index === 3 ? 90 : index === 1 ? 50 : 130} r="14" className={`cycle-diagram-node cycle-diagram-node-${index + 1}`} />)}
        <text x="82" y="126" textAnchor="middle">{hindi ? "पीरियड" : "Period"}</text>
        <text x="214" y="26" textAnchor="middle">{hindi ? "परत बनना" : "Lining builds"}</text>
        <text x="346" y="164" textAnchor="middle">{hindi ? "अंडा निकल सकता है" : "Possible egg release"}</text>
        <text x="478" y="126" textAnchor="middle">{hindi ? "अगला चक्र" : "Next cycle"}</text>
      </svg>
      <figcaption>{hindi
        ? "सरल चित्र—चरणों का समय अलग हो सकता है; यह उपजाऊ दिनों की भविष्यवाणी नहीं है।"
        : "Simplified diagram—stage timing can vary; this is not a prediction of fertile days."}</figcaption>
    </figure>
  );
}

/* -------------------- SETTINGS -------------------- */

function SettingsPage({
  discreetMode,
  onDiscreetModeChange,
  language,
  onLanguageChange,
  onEnableVault,
  onChangeVaultPin,
  onLockVault,
  ageGroup,
  onAgeGroupChange,
  pregnancyVisible,
  onPregnancyVisibilityChange,
  devicePreview,
  onDevicePreviewChange,
}) {
  const [message, setMessage] = useState("");
  const [speechVoices, setSpeechVoices] = useState([]);
  const [speechVoiceURI, setSpeechVoiceURI] = useState(
    () => localStorage.getItem("cyclecare_speech_voice") || "auto-feminine"
  );
  const [textSize, setTextSize] = useState(
    () => localStorage.getItem("cyclecare_text_size") || "default"
  );
  const [highContrast, setHighContrast] = useState(
    () => localStorage.getItem("cyclecare_high_contrast") === "true"
  );
  const [vaultPin, setVaultPin] = useState("");
  const [vaultPinConfirm, setVaultPinConfirm] = useState("");
  const [trackedSymptoms, setTrackedSymptoms] = useState(() => getTrackedSymptoms());
  const [hasVault, setHasVault] = useState(() => hasEncryptedVault());
  const [fertilityVisible, setFertilityVisible] = useState(
    () =>
      getHealthItem("cyclecare_fertility_info_visible") === "true" ||
      ageGroup !== "under18"
  );

  useEffect(() => {
    if (!("speechSynthesis" in window)) return undefined;
    const updateVoices = () => setSpeechVoices(window.speechSynthesis.getVoices());
    updateVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", updateVoices);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", updateVoices);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.textSize = textSize;
    document.documentElement.classList.toggle("high-contrast", highContrast);
  }, [textSize, highContrast]);

  function exportData() {
    try {
      const data = {
        format: "cyclecare-export-v1",
        periods: getPeriodEntries(),
        symptoms: getSymptomEntries(),
        dailyLogs: getSymptomEntries(),
        reminders: getReminders(),
        pregnancyMode: getHealthItem("cyclecare_pregnancy_mode") === "true",
        ageGroup,
        trackedSymptoms,
        selfCare: normalizeSelfCareData(
          JSON.parse(getHealthItem("cyclecare_self_care") || "null")
        ),
        exportedAt: new Date().toISOString(),
      };
      downloadFile(
        JSON.stringify(data, null, 2),
        `cyclecare-private-data-${localDateString()}.json`,
        "application/json;charset=utf-8"
      );
      setMessage("Your data export has been prepared on this device.");
    } catch {
      setMessage("We could not prepare your export. Please try again.");
    }
  }

  function exportCsv() {
    try {
      const rows = [
        ["type", "date", "details"],
        ...getPeriodEntries().map((item) => [
          "period",
          item.startDate,
          `${item.periodLength} days; flow ${item.flow}; frequent pad changes ${item.changesEveryHour}; large clots ${item.largeClots}`,
        ]),
        ...getSymptomEntries().map((item) => [
          "check-in",
          item.date,
          `symptoms=${item.symptoms.join("|")}; pain=${item.pain}/10; mood=${item.mood}; energy=${item.energy}; sleep=${item.sleepHours ?? ""}; medicines=${item.medicines}; note=${item.note}`,
        ]),
      ];
      const csv = rows.map((row) =>
        row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")
      ).join("\r\n");
      downloadFile(csv, `cyclecare-data-${localDateString()}.csv`, "text/csv;charset=utf-8");
      setMessage("CSV export prepared on this device. Keep the downloaded file private.");
    } catch {
      setMessage("We could not prepare your CSV export. Please try again.");
    }
  }

  async function importData(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Import file is larger than the 5 MB limit.");
      }
      const parsed = JSON.parse(await file.text());
      const imported = validateImportData(parsed, {
        today: localDateString(),
        availableSymptoms,
      });
      if (!window.confirm("Replace the current period, symptom, and self-care records with the valid records in this file? Export a backup first if you may need the current records.")) return;
      setHealthItem("cyclecare_periods", JSON.stringify(imported.periods));
      setHealthItem("cyclecare_symptoms", JSON.stringify(imported.symptoms));
      setHealthItem("cyclecare_reminders", JSON.stringify(imported.reminders));
      setHealthItem("cyclecare_self_care", JSON.stringify(imported.selfCare));
      setHealthItem("cyclecare_pregnancy_mode", String(imported.pregnancyMode));
      setHealthItem("cyclecare_age_group", imported.ageGroup);
      setHealthItem("cyclecare_tracked_symptoms", JSON.stringify(imported.trackedSymptoms));
      window.dispatchEvent(new Event("cyclecare-data-updated"));
      window.dispatchEvent(new Event("cyclecare-symptoms-updated"));
      setMessage("Import complete. Your browser will refresh the records on affected screens.");
    } catch (error) {
      setMessage(error instanceof Error
        ? `Import failed: ${error.message}`
        : "Import failed. Choose a valid CycleCare JSON export.");
    } finally {
      event.target.value = "";
    }
  }

  async function deleteData() {
    const confirmed = window.confirm(
      "Delete all CycleCare records and settings from this browser? This cannot be undone. Export any copy you need first."
    );

    if (!confirmed) return;

    try {
      await vaultWriteQueue;
      const keys = Object.keys(localStorage).filter((key) => key.startsWith("cyclecare_"));
      keys.forEach((key) => localStorage.removeItem(key));
      const remaining = Object.keys(localStorage).filter((key) => key.startsWith("cyclecare_"));
      if (remaining.length) {
        throw new Error(`Some CycleCare data could not be removed: ${remaining.join(", ")}`);
      }
      vaultKey = null;
      vaultData = null;
      vaultMetadata = null;
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error
        ? `Data deletion failed. ${error.message}`
        : "Data deletion failed. Check browser storage permissions and try again.");
    }
  }

  async function saveVaultPin() {
    if (!/^\d{5}$/.test(vaultPin)) {
      setMessage("Choose exactly five digits for your PIN.");
      return;
    }
    if (vaultPin !== vaultPinConfirm) {
      setMessage("The PIN entries do not match.");
      return;
    }
    if (!window.isSecureContext || !crypto?.subtle) {
      setMessage("Encrypted storage needs a secure browser context (HTTPS or localhost) with Web Crypto support.");
      return;
    }
    const exported = window.confirm(`Before ${hasVault ? "changing your PIN" : "enabling encryption"}, export your records if you want a separate backup. A forgotten PIN cannot be recovered. A five-digit PIN is easier to guess offline than a long password if someone obtains the vault file. Continue?`);
    if (!exported) return;
    try {
      if (hasVault) {
        await onChangeVaultPin(vaultPin);
      } else {
        await onEnableVault(vaultPin);
        setHasVault(true);
      }
      setVaultPin("");
      setVaultPinConfirm("");
      setMessage("Encrypted storage is updated. Your PIN is not stored and cannot be recovered.");
    } catch (error) {
      setMessage(error instanceof Error
        ? `Could not update encrypted storage: ${error.message}`
        : "Could not update encrypted storage. Your current records were not intentionally removed.");
    }
  }

  function updateTrackedSymptoms(symptom, checked) {
    const next = checked
      ? [...trackedSymptoms, symptom]
      : trackedSymptoms.filter((value) => value !== symptom);
    setTrackedSymptoms(next);
    setHealthItem("cyclecare_tracked_symptoms", JSON.stringify(next));
  }

  function handleAgeGroupChange(value) {
    onAgeGroupChange(value);
    if (value === "under18") {
      setFertilityVisible(
        getHealthItem("cyclecare_fertility_info_visible") === "true"
      );
    } else {
      setFertilityVisible(true);
      setHealthItem("cyclecare_fertility_info_visible", "true");
    }
  }

  return (
    <section className="page-card settings-page">
      <span className="eyebrow">YOUR DATA, YOUR CHOICE</span>
      <h2>Settings & Privacy</h2>

      <p className="page-description">
        Manage the records stored in this browser.
      </p>

      <div className="settings-row">
        <div>
          <h3>Local storage</h3>
          <p>
            Records stay in this browser. Without vault encryption, anyone with
            access to this browser profile or developer tools may be able to
            view them.
          </p>
        </div>

        <ShieldCheck size={23} />
      </div>

      <section className="privacy-center" aria-labelledby="privacy-center-heading">
        <span className="eyebrow">PRIVACY CENTER</span>
        <h3 id="privacy-center-heading">Your data on this device</h3>
        <p>
          CycleCare stores your period entries and symptom check-ins in this browser's localStorage. When the optional encrypted vault is off, these records are not encrypted and someone with access to this browser profile or device may be able to view them.
        </p>
        <p>
          Clearing browser data can permanently remove these records. Use the export option to save a copy, and the delete option below to remove CycleCare's health records from this browser.
        </p>
        <p className="privacy-limit">
          Browser storage is not a backup or a security boundary. The optional vault encrypts selected health records while stored, but records are available to this app while unlocked. A copied vault can be attacked offline, and a five-digit PIN is easier to guess than a long password. Forgotten PINs cannot be recovered.
        </p>

        <div className="discreet-setting">
          <div>
            <h4>Discreet Mode</h4>
            <p>Hide personal cycle details on the Overview dashboard with neutral placeholders.</p>
          </div>
          <label className="toggle-control">
            <span className="sr-only">Enable Discreet Mode</span>
            <input
              type="checkbox"
              checked={discreetMode}
              onChange={(event) => onDiscreetModeChange(event.target.checked)}
            />
            <span aria-hidden="true" />
          </label>
        </div>
        {discreetMode && (
          <p className="discreet-notice">
            Discreet Mode is on. It is a visual privacy feature only and does not protect records stored in your browser.
          </p>
        )}
      </section>

      <section className="settings-preferences">
        <span className="eyebrow">ACCESSIBILITY & PERSONALIZATION</span>
        <h3>App preferences</h3>
        <label className="field-label">Device preview</label>
        <div className="device-switcher settings-device-switcher" role="group" aria-label="Device preview">
          <button
            type="button"
            className={devicePreview === "desktop" ? "device-switch-active" : ""}
            aria-pressed={devicePreview === "desktop"}
            onClick={() => onDevicePreviewChange("desktop")}
          >
            <Laptop size={17} />
            <span>Desktop</span>
          </button>
          <button
            type="button"
            className={devicePreview === "mobile" ? "device-switch-active" : ""}
            aria-pressed={devicePreview === "mobile"}
            onClick={() => onDevicePreviewChange("mobile")}
          >
            <Smartphone size={17} />
            <span>Mobile</span>
          </button>
        </div>
        <p className="privacy-hint">Preview how CycleCare pages arrange on desktop or mobile.</p>
        <label className="field-label" htmlFor="app-language">Language</label>
        <AnimatedSelect id="app-language" value={language} onChange={(event) => onLanguageChange(event.target.value)}>
          <option value="en">English</option>
          <option value="hi">हिंदी</option>
        </AnimatedSelect>
        <p className="privacy-hint">Hindi is available for essential Learn lessons, onboarding, selected guidance and FAQ content. Some screens and supplementary Learn articles remain English-only.</p>

        <label className="field-label" htmlFor="speech-voice">Reading voice</label>
        <select
          id="speech-voice"
          value={speechVoiceURI}
          onChange={(event) => {
            setSpeechVoiceURI(event.target.value);
            localStorage.setItem("cyclecare_speech_voice", event.target.value);
          }}
          disabled={!speechVoices.length}
        >
          <option value="auto-feminine">Soft feminine voice (automatic)</option>
          <option value="">System default</option>
          {speechVoices.map((voice) => (
            <option value={voice.voiceURI} key={voice.voiceURI}>
              {voice.name} ({voice.lang})
            </option>
          ))}
        </select>
        <p className="privacy-hint">
          The automatic option prefers a soft feminine voice in Hindi or English when your browser provides one. This also applies to Listen in Learn.
        </p>

        <label className="field-label" htmlFor="age-group">Age group for cycle guidance</label>
        <AnimatedSelect id="age-group" value={ageGroup} onChange={(event) => {
          handleAgeGroupChange(event.target.value);
        }}>
          <option value="under18">Under 18</option>
          <option value="adult">18 and over</option>
          <option value="prefer-not">Prefer not to say (adult guidance)</option>
        </AnimatedSelect>
        <p className="privacy-hint">This only changes the general cycle range used for prompts. It cannot assess personal health or determine age-specific care needs.</p>
        {ageGroup === "under18" && (
          <label className="check-field">
            <input
              type="checkbox"
              checked={pregnancyVisible}
              onChange={(event) => onPregnancyVisibilityChange(event.target.checked)}
            />
            Show pregnancy information in navigation
          </label>
        )}
        <label className="check-field">
          <input
            type="checkbox"
            checked={fertilityVisible}
            onChange={(event) => {
              setFertilityVisible(event.target.checked);
              setHealthItem("cyclecare_fertility_info_visible", String(event.target.checked));
            }}
          />
          Show ovulation and fertile-window estimates
        </label>

        <label className="field-label" htmlFor="text-size">Text size</label>
        <AnimatedSelect id="text-size" value={textSize} onChange={(event) => {
          setTextSize(event.target.value);
          localStorage.setItem("cyclecare_text_size", event.target.value);
        }}>
          <option value="small">Small</option>
          <option value="default">Default</option>
          <option value="large">Large</option>
        </AnimatedSelect>
        <label className="check-field"><input type="checkbox" checked={highContrast} onChange={(event) => {
          setHighContrast(event.target.checked);
          localStorage.setItem("cyclecare_high_contrast", String(event.target.checked));
        }} /> High contrast</label>
        <button className="secondary-button read-aloud-button" onClick={() => {
          if (!("speechSynthesis" in window)) {
            setMessage("Read aloud is not available in this browser.");
            return;
          }
          const speech = new SpeechSynthesisUtterance(document.querySelector("main")?.innerText || "");
          speech.lang = language === "hi" ? "hi-IN" : "en-IN";
          applyPreferredSpeechVoice(speech);
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(speech);
        }}>Read this screen aloud</button>
        <h4>Symptoms to include in tracking</h4>
        <div className="settings-symptoms">
          {availableSymptoms.map((symptom) => (
            <label className="check-field" key={symptom}>
              <input type="checkbox" checked={trackedSymptoms.includes(symptom)} onChange={(event) => updateTrackedSymptoms(symptom, event.target.checked)} />
              {symptom}
            </label>
          ))}
        </div>
      </section>

      <section className="settings-preferences pin-settings">
        <span className="eyebrow">OPTIONAL ENCRYPTION</span>
        <h3>Encrypted vault</h3>
        <p>
          {hasVault
            ? "Vault data is encrypted with AES-GCM. New five-digit PINs use PBKDF2-SHA-256 with 600,000 iterations and a random salt. A five-digit PIN has limited resistance to offline guessing if someone copies the vault. The key and decrypted records remain available in this page's memory while unlocked."
            : "Encrypt selected health records stored in this browser. Encryption protects data at rest, not records while the app is unlocked or someone controls this device."}
        </p>
        {hasVault ? (
          <>
            {getEncryptedVaultVersion() !== 3 && <p className="privacy-hint" role="status">This vault uses an older credential format. Enter a new five-digit PIN below to re-encrypt and upgrade it.</p>}
            <div className="pin-fields">
              <label className="field-label" htmlFor="vault-new-pin">{getEncryptedVaultVersion() === 3 ? "Change five-digit PIN" : "Set a new five-digit PIN"}</label>
              <input id="vault-new-pin" type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{5}" maxLength={5} value={vaultPin} onChange={(event) => setVaultPin(event.target.value.replace(/\D/g, "").slice(0, 5))} aria-describedby="vault-pin-help" />
              <label className="field-label" htmlFor="vault-confirm-pin">Confirm five-digit PIN</label>
              <input id="vault-confirm-pin" type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{5}" maxLength={5} value={vaultPinConfirm} onChange={(event) => setVaultPinConfirm(event.target.value.replace(/\D/g, "").slice(0, 5))} />
              <p id="vault-pin-help" className="privacy-hint">Use a PIN you do not use elsewhere. Because a five-digit PIN has only 100,000 combinations, it offers less protection against offline guessing than a long password. CycleCare cannot recover it.</p>
              <button className="secondary-button" type="button" onClick={saveVaultPin}>{getEncryptedVaultVersion() === 3 ? "Change PIN" : "Upgrade to five-digit PIN"}</button>
              <button className="secondary-button" type="button" onClick={onLockVault}>Lock CycleCare now</button>
            </div>
          </>
        ) : (
          <div className="pin-fields">
            <label className="field-label" htmlFor="vault-new-pin">Five-digit PIN</label>
            <input id="vault-new-pin" type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{5}" maxLength={5} value={vaultPin} onChange={(event) => setVaultPin(event.target.value.replace(/\D/g, "").slice(0, 5))} aria-describedby="vault-pin-help" />
            <label className="field-label" htmlFor="vault-confirm-pin">Confirm five-digit PIN</label>
            <input id="vault-confirm-pin" type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{5}" maxLength={5} value={vaultPinConfirm} onChange={(event) => setVaultPinConfirm(event.target.value.replace(/\D/g, "").slice(0, 5))} />
            <p id="vault-pin-help" className="privacy-hint">Use a PIN you do not use elsewhere. Because a five-digit PIN has only 100,000 combinations, it offers less protection against offline guessing than a long password. CycleCare cannot recover it.</p>
            <button className="secondary-button" type="button" onClick={saveVaultPin}>Enable encrypted storage</button>
          </div>
        )}
      </section>

      <div className="settings-actions">
        <button className="secondary-button" onClick={exportData}>
          <Download size={16} /> Export JSON
        </button>
        <button className="secondary-button" onClick={exportCsv}>
          <Download size={16} /> Export CSV
        </button>
        <label className="secondary-button import-button">
          <Upload size={16} /> Import JSON
          <input type="file" accept="application/json,.json" onChange={importData} />
        </label>

        <button className="danger-button" onClick={deleteData}>
          Delete everything
        </button>
      </div>

      {message && (
        <p className="form-message" role="status">
          {message}
        </p>
      )}
    </section>
  );
}

/* -------------------- HELPERS -------------------- */

function getDiscreetMode() {
  try {
    return localStorage.getItem("cyclecare_discreet_mode") === "true";
  } catch {
    return false;
  }
}

function isOnboardingComplete() {
  return (
    localStorage.getItem("cyclecare_setup_complete") === "true" ||
    hasEncryptedVault() ||
    getHealthItem("cyclecare_periods") !== null ||
    getHealthItem("cyclecare_symptoms") !== null
  );
}

function hasEncryptedVault() {
  return localStorage.getItem("cyclecare_vault") !== null;
}

function getEncryptedVaultVersion() {
  try {
    return JSON.parse(localStorage.getItem("cyclecare_vault") || "null")?.version ?? 1;
  } catch {
    return 1;
  }
}

async function createHealthVault(pin) {
  const rawData = {};
  encryptedStorageKeys.forEach((key) => {
    rawData[key] = localStorage.getItem(key);
  });
  const { envelope, key, metadata } = await createVaultEnvelope(rawData, pin);
  localStorage.setItem("cyclecare_vault", envelope);
  try {
    encryptedStorageKeys.forEach((storageKey) => localStorage.removeItem(storageKey));
    if (encryptedStorageKeys.some((storageKey) => localStorage.getItem(storageKey) !== null)) {
      throw new Error("Some plaintext records remain in browser storage.");
    }
  } catch (error) {
    try {
      encryptedStorageKeys.forEach((storageKey) => {
        if (rawData[storageKey] !== null) localStorage.setItem(storageKey, rawData[storageKey]);
      });
      localStorage.removeItem("cyclecare_vault");
    } catch {
      throw new Error("Vault setup did not finish cleanly. Check browser storage and verify your records before continuing.");
    }
    throw new Error(`${error.message} Export your data and retry.`);
  }
  vaultKey = key;
  vaultData = rawData;
  vaultMetadata = metadata;
}

async function openHealthVault(secret) {
  const opened = await openVaultEnvelope(
    localStorage.getItem("cyclecare_vault") || "null",
    secret
  );
  vaultKey = opened.key;
  vaultData = opened.data;
  vaultMetadata = opened.metadata;
}

async function changeHealthVaultPin(pin) {
  if (!vaultKey || !vaultData) throw new Error("Unlock the vault before changing its PIN.");
  await vaultWriteQueue;
  const { envelope, key, metadata } = await createVaultEnvelope(vaultData, pin);
  localStorage.setItem("cyclecare_vault", envelope);
  vaultKey = key;
  vaultMetadata = metadata;
}

async function persistHealthVault() {
  if (!vaultKey || !vaultData || !vaultMetadata) return;
  localStorage.setItem(
    "cyclecare_vault",
    await encryptVaultData(vaultData, vaultKey, vaultMetadata)
  );
}

function getHealthItem(key) {
  if (encryptedStorageKeys.includes(key) && hasEncryptedVault()) {
    return vaultData ? vaultData[key] ?? null : null;
  }
  return localStorage.getItem(key);
}

function setHealthItem(key, value) {
  if (!encryptedStorageKeys.includes(key) || !hasEncryptedVault()) {
    localStorage.setItem(key, value);
    return;
  }
  if (!vaultData || !vaultKey) {
    throw new Error("Health vault is locked");
  }
  vaultData[key] = value;
  vaultWriteQueue = vaultWriteQueue
    .then(persistHealthVault)
    .catch(() => window.dispatchEvent(new Event("cyclecare-vault-error")));
}

function removeHealthItem(key) {
  if (!encryptedStorageKeys.includes(key) || !hasEncryptedVault()) {
    localStorage.removeItem(key);
    return;
  }
  if (!vaultData || !vaultKey) {
    throw new Error("Health vault is locked");
  }
  delete vaultData[key];
  vaultWriteQueue = vaultWriteQueue
    .then(persistHealthVault)
    .catch(() => window.dispatchEvent(new Event("cyclecare-vault-error")));
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const availableSymptoms = [
  "Cramps",
  "Headache",
  "Bloating",
  "Fatigue",
  "Mood changes",
  "Tender breasts",
  "Backache",
  "Acne",
  "Dizziness",
  "Shortness of breath",
  "Trouble sleeping",
];

function getTrackedSymptoms() {
  try {
    const saved = JSON.parse(getHealthItem("cyclecare_tracked_symptoms") || "null");
    return Array.isArray(saved)
      ? availableSymptoms.filter((symptom) => saved.includes(symptom))
      : availableSymptoms;
  } catch {
    return availableSymptoms;
  }
}

function createDemoData() {
  const intervals = [29, 31, 43, 28, 33, 29, 31];
  const dates = [localDateString()];
  let cursor = parseDateOnly(localDateString());
  intervals.forEach((length) => {
    cursor = addDays(cursor, -length);
    dates.unshift(localDateStringForDate(cursor));
  });
  const periods = dates.map((startDate, index) => ({
    startDate,
    periodLength: index === 2 ? 8 : index % 2 ? 5 : 6,
    flow: index === 2 ? "heavy" : "medium",
    changesEveryHour: index === 2,
    largeClots: false,
  }));
  const symptoms = [-4, -3, -2, -1].map((offset, index) => ({
    id: `demo-${index}`,
    date: localDateStringForDate(addDays(parseDateOnly(localDateString()), offset)),
    symptoms: index % 2 ? ["Cramps", "Fatigue"] : ["Headache"],
    note: "",
    pain: index === 1 ? 7 : 3,
    painStopsActivities: index === 1,
    mood: index < 3 ? "very-low" : "okay",
    energy: "low",
    sleepHours: 7,
    medicines: "",
    selfHarmConcern: false,
    bleedingBetweenPeriods: false,
  }));
  return { periods, symptoms, logs: symptoms };
}

function getReminders() {
  try {
    const stored = JSON.parse(getHealthItem("cyclecare_reminders") || "[]");
    if (!Array.isArray(stored)) return [];
    return stored.filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.message === "string" &&
        /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(item.time) &&
        typeof item.enabled === "boolean"
    );
  } catch {
    return [];
  }
}

function getFiredReminders() {
  try {
    const stored = JSON.parse(localStorage.getItem("cyclecare_reminder_fired") || "{}");
    return stored && typeof stored === "object" && !Array.isArray(stored)
      ? stored
      : {};
  } catch {
    return {};
  }
}

function hasThreeConsecutiveLowMoodDays(records) {
  const moodByDate = new Map();
  records.forEach((record) => moodByDate.set(record.date, record.mood));
  const recentDays = [...moodByDate.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .slice(-3);
  if (
    recentDays.length !== 3 ||
    recentDays.some(([, mood]) => mood !== "very-low") ||
    daysBetween(recentDays[2][0], localDateString()) > 1
  ) return false;
  return (
    daysBetween(recentDays[0][0], recentDays[1][0]) === 1 &&
    daysBetween(recentDays[1][0], recentDays[2][0]) === 1
  );
}

function getPeriodEntries() {
  try {
    const entries = JSON.parse(
      getHealthItem("cyclecare_periods") || "[]"
    );

    if (!Array.isArray(entries)) return [];

    return entries
      .filter(
        (entry) =>
          entry &&
          parseDateOnly(entry.startDate) &&
          Number.isInteger(Number(entry.periodLength)) &&
          Number(entry.periodLength) >= 1 &&
          Number(entry.periodLength) <= 10 &&
          entry.startDate <= localDateString()
      )
      .map((entry) => ({
        startDate: entry.startDate,
        periodLength: Number(entry.periodLength),
        flow: ["spotting", "light", "medium", "heavy"].includes(entry.flow)
          ? entry.flow
          : "medium",
        changesEveryHour: entry.changesEveryHour === true,
        largeClots: entry.largeClots === true,
      }))
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .filter(
        (entry, index, sorted) =>
          index === 0 || entry.startDate !== sorted[index - 1].startDate
      );
  } catch {
    return [];
  }
}

function getSymptomEntries() {
  try {
    const entries = JSON.parse(
      getHealthItem("cyclecare_symptoms") || "[]"
    );

    if (!Array.isArray(entries)) return [];

    return entries
      .filter((entry) => entry && parseDateOnly(entry.date))
      .map((entry, index) => ({
        id: entry.id === undefined || entry.id === null ? `legacy-${index}` : String(entry.id),
        date: entry.date,
        symptoms: Array.isArray(entry.symptoms)
          ? entry.symptoms.filter(
              (symptom) => typeof symptom === "string" && symptom.trim()
            )
          : [],
        flow: ["spotting", "light", "medium", "heavy"].includes(entry.flow)
          ? entry.flow
          : "",
        note: typeof entry.note === "string" ? entry.note : "",
        pain: Number.isFinite(Number(entry.pain))
          ? Math.min(10, Math.max(0, Number(entry.pain)))
          : 0,
        painStopsActivities: entry.painStopsActivities === true,
        bleedingBetweenPeriods: entry.bleedingBetweenPeriods === true,
        mood: ["very-low", "low", "okay", "good", "very-good"].includes(entry.mood)
          ? entry.mood
          : "okay",
        energy: ["low", "usual", "high"].includes(entry.energy)
          ? entry.energy
          : "usual",
        sleepHours:
          Number.isFinite(Number(entry.sleepHours)) &&
          Number(entry.sleepHours) >= 0 &&
          Number(entry.sleepHours) <= 24
            ? Number(entry.sleepHours)
            : null,
        medicines: typeof entry.medicines === "string" ? entry.medicines : "",
        selfHarmConcern: entry.selfHarmConcern === true,
        suddenSevereLowerPain: entry.suddenSevereLowerPain === true,
        veryHeavyWithFaintness: entry.veryHeavyWithFaintness === true,
        pregnancyPossibleWithSymptoms: entry.pregnancyPossibleWithSymptoms === true,
      }))
      .filter((entry) => entry.date <= localDateString());
  } catch {
    return [];
  }
}

function sortSymptomRecords(records) {
  return [...records].sort((first, second) => {
    const dateOrder = second.date.localeCompare(first.date);
    return dateOrder || second.id.localeCompare(first.id, undefined, { numeric: true });
  });
}

function getSymptomSummary(records) {
  const counts = new Map();

  records.forEach((record) => {
    new Set(record.symptoms).forEach((symptom) => {
      counts.set(symptom, (counts.get(symptom) || 0) + 1);
    });
  });

  const frequencies = [...counts.entries()]
    .map(([symptom, count]) => ({ symptom, count }))
    .sort((first, second) =>
      second.count - first.count || first.symptom.localeCompare(second.symptom)
    );
  const highestFrequency = frequencies[0]?.count || 0;

  return {
    totalEntries: records.length,
    distinctSymptoms: frequencies.length,
    frequencies,
    highestFrequency,
    mostFrequent: frequencies
      .filter((item) => item.count === highestFrequency)
      .map((item) => item.symptom),
  };
}

function getCareGuidance(entries, symptoms) {
  const guidance = [];
  const periodSource = {
    name: "NHS, Irregular periods",
    url: "https://www.nhs.uk/symptoms/irregular-periods/",
  };
  const heavyPeriodSource = {
    name: "NHS, Heavy periods",
    url: "https://www.nhs.uk/conditions/heavy-periods/",
  };
  const adolescentCycleSource = {
    name: "ACOG, Menstruation in Girls and Adolescents",
    url: "https://www.acog.org/clinical/guidance/committee-opinion/2015/12/menstruation-in-girls-and-adolescents-using-the-menstrual-cycle-as-a-vital-sign",
  };

  entries.forEach((entry) => {
    if (entry.periodLength > 7) {
      guidance.push({
        id: `duration-${entry.startDate}`,
        title: "A recorded period lasted longer than 7 days",
        observed: `Your entry beginning ${formatDate(entry.startDate)} records ${entry.periodLength} days of bleeding.`,
        why: "Periods lasting longer than 7 days are listed by the NHS as a reason to seek non-urgent medical advice.",
        nextStep: "Consider discussing this entry with a healthcare professional, especially if this is unusual for you or affects daily life.",
        source: heavyPeriodSource,
      });
    }
    if (entry.changesEveryHour || entry.largeClots) {
      guidance.push({
        id: `heavy-flow-${entry.startDate}`,
        title: "A heavy-flow observation was recorded",
        observed: `${formatDate(entry.startDate)}: ${entry.changesEveryHour ? "you recorded changing a pad every 1–2 hours" : ""}${entry.changesEveryHour && entry.largeClots ? "; " : ""}${entry.largeClots ? "you recorded clots larger than a ₹10 coin" : ""}.`,
        why: "The NHS lists frequent product changes and large clots among signs that bleeding may be heavy.",
        nextStep: "Consider sharing this record with a healthcare professional, especially if it affects daily life or happens repeatedly.",
        source: heavyPeriodSource,
      });
    }
  });

  const intervals = entries.slice(1).map((entry, index) => ({
    days: daysBetween(entries[index].startDate, entry.startDate),
    startDate: entries[index].startDate,
    endDate: entry.startDate,
  }));
  const under18 = getHealthItem("cyclecare_age_group") === "under18";
  const maximumCycleDays = under18 ? 45 : 35;
  const isOutOfRange = (interval) =>
    interval.days < 21 || interval.days > maximumCycleDays;
  const lastThreeIntervals = intervals.slice(-3);
  const threeInARow =
    lastThreeIntervals.length === 3 &&
    lastThreeIntervals.every(isOutOfRange)
      ? lastThreeIntervals
      : [];

  if (threeInARow.length) {
    const dates = threeInARow
      .map(
        (interval) =>
          `${formatDate(interval.startDate)} to ${formatDate(interval.endDate)} (${interval.days} days)`
      )
      .join("; ");

    const cycleSource = under18 ? adolescentCycleSource : periodSource;
    guidance.push({
      id: "cycle-intervals",
      title: "Three consecutive recorded cycle gaps are outside the reference range",
      observed: `We found these gaps between recorded period starts: ${dates}.`,
      why: under18
        ? "ACOG describes cycle lengths of about 21–45 days for adolescents. This app only flags three consecutive recorded cycles outside that range; it does not account for individual history or time since periods started."
        : "The NHS describes gaps shorter than 21 days or longer than 35 days as irregular. This app only flags three consecutive recorded cycles outside that range and cannot determine a cause.",
      nextStep: "If this pattern is new, continues, or worries you, take these dates to a healthcare professional. The record alone cannot tell what caused the variation.",
      source: cycleSource,
    });
  }

  const latestStart = entries.length ? entries[entries.length - 1].startDate : null;
  if (
    latestStart &&
    getHealthItem("cyclecare_pregnancy_mode") !== "true" &&
    daysBetween(latestStart, localDateString()) >= 90
  ) {
    guidance.push({
      id: "no-period-90-days",
      title: "No period start has been recorded for 90 days",
      observed: `Your latest recorded period began ${formatDate(latestStart)}.`,
      why: "A long gap may have several causes. The app cannot determine the reason or whether you are pregnant.",
      nextStep: "Consider contacting a healthcare professional. If pregnancy is possible, use an appropriate pregnancy test and seek care for severe pain or bleeding.",
      source: {
        name: "NHS, Missed or late periods",
        url: "https://www.nhs.uk/symptoms/missed-or-late-periods/",
      },
    });
  }

  symptoms.forEach((record) => {
    if (record.bleedingBetweenPeriods) {
      guidance.push({
        id: `between-bleeding-${record.id}`,
        title: "Bleeding between periods or after sex was recorded",
        observed: `This was recorded in your check-in dated ${formatDate(record.date)}.`,
        why: "Bleeding between periods or after sex should be discussed with a healthcare professional.",
        nextStep: "Arrange a medical appointment and share the date and any other details you wish.",
        source: {
          name: "NHS, Periods",
          url: "https://www.nhs.uk/conditions/periods/",
        },
      });
    }
    if (record.painStopsActivities) {
      guidance.push({
        id: `activity-pain-${record.id}`,
        title: "Pain affecting usual activities was recorded",
        observed: `Your ${formatDate(record.date)} check-in says pain stopped your usual activities (pain ${record.pain}/10).`,
        why: "Period pain that affects daily activities is a reason to seek medical advice.",
        nextStep: "Consider discussing the pain and its impact with a healthcare professional. Seek urgent help if pain is severe or suddenly worsens.",
        source: {
          name: "NHS, Period pain",
          url: "https://www.nhs.uk/symptoms/period-pain/",
        },
      });
    }
  });

  const heavyPeriod = entries.find(
    (entry) => entry.flow === "heavy" || entry.periodLength > 7
  );
  const associatedConcern = heavyPeriod && symptoms.find((record) => {
    const daysFromStart = daysBetween(heavyPeriod.startDate, record.date);
    return (
      daysFromStart >= 0 &&
      daysFromStart < heavyPeriod.periodLength &&
      record.symptoms.some((symptom) =>
        ["Fatigue", "Dizziness", "Shortness of breath"].includes(symptom)
      )
    );
  });
  if (associatedConcern) {
    guidance.push({
      id: `heavy-period-associated-symptoms-${heavyPeriod.startDate}`,
      title: "A heavy-period record and related symptom were logged",
      observed: `A heavy or longer-than-7-day period beginning ${formatDate(heavyPeriod.startDate)} overlaps with a check-in on ${formatDate(associatedConcern.date)} that records tiredness, dizziness, or shortness of breath.`,
      why: "Heavy bleeding together with these symptoms is worth discussing with a healthcare professional. The app cannot determine a cause.",
      nextStep: "Arrange medical advice. Seek urgent care if you feel faint, severely short of breath, or very unwell.",
      source: heavyPeriodSource,
    });
  }

  if (symptoms.some((record) => record.pain >= 9)) {
    guidance.push({
      id: "severe-pain-recorded",
      title: "A high pain score was recorded",
      observed: "At least one check-in records pain at 9 or 10 out of 10.",
      why: "A high self-reported score cannot establish the cause or urgency by itself.",
      nextStep: "If the pain is sudden, severe, worsening, or pregnancy is possible, seek urgent medical care now. Otherwise, consider prompt professional advice.",
      source: {
        name: "NHS, Period pain",
        url: "https://www.nhs.uk/symptoms/period-pain/",
      },
    });
  }

  return guidance;
}

function formatDate(value) {
  const date = typeof value === "string" ? parseDateOnly(value) : value;

  return date
    ? date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Unknown date";
}

function formatDateRange(start, end) {
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function applyPreferredSpeechVoice(utterance) {
  try {
    utterance.rate = 0.94;
    utterance.pitch = 1.04;
    utterance.volume = 1;
    const preferredVoiceURI = localStorage.getItem("cyclecare_speech_voice");
    if (!("speechSynthesis" in window)) return;
    const voices = window.speechSynthesis.getVoices();
    if (preferredVoiceURI && preferredVoiceURI !== "auto-feminine") {
      const selectedVoice = voices.find((voice) => voice.voiceURI === preferredVoiceURI);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        return;
      }
    }

    const language = utterance.lang.toLowerCase().split("-")[0];
    const languageVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith(language));
    const feminineName = /female|woman|heera|kalpana|swara|aditi|priya|zira|aria|jenny|sonia|neerja|samantha|eva|susan|hazel/i;
    const voiceQuality = (voice) => {
      const name = voice.name.toLowerCase();
      return (/(natural|neural|premium|enhanced)/i.test(name) ? 5 : 0)
        + (feminineName.test(voice.name) ? 3 : 0)
        + (voice.localService === false ? 2 : 0)
        + (/(google|microsoft)/i.test(name) ? 1 : 0);
    };
    const preferredVoice = [...languageVoices].sort((a, b) => voiceQuality(b) - voiceQuality(a))[0]
      || voices.find((voice) => feminineName.test(voice.name));
    if (preferredVoice) utterance.voice = preferredVoice;
  } catch {
    // Keep the browser's default voice if saved preferences are unavailable.
  }
}

function localDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default App;
