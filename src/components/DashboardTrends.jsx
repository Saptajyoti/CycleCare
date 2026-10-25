import {
  getMoodDistribution,
  getRecentCycleHistory,
  getSymptomFrequency,
} from "../utils/dashboardTrends.js";

const moodLabels = {
  en: {
    "very-low": "Very low",
    low: "Low",
    okay: "Okay",
    good: "Good",
    "very-good": "Very good",
  },
  hi: {
    "very-low": "बहुत खराब",
    low: "खराब",
    okay: "ठीक",
    good: "अच्छा",
    "very-good": "बहुत अच्छा",
  },
};

export function DashboardTrends({ periods, symptoms, formatDate, daysBetween, language }) {
  const hi = language === "hi";
  const cycles = getRecentCycleHistory(periods, daysBetween);
  const symptomCounts = getSymptomFrequency(symptoms);
  const moodCounts = getMoodDistribution(symptoms);
  const maxCycleLength = Math.max(1, ...cycles.map((cycle) => cycle.cycleLength));
  const maxPeriodLength = Math.max(1, ...cycles.map((cycle) => cycle.periodLength));
  const maxSymptomCount = Math.max(1, ...symptomCounts.map((item) => item.count));
  const maxMoodCount = Math.max(1, ...moodCounts.map((item) => item.count));

  return (
    <section className="dashboard-trends" aria-labelledby="dashboard-trends-heading">
      <div className="dashboard-trends-heading">
        <div>
          <span className="eyebrow">{hi ? "आपके दर्ज रिकॉर्ड" : "YOUR RECORDED DATA"}</span>
          <h2 id="dashboard-trends-heading">{hi ? "इतिहास और रुझान" : "History and trends"}</h2>
          <p>{hi ? "ये केवल आपके दर्ज अनुभवों का सार हैं, चिकित्सकीय निष्कर्ष नहीं।" : "A summary of your entries, not a medical finding or prediction."}</p>
        </div>
      </div>
      <div className="dashboard-trends-grid">
        <article className="dashboard-trend-card">
          <h3>{hi ? "चक्र का इतिहास" : "Cycle history"}</h3>
          <p className="privacy-hint">{hi ? "चक्र अवधि दो दर्ज शुरुआतों के बीच के दिन हैं। पीरियड अवधि अलग दिखाई गई है।" : "Cycle length is the days between recorded starts; period duration is shown separately."}</p>
          {cycles.length ? (
            <div className="dashboard-trend-list" role="list" aria-label={hi ? "हाल के दर्ज चक्र" : "Recent recorded cycles"}>
              {cycles.map((cycle) => (
                <div className="dashboard-trend-row dashboard-cycle-trend" role="listitem" key={cycle.startDate}>
                  <span className="dashboard-trend-label">{formatDate(cycle.startDate)}</span>
                  <div className="dashboard-trend-metrics">
                    <div className="dashboard-trend-meter">
                      <span>{hi ? `चक्र ${cycle.cycleLength} दिन` : `Cycle ${cycle.cycleLength} days`}</span>
                      <div className="dashboard-trend-track" role="progressbar" aria-label={hi ? `चक्र अवधि ${cycle.cycleLength} दिन` : `Cycle length ${cycle.cycleLength} days`} aria-valuemin={0} aria-valuemax={maxCycleLength} aria-valuenow={cycle.cycleLength}>
                        <span style={{ width: `${(cycle.cycleLength / maxCycleLength) * 100}%` }} />
                      </div>
                    </div>
                    <div className="dashboard-trend-meter">
                      <span>{hi ? `पीरियड ${cycle.periodLength} दिन` : `Period ${cycle.periodLength} days`}</span>
                      <div className="dashboard-trend-track period-duration-track" role="progressbar" aria-label={hi ? `पीरियड अवधि ${cycle.periodLength} दिन` : `Period duration ${cycle.periodLength} days`} aria-valuemin={0} aria-valuemax={maxPeriodLength} aria-valuenow={cycle.periodLength}>
                        <span style={{ width: `${(cycle.periodLength / maxPeriodLength) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>{hi ? "इतिहास देखने के लिए कम-से-कम दो पीरियड की शुरुआत दर्ज करें।" : "Record at least two period starts to see cycle history."}</p>
          )}
        </article>

        <article className="dashboard-trend-card">
          <h3>{hi ? "लक्षणों के रुझान" : "Symptom trends"}</h3>
          <p className="privacy-hint">{hi ? "सभी दर्ज चेक-इन में प्रत्येक लक्षण कितनी बार दर्ज हुआ।" : "How often each symptom appears across your saved check-ins."}</p>
          {symptomCounts.length ? (
            <div className="dashboard-trend-list" role="list" aria-label={hi ? "दर्ज लक्षणों की आवृत्ति" : "Recorded symptom frequency"}>
              {symptomCounts.map(({ symptom, count }) => (
                <div className="dashboard-trend-row" role="listitem" key={symptom}>
                  <span className="dashboard-trend-label">{symptom}</span>
                  <div className="dashboard-trend-meter">
                    <div className="dashboard-trend-track symptom-trend-track" role="progressbar" aria-label={hi ? `${symptom}, ${count} चेक-इन` : `${symptom}, ${count} check-ins`} aria-valuemin={0} aria-valuemax={maxSymptomCount} aria-valuenow={count}>
                      <span style={{ width: `${(count / maxSymptomCount) * 100}%` }} />
                    </div>
                    <strong>{count}</strong>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>{hi ? "लक्षण दर्ज करने पर यहाँ रुझान दिखेंगे।" : "Log symptoms to see their recorded frequency here."}</p>
          )}
        </article>

        <article className="dashboard-trend-card">
          <h3>{hi ? "दर्ज मनोदशाएँ" : "Recorded moods"}</h3>
          <p className="privacy-hint">{hi ? "यह आपके दर्ज मनोदशा चेक-इन की गिनती है; इससे कारण या भविष्य का पता नहीं चलता।" : "Counts of mood check-ins only; they do not explain causes or predict future mood."}</p>
          {moodCounts.length ? (
            <div className="dashboard-trend-list" role="list" aria-label={hi ? "मनोदशा चेक-इन का वितरण" : "Mood check-in distribution"}>
              {moodCounts.map(({ mood, count }) => (
                <div className="dashboard-trend-row" role="listitem" key={mood}>
                  <span className="dashboard-trend-label">{moodLabels[hi ? "hi" : "en"][mood]}</span>
                  <div className="dashboard-trend-meter">
                    <div className="dashboard-trend-track mood-trend-track" role="progressbar" aria-label={hi ? `${moodLabels.hi[mood]}, ${count} चेक-इन` : `${moodLabels.en[mood]}, ${count} check-ins`} aria-valuemin={0} aria-valuemax={maxMoodCount} aria-valuenow={count}>
                      <span style={{ width: `${(count / maxMoodCount) * 100}%` }} />
                    </div>
                    <strong>{count}</strong>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>{hi ? "मनोदशा दर्ज करने पर यहाँ सार दिखेगा।" : "Record a mood to see a summary here."}</p>
          )}
        </article>
      </div>
    </section>
  );
}
