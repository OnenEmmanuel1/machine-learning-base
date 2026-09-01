# Machine Learning-Based Student Performance Monitoring System (ML-SPMS)
### Department of Computer Science, University of Calabar
An intelligent web application that monitors student performance, predicts risk levels using JavaScript machine learning models, and provides actionable insights for educators.
---

## 📌 Stack Override Notice

> **IMPORTANT ARCHITECTURAL NOTICE:**
> Section 3.4 of the source document specified Python (Flask) for the application layer and Python (scikit-learn) for the ML layer. **This has been overridden**:
> - **Application Layer:** **Node.js + Express** (zero Python dependencies).
> - **Machine Learning Layer:** **Genuine JavaScript ML libraries** (`ml-cart`, `ml-random-forest`, `ml-logistic-regression`) executing real offline gradient/tree training, cross-validation metrics, confusion matrix computation, and real-time live inference with mathematical feature contributions.
> - **Database:** **MySQL 8** via `mysql2` with 100% parameterized queries.
> - **Templating:** **EJS** with modular partials.
> - **Styling:** **Flat CSS (zero gradients)**, **Inter typography**, and custom **`mlspms-`** prefixed class names.
> - **Infra:** **Docker Compose** (`app` + `MySQL 8` + automated seed/migration).

---

## 🚀 Quick Start with Docker Compose

To launch the full system (Node.js web application + MySQL database + auto-migrations & seeded models):

```bash
docker compose up --build
```

The application will be accessible at: **`http://localhost:3000`**

---

## 💻 Local Setup (Without Docker)

### 1. Prerequisites
- Node.js >= 18.0.0
- MySQL Server >= 8.0 running locally

### 2. Configure Environment
Copy `.env.example` to `.env` and adjust database credentials if needed:
```env
PORT=3000
NODE_ENV=development
SESSION_SECRET=unical_cs_ml_spms_super_secret_key_2026

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=ml_spms_unical

ENABLE_EMAIL_DISPATCH=false
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Seed Database & Train ML Models
```bash
npm run seed
```

### 5. Start Application
```bash
# Production start
npm start

# Development mode (with live reload)
npm run dev
```

### 6. Run Automated Test Suite
```bash
npm run test:pipeline
```

---

## 🔐 Seeded Accounts & Credentials

| Role | Name | Email / Matric No | Password | Scope & Privileges |
| :--- | :--- | :--- | :--- | :--- |
| **Administrator** | Prof. O. Etebong (HOD CS) | `admin@unical-cs.edu.ng` | `password123` | Full administrative control, user creation, ML model review/retraining/switching |
| **Lecturer** | Dr. A. Bassey | `lecturer@unical-cs.edu.ng` | `password123` | Continuous assessment score entry, session attendance tracking, cohort analytics, report exports |
| **Lecturer** | Dr. E. Okon | `dr.okon@unical-cs.edu.ng` | `password123` | Score & attendance entry, student deep-dive analysis |
| **Student (High Risk)** | Kufre Ekpenyong | `CSC/2021/041` / `kufre@student.unical.edu.ng` | `password123` | High Risk (low attendance & CA score), alerts dispatched |
| **Student (Moderate Risk)** | Blessing Asuquo | `CSC/2021/018` / `blessing@student.unical.edu.ng` | `password123` | Moderate Risk (borderline submissions & tests) |
| **Student (Low Risk / Safe)** | Emeka Nnamdi | `CSC/2021/005` / `emeka@student.unical.edu.ng` | `password123` | Low Risk (consistent high scores & attendance) |

---

## 🧠 Machine Learning Engine Architecture

The ML layer is built natively in JavaScript using the `mljs` ecosystem:

1. **CART Decision Tree (`ml-cart`):**
   - Implements Gini impurity decision tree classification (`DecisionTreeClassifier`).
   - Evaluates multi-level decision boundaries on continuous assessment scores, attendance rates, and assignment completion.

2. **Random Forest Ensemble (`ml-random-forest`):**
   - Ensemble of bootstrap-aggregated decision trees (`RandomForestClassifier`).
   - Derives prediction confidence from tree ensemble votes.

3. **Multinomial Logistic Regression (`ml-logistic-regression`):**
   - Real iterative gradient-descent trained One-vs-Rest linear classifiers.
   - Computes softmax probability distributions across Low, Moderate, and High risk classes.

4. **Explainability Engine (NFR5):**
   - Computes mathematical risk attribution against UNICAL Computer Science curriculum benchmarks (CA: 50%, Attendance: 75%, Submissions: 70%).
   - Produces serialized feature-level contributions and natural language advisory text stored in `prediction_results.feature_contributions`.

---

## 🔄 Core Automated Pipeline (Section 3.2.3 Activity Diagram)

1. Lecturer enters or updates an assessment score or attendance record.
2. System stores the record in `assessment_records` or `attendance_records`.
3. System recomputes that student's `feature_vector` (`avg_ca_score` weighted by course `ca_weight`, `attendance_rate`, `submission_rate`).
4. The Prediction Engine applies the currently active model (`is_active = TRUE` in `prediction_models`).
5. System generates a `prediction_result` (Risk Level, Confidence %, Feature Contributions).
6. If `risk_level >= 'moderate'`, system generates an `alert_notification` and dispatches in-app and email notices to student and academic supervisor.
7. Dashboards (Cohort & Individual) update in real-time.

---

## 🗄️ Database Schema (3NF Compliant)

- `users`: User accounts with bcrypt password hashes and roles (`lecturer`, `administrator`, `student`).
- `students`: Matric numbers, student names, levels, and foreign keys to supervisor and user accounts.
- `courses`: Course codes, titles, lecturer assignments, and `ca_weight`.
- `assessment_records`: Course assessment records (`test`, `assignment`, `examination`), scores, and dates.
- `attendance_records`: Session dates and statuses (`present`, `absent`).
- `feature_vectors`: Computed metrics (`avg_ca_score`, `attendance_rate`, `submission_rate`, `computed_at`).
- `prediction_models`: Model type (`decision_tree`, `random_forest`, `logistic_regression`), version, accuracy, serialized `model_data`, and `is_active` flag.
- `prediction_results`: Linked to student & model, risk level (`low`, `moderate`, `high`), confidence %, and serialized feature contributions.
- `alert_notifications`: Risk escalation notices sent to student & supervisor with acknowledgement status.

---

## 📜 License
Developed for the Department of Computer Science, University of Calabar.
