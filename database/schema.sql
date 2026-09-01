-- Machine Learning-Based Student Performance Monitoring System (ML-SPMS)
-- Department of Computer Science, University of Calabar
-- Database Schema (Section 3.5 - 3NF Compliant)

CREATE DATABASE IF NOT EXISTS ml_spms_unical;
USE ml_spms_unical;

-- 1. Users Table (Lecturers, Administrators, and Students)
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('lecturer', 'administrator', 'student') NOT NULL,
    department VARCHAR(100) NOT NULL DEFAULT 'Computer Science',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Students Table
CREATE TABLE IF NOT EXISTS students (
    student_id INT AUTO_INCREMENT PRIMARY KEY,
    matric_no VARCHAR(30) NOT NULL UNIQUE,
    full_name VARCHAR(120) NOT NULL,
    level INT NOT NULL DEFAULT 300,
    supervisor_id INT NOT NULL,
    user_id INT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_students_supervisor FOREIGN KEY (supervisor_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Courses Table
CREATE TABLE IF NOT EXISTS courses (
    course_code VARCHAR(16) PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    lecturer_id INT NOT NULL,
    ca_weight DECIMAL(4, 2) NOT NULL DEFAULT 0.30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_courses_lecturer FOREIGN KEY (lecturer_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Assessment Records Table
CREATE TABLE IF NOT EXISTS assessment_records (
    record_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    course_code VARCHAR(16) NOT NULL,
    assessment_type ENUM('test', 'assignment', 'examination') NOT NULL,
    score DECIMAL(5, 2) NOT NULL,
    date_recorded DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_assessment_student FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    CONSTRAINT fk_assessment_course FOREIGN KEY (course_code) REFERENCES courses(course_code) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Attendance Records Table
CREATE TABLE IF NOT EXISTS attendance_records (
    record_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    course_code VARCHAR(16) NOT NULL,
    session_date DATE NOT NULL,
    status ENUM('present', 'absent') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_attendance_student FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    CONSTRAINT fk_attendance_course FOREIGN KEY (course_code) REFERENCES courses(course_code) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Feature Vectors Table
CREATE TABLE IF NOT EXISTS feature_vectors (
    vector_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    avg_ca_score DECIMAL(5, 2) NOT NULL,
    attendance_rate DECIMAL(5, 2) NOT NULL,
    submission_rate DECIMAL(5, 2) NOT NULL,
    computed_at DATETIME NOT NULL,
    CONSTRAINT fk_feature_student FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Prediction Models Table
CREATE TABLE IF NOT EXISTS prediction_models (
    model_id INT AUTO_INCREMENT PRIMARY KEY,
    model_type ENUM('decision_tree', 'random_forest', 'logistic_regression') NOT NULL,
    version VARCHAR(32) NOT NULL,
    accuracy DECIMAL(5, 2) NULL,
    metrics_json TEXT NULL,
    model_data LONGTEXT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    trained_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Prediction Results Table
CREATE TABLE IF NOT EXISTS prediction_results (
    result_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    model_id INT NOT NULL,
    risk_level ENUM('low', 'moderate', 'high') NOT NULL,
    confidence DECIMAL(5, 2) NOT NULL,
    feature_contributions TEXT NOT NULL,
    generated_at DATETIME NOT NULL,
    CONSTRAINT fk_prediction_student FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    CONSTRAINT fk_prediction_model FOREIGN KEY (model_id) REFERENCES prediction_models(model_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Alert Notifications Table
CREATE TABLE IF NOT EXISTS alert_notifications (
    alert_id INT AUTO_INCREMENT PRIMARY KEY,
    result_id INT NOT NULL,
    student_id INT NOT NULL,
    supervisor_id INT NOT NULL,
    message TEXT NOT NULL,
    status ENUM('sent', 'acknowledged') DEFAULT 'sent',
    timestamp DATETIME NOT NULL,
    CONSTRAINT fk_alert_result FOREIGN KEY (result_id) REFERENCES prediction_results(result_id) ON DELETE CASCADE,
    CONSTRAINT fk_alert_student FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    CONSTRAINT fk_alert_supervisor FOREIGN KEY (supervisor_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Indices for rapid query performance
CREATE INDEX idx_assessment_student ON assessment_records(student_id);
CREATE INDEX idx_attendance_student ON attendance_records(student_id);
CREATE INDEX idx_feature_student ON feature_vectors(student_id);
CREATE INDEX idx_prediction_student ON prediction_results(student_id);
CREATE INDEX idx_alert_student ON alert_notifications(student_id);
CREATE INDEX idx_alert_supervisor ON alert_notifications(supervisor_id);
