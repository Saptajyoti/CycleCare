
import { useEffect, useState } from "react";
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
  Search,
  ArrowLeft,
  ExternalLink,
  Clock,
} from "lucide-react";

import "./App.css";

const navigation = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "My Calendar", icon: CalendarDays },
  { name: "My Symptoms", icon: Activity },
  { name: "Learn", icon: BookOpen },
];

function App() {
  const [activePage, setActivePage] = useState("Overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [discreetMode, setDiscreetMode] = useState(() => getDiscreetMode());

  function navigateTo(page) {
    setActivePage(page);
    setMenuOpen(false);
  }

  useEffect(() => {
    const handleNavigation = (event) => navigateTo(event.detail);

    window.addEventListener("cyclecare-navigate", handleNavigation);
    return () =>
      window.removeEventListener("cyclecare-navigate", handleNavigation);
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

  function updateDiscreetMode(enabled) {
    localStorage.setItem("cyclecare_discreet_mode", String(enabled));
    setDiscreetMode(enabled);
  }

  return (
    <div className="app-container">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-icon">
            <Heart size={23} />
          </div>

          <span>
            cyclecare<span className="brand-dot">.</span>
          </span>

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
          {navigation.map(({ name, icon: Icon }) => (
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
          <button
            className="menu-button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          <div>
            <p className="topbar-date">YOUR PERSONAL WELLNESS SPACE</p>
            <h2>{activePage}</h2>
          </div>

          <div className="profile-badge">
            <Heart size={19} />
          </div>
        </header>

        {activePage === "Overview" ? (
          <Dashboard discreetMode={discreetMode} />
        ) : activePage === "My Calendar" ? (
          <CalendarPage />
        ) : activePage === "My Symptoms" ? (
          <SymptomsPage />
        ) : activePage === "Learn" ? (
          <LearnPage />
        ) : (
          <SettingsPage
            discreetMode={discreetMode}
            onDiscreetModeChange={updateDiscreetMode}
          />
        )}
      </main>
    </div>
  );
}

/* -------------------- DASHBOARD -------------------- */

function Dashboard({ discreetMode }) {
  const [showLogForm, setShowLogForm] = useState(false);
  const [periodStart, setPeriodStart] = useState("");
  const [periodLength, setPeriodLength] = useState("5");
  const [message, setMessage] = useState("");

  const entries = getPeriodEntries();
  const latestEntry = entries.length
    ? entries[entries.length - 1]
    : null;

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

    const updatedEntries = [
      ...entries,
      {
        startDate: periodStart,
        periodLength: Number(periodLength),
      },
    ].sort((a, b) => a.startDate.localeCompare(b.startDate));

    localStorage.setItem(
      "cyclecare_periods",
      JSON.stringify(updatedEntries)
    );

    setPeriodStart("");
    setPeriodLength("5");
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
        <div>
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
            Get to know your cycle, understand your patterns, and
            make space for yourself.
          </p>
        </div>

        <div className="welcome-decoration">
          <div className="decoration-circle circle-one" />
          <div className="decoration-circle circle-two" />
          <Heart size={62} strokeWidth={1.1} />
          <span>care for you</span>
        </div>
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
        </article>
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

              <select
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
              </select>

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
  const [initialMonth] = useState(() => {
    const date = new Date();
    return { year: date.getFullYear(), month: date.getMonth() };
  });

  useEffect(() => {
    const updateCalendar = () => setRefresh((value) => value + 1);

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
  const estimate = getCycleEstimate(entries);

  const periodDates = new Set();
  const estimatedDates = new Set();

  entries.forEach((entry) => {
    const start = parseDateOnly(entry.startDate);

    if (!start) return;

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

  if (estimate) {
    for (let i = -2; i <= 2; i++) {
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

      <div className="calendar-grid">
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
          const isEstimatedDay = estimatedDates.has(day);

          return (
            <div
              key={day}
              className={`calendar-day ${
                isPeriodDay ? "period-day" : ""
              } ${isEstimatedDay && !isPeriodDay ? "estimated-day" : ""}`}
              title={
                isPeriodDay
                  ? "Recorded period day"
                  : isEstimatedDay
                    ? "Estimated period day"
                    : ""
              }
            >
              {day}
            </div>
          );
        })}
      </div>

      <div className="calendar-legend" aria-label="Calendar legend">
        <span><i className="legend-dot" />Recorded period days</span>
        <span><i className="legend-dot estimated-dot" />Estimated period window</span>
      </div>

      <section className="estimate-card" aria-labelledby="estimate-heading">
        <span className="eyebrow">PATTERN-BASED ESTIMATE</span>
        <h3 id="estimate-heading">Next Period Estimate</h3>
        {estimate ? (
          <>
            <p className="estimate-range">{formatDateRange(estimate.windowStart, estimate.windowEnd)}</p>
            <p>Estimated from an average cycle length of {estimate.averageCycleLength} days.</p>
          </>
        ) : (
          <p>Record at least three period start dates to see an estimate. We also need two plausible cycle intervals.</p>
        )}
        <p className="estimate-disclaimer">Predictions are estimates, not guarantees. Cycles can vary naturally; this cannot confirm ovulation or be used as contraception.</p>
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
                    {formatDate(entry.startDate)}
                  </h4>

                  <p>
                    {entry.periodLength}{" "}
                    {entry.periodLength === 1 ? "day" : "days"} recorded
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* -------------------- SYMPTOMS -------------------- */

function SymptomsPage() {
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [records, setRecords] = useState(() => getSymptomEntries());

  const symptoms = [
    "Cramps",
    "Headache",
    "Bloating",
    "Fatigue",
    "Mood changes",
    "Tender breasts",
    "Backache",
    "Acne",
  ];
  const summary = getSymptomSummary(records);

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

    const updatedRecords = [
      ...records,
      {
        id: `${Date.now()}`,
        date: localDateString(),
        symptoms: selectedSymptoms,
        note,
      },
    ];

    localStorage.setItem(
      "cyclecare_symptoms",
      JSON.stringify(updatedRecords)
    );

    setRecords(updatedRecords);
    setSelectedSymptoms([]);
    setNote("");
    setMessage("Your symptom check-in was saved on this device.");
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

      <form onSubmit={saveSymptoms}>
        <h3 className="form-section-title">
          What are you experiencing?
        </h3>

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

        <label className="field-label" htmlFor="symptom-note">
          Additional notes (optional)
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

        <button type="submit" className="primary-button">
          Save check-in
        </button>
      </form>

      {message && (
        <p className="form-message" role="status">
          {message}
        </p>
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

                  {record.note && (
                    <p className="history-note">{record.note}</p>
                  )}
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

function LearnPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("All");
  const [openedArticle, setOpenedArticle] = useState(null);
  const categories = ["All", "Basics", "Symptoms", "Hygiene", "Wellbeing", "Medical Guidance"];
  const query = searchTerm.trim().toLowerCase();
  const filteredArticles = learningArticles.filter((article) =>
    (category === "All" || article.category === category) &&
    (!query || [article.title, article.description, article.keywords].join(" ").toLowerCase().includes(query))
  );

  if (openedArticle) {
    return (
      <section className="page-card article-reader">
        <button className="back-button" onClick={() => setOpenedArticle(null)}>
          <ArrowLeft size={17} /> Back to articles
        </button>
        <span className="article-category">{openedArticle.category}</span>
        <h2>{openedArticle.title}</h2>
        <p className="article-intro">{openedArticle.intro}</p>
        {openedArticle.sections.map(([heading, body]) => <section className="article-section" key={heading}><h3>{heading}</h3><p>{body}</p></section>)}
        <div className="article-takeaway"><h3>Key takeaway</h3><p>{openedArticle.takeaway}</p></div>
        <p className="article-disclaimer">This information is educational and is not individualized medical advice.</p>
        <a className="article-source" href={openedArticle.source.url} target="_blank" rel="noreferrer"><ExternalLink size={16} /><span><strong>{openedArticle.source.organisation}</strong><br />{openedArticle.source.title}</span></a>
      </section>
    );
  }

  return (
    <section className="page-card learn-hub">
      <span className="eyebrow">KNOWLEDGE IS CARE</span>
      <h2>Learn about your health</h2>
      <p className="page-description">Clear, evidence-informed reading for understanding menstrual health. It is not a substitute for personal medical advice.</p>
      <label className="article-search"><Search size={18} aria-hidden="true" /><span className="sr-only">Search articles</span><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search articles" /></label>
      <div className="category-filters" aria-label="Article categories">{categories.map((item) => <button key={item} className={category === item ? "selected" : ""} onClick={() => setCategory(item)} aria-pressed={category === item}>{item}</button>)}</div>
      {filteredArticles.length === 0 ? <div className="article-empty"><h3>No articles found</h3><p>Try a different search term or choose another category.</p></div> : <div className="article-grid">{filteredArticles.map((article) => <article className="article-card" key={article.title}><span className="article-category">{article.category}</span><h3>{article.title}</h3><p>{article.description}</p><div><span className="reading-time"><Clock size={14} />{article.minutes}</span><button onClick={() => setOpenedArticle(article)} aria-label={`Read ${article.title}`}>Read article <ChevronRight size={16} /></button></div></article>)}</div>}
    </section>
  );
}

/* -------------------- SETTINGS -------------------- */

function SettingsPage({ discreetMode, onDiscreetModeChange }) {
  const [message, setMessage] = useState("");

  function exportData() {
    try {
      const data = {
        periods: getPeriodEntries(),
        symptoms: getSymptomEntries(),
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `cyclecare-private-data-${localDateString()}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage("Your data export has been prepared on this device.");
    } catch {
      setMessage("We could not prepare your export. Please try again.");
    }
  }

  function deleteData() {
    const confirmed = window.confirm(
      "Delete all CycleCare period and symptom records from this browser? This cannot be undone."
    );

    if (!confirmed) return;

    localStorage.removeItem("cyclecare_periods");
    localStorage.removeItem("cyclecare_symptoms");
    window.dispatchEvent(new Event("cyclecare-data-updated"));
    window.dispatchEvent(new Event("cyclecare-symptoms-updated"));
    setMessage("Your CycleCare period and symptom records have been deleted from this browser.");
  }

  return (
    <section className="page-card">
      <span className="eyebrow">YOUR DATA, YOUR CHOICE</span>
      <h2>Settings & Privacy</h2>

      <p className="page-description">
        Manage the records stored in this browser.
      </p>

      <div className="settings-row">
        <div>
          <h3>Local storage</h3>
          <p>
            This prototype stores records in your browser. It does not
            yet encrypt them or protect them with a PIN.
          </p>
        </div>

        <ShieldCheck size={23} />
      </div>

      <section className="privacy-center" aria-labelledby="privacy-center-heading">
        <span className="eyebrow">PRIVACY CENTER</span>
        <h3 id="privacy-center-heading">Your data on this device</h3>
        <p>
          CycleCare stores your period entries and symptom check-ins in this browser's localStorage. These records are not automatically encrypted, and someone with access to this browser profile or device may be able to view them.
        </p>
        <p>
          Clearing browser data can permanently remove these records. Use the export option to save a copy, and the delete option below to remove CycleCare's health records from this browser.
        </p>
        <p className="privacy-limit">
          This app does not offer a PIN lock because a browser-only lock would not secure localStorage from someone with device or developer-tools access.
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

      <div className="settings-actions">
        <button className="secondary-button" onClick={exportData}>
          Export my data
        </button>

        <button className="danger-button" onClick={deleteData}>
          Delete all my data
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

function getPeriodEntries() {
  try {
    const entries = JSON.parse(
      localStorage.getItem("cyclecare_periods") || "[]"
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
      localStorage.getItem("cyclecare_symptoms") || "[]"
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
        note: typeof entry.note === "string" ? entry.note : "",
      }));
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

function daysBetween(firstDate, secondDate) {
  const first = parseDateOnly(firstDate);
  const second = parseDateOnly(secondDate);

  if (!first || !second) return null;

  return Math.round(
    (Date.UTC(second.getFullYear(), second.getMonth(), second.getDate()) -
      Date.UTC(first.getFullYear(), first.getMonth(), first.getDate())) /
      (1000 * 60 * 60 * 24)
  );
}

function parseDateOnly(value) {
  if (typeof value !== "string") return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : null;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getCycleEstimate(entries) {
  const sortedEntries = [...entries].sort((a, b) =>
    a.startDate.localeCompare(b.startDate)
  );

  if (sortedEntries.length < 3) return null;

  const intervals = sortedEntries
    .slice(1)
    .map((entry, index) =>
      daysBetween(sortedEntries[index].startDate, entry.startDate)
    )
    .filter((interval) => interval >= 20 && interval <= 45);

  if (intervals.length < 2) return null;

  const averageCycleLength = Math.round(
    intervals.reduce((total, interval) => total + interval, 0) /
      intervals.length
  );
  const latestStart = parseDateOnly(
    sortedEntries[sortedEntries.length - 1].startDate
  );
  const nextStart = addDays(latestStart, averageCycleLength);

  return {
    averageCycleLength,
    nextStart,
    windowStart: addDays(nextStart, -2),
    windowEnd: addDays(nextStart, 2),
  };
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

function localDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default App;

