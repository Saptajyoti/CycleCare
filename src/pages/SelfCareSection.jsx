import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Coffee,
  Move,
  Star,
  Utensils,
  Wind,
} from "lucide-react";
import {
  createEmptySelfCareData,
  normalizeSelfCareData,
  selfCareCategories,
  selfCareSuggestions,
} from "../utils/selfCare";

const categoryIcons = {
  nutrition: Utensils,
  refreshments: Coffee,
  relaxation: Wind,
  "physical-comfort": Move,
};

export function SelfCareSection({
  getData,
  setData,
  localDateString,
  Illustration,
  refreshmentItems,
}) {
  const [initialState] = useState(() => {
    try {
      return { data: normalizeSelfCareData(getData()), error: "" };
    } catch (error) {
      return {
        data: createEmptySelfCareData(),
        error: error instanceof Error
          ? `${error.message} It has not been changed; save an update only if you want to replace it.`
          : "Saved self-care data could not be read. It has not been changed.",
      };
    }
  });
  const [data, setDataState] = useState(initialState.data);
  const [activeCategory, setActiveCategory] = useState("nutrition");
  const [showFavorites, setShowFavorites] = useState(false);
  const [reminderReached, setReminderReached] = useState(false);
  const [storageMessage, setStorageMessage] = useState(initialState.error);

  const persist = useCallback((next) => {
    try {
      setData(JSON.stringify(next));
      setDataState(next);
      setStorageMessage("");
      return true;
    } catch {
      setStorageMessage("Your self-care update could not be saved. Check available browser storage and try again.");
      return false;
    }
  }, [setData]);

  function updateData(update) {
    const next = normalizeSelfCareData(update(data));
    persist(next);
  }

  useEffect(() => {
    const checkReminder = () => {
      if (storageMessage) return;
      let current;
      try {
        current = normalizeSelfCareData(getData());
      } catch (error) {
        setStorageMessage(error instanceof Error
          ? error.message
          : "Saved self-care data could not be read.");
        return;
      }
      const now = new Date();
      const currentDate = localDateString();
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      if (
        current.reminder.enabled &&
        current.reminder.time <= currentTime &&
        current.reminder.lastFiredDate !== currentDate
      ) {
        const fired = {
          ...current,
          reminder: { ...current.reminder, lastFiredDate: currentDate },
        };
        if (persist(fired)) setReminderReached(true);
      }
    };
    checkReminder();
    const timer = window.setInterval(checkReminder, 30_000);
    return () => window.clearInterval(timer);
  }, [getData, localDateString, persist, storageMessage]);

  const today = localDateString();
  const completed = new Set(data.completedByDate[today] || []);
  const displayedSuggestions = selfCareSuggestions.filter((suggestion) =>
    showFavorites
      ? data.favorites.includes(suggestion.id)
      : suggestion.category === activeCategory
  );
  const completedCount = completed.size;

  function toggleChecklist(id) {
    updateData((current) => {
      const currentItems = new Set(current.completedByDate[today] || []);
      if (currentItems.has(id)) currentItems.delete(id);
      else currentItems.add(id);
      return {
        ...current,
        completedByDate: {
          ...current.completedByDate,
          [today]: [...currentItems],
        },
      };
    });
  }

  function toggleFavorite(id) {
    updateData((current) => ({
      ...current,
      favorites: current.favorites.includes(id)
        ? current.favorites.filter((favorite) => favorite !== id)
        : [...current.favorites, id],
    }));
  }

  function recordComfort(id, helped) {
    updateData((current) => ({
      ...current,
      comfortFeedback: {
        ...current.comfortFeedback,
        [id]: { date: today, helped },
      },
    }));
  }

  function updateReminder(field, value) {
    updateData((current) => ({
      ...current,
      reminder: {
        ...current.reminder,
        [field]: value,
        lastFiredDate: field === "time" ? "" : current.reminder.lastFiredDate,
      },
    }));
    if (field === "enabled" && value) setReminderReached(false);
  }

  return (
    <section className="self-care-section" aria-labelledby="self-care-heading">
      <div className="self-care-heading">
        <span className="eyebrow">SMALL MOMENTS OF COMFORT</span>
        <h2 id="self-care-heading">Little Comforts, Better Days</h2>
        <p>Explore gentle, optional ideas and choose what works for you. You can skip any suggestion.</p>
      </div>

      <section className="self-care-daily" aria-labelledby="self-care-daily-heading">
        <div>
          <h3 id="self-care-daily-heading">Your daily self-care checklist</h3>
          <p>{completedCount} of {selfCareSuggestions.length} ideas checked today · {today}</p>
        </div>
        <div className="self-care-progress" role="progressbar" aria-label="Today's optional self-care ideas completed" aria-valuemin={0} aria-valuemax={selfCareSuggestions.length} aria-valuenow={completedCount}>
          <span style={{ width: `${Math.round((completedCount / selfCareSuggestions.length) * 100)}%` }} />
        </div>
        <p className="privacy-hint">This is a flexible checklist, not a goal or health score.</p>
      </section>

      <div className="self-care-toolbar">
        <div className="self-care-categories" role="group" aria-label="Self-care categories">
          {selfCareCategories.map((category) => {
            const Icon = categoryIcons[category.id];
            return (
              <button
                className={`self-care-category-button ${!showFavorites && activeCategory === category.id ? "is-active" : ""}`}
                type="button"
                aria-pressed={!showFavorites && activeCategory === category.id}
                key={category.id}
                onClick={() => {
                  setShowFavorites(false);
                  setActiveCategory(category.id);
                }}
              >
                <Icon size={16} aria-hidden="true" />
                {category.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className={`self-care-favorites-toggle ${showFavorites ? "is-active" : ""}`}
          aria-pressed={showFavorites}
          onClick={() => setShowFavorites((current) => !current)}
        >
          <Star size={16} aria-hidden="true" />
          Favorites ({data.favorites.length})
        </button>
      </div>

      <p className="self-care-category-description">
        {showFavorites
          ? "Your saved ideas are stored on this device."
          : selfCareCategories.find((category) => category.id === activeCategory)?.description}
      </p>
      {!showFavorites && activeCategory === "nutrition" && (
        <p className="self-care-nutrition-note">
          Nutritional needs differ. When possible, variety across staple foods,
          vegetables or fruit, and protein sources can be one flexible way to
          think about meals; choose foods that fit your preferences, access, and
          any advice from your care team.
        </p>
      )}
      {storageMessage && <p className="self-care-storage-error" role="alert">{storageMessage}</p>}

      {displayedSuggestions.length ? (
        <div className="refreshment-grid self-care-suggestion-grid">
          {displayedSuggestions.map((item) => {
            const category = selfCareCategories.find((entry) => entry.id === item.category);
            const Icon = categoryIcons[item.category];
            const feedback = data.comfortFeedback[item.id];
            const feedbackToday = feedback?.date === today ? feedback.helped : null;
            return (
              <article className="refreshment-card self-care-suggestion-card" key={item.id}>
                {item.kind && Illustration && (
                  <div className="refreshment-illustration">
                    <Illustration
                      kind={item.kind}
                      label={refreshmentItems.find((refreshment) => refreshment.kind === item.kind)?.alt || item.title}
                    />
                  </div>
                )}
                <div className="refreshment-copy">
                  <div className="self-care-card-category"><Icon size={14} aria-hidden="true" />{category.label}</div>
                  <h4>{item.title}</h4>
                  <p>{item.description}</p>
                  <small>{item.detail}</small>
                  <div className="self-care-card-actions">
                    <button
                      type="button"
                      className={`self-care-icon-button ${data.favorites.includes(item.id) ? "is-saved" : ""}`}
                      aria-label={`${data.favorites.includes(item.id) ? "Remove" : "Save"} ${item.title} ${data.favorites.includes(item.id) ? "from" : "to"} favorites`}
                      aria-pressed={data.favorites.includes(item.id)}
                      onClick={() => toggleFavorite(item.id)}
                    >
                      <Star size={16} aria-hidden="true" />
                      {data.favorites.includes(item.id) ? "Saved" : "Save"}
                    </button>
                    <button
                      type="button"
                      className={`self-care-check-button ${completed.has(item.id) ? "is-complete" : ""}`}
                      aria-pressed={completed.has(item.id)}
                      onClick={() => toggleChecklist(item.id)}
                    >
                      {completed.has(item.id) ? <Check size={15} aria-hidden="true" /> : null}
                      {completed.has(item.id) ? "Done today" : "Add to today's checklist"}
                    </button>
                  </div>
                  <div className="self-care-feedback">
                    <span>{feedbackToday === null ? "Did this help you feel more comfortable today?" : feedbackToday ? "Marked as helpful today." : "Thanks for letting us know."}</span>
                    <div role="group" aria-label={`Did ${item.title} help you feel more comfortable?`}>
                      <button type="button" aria-pressed={feedbackToday === true} onClick={() => recordComfort(item.id, true)}>Yes</button>
                      <button type="button" aria-pressed={feedbackToday === false} onClick={() => recordComfort(item.id, false)}>Not today</button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="self-care-empty">No favorites saved yet. Save an idea to find it here.</p>
      )}

      <section className="self-care-reminder" aria-labelledby="self-care-reminder-heading">
        <div className="self-care-reminder-copy">
          <h3 id="self-care-reminder-heading">Optional daily reminder</h3>
          <p>Choose a gentle prompt time. It appears only while CycleCare is open on the Overview page; it does not send a notification after you leave or close the app.</p>
          {reminderReached && (
            <p className="self-care-reminder-message" role="status">
              A gentle reminder: take a moment for any self-care that feels right today—or skip it.
            </p>
          )}
        </div>
        <label className="self-care-reminder-toggle">
          <input
            type="checkbox"
            checked={data.reminder.enabled}
            onChange={(event) => updateReminder("enabled", event.target.checked)}
          />
          <span>Enable reminder</span>
        </label>
        <label className="self-care-reminder-time">
          <span>Reminder time</span>
          <input
            type="time"
            value={data.reminder.time}
            disabled={!data.reminder.enabled}
            onChange={(event) => updateReminder("time", event.target.value)}
          />
        </label>
      </section>

      <p className="self-care-disclaimer">
        These are optional general comfort and wellbeing ideas, not medical advice or treatment. No food or drink can be promised to cure cramps, regulate hormones, or treat a condition. Stop any activity that feels uncomfortable. Seek professional advice for severe or worsening symptoms.
      </p>
    </section>
  );
}
