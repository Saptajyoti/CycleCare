import { useState } from "react";
import { ExternalLink } from "lucide-react";

export function CareGuidancePage({ entries, symptoms, getCareGuidance, formatDate, localDateString, sortSymptomRecords }) {
  const guidance = getCareGuidance(entries, symptoms);
  const [showPrintSummary, setShowPrintSummary] = useState(false);

  return (
    <section className="page-card care-guidance">
      <span className="eyebrow">SUPPORT FOR YOUR NEXT STEP</span>
      <h2>When to see a doctor</h2>
      <p className="page-description">
        This page checks only the period dates and lengths you have recorded.
        It cannot assess symptoms you have not logged, diagnose a condition,
        or tell you that a warning sign is safe to ignore.
      </p>

      <section className="care-guidance-category" aria-labelledby="self-care-heading">
        <h3 id="self-care-heading">General self-care</h3>
        <article className="care-guidance-card">
          <p>
            For familiar, mild cramps, some people find a warm bath or a wrapped
            heat pad, gentle movement, rest, and keeping hydrated comforting.
            Stop anything that makes you feel worse. These are comfort ideas,
            not treatments; do not start or stop medication based on this app.
          </p>
          <a href="https://www.nhs.uk/symptoms/period-pain/" target="_blank" rel="noreferrer">
            Source: NHS, Period pain <ExternalLink size={14} />
          </a>
        </article>
      </section>

      <section className="care-guidance-category" aria-labelledby="medical-advice-heading">
        <h3 id="medical-advice-heading">Arrange medical advice</h3>
        <article className="care-guidance-card">
          <h4>Bleeding or period changes</h4>
          <p>
            Talk with a qualified healthcare professional if bleeding lasts
            longer than 7 days, repeatedly requires changing a pad or tampon
            every 1–2 hours, includes large clots, disrupts daily life, or
            bleeding happens between periods or after sex. Repeatedly short,
            long, or changing cycles also deserve discussion.
          </p>
          <p>
            If you miss 3 periods in a row or go about 90 days without one,
            seek professional advice. If pregnancy is possible, consider a
            pregnancy test and follow its instructions. A missed period has
            many possible causes and is not a diagnosis.
          </p>
          <div className="care-guidance-sources">
            <a href="https://www.nhs.uk/conditions/heavy-periods/" target="_blank" rel="noreferrer">
              Source: NHS, Heavy periods <ExternalLink size={14} />
            </a>
            <a href="https://www.nhs.uk/symptoms/irregular-periods/" target="_blank" rel="noreferrer">
              Source: NHS, Irregular periods <ExternalLink size={14} />
            </a>
            <a href="https://www.nhs.uk/symptoms/missed-or-late-periods/" target="_blank" rel="noreferrer">
              Source: NHS, Missed or late periods <ExternalLink size={14} />
            </a>
          </div>
        </article>
        <article className="care-guidance-card">
          <h4>Pain or other symptoms</h4>
          <p>
            Seek medical advice if period pain is severe, worsening, new for
            you, or stops usual activities. Also ask for advice if symptoms
            worry you, even if they are not listed here. Cycle records cannot
            diagnose PCOS, endometriosis, or another condition.
          </p>
          <a href="https://www.nhs.uk/symptoms/period-pain/" target="_blank" rel="noreferrer">
            Source: NHS, Period pain <ExternalLink size={14} />
          </a>
        </article>
        {guidance.length ? (
          <div className="care-guidance-list">
            {guidance.map((item) => (
              <article className="care-guidance-card" key={item.id}>
                <h4>{item.title}</h4>
                <p>{item.observed}</p>
                <p>{item.why}</p>
                <p>{item.nextStep}</p>
                <a href={item.source.url} target="_blank" rel="noreferrer">
                  Source: {item.source.name} <ExternalLink size={14} />
                </a>
              </article>
            ))}
          </div>
        ) : (
          <article className="care-guidance-card">
            <h4>No date-based prompts from your current records</h4>
            <p>
              This is not a medical assessment. Records may be incomplete, and
              the app cannot check symptoms you have not logged.
            </p>
          </article>
        )}
        <article className="care-guidance-card">
          <h4>Information this app cannot check</h4>
          <p>
            Speak with a healthcare professional if you have not had a first
            period by age 15, your periods suddenly change after years of being
            regular, or you have bleeding after menopause.
          </p>
          <a href="https://www.nhs.uk/symptoms/missed-or-late-periods/" target="_blank" rel="noreferrer">
            Source: NHS, Missed or late periods <ExternalLink size={14} />
          </a>
        </article>
        <article className="care-guidance-card">
          <h4>Ways to seek care</h4>
          <p>
            Consider a nearby government health centre, a qualified
            gynaecologist, or a tele-consultation service. Availability and
            eligibility can vary by location.
          </p>
          <a href="https://esanjeevani.mohfw.gov.in/" target="_blank" rel="noreferrer">
            Government of India eSanjeevani tele-consultation
            <ExternalLink size={14} />
          </a>
        </article>
      </section>

      <section className="care-guidance-category" aria-labelledby="urgent-care-heading">
        <h3 id="urgent-care-heading">Urgent symptoms—get help now</h3>
        <div className="care-urgent-note">
        <h3>Get urgent medical help</h3>
        <p>
          Seek urgent medical assessment for sudden or severe lower-belly pain;
          very heavy bleeding with dizziness, fainting, or feeling very unwell;
          or severe pain or bleeding when pregnancy is possible. Contact your
          local emergency service or go to an emergency department. In India,
          call 112.
        </p>
        <p>
          CycleCare does not monitor emergencies. Do not wait for an app
          estimate or a logged pattern if you have a concerning symptom.
        </p>
        <div className="care-guidance-sources">
          <a
            href="https://www.nhs.uk/symptoms/period-pain/"
            target="_blank"
            rel="noreferrer"
          >
            Source: NHS, Period pain <ExternalLink size={14} />
          </a>
          <a
            href="https://www.nhs.uk/conditions/ectopic-pregnancy/symptoms/"
            target="_blank"
            rel="noreferrer"
          >
            Source: NHS, Ectopic pregnancy symptoms <ExternalLink size={14} />
          </a>
          <a
            href="https://www.nhs.uk/conditions/heavy-periods/"
            target="_blank"
            rel="noreferrer"
          >
            Source: NHS, Heavy periods <ExternalLink size={14} />
          </a>
          <a href="https://112.gov.in/" target="_blank" rel="noreferrer">
            India Emergency Response Support System (112) <ExternalLink size={14} />
          </a>
        </div>
        </div>
      </section>
      <button
        className="secondary-button print-summary-button"
        onClick={() => {
          setShowPrintSummary(true);
          window.setTimeout(() => window.print(), 150);
        }}
      >
        Prepare / print a visit summary
      </button>
      {showPrintSummary && (
        <section className="print-summary">
          <h2>CycleCare visit summary</h2>
          <p>Personal record only. Not a diagnosis. Prepared {formatDate(localDateString())}.</p>
          <h3>Recorded periods</h3>
          <ul>{entries.slice(-12).reverse().map((entry) => (
            <li key={entry.startDate}>
              {formatDate(entry.startDate)} — {entry.periodLength} days, {entry.flow} flow
              {entry.changesEveryHour ? ", changed pad every 1–2 hours" : ""}
              {entry.largeClots ? ", recorded large clots" : ""}
            </li>
          ))}</ul>
          <h3>Recent symptom check-ins</h3>
          <ul>{sortSymptomRecords(symptoms).slice(0, 12).map((record) => (
            <li key={record.id}>
              {formatDate(record.date)} — {record.symptoms.join(", ") || "No symptoms selected"}; pain {record.pain}/10
              {record.painStopsActivities ? ", affected usual activities" : ""}
              {record.medicines ? `; medicines: ${record.medicines}` : ""}
            </li>
          ))}</ul>
          <h3>Questions for my healthcare professional</h3>
          <ul><li>What could be causing the changes I recorded?</li><li>What should I monitor or do next?</li><li>When should I seek urgent care?</li></ul>
        </section>
      )}
      <p className="clinical-review-note">
        Health guidance is based on the linked public sources and has not yet
        been reviewed by a qualified clinician. It is general education, not
        diagnosis or a substitute for individual medical care.
      </p>
    </section>
  );
}
