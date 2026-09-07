import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API_URL = "http://127.0.0.1:8000";

/* =========================================================
   DEMO PATIENT
========================================================= */

const defaultForm = {
  age: "56",
  gender: "Male",
  systolic: "165",
  diastolic: "100",
  heartRate: "108",
  spo2: "93",
  temperature: "37.2",
  glucose: "323",

  confusion: true,
  thirst: true,
  sweating: true,
  chestPain: false,
  breathingDifficulty: false,
  weakness: false,
};

/* =========================================================
   DEMO FACILITIES
========================================================= */

const facilities = [
  {
    id: "city-emergency",
    name: "City Emergency Centre",
    type: "Emergency + ICU",
    distance: "2.4 km",
    eta: 8,
    beds: 12,
    status: "Available",
    icu: true,
    emergency: true,
    specialist: true,
    ct: true,
    capabilityScore: 90,
    capacityScore: 88,
    etaScore: 94,
    specialistScore: 90,
    diagnosticsScore: 95,
    reasons: [
      "Highest clinical suitability",
      "Emergency capacity available",
      "Shortest estimated travel time",
      "Specialist support available",
    ],
  },
  {
    id: "district-general",
    name: "District General Hospital",
    type: "Government",
    distance: "3.8 km",
    eta: 12,
    beds: 18,
    status: "Available",
    icu: true,
    emergency: true,
    specialist: false,
    ct: true,
    capabilityScore: 84,
    capacityScore: 90,
    etaScore: 85,
    specialistScore: 65,
    diagnosticsScore: 95,
    reasons: [
      "Strong emergency capacity",
      "ICU and CT facilities available",
      "More emergency beds available",
      "Longer estimated travel time",
    ],
  },
  {
    id: "metro-care",
    name: "Metro Care Hospital",
    type: "Private",
    distance: "5.1 km",
    eta: 16,
    beds: 14,
    status: "Busy",
    icu: true,
    emergency: true,
    specialist: true,
    ct: true,
    capabilityScore: 84,
    capacityScore: 63,
    etaScore: 70,
    specialistScore: 92,
    diagnosticsScore: 94,
    reasons: [
      "Specialist support available",
      "Strong diagnostic capability",
      "Emergency services available",
      "Current facility load reduces suitability",
    ],
  },
];

/* =========================================================
   LOCAL TRIAGE
========================================================= */

function localTriage(form) {
  let score = 0;
  const indicators = [];

  const glucose = Number(form.glucose);
  const systolic = Number(form.systolic);
  const diastolic = Number(form.diastolic);
  const heartRate = Number(form.heartRate);
  const spo2 = Number(form.spo2);
  const temperature = Number(form.temperature);
  const age = Number(form.age);

  if (glucose >= 300) {
    score += 3;
    indicators.push("Very high blood glucose");
  } else if (glucose >= 200) {
    score += 2;
    indicators.push("High blood glucose");
  }

  if (systolic >= 160 || diastolic >= 100) {
    score += 2;
    indicators.push("High blood pressure");
  } else if (systolic >= 140 || diastolic >= 90) {
    score += 1;
    indicators.push("Elevated blood pressure");
  }

  if (heartRate > 100) {
    score += 1;
    indicators.push("Elevated heart rate");
  }

  if (spo2 < 94) {
    score += 2;
    indicators.push("Low oxygen saturation");
  } else if (spo2 < 96) {
    score += 1;
    indicators.push("Borderline oxygen saturation");
  }

  if (temperature >= 38.5 || temperature < 35) {
    score += 1;
    indicators.push("Abnormal temperature");
  }

  const symptoms = [
    ["confusion", "Confusion reported"],
    ["thirst", "Excessive thirst reported"],
    ["sweating", "Sweating reported"],
    ["chestPain", "Chest pain reported"],
    ["breathingDifficulty", "Breathing difficulty reported"],
    ["weakness", "Weakness reported"],
  ];

  symptoms.forEach(([key, label]) => {
    if (form[key]) {
      score += 2;
      indicators.push(label);
    }
  });

  if (age >= 65) {
    score += 1;
    indicators.push("Older age group");
  }

  score = Math.min(score, 15);

  let level = "LOW";

  if (score >= 9) {
    level = "HIGH";
  } else if (score >= 5) {
    level = "MODERATE";
  }

  let action = "Routine clinical review recommended.";

  if (level === "MODERATE") {
    action =
      "Priority clinical assessment recommended. Monitor patient and consider facility coordination.";
  }

  if (level === "HIGH") {
    action =
      "Immediate clinical assessment recommended. Consider emergency facility coordination.";
  }

  return {
    score,
    level,
    indicators,
    action,
  };
}

/* =========================================================
   BACKEND ASSESSMENT
========================================================= */

async function assessPatient(form) {
  const payload = {
    age: Number(form.age),
    systolic: Number(form.systolic),
    diastolic: Number(form.diastolic),
    heartRate: Number(form.heartRate),
    spo2: Number(form.spo2),
    temperature: Number(form.temperature),
    glucose: Number(form.glucose),

    symptoms: {
      confusion: form.confusion,
      thirst: form.thirst,
      sweating: form.sweating,
      chestPain: form.chestPain,
      breathingDifficulty: form.breathingDifficulty,
      weakness: form.weakness,
    },
  };

  try {
    const response = await fetch(`${API_URL}/api/assess`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Backend assessment failed");
    }

    const data = await response.json();

    return {
      ...data,
      backendOnline: true,
    };
  } catch (error) {
    console.warn(
      "Backend unavailable. Using local demo triage.",
      error
    );

    const local = localTriage(form);

    return {
      engine: "Local Prototype Triage",
      classical_probability: null,
      hybrid_probability:
        local.level === "HIGH"
          ? 99.9
          : local.level === "MODERATE"
          ? 65.4
          : 18.7,
      risk_level: local.level,
      prototype_rule_score: local.score,
      symptom_count: Object.values(form).filter(
        (value) => value === true
      ).length,
      backendOnline: false,
      disclaimer:
        "Prototype demonstration using simulated/local triage logic; not a clinical diagnostic model.",
    };
  }
}

/* =========================================================
   FACILITY MATCHING
========================================================= */

function calculateFacilityMatch(facility, riskLevel) {
  let score =
    facility.capabilityScore * 0.3 +
    facility.capacityScore * 0.25 +
    facility.etaScore * 0.2 +
    facility.specialistScore * 0.15 +
    facility.diagnosticsScore * 0.1;

  if (riskLevel === "HIGH") {
    if (facility.icu) score += 1;
    if (facility.emergency) score += 1;
  }

  return Math.min(99, Math.round(score));
}

function getFacilityMatches(riskLevel) {
  return facilities
    .map((facility) => ({
      ...facility,
      match: calculateFacilityMatch(facility, riskLevel),
    }))
    .sort((a, b) => b.match - a.match);
}

/* =========================================================
   APP
========================================================= */

function App() {
  const [selected, setSelected] = useState("Dashboard");
  const [assessmentData, setAssessmentData] = useState(null);
  const [selectedFacility, setSelectedFacility] = useState(null);

  const handleAssessmentComplete = (data) => {
    setAssessmentData(data);
  };

  const pageTitle =
    selected === "Hospital Network"
      ? "Facility Matching"
      : selected === "Patient History"
      ? "Patient Record"
      : selected;

  return (
    <div className="app-shell">

      {/* SIDEBAR */}

      <aside className="sidebar">

        <div className="brand">
          <div className="brand-mark">J</div>

          <div>
            <div className="brand-name">JEEVAN-NET</div>
            <div className="brand-subtitle">
              ArogyaNexus
            </div>
          </div>
        </div>

        <div className="menu-label">
          MAIN MENU
        </div>

        <nav className="nav-menu">

          <button
            className={`nav-item ${
              selected === "Dashboard"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setSelected("Dashboard")
            }
          >
            <span className="nav-icon">⌂</span>
            <span>Dashboard</span>
          </button>

          <button
            className={`nav-item ${
              selected === "Patient Assessment"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setSelected("Patient Assessment")
            }
          >
            <span className="nav-icon">◉</span>
            <span>Patient Assessment</span>
          </button>

          <button
            className={`nav-item ${
              selected === "Emergency"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setSelected("Emergency")
            }
          >
            <span className="nav-icon">✚</span>
            <span>Emergency Response</span>
          </button>

          <button
            className={`nav-item ${
              selected === "Hospital Network"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setSelected("Hospital Network")
            }
          >
            <span className="nav-icon">⚕</span>
            <span>Hospital Network</span>
          </button>

          <button
            className={`nav-item ${
              selected === "Patient History"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setSelected("Patient History")
            }
          >
            <span className="nav-icon">▣</span>
            <span>Patient Record</span>
          </button>

        </nav>

        <div className="sidebar-bottom">

          <div className="network-status">
            <div className="status-dot"></div>

            <div>
              <strong>Network Status</strong>
              <span>
                All core services online
              </span>
            </div>
          </div>

          <div className="copyright">
            SIH 2026 • SteelBrains
          </div>

        </div>

      </aside>

      {/* MAIN */}

      <main className="main-content">

        <header className="top-header">

          <div>
            <div className="eyebrow">
              HEALTHCARE COORDINATION PLATFORM
            </div>

            <h1>{pageTitle}</h1>
          </div>

          <div className="header-right">

            <div className="system-online">
              <span className="status-dot"></span>
              System Online
            </div>

            <div className="profile-circle">
              SB
            </div>

          </div>

        </header>

        <div className="content-area">

          {selected === "Dashboard" && (
            <Dashboard
              assessmentData={assessmentData}
              selectedFacility={selectedFacility}
              onNavigate={setSelected}
            />
          )}

          {selected === "Patient Assessment" && (
            <PatientAssessment
              onAssessmentComplete={
                handleAssessmentComplete
              }
              onOpenFacilityMatching={() =>
                setSelected("Hospital Network")
              }
            />
          )}

          {selected === "Hospital Network" && (
            <FacilityMatching
              assessmentData={assessmentData}
              selectedFacility={selectedFacility}
              setSelectedFacility={
                setSelectedFacility
              }
              onBackToAssessment={() =>
                setSelected("Patient Assessment")
              }
              onOpenEmergency={() =>
                setSelected("Emergency")
              }
            />
          )}

          {selected === "Emergency" && (
            <Emergency
              assessmentData={assessmentData}
              selectedFacility={selectedFacility}
              onOpenPatientRecord={() =>
                setSelected("Patient History")
              }
            />
          )}

          {selected === "Patient History" && (
            <PatientHistory
              assessmentData={assessmentData}
              selectedFacility={selectedFacility}
              onNewAssessment={() =>
                setSelected("Patient Assessment")
              }
            />
          )}

        </div>

        <footer className="page-footer">
          <span>
            JEEVAN-NET / ArogyaNexus
          </span>

          <span>
            Prototype • Clinical decisions require
            qualified medical professionals
          </span>
        </footer>

      </main>

    </div>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard({
  assessmentData,
  selectedFacility,
  onNavigate,
}) {
  return (
    <div className="dashboard-grid">

      <section className="hero-panel">

        <div>

          <div className="section-label">
            SMART HEALTHCARE COORDINATION
          </div>

          <h2>
            Intelligent patient assessment
            <br />
            and emergency coordination.
          </h2>

          <p>
            JEEVAN-NET combines clinical triage,
            hybrid ML intelligence and facility
            matching to demonstrate coordinated
            healthcare decision support.
          </p>

          <button
            className="primary-button"
            onClick={() =>
              onNavigate("Patient Assessment")
            }
          >
            Start Patient Assessment →
          </button>

        </div>

        <div className="hero-symbol">
          +
        </div>

      </section>

      <section className="stats-row">

        <div className="stat-card">
          <span>Assessment Engine</span>
          <strong>Hybrid AI</strong>
          <small>Classical + Quantum</small>
        </div>

        <div className="stat-card">
          <span>Facility Network</span>
          <strong>03</strong>
          <small>Demo facilities</small>
        </div>

        <div className="stat-card">
          <span>Emergency Routing</span>
          <strong>Ready</strong>
          <small>Simulation mode</small>
        </div>

      </section>

      <section className="panel">

        <div className="panel-header">

          <div>
            <div className="section-label">
              DEMO WORKFLOW
            </div>

            <h3>
              End-to-end coordination
            </h3>
          </div>

        </div>

        <div className="workflow">

          <div className="workflow-step">
            <span>01</span>
            Patient Assessment
          </div>

          <div className="workflow-arrow">
            →
          </div>

          <div className="workflow-step">
            <span>02</span>
            Hybrid Triage
          </div>

          <div className="workflow-arrow">
            →
          </div>

          <div className="workflow-step">
            <span>03</span>
            Facility Matching
          </div>

          <div className="workflow-arrow">
            →
          </div>

          <div className="workflow-step">
            <span>04</span>
            Emergency Response
          </div>

          <div className="workflow-arrow">
            →
          </div>

          <div className="workflow-step">
            <span>05</span>
            Patient Record
          </div>

        </div>

      </section>

      {assessmentData && (
        <section className="panel">

          <div className="panel-header">

            <div>
              <div className="section-label">
                LAST ASSESSMENT
              </div>

              <h3>
                {assessmentData.result?.risk_level ||
                  "UNKNOWN"}{" "}
                RISK
              </h3>
            </div>

            <button
              className="secondary-button"
              onClick={() =>
                onNavigate("Patient History")
              }
            >
              View Patient Record →
            </button>

          </div>

          {selectedFacility && (
            <p className="muted">
              Selected facility:{" "}
              <strong>
                {selectedFacility.name}
              </strong>
            </p>
          )}

        </section>
      )}

    </div>
  );
}

/* =========================================================
   PATIENT ASSESSMENT
========================================================= */

function PatientAssessment({
  onAssessmentComplete,
  onOpenFacilityMatching,
}) {
  const [form, setForm] = useState(defaultForm);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const analyze = async () => {
    setLoading(true);

    const local = localTriage(form);
    const backend = await assessPatient(form);

    const combined = {
      ...backend,
      localScore: local.score,
      localLevel: local.level,
      indicators: local.indicators,
      action: local.action,
      risk_level: local.level,
    };

    setResult(combined);

    onAssessmentComplete({
      form: { ...form },
      result: combined,
      assessedAt: new Date().toLocaleString(),
    });

    setLoading(false);
  };

  return (
    <div className="assessment-layout">

      <section className="panel assessment-panel">

        <div className="panel-header">

          <div>

            <div className="section-label">
              PATIENT INTAKE
            </div>

            <h2>
              Clinical Assessment
            </h2>

            <p className="muted">
              Enter patient vitals and reported
              symptoms.
            </p>

          </div>

          <div className="demo-badge">
            DEMO MODE
          </div>

        </div>

        <div className="form-grid">

          <Field
            label="Age"
            value={form.age}
            onChange={(v) =>
              updateField("age", v)
            }
          />

          <div className="field">

            <label>Gender</label>

            <select
              value={form.gender}
              onChange={(e) =>
                updateField(
                  "gender",
                  e.target.value
                )
              }
            >
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>

          </div>

          <Field
            label="Systolic BP"
            value={form.systolic}
            onChange={(v) =>
              updateField("systolic", v)
            }
          />

          <Field
            label="Diastolic BP"
            value={form.diastolic}
            onChange={(v) =>
              updateField("diastolic", v)
            }
          />

          <Field
            label="Heart Rate"
            value={form.heartRate}
            onChange={(v) =>
              updateField("heartRate", v)
            }
          />

          <Field
            label="SpO₂"
            value={form.spo2}
            onChange={(v) =>
              updateField("spo2", v)
            }
          />

          <Field
            label="Temperature"
            value={form.temperature}
            onChange={(v) =>
              updateField("temperature", v)
            }
          />

          <Field
            label="Blood Glucose"
            value={form.glucose}
            onChange={(v) =>
              updateField("glucose", v)
            }
          />

        </div>

        <div className="symptoms-section">

          <div className="section-label">
            REPORTED SYMPTOMS
          </div>

          <div className="symptoms-grid">

            <Checkbox
              label="Confusion"
              checked={form.confusion}
              onChange={(v) =>
                updateField("confusion", v)
              }
            />

            <Checkbox
              label="Excessive thirst"
              checked={form.thirst}
              onChange={(v) =>
                updateField("thirst", v)
              }
            />

            <Checkbox
              label="Sweating"
              checked={form.sweating}
              onChange={(v) =>
                updateField("sweating", v)
              }
            />

            <Checkbox
              label="Chest pain"
              checked={form.chestPain}
              onChange={(v) =>
                updateField("chestPain", v)
              }
            />

            <Checkbox
              label="Breathing difficulty"
              checked={
                form.breathingDifficulty
              }
              onChange={(v) =>
                updateField(
                  "breathingDifficulty",
                  v
                )
              }
            />

            <Checkbox
              label="Weakness"
              checked={form.weakness}
              onChange={(v) =>
                updateField("weakness", v)
              }
            />

          </div>

        </div>

        <button
          className="primary-button analyze-button"
          onClick={analyze}
          disabled={loading}
        >
          {loading
            ? "Analyzing patient..."
            : "Analyze Patient →"}
        </button>

      </section>

      {result && (
        <Result
          result={result}
          onOpenFacilityMatching={
            onOpenFacilityMatching
          }
        />
      )}

    </div>
  );
}

/* =========================================================
   FIELD
========================================================= */

function Field({
  label,
  value,
  onChange,
}) {
  return (
    <div className="field">

      <label>{label}</label>

      <input
        type="number"
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
      />

    </div>
  );
}

/* =========================================================
   CHECKBOX
========================================================= */

function Checkbox({
  label,
  checked,
  onChange,
}) {
  return (
    <label className="checkbox-row">

      <input
        type="checkbox"
        checked={checked}
        onChange={(e) =>
          onChange(e.target.checked)
        }
      />

      <span>{label}</span>

    </label>
  );
}

/* =========================================================
   RESULT
========================================================= */

function Result({
  result,
  onOpenFacilityMatching,
}) {
  const isHigh =
    result.risk_level === "HIGH";

  return (
    <section className="panel result-panel">

      <div className="section-label">
        HYBRID TRIAGE RESULT
      </div>

      <div
        className={`risk-banner ${
          isHigh
            ? "risk-high"
            : "risk-normal"
        }`}
      >

        <div>

          <span>RISK LEVEL</span>

          <strong>
            {result.risk_level} RISK
          </strong>

        </div>

        <div className="risk-score">

          {result.localScore ??
            result.prototype_rule_score}

          <small>/15</small>

        </div>

      </div>

      <div className="result-section">

        <h4>Risk Indicators</h4>

        <div className="indicator-list">

          {(result.indicators || []).map(
            (indicator, index) => (
              <div
                className="indicator"
                key={index}
              >
                <span>✓</span>
                {indicator}
              </div>
            )
          )}

        </div>

      </div>

      <div className="action-box">

        <span>
          RECOMMENDED ACTION
        </span>

        <strong>
          {result.action}
        </strong>

      </div>

      <div className="hybrid-box">

        <div className="section-label">
          HYBRID INTELLIGENCE
        </div>

        <div className="model-grid">

          <div>
            <span>
              Classical Model
            </span>

            <strong>
              {result.classical_probability != null
                ? `${result.classical_probability}%`
                : "Local"}
            </strong>
          </div>

          <div>
            <span>
              Quantum-Classical Model
            </span>

            <strong>
              {result.hybrid_probability}%
            </strong>
          </div>

        </div>

        <p>
          Prototype confidence generated using
          synthetic/demo data. This is not a
          clinically validated diagnostic model.
        </p>

      </div>

      <button
        className="primary-button facility-next-button"
        onClick={onOpenFacilityMatching}
      >
        Continue to Facility Matching →
      </button>

    </section>
  );
}

/* =========================================================
   FACILITY MATCHING
========================================================= */

function FacilityMatching({
  assessmentData,
  selectedFacility,
  setSelectedFacility,
  onBackToAssessment,
  onOpenEmergency,
}) {
  const data =
    assessmentData || {
      form: defaultForm,
      result: {
        risk_level: "HIGH",
        hybrid_probability: 99.9,
      },
    };

  const riskLevel =
    data.result?.risk_level || "HIGH";

  const rankedFacilities =
    getFacilityMatches(riskLevel);

  const recommended =
    rankedFacilities[0];

  return (
    <div className="facility-page">

      <section className="panel">

        <div className="panel-header">

          <div>

            <div className="section-label">
              INTELLIGENT FACILITY MATCHING
            </div>

            <h2>
              Recommended Care Facility
            </h2>

            <p className="muted">
              Facility ranking is based on
              clinical capability, emergency
              capacity, ETA, specialist
              availability and diagnostics.
            </p>

          </div>

          <div className="demo-badge">
            SIMULATED NETWORK DATA
          </div>

        </div>

        <div className="patient-summary">

          <div>
            <span>Patient Risk</span>
            <strong className="high-text">
              {riskLevel}
            </strong>
          </div>

          <div>
            <span>
              Hybrid Probability
            </span>

            <strong>
              {data.result
                ?.hybrid_probability ?? "—"}%
            </strong>
          </div>

          <div>
            <span>
              Facilities Evaluated
            </span>

            <strong>03</strong>
          </div>

        </div>

      </section>

      <section className="panel recommended-facility">

        <div className="recommended-header">

          <div>

            <div className="section-label">
              TOP MATCH
            </div>

            <h2>
              {recommended.name}
            </h2>

            <p className="muted">
              {recommended.type}
            </p>

          </div>

          <div className="facility-match-score">

            <div>
              {recommended.match}%
            </div>

            <span>MATCH</span>

          </div>

        </div>

        <div className="facility-stats">

          <div className="facility-stat">
            <span>Distance</span>
            <strong>
              {recommended.distance}
            </strong>
          </div>

          <div className="facility-stat">
            <span>ETA</span>
            <strong>
              {recommended.eta} min
            </strong>
          </div>

          <div className="facility-stat">
            <span>Emergency Beds</span>
            <strong>
              {recommended.beds}
            </strong>
          </div>

          <div className="facility-stat">
            <span>Status</span>
            <strong>
              {recommended.status}
            </strong>
          </div>

        </div>

        <div className="capability-list">

          <Capability
            enabled={recommended.icu}
            text="ICU capability"
          />

          <Capability
            enabled={recommended.emergency}
            text="Emergency department"
          />

          <Capability
            enabled={recommended.specialist}
            text="Specialist available"
          />

          <Capability
            enabled={recommended.ct}
            text="CT available"
          />

        </div>

        <div className="facility-reasons">

          <div className="section-label">
            WHY THIS FACILITY?
          </div>

          {recommended.reasons.map(
            (reason, index) => (
              <div
                className="reason-row"
                key={index}
              >
                <span>✓</span>
                {reason}
              </div>
            )
          )}

        </div>

        <div className="facility-actions">

          <button
            className="primary-button"
            onClick={() =>
              setSelectedFacility(
                recommended
              )
            }
          >
            {selectedFacility?.id ===
            recommended.id
              ? "✓ Facility Selected"
              : "Select Facility"}
          </button>

          <button
            className="secondary-button"
            onClick={onBackToAssessment}
          >
            ← Back to Assessment
          </button>

        </div>

        {selectedFacility?.id ===
          recommended.id && (
          <div className="selected-message">
            ✓ {recommended.name} selected
            for emergency coordination.
          </div>
        )}

      </section>

      <section className="panel">

        <div className="panel-header">

          <div>

            <div className="section-label">
              MATCHING ALGORITHM
            </div>

            <h3>
              Transparent multi-factor ranking
            </h3>

          </div>

        </div>

        <div className="matching-factors">

          <MatchFactor
            title="Clinical Capability"
            value="30%"
          />

          <MatchFactor
            title="Emergency / ICU"
            value="25%"
          />

          <MatchFactor
            title="Estimated ETA"
            value="20%"
          />

          <MatchFactor
            title="Specialist"
            value="15%"
          />

          <MatchFactor
            title="Diagnostics"
            value="10%"
          />

        </div>

        <p className="muted">
          Displayed match percentage is a
          prototype ranking score based on
          simulated facility attributes.
        </p>

      </section>

      <section className="panel">

        <div className="panel-header">

          <div>

            <div className="section-label">
              ALTERNATIVE OPTIONS
            </div>

            <h3>
              Other Suitable Facilities
            </h3>

          </div>

        </div>

        <div className="alternative-list">

          {rankedFacilities
            .slice(1)
            .map((facility) => (
              <FacilityCard
                key={facility.id}
                facility={facility}
                selected={
                  selectedFacility?.id ===
                  facility.id
                }
                onSelect={() =>
                  setSelectedFacility(
                    facility
                  )
                }
              />
            ))}

        </div>

      </section>

      {selectedFacility && (
        <section className="panel confirmed-panel">

          <div>

            <div className="section-label">
              FACILITY CONFIRMED
            </div>

            <h3>
              {selectedFacility.name}
            </h3>

            <p className="muted">
              Ready for emergency response
              simulation.
            </p>

          </div>

          <button
            className="primary-button"
            onClick={onOpenEmergency}
          >
            Continue to Emergency Response →
          </button>

        </section>
      )}

    </div>
  );
}

/* =========================================================
   CAPABILITY
========================================================= */

function Capability({
  enabled,
  text,
}) {
  return (
    <div
      className={
        enabled
          ? "capability enabled"
          : "capability disabled"
      }
    >
      {enabled ? "✓" : "—"} {text}
    </div>
  );
}

/* =========================================================
   MATCH FACTOR
========================================================= */

function MatchFactor({
  title,
  value,
}) {
  return (
    <div className="match-factor">

      <span>{title}</span>

      <strong>{value}</strong>

    </div>
  );
}

/* =========================================================
   FACILITY CARD
========================================================= */

function FacilityCard({
  facility,
  selected,
  onSelect,
}) {
  return (
    <div
      className={`facility-card ${
        selected ? "selected" : ""
      }`}
    >

      <div className="facility-card-header">

        <div>

          <strong>
            {facility.name}
          </strong>

          <span>
            {facility.type}
          </span>

        </div>

        <div className="facility-card-match">

          <strong>
            {facility.match}%
          </strong>

          <span>MATCH</span>

        </div>

      </div>

      <div className="facility-card-info">

        <span>
          📍 {facility.distance}
        </span>

        <span>
          ⏱ ETA {facility.eta} min
        </span>

        <span>
          🛏 {facility.beds} beds
        </span>

        <span>
          ● {facility.status}
        </span>

      </div>

      <div className="facility-tags">

        {facility.icu && (
          <span className="mini-tag">
            ICU
          </span>
        )}

        {facility.specialist && (
          <span className="mini-tag">
            Specialist
          </span>
        )}

        {facility.ct && (
          <span className="mini-tag">
            CT
          </span>
        )}

      </div>

      <button
        className="secondary-button"
        onClick={onSelect}
      >
        {selected
          ? "✓ Selected"
          : "Select Facility"}
      </button>

    </div>
  );
}

/* =========================================================
   EMERGENCY RESPONSE
========================================================= */

function Emergency({
  assessmentData,
  selectedFacility,
  onOpenPatientRecord,
}) {
  const [status, setStatus] =
    useState("Awaiting Dispatch");

  const patient =
    assessmentData?.form || defaultForm;

  const result =
    assessmentData?.result || {
      risk_level: "HIGH",
      hybrid_probability: 99.9,
    };

  const facility =
    selectedFacility || facilities[0];

  const dispatch = () => {
    setStatus("Requested");

    setTimeout(() => {
      setStatus("Dispatched");

      setTimeout(() => {
        setStatus("En Route");

        setTimeout(() => {
          setStatus("Arrived");
        }, 4000);

      }, 3000);

    }, 1500);
  };

  const activeStep =
    status === "Awaiting Dispatch"
      ? 0
      : status === "Requested"
      ? 1
      : status === "Dispatched"
      ? 2
      : status === "En Route"
      ? 3
      : 4;

  return (
    <div className="emergency-page">

      <section className="panel emergency-header-panel">

        <div>

          <div className="section-label">
            EMERGENCY COORDINATION
          </div>

          <h2>
            Emergency Response
          </h2>

          <p className="muted">
            Coordinate the simulated emergency
            response for the assessed patient.
          </p>

        </div>

        <div className="demo-badge">
          SIMULATION MODE
        </div>

      </section>

      <div className="emergency-grid">

        <section className="panel emergency-alert">

          <div className="emergency-alert-icon">
            !
          </div>

          <div className="section-label">
            EMERGENCY ALERT
          </div>

          <h2>
            {result.risk_level} RISK
          </h2>

          <p className="muted">
            Immediate clinical assessment and
            emergency coordination recommended.
          </p>

          <div className="emergency-patient-summary">

            <div>
              <span>Age</span>
              <strong>
                {patient.age}
              </strong>
            </div>

            <div>
              <span>SpO₂</span>
              <strong>
                {patient.spo2}%
              </strong>
            </div>

            <div>
              <span>Heart Rate</span>
              <strong>
                {patient.heartRate}
              </strong>
            </div>

            <div>
              <span>Glucose</span>
              <strong>
                {patient.glucose}
              </strong>
            </div>

          </div>

        </section>

        <section className="panel">

          <div className="section-label">
            DESTINATION FACILITY
          </div>

          <h2>
            {facility.name}
          </h2>

          <p className="muted">
            {facility.type}
          </p>

          <div className="emergency-facility-info">

            <div>
              <span>Distance</span>
              <strong>
                {facility.distance}
              </strong>
            </div>

            <div>
              <span>Estimated ETA</span>
              <strong>
                {facility.eta} min
              </strong>
            </div>

            <div>
              <span>Emergency Beds</span>
              <strong>
                {facility.beds}
              </strong>
            </div>

            <div>
              <span>Facility Status</span>
              <strong>
                {facility.status}
              </strong>
            </div>

          </div>

        </section>

      </div>

      <section className="panel dispatch-panel">

        <div className="panel-header">

          <div>

            <div className="section-label">
              AMBULANCE COORDINATION
            </div>

            <h3>
              Dispatch Status
            </h3>

          </div>

          <div
            className={`dispatch-status ${
              status === "Arrived"
                ? "completed"
                : ""
            }`}
          >
            {status}
          </div>

        </div>

        <div className="dispatch-timeline">

          <TimelineStep
            number="01"
            title="Request Received"
            text="Emergency request created."
            active={activeStep >= 0}
          />

          <TimelineStep
            number="02"
            title="Dispatch Requested"
            text="Ambulance request submitted."
            active={activeStep >= 1}
          />

          <TimelineStep
            number="03"
            title="Ambulance Dispatched"
            text="Emergency vehicle assigned."
            active={activeStep >= 2}
          />

          <TimelineStep
            number="04"
            title="En Route"
            text={`Estimated arrival in ${facility.eta} minutes.`}
            active={activeStep >= 3}
          />

          <TimelineStep
            number="05"
            title="Arrived"
            text="Patient handover ready."
            active={activeStep >= 4}
          />

        </div>

        <div className="dispatch-actions">

          {status === "Awaiting Dispatch" ? (
            <button
              className="primary-button"
              onClick={dispatch}
            >
              🚑 Dispatch Ambulance →
            </button>
          ) : status === "Arrived" ? (
            <button
              className="primary-button"
              onClick={onOpenPatientRecord}
            >
              Open Patient Record →
            </button>
          ) : (
            <div className="dispatch-running">
              Emergency response simulation in
              progress...
            </div>
          )}

        </div>

      </section>

      <section className="panel coordination-summary">

        <div className="section-label">
          EMERGENCY COORDINATION SUMMARY
        </div>

        <div className="coordination-grid">

          <div>
            <span>Patient Risk</span>
            <strong>
              {result.risk_level}
            </strong>
          </div>

          <div>
            <span>Selected Facility</span>
            <strong>
              {facility.name}
            </strong>
          </div>

          <div>
            <span>Ambulance Status</span>
            <strong>
              {status}
            </strong>
          </div>

          <div>
            <span>Mode</span>
            <strong>
              Demonstration
            </strong>
          </div>

        </div>

        <p className="prototype-note">
          This emergency workflow is a simulated
          demonstration. It does not connect to
          real ambulance services or emergency
          dispatch systems.
        </p>

      </section>

    </div>
  );
}

/* =========================================================
   TIMELINE STEP
========================================================= */

function TimelineStep({
  number,
  title,
  text,
  active,
}) {
  return (
    <div
      className={`timeline-step ${
        active ? "active" : ""
      }`}
    >

      <div className="timeline-number">
        {active ? "✓" : number}
      </div>

      <div>

        <strong>{title}</strong>

        <span>{text}</span>

      </div>

    </div>
  );
}

/* =========================================================
   PATIENT HISTORY / RECORD
========================================================= */

function PatientHistory({
  assessmentData,
  selectedFacility,
  onNewAssessment,
}) {
  const patient =
    assessmentData?.form || defaultForm;

  const result =
    assessmentData?.result || {
      risk_level: "HIGH",
      hybrid_probability: 99.9,
      localScore: 12,
      indicators: [
        "Very high blood glucose",
        "High blood pressure",
        "Elevated heart rate",
        "Low oxygen saturation",
      ],
      action:
        "Immediate clinical assessment recommended.",
    };

  const symptoms = [
    ["confusion", "Confusion"],
    ["thirst", "Excessive thirst"],
    ["sweating", "Sweating"],
    ["chestPain", "Chest pain"],
    [
      "breathingDifficulty",
      "Breathing difficulty",
    ],
    ["weakness", "Weakness"],
  ];

  return (
    <div className="history-page">

      <section className="panel">

        <div className="panel-header">

          <div>

            <div className="section-label">
              PATIENT RECORD
            </div>

            <h2>
              Patient Clinical Record
            </h2>

            <p className="muted">
              Consolidated demonstration record
              generated from the current assessment.
            </p>

          </div>

          <div className="demo-badge">
            DEMO RECORD
          </div>

        </div>

        <div className="record-header">

          <div className="patient-avatar">
            P
          </div>

          <div>

            <h3>
              Demo Patient
            </h3>

            <p className="muted">
              Patient ID: JN-DEMO-001
            </p>

          </div>

          <div className="record-risk">

            <span>Current Risk</span>

            <strong>
              {result.risk_level}
            </strong>

          </div>

        </div>

      </section>

      <div className="history-grid">

        <section className="panel">

          <div className="section-label">
            PATIENT INFORMATION
          </div>

          <h3>
            Demographics
          </h3>

          <div className="record-details">

            <RecordItem
              label="Age"
              value={`${patient.age} years`}
            />

            <RecordItem
              label="Gender"
              value={patient.gender}
            />

            <RecordItem
              label="Patient ID"
              value="JN-DEMO-001"
            />

            <RecordItem
              label="Assessment"
              value={
                assessmentData?.assessedAt ||
                "Demo session"
              }
            />

          </div>

        </section>

        <section className="panel">

          <div className="section-label">
            VITAL SIGNS
          </div>

          <h3>
            Latest Assessment
          </h3>

          <div className="record-details">

            <RecordItem
              label="Blood Pressure"
              value={`${patient.systolic}/${patient.diastolic} mmHg`}
            />

            <RecordItem
              label="Heart Rate"
              value={`${patient.heartRate} bpm`}
            />

            <RecordItem
              label="SpO₂"
              value={`${patient.spo2}%`}
            />

            <RecordItem
              label="Temperature"
              value={`${patient.temperature} °C`}
            />

            <RecordItem
              label="Blood Glucose"
              value={`${patient.glucose} mg/dL`}
            />

          </div>

        </section>

      </div>

      <section className="panel">

        <div className="section-label">
          REPORTED SYMPTOMS
        </div>

        <h3>
          Clinical Observations
        </h3>

        <div className="record-symptoms">

          {symptoms.map(
            ([key, label]) => (
              <div
                className={
                  patient[key]
                    ? "record-symptom active"
                    : "record-symptom"
                }
                key={key}
              >
                <span>
                  {patient[key] ? "✓" : "—"}
                </span>

                {label}
              </div>
            )
          )}

        </div>

      </section>

      <section className="panel">

        <div className="section-label">
          TRIAGE SUMMARY
        </div>

        <div className="history-risk">

          <div>

            <span>Risk Level</span>

            <strong>
              {result.risk_level}
            </strong>

          </div>

          <div>

            <span>
              Prototype Score
            </span>

            <strong>
              {result.localScore ??
                result.prototype_rule_score ??
                "—"}
              /15
            </strong>

          </div>

          <div>

            <span>
              Hybrid Probability
            </span>

            <strong>
              {result.hybrid_probability ??
                "—"}%
            </strong>

          </div>

        </div>

        <div className="record-action">

          <span>
            RECOMMENDED ACTION
          </span>

          <strong>
            {result.action}
          </strong>

        </div>

      </section>

      <section className="panel">

        <div className="section-label">
          CARE COORDINATION
        </div>

        <h3>
          Facility & Emergency Record
        </h3>

        <div className="coordination-grid">

          <div>
            <span>
              Selected Facility
            </span>

            <strong>
              {selectedFacility
                ? selectedFacility.name
                : "Not selected"}
            </strong>
          </div>

          <div>
            <span>
              Facility ETA
            </span>

            <strong>
              {selectedFacility
                ? `${selectedFacility.eta} min`
                : "—"}
            </strong>
          </div>

          <div>
            <span>
              Facility Status
            </span>

            <strong>
              {selectedFacility
                ? selectedFacility.status
                : "—"}
            </strong>
          </div>

          <div>
            <span>
              Record Status
            </span>

            <strong>
              Active Demo Record
            </strong>
          </div>

        </div>

      </section>

      <section className="panel record-actions">

        <div>

          <div className="section-label">
            NEXT ACTION
          </div>

          <h3>
            Continue patient care workflow
          </h3>

          <p className="muted">
            Start another assessment to
            demonstrate the workflow again.
          </p>

        </div>

        <button
          className="primary-button"
          onClick={onNewAssessment}
        >
          New Patient Assessment →
        </button>

      </section>

      <div className="prototype-note">
        DEMONSTRATION ONLY — Patient information
        shown here is simulated data for the
        SIH prototype and is not a real medical
        record.
      </div>

    </div>
  );
}

/* =========================================================
   RECORD ITEM
========================================================= */

function RecordItem({
  label,
  value,
}) {
  return (
    <div className="record-item">

      <span>{label}</span>

      <strong>{value}</strong>

    </div>
  );
}

/* =========================================================
   ROOT
========================================================= */

createRoot(
  document.getElementById("root")
).render(
  <App />
);