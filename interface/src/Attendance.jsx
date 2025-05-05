import { useEffect, useState } from "react";
import axios from 'axios';
import { Chart } from "react-google-charts";
import './Attendance.css';
import Welcome from './Welcome'; // Import the Welcome component
import './Welcome.css'; // Import the Welcome CSS

const API_URL = import.meta.env.VITE_API_URL;

const COURSE_TABLES = {
  "Introducción a la Robótica Móvil": "robotica",
  "Diseño Electrónico 1": "diseno1",
  "Diseño Electrónico 2": "diseno2",
};

function Attendance() {
  const [showWelcome, setShowWelcome] = useState(true); // State to control welcome screen
  const [students, setStudents] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("Introducción a la Robótica Móvil");
  const [recognizedStudents, setRecognizedStudents] = useState({});
  const [classroomPhotos, setClassroomPhotos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showHistorics, setShowHistorics] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentRecords, setStudentRecords] = useState([]);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [dates, setDates] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [sysPrediction, SetSysPrediction] = useState([]);

  const table = COURSE_TABLES[selectedCourse];
  
  // Handle welcome screen continue
  const handleContinue = () => {
    setShowWelcome(false);
  };
  
  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);
      if (width > 600) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  async function fetchDates(course) {
    try {
      const res = await axios.get(`${API_URL}/attendance-matrix/${course}`);
      return res.data.dates;
    } catch (err) {
      console.error("Error retrieving dates:", err);
      return [];
    }
  }
  
  async function loadDates(course) {
    const fetchedDates = await fetchDates(course);
    setDates(fetchedDates);
  }

  const fetchStudents = () => {
    fetch(`${API_URL}/students/${table}`)
      .then((res) => res.json())
      .then((data) => {
        setStudents(data);
        setRecognizedStudents((prev) => {
          const updated = { ...prev };
          data.forEach((student) => {
            if (!(student.student_name in updated)) {
              updated[student.student_name] = false;
            }
          });
          return updated;
        });
      });
  };
  
  useEffect(() => {
    // Only fetch students if not showing welcome screen
    if (!showWelcome) {
      fetchStudents();
    }
  }, [table, showWelcome]);

  const fetchClassroomPhotos = (table) => {
    fetch(`${API_URL}/classroom-photos/${table}`)
      .then((res) => res.json())
      .then((data) => {
        setClassroomPhotos(data.photos || []);
        if (data.photos && data.photos.length > 0) {
          setSelectedPhoto(data.photos[0]);
        }
        else{
          setSelectedPhoto(null);
        }
      })
      .catch((err) => console.error("Failed to obtain photos:", err));
  };
  
  useEffect(() => {
    // Only fetch photos if not showing welcome screen
    if (!showWelcome) {
      fetchClassroomPhotos(table);
    }
  }, [table, showWelcome]);


  const takeAttendance = () => {
    setIsLoading(true);
    fetch(`${API_URL}/run-backend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: table })
    })
      .then((res) => res.json())
      .then((data) => {
        const recognized = data.recognized || [];
        const updatedToggles = { ...recognizedStudents };
        recognized.forEach((name) => {
          updatedToggles[name] = true;
          if (!sysPrediction.includes(name)){
            SetSysPrediction((prev) => [...prev, name]);
          }
            
        });
        setRecognizedStudents(updatedToggles);
        fetchClassroomPhotos(table);
        setIsLoading(false);
        setIsMobileMenuOpen(false);
      })
      .catch((err) => {
        console.error("Error taking attendance:", err);
        setIsLoading(false);
      });
  };

  const saveAttendance = () => {
    const studentsToUpdate = students
      .filter((s) => recognizedStudents[s.student_name])
      .map((s) => s.student_name);

    if (studentsToUpdate.length === 0) {
      alert("There is no attendance to save");
      return;
    }

    const presentStudents = Object.keys(recognizedStudents).filter(name => recognizedStudents[name] === true);
    console.log(sysPrediction)
    console.log(presentStudents)
    let TP = 0
    let FP = 0
    let FN = 0
    sysPrediction.forEach((name) => {
      if (presentStudents.includes(name)){
        TP += 1
      }
      else {
        FP += 1
      }
    })

    presentStudents.forEach((name) =>{
      if(!sysPrediction.includes(name)){
        FN += 1
      }
    })

    console.log (`TP:${TP}, FP:${FP}, FN:${FN}`)

    fetch(`${API_URL}/metrics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        TP: TP,
        FP: FP,
        FN: FN
      })
    })
    .then(response => response.json())
    .then(data => {
      console.log('Success:', data);
    })
    .catch((error) => {
      console.error('Error:', error);
    });


    fetch(`${API_URL}/update-attendances/${table}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ students: studentsToUpdate }),
    })
      .then((res) => res.json())
      .then(() => {
        alert("Attendance saved to the database");
        setRecognizedStudents((prev) => {
          const updated = { ...prev };
          studentsToUpdate.forEach((name) => {
            updated[name] = false;
          });
          return updated;
        });
        fetchStudents();
        setIsMobileMenuOpen(false);
      })
      .catch((err) => console.error("Error saving attendance:", err));
  };

  const toggleStudent = (name) => {
    setRecognizedStudents((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const fetchHistorics = (studentName) => {
    fetch(`${API_URL}/historics/${table}_records/${studentName}`)
      .then((res) => res.json())
      .then((data) => {
        let dates = data.records || []
        // dates.forEach((date) =>{
        //   date.attendance_date = new Date(date.attendance_date).toLocaleDateString("en-GB",{
        //     timeZone: "America/Bogota", 
        //     day: "2-digit",
        //     month: "short",
        //     year: "numeric"
        //   })
        // })
        setStudentRecords(dates || []);
        setSelectedStudent(studentName);
        setShowHistorics(true);
        setShowNewMenu(false);
        setIsMobileMenuOpen(false);
      })
      .catch((err) => console.error("Error retrieving historics:", err));
  };
  
  function formatName(concatenatedName) {
    const parts = concatenatedName.match(/[A-Z][a-z]+/g);
    if (!parts || parts.length < 2) return concatenatedName;
    return `${parts[1]} ${parts[0]}`;
  }
  
  const openNewMenu = () => {
    setShowNewMenu(true);
    setShowHistorics(false);
    loadDates(table);
    setIsMobileMenuOpen(false);
  };
  
  function AttendanceMatrix({ course }) {
    const [dates, setDates] = useState([]);
    const [matrix, setMatrix] = useState([]);
  
    useEffect(() => {
      axios.get(`${API_URL}/attendance-matrix/${course}`)
        .then(res => {
          setDates(res.data.dates);
          setMatrix(res.data.data);
        })
        .catch(err => console.error("Error retrieving attendance matrix:", err));
    }, [course]);
  fetchClassroomPhotos(table)
    return (
      <div className="matrix-container">
        <h2 className="matrix-title">Attendance Record</h2>
        <div className="table-container">
          <table className="attendance-table">
            <thead>
              <tr>
                <th>Student</th>
                {dates.map(date => (
                  <th key={date}>{date}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map(row => (
                <tr key={row.student_name}>
                  <td onClick={() => fetchHistorics(row.student_name)} className="student-name">
                    {row.student_name}
                    <span className="view-details">View Details</span>
                  </td>
                  {dates.map(date => (
                    <td
                      key={date}
                      className={row[date] === 1 ? "present" : "absent"}
                    >
                      {row[date] === 1 ? "✓" : "✗"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  
  // Function to render the tab-style course selector
  const renderCourseTabs = () => {
    return (
      <div className="folder-tabs">
        {Object.keys(COURSE_TABLES).map((course) => (
          <div 
            key={course}
            className={`folder-tab ${selectedCourse === course ? 'active-tab' : ''}`}
            onClick={() =>{ setSelectedCourse(course)
              fetchClassroomPhotos(COURSE_TABLES[course]);
            }}
          >
            <div className="tab-content">
              <span className="tab-text">{course}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // FIXED: Made toggleMobileMenu function that directly updates state
  const toggleMobileMenu = () => {
    console.log("Mobile menu toggle button clicked, current state:", isMobileMenuOpen);
    setIsMobileMenuOpen(prevState => !prevState);
  };

  // FIXED: Mobile menu component with explicit styles to ensure visibility
  const MobileMenuButton = () => {
    return (
      <button
        onClick={toggleMobileMenu}
        style={{
          display: 'block',
          width: '100%',
          padding: '12px',
          backgroundColor: '#e5e4d2',
          color: '#621717',
          border: 'none',
          borderRadius: '6px',
          marginBottom: '15px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: '500',
          textAlign: 'center'
        }}
      >
        {isMobileMenuOpen ? "Close Menu ▲" : "Open Menu ▼"}
      </button>
    );
  };

  // Responsive students table
  const renderStudentsTable = () => {
    if (windowWidth <= 480) {
      return (
        <div className="students-table-container mobile-table-container">
          {students.map((student) => (
            <div
              key={student.student_name}
              className={`mobile-student-row ${recognizedStudents[student.student_name] ? "recognized" : ""}`}
            >
              <div className="student-name">{student.student_name}</div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={!!recognizedStudents[student.student_name]}
                  onChange={() => toggleStudent(student.student_name)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          ))}
        </div>
      );
    } else {
      return (
        <div className="students-table-container">
          <table className="students-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Present</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr
                  key={student.student_name}
                  className={recognizedStudents[student.student_name] ? "recognized" : ""}
                >
                  <td className="student-name">{student.student_name}</td>
                  <td className="attendance-toggle">
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={!!recognizedStudents[student.student_name]}
                        onChange={() => toggleStudent(student.student_name)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  };

  // Function to render the main content
  const renderContent = () => {
    if (showNewMenu) {
      return (
        <div className="content-container records-view">
          <div className="header-bar">
            <button
              onClick={() => setShowNewMenu(false)}
              className="back-button"
            >
              <span className="back-icon">←</span> Back to Attendance
            </button>
            <h2>Class Attendance Records</h2>
          </div>
          <AttendanceMatrix course={table}/>
        </div>
      );
    } else if (showHistorics) {
      return (
        <div className="content-container student-history">
          <div className="header-bar">
            <button
              onClick={openNewMenu}
              className="back-button"
            >
              <span className="back-icon">←</span> Back to Records
            </button>
            <h2>History of {formatName(selectedStudent)}</h2>
          </div>
          
          <div className="stats-container">
            <div className="chart-container">
              <Chart
                chartType="PieChart"
                data={[
                  ["Attendances", "Numbers"],
                  ["Present", studentRecords.length],
                  ["Absent", dates.length - studentRecords.length]
                ]}
                options={{
                  title: "Attendance Summary",
                  colors: ['#4CAF50', '#F44336'],
                  is3D: true,
                  legend: windowWidth < 600 ? { position: 'bottom' } : { position: 'right' },
                  chartArea: windowWidth < 600 ? { width: '100%', height: '70%' } : { width: '80%', height: '80%' }
                }}
                width={"100%"}
                height={"300px"}
              />
            </div>
            
            <div className="records-list">
              <h3>Attendance Dates</h3>
              <div className="dates-container">
                {studentRecords.map((record, index) => (
                  <div key={index} className="date-card">
                    <span className="date-icon">✓</span>
                    <span className="date-text">{record.attendance_date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="content-container main-view">
          {/* FIXED: Display the mobile menu button on small screens */}
          {windowWidth <= 600 && <MobileMenuButton />}
          
          {/* FIXED: Show mobile menu items when open */}
          {windowWidth <= 600 && isMobileMenuOpen && (
            <div 
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                marginBottom: '15px'
              }}
            >
              <div 
                style={{
                  backgroundColor: selectedCourse === "Introducción a la Robótica Móvil" ? '#3e5240' : '#f8f9fa',
                  color: selectedCourse === "Introducción a la Robótica Móvil" ? 'white' : 'black',
                  padding: '10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  border: '1px solid #e0e0e0'
                }}
                onClick={() => {
                  setSelectedCourse("Introducción a la Robótica Móvil");
                  setIsMobileMenuOpen(false);
                }}
              >
                Introducción a la Robótica Móvil
              </div>
              <div 
                style={{
                  backgroundColor: selectedCourse === "Diseño Electrónico 1" ? '#3e5240' : '#f8f9fa',
                  color: selectedCourse === "Diseño Electrónico 1" ? 'white' : 'black',
                  padding: '10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  border: '1px solid #e0e0e0'
                }}
                onClick={() => {
                  setSelectedCourse("Diseño Electrónico 1");
                  setIsMobileMenuOpen(false);
                }}
              >
                Diseño Electrónico 1
              </div>
              <div 
                style={{
                  backgroundColor: selectedCourse === "Diseño Electrónico 2" ? '#3e5240' : '#f8f9fa',
                  color: selectedCourse === "Diseño Electrónico 2" ? 'white' : 'black',
                  padding: '10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  border: '1px solid #e0e0e0'
                }}
                onClick={() => {
                  setSelectedCourse("Diseño Electrónico 2");
                  setIsMobileMenuOpen(false);
                }}
              >
                Diseño Electrónico 2
              </div>
              <div 
                style={{
                  backgroundColor: "#31a301",
                  color: "#ebebeb",
                  padding: '10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  border: '1px solid #e0e0e0'
                  
                }}
                onClick={takeAttendance}
              ><span className="button-icon">📸</span>
                {isLoading ? "Processing..." : "Take Attendance"}
              </div>
              <div 
                style={{
                  backgroundColor: "#1f2ca1",
                  color: "#ebebeb",
                  padding: '10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  border: '1px solid #e0e0e0'
                }}
                onClick={saveAttendance}
              ><span className="button-icon">💾</span>
                Save Attendance
              </div>
              <div 
                style={{
                  backgroundColor: '#e5e4d2',
                  color: "#621717",
                  padding: '10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  border: '1px solid #e0e0e0'
                }}
                onClick={openNewMenu}
              ><span className="button-icon">📊</span>
                View Records
              </div>
            </div>
          )}

          {windowWidth > 600 && (
            <div className="controls-section">
              <button
                onClick={takeAttendance}
                disabled={isLoading}
                className={`action-button take-attendance ${isLoading ? 'loading' : ''}`}
              >
                <span className="button-icon">📸</span>
                {isLoading ? "Processing..." : "Take Attendance"}
              </button>

              <button
                onClick={saveAttendance}
                className="action-button save-attendance"
              >
                <span className="button-icon">💾</span>
                Save Attendance
              </button>
              
              <button
                onClick={openNewMenu}
                className="action-button view-records"
              >
                <span className="button-icon">📊</span>
                View Records
              </button>
            </div>
          )}

          <div className="attendance-grid">
            <div className="students-section">
              <h2 className="section-title">Students</h2>
              {renderStudentsTable()}
            </div>

            <div className="detection-section">
              <h2 className="section-title">Detection</h2>
              <div className="photo-container">
                {selectedPhoto ? (
                  <div className="photo-display">
                    <div className="photo-frame">
                      <img
                        src={`${API_URL}/photo/${selectedPhoto}`}
                        alt="Class Photo"
                      />
                    </div>
                    <p className="photo-caption">{selectedPhoto}</p>
                  </div>
                ) : (
                  <div className="no-photo">
                    {isLoading ? (
                      <div className="loading-indicator">
                        <div className="spinner"></div>
                        <p>Processing image...</p>
                      </div>
                    ) : (
                      <div className="empty-state">
                        <span className="empty-icon">📷</span>
                        <p>No photos available. Take attendance to generate photos.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

  // Render welcome screen if showWelcome is true
  if (showWelcome) {
    return <Welcome onContinue={handleContinue} />;
  }

  return (
    <div className="attendance-system">
      <div className="app-header">
        <h1 className="app-title">Facial Recognition Attendance System</h1>
        <img 
          src="https://www.uninorte.edu.co/o/uninorte-theme/images/uninorte/footer_un/logo.png" 
          alt="Logo" 
          className="app-logo" 
        />
      </div>
      
      {/* Show course tabs unless in history or records view and screen is wider than 600px */}
      {!showHistorics && !showNewMenu && windowWidth > 600 && renderCourseTabs()}
      
      {/* Main content area */}
      <div className="content-wrapper">
        {renderContent()}
      </div>
    </div>
  );
}

export default Attendance;