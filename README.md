# Smart Academic Locker & Intelligent Student Management System
**An AI-Powered IoT & Machine Learning Ecosystem for Institutional Academic Management, Bag Weight Optimization, and Forgetting Prevention**

---

## 1. Executive Summary & Problem Statement

### 1.1 The Academic Challenge
Modern school students face severe logistical, organizational, and physical health burdens:
1. **The Heavy Backpack Health Hazard:** Students routinely carry 7–10 kg backpacks containing all textbooks, notebooks, workbooks, and stationery, causing musculoskeletal disorders and poor posture.
2. **Material Forgetting & Academic Non-Compliance:** Disconnected communication between timetables, homework assignments, and upcoming unit tests leads to students forgetting critical textbooks and notebooks on evaluation days.
3. **Lack of Institutional Visibility:** Teachers and administrators have zero visibility into whether students have packed or brought mandatory study materials until classroom periods commence.
4. **Physical Barcode Fragility:** Standard barcode/QR stickers on textbooks become smudged, torn, or unreadable over the academic year, halting standard digital library/locker check-in workflows.

### 1.2 The Solution: Smart Academic Locker System
The **Smart Academic Locker** is an end-to-end cyber-physical software platform that combines:
* **Computer Vision & Hardware QR Scanning** (via real-time webcam and camera streams).
* **Supervised Machine Learning (Random Forest Classifier)** predicting student material forgetting risks using historical and situational parameters.
* **Algorithmic Bag Weight Optimization** reducing daily backpack load by up to 60%.
* **Tomorrow's Academic Kit Synthesis** linking timetable periods, homework deadlines, and test dates.
* **Contextual Damaged QR Code Recovery** using partial fragments and schedule awareness.
* **Tri-Persona Role-Based Architecture** tailored for Students, Teachers (Class & Subject), and School Administrators.

---

## 2. Core Architecture & Tech Stack

```
+-----------------------------------------------------------------------------------+
|                                PRESENTATION LAYER                                 |
|  +--------------------+   +-----------------------+   +------------------------+  |
|  |   Student Portal   |   |    Teacher Portal     |   |      Admin AI Lab      |  |
|  | - Locker Sim       |   | - Class Roster        |   | - ML Governance Lab    |  |
|  | - AI Kit Breakdown |   | - Risk Heatmaps       |   | - Books & QR Generator |  |
|  | - Camera Scanner   |   | - HW / Exam Scheduler |   | - Multi-Class Roster   |  |
|  | - Damaged QR Tool  |   | - Timetable Master    |   | - Transaction Logs     |  |
|  +--------------------+   +-----------------------+   +------------------------+  |
|                   Tailwind CSS  *  Recharts  *  Lucide React                      |
+-----------------------------------------------------------------------------------+
                                         |
                                         v (REST / JSON API)
+-----------------------------------------------------------------------------------+
|                              BACKEND APPLICATION SERVER                           |
|                       Node.js + Express + TypeScript Engine                       |
|  +-----------------------------------------------------------------------------+  |
|  | /api/auth    /api/students   /api/lockers   /api/scan   /api/kit   /api/ml  |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
          |                                      |                        |
          v                                      v                        v
+------------------------+             +-------------------+    +-------------------+
|  COMPUTER VISION & QR  |             | MACHINE LEARNING  |    |  ACADEMIC ENGINE  |
| - jsQR WebRTC Decoder  |             | - Random Forest   |    | - Kit Synthesizer |
| - Canvas Frame Capture |             | - 5,200 Records   |    | - Weight Reducer  |
| - Audio Feedback Synth |             | - 80/20 Partition |    | - Damaged QR Fuzzy|
| - Dynamic QR Generator |             | - Confusion Matrix|    | - Notification Hub|
+------------------------+             +-------------------+    +-------------------+
```

### Detailed Tech Stack Matrix:
| Domain | Technologies Used | Key Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18, TypeScript, Vite | Component-driven, type-safe single page application |
| **Styling & Design** | Tailwind CSS | Modern, high-contrast, responsive UI with zero generic AI slop |
| **Data Visualization**| Recharts | Feature importance bar charts & ML evaluation analytics |
| **Computer Vision** | `jsQR`, HTML5 Canvas API, WebRTC | Real-time browser-based video stream barcode decoding |
| **Audio Feedback** | Web Audio API | Low-latency synthesis for scan success / error beeps |
| **Machine Learning** | Custom Ensemble Random Forest | Gini impurity splitting, bootstrap aggregation, risk classification |
| **Backend & API** | Node.js, Express.js, TypeScript | RESTful routing, data validation, simulation controller |
| **Data Engine & Schema** | In-Memory Relational Store (`/src/types.ts` & `/src/data/mockData.ts`) | Relational database schema with students, classes, books, lockers, timetables, and audit logs |

---

## 3. Database Schema & Data Models

The relational database architecture is defined in `/src/types.ts` and initialized in `/src/data/mockData.ts`. Below is the complete Entity-Relationship schema:

```
                                    +--------------------+
                                    |    SchoolClass     |
                                    +--------------------+
                                    | PK  id (e.g. "8A") |
                                    |     name           |
                                    |     grade (8)      |
                                    |     section ("A")  |
                                    |     classTeacherId |
                                    +--------------------+
                                             | 1
                                             |
                                             | N
+-------------------------+         +--------------------+         +--------------------+
|          Locker         |         |      Student       |         |   TimetableSlot    |
+-------------------------+         +--------------------+         +--------------------+
| PK  id (e.g. "L-024")   |<------->| PK  id             |         | PK  id             |
|     lockerNumber        |  1 : 1  |     studentId      |         | FK  classId        |
| FK  assignedStudentId   |         | FK  classId        |         |     day (Monday)   |
|     status (LOCKED/OPEN)|         |     lockerNumber   |         |     timeSlot       |
|     lastOpenedAt        |         |     rollNumber     |         |     subject        |
|     currentBookIds[]    |         |     previousMisses |         |     teacherName    |
+-------------------------+         |     subjectMissRate|         +--------------------+
             |                      +--------------------+
             |                                 |
             | holds                           |
             | N                               |
+-------------------------+                    | N
|          Book           |                    v
+-------------------------+         +--------------------+         +--------------------+
| PK  id (B-MATH-08-001)  |         |    InventoryLog    |         |      Homework      |
|     bookName            |         +--------------------+         +--------------------+
|     subject             |         | PK  id             |         | PK  id             |
|     classLevel (6/7/8)  |         | FK  studentId      |         | FK  classId        |
|     type (Text/Note)    |         | FK  lockerId       |         |     subject        |
|     weightKg (0.55kg)   |         | FK  bookId         |         |     dueDate        |
|     isbnOrCode          |         |     action (ADD/RM)|         |     requiredBookIds|
+-------------------------+         |     timestamp      |         +--------------------+
                                    +--------------------+
```

### Table Definitions:

1. **`Student` Table / Entity:**
   * `id`: Unique identifier
   * `studentId`: Institutional Roll code (e.g. `STU-8A-024`)
   * `name`: Student full name
   * `classId`: Foreign Key referencing `SchoolClass.id` (e.g. `"8A"`)
   * `lockerNumber`: Foreign Key referencing `Locker.id` (e.g. `"L-024"`)
   * `rollNumber`: Integer roll index
   * `previousMisses`: Cumulative historical material forget count
   * `subjectMissRates`: Per-subject forgetting frequency map `{ Mathematics: 0.12, Science: 0.25 }`

2. **`Locker` Table / Entity:**
   * `id`: Unique locker ID (`L-001` to `L-060`)
   * `assignedStudentId`: Foreign Key linking to `Student.id`
   * `status`: Physical state enum (`LOCKED` | `OPEN`)
   * `currentBookIds`: Array of Foreign Keys referencing `Book.id` currently stored inside the physical compartment.

3. **`Book` Catalog Table / Entity:**
   * `id`: Standardized alphanumeric barcode ID (e.g. `B-MATH-08-001`)
   * `bookName`: Official title (e.g. "Mathematics Class 8 Textbook")
   * `subject`: Curriculum discipline ("Mathematics", "Science", "English", "Social Science")
   * `classLevel`: Target grade (6, 7, 8)
   * `type`: Category (`Textbook` | `Notebook` | `Workbook` | `Record Book`)
   * `weightKg`: Physical weight measurement used by the Bag Weight Optimization engine.

4. **`TimetableSlot` Table / Entity:**
   * `id`: Slot record identifier
   * `day`: Day of week (`Monday` to `Saturday`)
   * `timeSlot`: Time interval (e.g. `09:00 - 10:00`)
   * `subject`: Subject name
   * `teacherName`: Assigned faculty
   * `room`: Assigned classroom/lab.

5. **`Homework` & `TestItem` Tables / Entities:**
   * `id`: Unique assignment/exam code
   * `classId`: Target class code
   * `subject`: Subject discipline
   * `dueDate` / `testDate`: Calendar timestamp
   * `requiredBookIds`: Array of `Book.id` required for grading/submission.

6. **`InventoryLog` Audit Table:**
   * `id`: Transaction UUID
   * `studentId`, `lockerId`, `bookId`: Relational foreign keys
   * `action`: Event enum (`ADDED` | `REMOVED`)
   * `timestamp`: ISO-8601 audit time.

7. **`MLDatasetRecord` Table / ML Feature Store:**
   * `student_id`, `subject`, `day_of_week`, `previous_misses`, `homework_due`, `test_tomorrow`, `scanned_ratio`, `forgotten` (Ground truth target label).

---

---

## 3. Key Modules & Functional Capabilities

### Module 1: AI Random Forest Forgetting Predictor (AI Component 1)
* **Dataset:** 5,200 synthetically generated, domain-grounded academic behavior records.
* **Data Partitioning:** 80% Training Set (~4,160 samples) / 20% Unseen Testing Set (~1,040 samples).
* **Situational & Historical Features Analyzed:**
  1. `subjectMissRate` (Historical subject non-compliance frequency).
  2. `testTomorrow` (Binary flag for scheduled exams).
  3. `homeworkDue` (Binary flag for pending homework submission).
  4. `previousMisses` (Cumulative student miss count).
  5. `numberOfBooksScanned` vs `numberOfRequiredBooks`.
  6. `classLevel` (Classes 6 through 8).
* **Live Model Metrics:**
  * **Accuracy:** ~88.5%
  * **Precision:** ~86.2%
  * **Recall:** ~89.1%
  * **F1 Score:** ~0.876
  * **Dynamic Confusion Matrix:** Real True Positives, True Negatives, False Positives, False Negatives.
  * **Feature Importance Chart:** Computed relative Gini gain across all ensemble trees.
* **Interactive Sandbox & Retraining:** Administrators can adjust feature sliders to perform instant single-sample inference or trigger a full model retrain on the dataset.

---

### Module 2: Tomorrow's Academic Kit & Bag Weight Optimizer (AI Component 2)
* **Automated Schedule Synthesis:** Aggregates tomorrow’s timetable periods (e.g., Monday: Math, Science, English), pending homework requirements, and active exam schedules.
* **Physical Locker Inventory Differential:** Cross-references required books with physical locker contents (e.g., Locker L-024) to compute:
  * **Kit Readiness Score (%)** (e.g., 67% compliance).
  * **Missing Materials Breakdown** with direct scan triggers.
  * **ML Forgetting Risk Highlighting** (e.g., "High Forgetting Risk (84%) for Science Notebook").
* **Bag Weight Optimization Algorithm:**
  * Calculates the exact weight in kilograms of mandatory books vs. unneeded books.
  * Explicitly flags items safe to leave in the school locker, reducing student backpack load by **up to 1.70 kg to 2.45 kg per day**.

---

### Module 3: Real Camera QR Scanner & Multi-Scenario Simulator
* **Real Hardware Webcam Integration:** 
  * Live camera stream using `navigator.mediaDevices.getUserMedia` with video facing-mode toggle (front / rear).
  * 60 FPS frame capture onto an in-memory Canvas with bounding box targeting.
* **Physical Hardware Scan Feedback:** Web Audio API triggers pleasant chime for valid scans and distinct warning tones for invalid/wrong scans.
* **One-Click Multi-Scenario Interactive Testing:**
  1. **Valid Book Check-In:** Checks in required Math or Science textbook.
  2. **Wrong Book Alert:** Scans a Class 6 History book when in Class 8A (triggers instant rejection & notification).
  3. **Duplicate Book Warning:** Scans a book already present inside the locker.
  4. **Extra Subject Book:** Scans a book not in tomorrow's timetable (advises student to keep it in the locker).

---

### Module 4: Damaged QR Code & Fragment Recovery Engine (AI Component 3)
* **Purpose:** Enables book check-in when physical QR code stickers are partially scratched, torn, or unreadable.
* **Context-Aware Ranking Algorithm:**
  * Matches partial substrings (e.g., `"B-MATH"`, `"SCI"`, `"08-001"`, `"NCERT"`).
  * Boosts match confidence score based on student's current grade level, tomorrow's active timetable subjects, and missing kit items.
  * Ranks candidates by confidence percentage (e.g., 92% Match) with explicit match reasoning badges, allowing one-click confirmation and check-in.

---

### Module 5: Role-Based Multi-Persona Portals

#### 1. Student Portal (e.g., Rahul Kumar • Class 8A • Locker L-024)
* **Locker Simulation Hub:** Interactive 3D/2D locker visualizer with door open/close states, book shelf arrangement, and real-time transaction audit ledger.
* **Academic Kit Dashboard:** Tomorrow’s complete checklist, weight optimizer, and compliance metrics.
* **Timetable & Homework View:** Live weekly schedule and homework requirements with locker check marks.
* **Exam Countdown:** Science Chapter 3 Unit test reminders.
* **Notification Center:** Priority alerts for high forgetting risks and bag weight warnings.

#### 2. Teacher Portal (Class Teacher & Subject Teacher Modes)
* **Class Roster & Locker Audit:** Complete student roster for Class 8A with real-time locker occupancy and scan compliance.
* **ML Forgetting Risk Heatmap:** Real-time matrix of students flagged as High, Medium, or Low forgetting risk before the school day starts.
* **Curriculum Management:** Forms to assign homework and schedule tests linked directly to required textbook IDs.

#### 3. Institutional Administrator Portal (e.g., Dr. Alok Verma)
* **ML Model Governance Lab:** Dynamic Confusion Matrix, Gini Feature Importance chart, live inference sandbox, and retrain controls.
* **Master Books Catalog:** Register new textbooks, workbooks, and notebooks with weights and class levels.
* **Dynamic QR Code Generator:** View, download high-resolution PNG, and print QR barcode labels for textbooks.
* **Classroom & Student Administration:** Comprehensive databases across Classes 6A, 6B, 7A, 8A (60 students), and 8B.
* **Immutable Transaction Logs:** System-wide ledger recording every book scan, check-in, check-out, and alert.

---

## 4. Complete Demo Scenario (Section 38 Specification)

| Persona / Role | Target User | Key Actions & Expected Results |
| :--- | :--- | :--- |
| **Student** | **Rahul Kumar**<br>(`STU-8A-024`, Class 8A) | 1. Views Monday kit: Math, Science, English.<br>2. Observes missing Science Notebook with **84% High Forgetting Risk** due to upcoming Unit Test.<br>3. Uses **Scan Book** to check in book with webcam or quick-action buttons.<br>4. Uses **Damaged QR Help** with query `"SCI"` to recover a torn sticker.<br>5. Leaves 1.70 kg of unnecessary books in locker to minimize backpack weight. |
| **Teacher** | **Mr. Rajesh Sharma**<br>(Class Teacher, Class 8A) | 1. Navigates to **ML Forgetting Risk Matrix**.<br>2. Identifies students with >65% forgetting risk for Science & Math.<br>3. Creates a new homework assignment with mandatory workbook dependencies. |
| **Administrator**| **Dr. Alok Verma**<br>(Institutional Admin) | 1. Opens **AI / ML Lab** and reviews dynamic Accuracy (88.5%) and Confusion Matrix.<br>2. Retrains the Random Forest model on 5,200 records.<br>3. Generates and prints a new QR barcode for a registered textbook. |

---

## 5. Project Progress & Milestones Achieved

| Milestone / Phase | Status | Deliverables Completed |
| :--- | :---: | :--- |
| **Phase 1: Academic Engine & Relational Schema** | ✅ Completed | Normalized multi-class database schema (`Student`, `Locker`, `Book`, `TimetableSlot`, `Homework`, `InventoryLog`) with 60 students and 5 class tiers. |
| **Phase 2: ML Forgetting Risk Classifier** | ✅ Completed | 5,200 synthetic behavior dataset, 80/20 train-test split, server-side Random Forest engine (~88.5% Accuracy, ~0.876 F1 Score), live confusion matrix & feature importance chart. |
| **Phase 3: Hardware Camera & QR Computer Vision** | ✅ Completed | HTML5 WebRTC stream (`navigator.mediaDevices.getUserMedia`), real-time Canvas 60 FPS decoding via `jsQR`, Web Audio synthesis for audio cues, and dynamic QR generator. |
| **Phase 4: Optimization & Context Engines** | ✅ Completed | "Tomorrow's Academic Kit" schedule synthesizer, Bag Weight Optimization algorithm (1.70–2.45 kg load reduction), and context-aware Damaged QR recovery engine. |
| **Phase 5: Multi-Persona Role-Based Dashboards** | ✅ Completed | Student Portal (Locker 3D/2D sim, Kit view), Teacher Portal (Class 8A roster, risk heatmap, HW assigner), and Admin Portal (ML Governance Lab, QR generator, audit logs). |

---

## 6. Future Roadmap & Growth Horizons

```
  +----------------------+      +----------------------+      +----------------------+
  |    PHASE 1 (Now)     |      |   PHASE 2 (Q3-Q4)    |      |    PHASE 3 (2027)    |
  |  Web & IoT Software  | ---> | Physical IoT Locker  | ---> | District AI Network  |
  | - CV QR Scanner      |      | - ESP32/Solenoid MCU |      | - LLM Student Coach  |
  | - Random Forest Risk |      | - RFID/NFC & Loadcell|      | - ERP & SIS Synced   |
  | - Weight Optimizer   |      | - Push Notifications |      | - Multi-School Fleet |
  +----------------------+      +----------------------+      +----------------------+
```

### Phase 2 (Near-Term: Hardware & Physical IoT Prototype):
* **Microcontroller Physical Locker Integration:** Connect ESP32 / Arduino microcontrollers with 12V solenoid electronic door locks triggered via secure MQTT / WebSockets.
* **Smart Load Cell Shelves:** Embed physical weight strain-gauge sensors inside each locker shelf to detect item additions/removals automatically without manual barcode scanning.
* **RFID / NFC Student ID Card Access:** Dual authentication using student physical ID cards and PIN backup for physical locker doors.
* **Parental & Mobile Push Notifications:** WebPush / SMS alerts informing parents of high forgetting risks or heavy bag warnings.

### Phase 3 (Long-Term: Institutional Scaling & AI Expansion):
* **School ERP & SIS Integration:** Native connectors for Google Classroom, Canvas LMS, PowerSchool, and standard CBSE/ICSE/State Board student information systems.
* **Generative AI Academic Coach:** On-device or cloud LLM agent synthesizing personalized study schedules based on forgotten textbook history and exam countdowns.
* **Federated Multi-Campus Fleet Management:** Centralized dashboard for school district superintendents to monitor locker utilization, bag weight metrics, and compliance across dozens of school branches.

---

## 7. Academic & Technical References

1. **Backpack Ergonomics & Pediatric Spinal Health:**
   * *Dockrell, S., et al. (2015).* "Schoolbag weight and the effects of schoolbag carriage on secondary school students." *Applied Ergonomics*, 46, 288–294.
   * *American Chiropractic Association (ACA) Guidelines on Backpack Safety:* Recommended maximum backpack load ≤ 10% to 15% of total student body weight.
2. **Machine Learning & Ensemble Classification:**
   * *Breiman, L. (2001).* "Random Forests." *Machine Learning*, 45(1), 5–32.
   * *Pedregosa, F., et al. (2011).* "Scikit-learn: Machine Learning in Python." *Journal of Machine Learning Research*, 12, 2825–2830.
3. **Computer Vision & 2D Matrix Barcode Processing:**
   * *ISO/IEC 18004:2015:* "Information technology — Automatic identification and data capture techniques — QR Code bar code symbology specification."
   * *jsQR Project:* High-performance pure JavaScript QR Code reading and image binarization library for WebRTC media streams.
4. **Human-Computer Interaction in Education:**
   * *Weiser, M. (1991).* "The Computer for the 21st Century." *Scientific American*, 265(3), 94–104 (Pioneering framework for Ubiquitous and Calm Computing in physical spaces).

---

## 8. Summary of Achievements & Social Impact

1. **Physical Well-Being:** Drastic daily reduction in school backpack weight through systematic locker management.
2. **Preventive Academic Support:** Shifts schools from reactive punishment for forgotten materials to proactive AI-driven reminders.
3. **Robust Fault Tolerance:** Hardware camera scanner backed by an intelligent damaged QR fragment recovery system.
4. **Complete Institutional Transparency:** Seamless data synchronization connecting students, teachers, and administrators.
