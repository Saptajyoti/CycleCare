import { getCrossCyclePatterns } from "../utils/insights";

export function InsightsPage({ periods, symptoms, formatDate, daysBetween }) {
  const cycles = periods.slice(1).map((entry, index) => ({
    start: periods[index].startDate,
    end: entry.startDate,
    days: daysBetween(periods[index].startDate, entry.startDate),
    periodDays: periods[index].periodLength,
  }));
  const cycleLengths = cycles.map((cycle) => cycle.days);
  const mean = cycleLengths.length
    ? Math.round(cycleLengths.reduce((sum, value) => sum + value, 0) / cycleLengths.length)
    : null;
  const minimum = cycleLengths.length ? Math.min(...cycleLengths) : null;
  const maximum = cycleLengths.length ? Math.max(...cycleLengths) : null;
  const recentLengths = cycleLengths.slice(-6);
  const recentSpread = recentLengths.length
    ? Math.max(...recentLengths) - Math.min(...recentLengths)
    : null;
  const patterns = getCrossCyclePatterns(periods, symptoms);

  return (
    <section className="page-card">
      <span className="eyebrow">YOUR RECORDS, GENTLY SUMMARIZED</span>
      <h2>Cycle insights</h2>
      <p className="page-description">
        These are summaries of what you recorded, not medical findings or
        predictions. Missing logs can change the picture.
      </p>
      <details className="insight-example">
        <summary>See an example of how this works</summary>
        <div className="insight-example-content">
          <p><strong>Sample period starts:</strong> 1 Apr, 29 Apr, 27 May, 23 Jun</p>
          <p>Days between starts: <strong>28, 28, and 27</strong></p>
          <p><strong>Example result:</strong> average cycle 28 days; recorded range 27–28 days.</p>
          <p>If “cramps” was logged once in each of those three cycles, the pattern would read: <strong>Cramps — recorded in 3 of 3 cycles.</strong></p>
          <small>Sample data only. This does not change your saved records.</small>
        </div>
      </details>
      {cycles.length ? (
        <>
          <div className="symptom-stat-grid cycle-summary-grid">
            <article className="symptom-stat-card"><span>AVERAGE RECORDED CYCLE</span><strong>{mean} days</strong></article>
            <article className="symptom-stat-card purple-stat"><span>RECORDED RANGE</span><strong>{minimum}–{maximum} days</strong></article>
          </div>
          {recentSpread !== null && (
            <p className="privacy-hint">
              Tracking label: {recentLengths.length < 2
                ? "not enough recent cycles to describe variation"
                : recentSpread > 7
                  ? "recent cycle lengths vary by more than 7 days (irregular tracking pattern)"
                  : "recent cycle lengths vary by 7 days or less"}.
              This is a simple summary, not a clinical assessment.
            </p>
          )}
          <div className="cycle-history-heading">
            <h3>Recorded cycle history</h3>
            <span>{cycles.length} completed {cycles.length === 1 ? "cycle" : "cycles"}</span>
          </div>
          <p className="cycle-history-explanation">
            Each bar shows the days from one recorded period start to the next. The average and range use all recorded intervals; the tracking label above checks the six most recent.
          </p>
          <div className="cycle-history-chart" aria-label="Recorded cycle lengths">
            {cycles.slice(-12).map((cycle) => (
              <div className="cycle-chart-row" key={cycle.end}>
                <span>{formatDate(cycle.start)}</span>
                <div className="cycle-chart-track" role="progressbar" aria-label={`${cycle.days} days from this period start to the next`} aria-valuemin={0} aria-valuemax={maximum} aria-valuenow={cycle.days}>
                  <span className="cycle-chart-bar" style={{ width: `${Math.min(100, Math.max(8, (cycle.days / Math.max(maximum, 1)) * 100))}%` }} />
                </div>
                <strong>{cycle.days} d</strong>
                <small>{cycle.periodDays} period days</small>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="insight-empty-state">
          <h3>Cycle history will appear here</h3>
          <p>Record at least two period start dates to see the days between them. Three starts are needed before the app can estimate your next period.</p>
        </div>
      )}
      <section className="history-section">
        <h3>Patterns across cycles</h3>
        {patterns.length ? patterns.map((pattern) => (
          <article className="care-guidance-card" key={pattern.symptom}>
            <h4>{pattern.symptom}</h4>
            <p>Recorded in {pattern.cycleCount} of your last {pattern.cyclesChecked} logged cycles. This is a record of co-occurrence, not evidence of a cause.</p>
          </article>
        )) : (
          <p className="page-description">
            Patterns appear after the same symptom has been recorded in at
            least three separate logged cycles.
          </p>
        )}
      </section>
    </section>
  );
}
