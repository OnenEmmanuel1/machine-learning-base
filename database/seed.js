const bcrypt = require('bcryptjs');
const { initDatabase, query, queryOne } = require('../src/config/database');
const { trainAllModels } = require('../src/ml/trainer');
const { processStudentPerformanceUpdate } = require('../src/services/predictionEngine');

async function seedDatabase() {
  console.log('=== STARTING ML-SPMS DATABASE SEEDING ===');

  try {
    // 1. Ensure DB schema exists
    await initDatabase();

    // Clear old data cleanly respecting FK constraints
    console.log('[SEED] Cleaning existing tables...');
    await query('SET FOREIGN_KEY_CHECKS = 0;');
    await query('TRUNCATE TABLE alert_notifications;');
    await query('TRUNCATE TABLE prediction_results;');
    await query('TRUNCATE TABLE feature_vectors;');
    await query('TRUNCATE TABLE attendance_records;');
    await query('TRUNCATE TABLE assessment_records;');
    await query('TRUNCATE TABLE courses;');
    await query('TRUNCATE TABLE students;');
    await query('TRUNCATE TABLE users;');
    await query('TRUNCATE TABLE prediction_models;');
    await query('SET FOREIGN_KEY_CHECKS = 1;');

    console.log('[SEED] Inserting Users...');
    const commonPasswordHash = await bcrypt.hash('password123', 10);
    const defaultPasswordHash = commonPasswordHash;
    const lecturerPasswordHash = commonPasswordHash;
    const studentPasswordHash = commonPasswordHash;

    // 2. Insert Users
    console.log('[SEED] Inserting Users...');
    const usersData = [
      // Admins & Lecturers
      ['Prof. O. Etebong (HOD CS)', 'admin@unical-cs.edu.ng', defaultPasswordHash, 'administrator', 'Computer Science'],
      ['Dr. A. Bassey', 'lecturer@unical-cs.edu.ng', lecturerPasswordHash, 'lecturer', 'Computer Science'],
      ['Dr. E. Okon', 'dr.okon@unical-cs.edu.ng', lecturerPasswordHash, 'lecturer', 'Computer Science'],
      ['Dr. Mrs. N. Archibong', 'n.archibong@unical-cs.edu.ng', lecturerPasswordHash, 'lecturer', 'Computer Science'],
      
      // Student User Logins
      ['Kufre Ekpenyong', 'kufre@student.unical.edu.ng', studentPasswordHash, 'student', 'Computer Science'],
      ['Blessing Asuquo', 'blessing@student.unical.edu.ng', studentPasswordHash, 'student', 'Computer Science'],
      ['Emeka Nnamdi', 'emeka@student.unical.edu.ng', studentPasswordHash, 'student', 'Computer Science'],
      ['Amina Yusuf', 'amina@student.unical.edu.ng', studentPasswordHash, 'student', 'Computer Science'],
      ['Chinedu Okafor', 'chinedu@student.unical.edu.ng', studentPasswordHash, 'student', 'Computer Science'],
      ['Ifeoma Eze', 'ifeoma@student.unical.edu.ng', studentPasswordHash, 'student', 'Computer Science'],
      ['Tunde Bakare', 'tunde@student.unical.edu.ng', studentPasswordHash, 'student', 'Computer Science'],
      ['Victoria Effiom', 'victoria@student.unical.edu.ng', studentPasswordHash, 'student', 'Computer Science'],
      ['David Henshaw', 'david@student.unical.edu.ng', studentPasswordHash, 'student', 'Computer Science'],
      ['Precious Udoh', 'precious@student.unical.edu.ng', studentPasswordHash, 'student', 'Computer Science'],
      ['Samuel Okoro', 'samuel@student.unical.edu.ng', studentPasswordHash, 'student', 'Computer Science'],
      ['Joy Akpan', 'joy@student.unical.edu.ng', studentPasswordHash, 'student', 'Computer Science']
    ];

    const userIdMap = {};
    for (const u of usersData) {
      const res = await query(
        'INSERT INTO users (full_name, email, password_hash, role, department) VALUES (?, ?, ?, ?, ?)',
        u
      );
      userIdMap[u[1]] = res.insertId;
    }

    const adminId = userIdMap['admin@unical-cs.edu.ng'];
    const lecturer1Id = userIdMap['lecturer@unical-cs.edu.ng'];
    const lecturer2Id = userIdMap['dr.okon@unical-cs.edu.ng'];
    const lecturer3Id = userIdMap['n.archibong@unical-cs.edu.ng'];

    // 3. Insert Courses
    console.log('[SEED] Inserting Courses...');
    const coursesData = [
      ['CSC 311', 'Algorithms & Complexity Analysis', lecturer1Id, 0.30],
      ['CSC 321', 'Database Systems & Data Modeling', lecturer2Id, 0.30],
      ['CSC 331', 'Software Engineering Principles', lecturer1Id, 0.40],
      ['CSC 411', 'Artificial Intelligence & Machine Learning', adminId, 0.30],
      ['CSC 421', 'Operating Systems & Distributed Architecture', lecturer2Id, 0.30]
    ];

    for (const c of coursesData) {
      await query(
        'INSERT INTO courses (course_code, title, lecturer_id, ca_weight) VALUES (?, ?, ?, ?)',
        c
      );
    }

    // 4. Insert Students
    console.log('[SEED] Inserting Students...');
    const studentsData = [
      // [matric_no, full_name, level, supervisor_id, user_email, risk_archetype]
      ['CSC/2021/041', 'Kufre Ekpenyong', 300, lecturer1Id, 'kufre@student.unical.edu.ng', 'high'],
      ['CSC/2021/018', 'Blessing Asuquo', 300, lecturer1Id, 'blessing@student.unical.edu.ng', 'moderate'],
      ['CSC/2021/005', 'Emeka Nnamdi', 300, lecturer2Id, 'emeka@student.unical.edu.ng', 'low'],
      ['CSC/2021/012', 'Amina Yusuf', 300, lecturer2Id, 'amina@student.unical.edu.ng', 'low'],
      ['CSC/2021/033', 'Chinedu Okafor', 300, lecturer1Id, 'chinedu@student.unical.edu.ng', 'high'],
      ['CSC/2021/027', 'Ifeoma Eze', 300, lecturer3Id, 'ifeoma@student.unical.edu.ng', 'moderate'],
      ['CSC/2021/049', 'Tunde Bakare', 300, lecturer3Id, 'tunde@student.unical.edu.ng', 'low'],
      ['CSC/2021/015', 'Victoria Effiom', 300, lecturer1Id, 'victoria@student.unical.edu.ng', 'moderate'],
      ['CSC/2021/052', 'David Henshaw', 300, lecturer2Id, 'david@student.unical.edu.ng', 'high'],
      ['CSC/2021/009', 'Precious Udoh', 300, lecturer3Id, 'precious@student.unical.edu.ng', 'low'],
      ['CSC/2021/038', 'Samuel Okoro', 300, lecturer1Id, 'samuel@student.unical.edu.ng', 'low'],
      ['CSC/2021/022', 'Joy Akpan', 300, lecturer2Id, 'joy@student.unical.edu.ng', 'moderate']
    ];

    const studentIds = [];

    for (const s of studentsData) {
      const studentUserId = userIdMap[s[4]];
      const res = await query(
        'INSERT INTO students (matric_no, full_name, level, supervisor_id, user_id) VALUES (?, ?, ?, ?, ?)',
        [s[0], s[1], s[2], s[3], studentUserId]
      );
      studentIds.push({
        id: res.insertId,
        matric: s[0],
        name: s[1],
        archetype: s[5]
      });
    }

    // 5. Train all 3 Machine Learning Models
    console.log('[SEED] Training Real Machine Learning Models (CART Decision Tree, Random Forest, Logistic Regression)...');
    await trainAllModels({ sampleCount: 1200, activeModel: 'random_forest', version: 'v1.0.0' });

    // 6. Generate Assessment & Attendance Records matching Archetypes
    console.log('[SEED] Populating Assessment & Attendance History...');
    const enrolledCourses = ['CSC 311', 'CSC 321', 'CSC 331'];
    const sessionDates = [
      '2026-02-02', '2026-02-09', '2026-02-16', '2026-02-23',
      '2026-03-02', '2026-03-09', '2026-03-16', '2026-03-23'
    ];

    for (const student of studentIds) {
      for (const courseCode of enrolledCourses) {
        // Attendance sessions
        for (const sDate of sessionDates) {
          let isPresent = true;
          if (student.archetype === 'high') {
            isPresent = Math.random() < 0.38; // ~38% attendance
          } else if (student.archetype === 'moderate') {
            isPresent = Math.random() < 0.65; // ~65% attendance
          } else {
            isPresent = Math.random() < 0.94; // ~94% attendance
          }

          await query(
            'INSERT INTO attendance_records (student_id, course_code, session_date, status) VALUES (?, ?, ?, ?)',
            [student.id, courseCode, sDate, isPresent ? 'present' : 'absent']
          );
        }

        // Assessments: 2 Tests, 2 Assignments
        let test1Score, test2Score, assign1Score, assign2Score;

        if (student.archetype === 'high') {
          test1Score = Math.floor(Math.random() * 8) + 3; // 3-11 out of 30
          test2Score = Math.floor(Math.random() * 7) + 2; // 2-9
          assign1Score = Math.random() < 0.4 ? Math.floor(Math.random() * 8) + 5 : 0; // 0 (unsubmitted) or 5-12
          assign2Score = 0; // missed assignment
        } else if (student.archetype === 'moderate') {
          test1Score = Math.floor(Math.random() * 8) + 12; // 12-20 out of 30
          test2Score = Math.floor(Math.random() * 7) + 13; // 13-20
          assign1Score = Math.floor(Math.random() * 6) + 12; // 12-18
          assign2Score = Math.random() < 0.6 ? Math.floor(Math.random() * 6) + 11 : 0;
        } else {
          test1Score = Math.floor(Math.random() * 7) + 23; // 23-30 out of 30
          test2Score = Math.floor(Math.random() * 6) + 24; // 24-30
          assign1Score = Math.floor(Math.random() * 4) + 16; // 16-20
          assign2Score = Math.floor(Math.random() * 4) + 17; // 17-20
        }

        await query(
          'INSERT INTO assessment_records (student_id, course_code, assessment_type, score, date_recorded) VALUES (?, ?, ?, ?, ?)',
          [student.id, courseCode, 'test', test1Score, '2026-02-20']
        );
        await query(
          'INSERT INTO assessment_records (student_id, course_code, assessment_type, score, date_recorded) VALUES (?, ?, ?, ?, ?)',
          [student.id, courseCode, 'test', test2Score, '2026-03-20']
        );
        await query(
          'INSERT INTO assessment_records (student_id, course_code, assessment_type, score, date_recorded) VALUES (?, ?, ?, ?, ?)',
          [student.id, courseCode, 'assignment', assign1Score, '2026-02-15']
        );
        await query(
          'INSERT INTO assessment_records (student_id, course_code, assessment_type, score, date_recorded) VALUES (?, ?, ?, ?, ?)',
          [student.id, courseCode, 'assignment', assign2Score, '2026-03-15']
        );
      }

      // 7. Execute full automated Prediction Pipeline for each seeded student
      await processStudentPerformanceUpdate(student.id);
    }

    console.log('=== DATABASE SEEDING COMPLETED SUCCESSFULLY ===');
    console.log('Accounts Seeded (All passwords set to password123):');
    console.log('  1. Administrator: admin@unical-cs.edu.ng / password123');
    console.log('  2. Lecturer: lecturer@unical-cs.edu.ng / password123');
    console.log('  3. Lecturer: dr.okon@unical-cs.edu.ng / password123');
    console.log('  4. Student (High Risk): kufre@student.unical.edu.ng (CSC/2021/041) / password123');
    console.log('  5. Student (Moderate Risk): blessing@student.unical.edu.ng (CSC/2021/018) / password123');
    console.log('  6. Student (Low Risk): emeka@student.unical.edu.ng (CSC/2021/005) / password123');
    return true;
  } catch (err) {
    console.error('[SEED FATAL ERROR]:', err);
    throw err;
  }
}

if (require.main === module) {
  seedDatabase().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { seedDatabase };
