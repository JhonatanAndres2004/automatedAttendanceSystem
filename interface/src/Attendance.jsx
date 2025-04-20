import { useEffect, useState } from "react";
import ImageButton from "./ImageButton";
import customIcon from './assets/history-icon.png';
import axios from 'axios';
import './Attendance.css';

const API_URL = import.meta.env.VITE_API_URL;

const COURSE_TABLES = {
  "Introducción a la Robótica Móvil": "robotica",
  "Diseño Electrónico 1": "diseno1",
  "Diseño Electrónico 2": "diseno2",
};

function Attendance() {
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


  const table = COURSE_TABLES[selectedCourse];

  
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
    fetchStudents();
  }, [table]);

  const fetchClassroomPhotos = () => {
    fetch(`${API_URL}/classroom-photos`)
      .then((res) => res.json())
      .then((data) => {
        setClassroomPhotos(data.photos || []);
        if (data.photos && data.photos.length > 0) {
          setSelectedPhoto(data.photos[0]);
        }
      })
      .catch((err) => console.error("Failend to obtain photos:", err));
  };

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
        });
        setRecognizedStudents(updatedToggles);
        fetchClassroomPhotos();
        setIsLoading(false);
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
        dates.forEach((date) =>{
          date.attendance_date = new Date(date.attendance_date).toLocaleDateString("en-GB",{
            day: "2-digit",
            month: "short",
            year: "numeric"
          })
          //setStudentRecords(formatDate);  
        })
        setStudentRecords(dates || []);
        setSelectedStudent(studentName);
        setShowHistorics(true);
        setShowNewMenu(false); // Close new menu when showing historics
        console.log(studentRecords)
      })
      .catch((err) => console.error("Error retrieving historics:", err));
  };
  
  function formatName(concatenatedName) {
    // Split by capital letters using a regular expression
    const parts = concatenatedName.match(/[A-Z][a-z]+/g);
    if (!parts || parts.length < 2) return concatenatedName; // fallback
    return `${parts[1]} ${parts[0]}`; // first name + last name
  }
  
  const openNewMenu = () => {
    setShowNewMenu(true);
    setShowHistorics(false); // Close historics when opening new menu
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
  
    return (
      <div className="table-container">
  <table className="attendance-table">
    <thead>
      <tr>
        <th>Estudiante</th>
        {dates.map(date => (
          <th key={date}>{date}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {matrix.map(row => (
        <tr key={row.student_name}>
          <td>{row.student_name}</td>
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
          );
  }
  

  // Function to render the main content
  const renderContent = () => {
    if (showNewMenu) {
      return (
        <div>
          <button
            onClick={() => setShowNewMenu(false)}
            style={{
              marginBottom: "10px",
              padding: "8px 12px",
              backgroundColor: "#f44336",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Close
          </button>
          <AttendanceMatrix course ={table}/>
          {/* Add your new menu content here */}
          
        </div>
      );
    } else if (showHistorics) {
      return (
        <div>
          <h2>Historics of {formatName(selectedStudent)}</h2>
          <button
            onClick={() => setShowHistorics(false)}
            style={{
              marginBottom: "10px",
              padding: "8px 12px",
              backgroundColor: "#f44336",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
          close
          </button>
          <table border="1" style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr style={{ backgroundColor: "#f2f2f2" }}>
                <th style={{ padding: "8px" }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {studentRecords.map((record, index) => (
                <tr key={index}>
                  <td style={{ padding: "8px" }}>{record.attendance_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    } else {
      return (
        <div style={{ display: "flex", marginBottom: "20px" }}>
          <div style={{ flex: "1" }}>
            {/* Action buttons */}
            <div style={{ marginBottom: "15px" }}>
              <button
                onClick={takeAttendance}
                disabled={isLoading}
                style={{
                  padding: "10px 15px",
                  backgroundColor: "#2196F3",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  opacity: isLoading ? 0.7 : 1
                }}
              >
                {isLoading ? "Procesing..." : "Take attendance"}
              </button>

              <button
                onClick={saveAttendance}
                style={{
                  marginLeft: "10px",
                  padding: "10px 15px",
                  backgroundColor: "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                Save attendance
              </button>
              <button
          onClick={openNewMenu}
          style={{
            marginLeft: "10px",
            padding: "10px 15px",
            backgroundColor: "#FF9800",
            color: "white", 
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Record
        </button>
            </div>

            {/* Tabla de estudiantes */}
            <table border="1" style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr style={{ backgroundColor: "#f2f2f2" }}>
                  <th style={{ padding: "8px", textAlign: "center" }}>Historic</th>
                  <th style={{ padding: "8px", textAlign: "left" }}>Name</th>
                  <th style={{ padding: "8px", textAlign: "center" }}>Attendances</th>
                  <th style={{ padding: "8px", textAlign: "center" }}>Present</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr
                    key={student.student_name}
                    style={{
                      backgroundColor: recognizedStudents[student.student_name] ? "#e8f5e9" : "white"
                    }}
                  >
                    <td style={{ padding: "8px", textAlign: "center" }}>
                      <ImageButton
                        imageSrc={customIcon}
                        onClick={() => fetchHistorics(student.student_name)}
                      />
                    </td>
                    <td style={{ padding: "8px" }}>{student.student_name}</td>
                    <td style={{ padding: "8px", textAlign: "center" }}>{student.attendances}</td>
                    <td style={{ padding: "8px", textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={!!recognizedStudents[student.student_name]}
                        onChange={() => toggleStudent(student.student_name)}
                        style={{ width: "18px", height: "18px" }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Contenedor de fotos */}
          <div style={{ flex: "1", marginLeft: "20px" }}>
            <h2>Detection</h2>

            {selectedPhoto ? (
              <div style={{ textAlign: "center", border: "1px solid #ddd", borderRadius: "8px", padding: "10px" }}>
                <img
                  src={`${API_URL}/photo/${selectedPhoto}`}
                  alt="Foto seleccionada"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "400px",
                    borderRadius: "4px"
                  }}
                />
                <p style={{ marginTop: "10px", fontWeight: "bold" }}>
                  {selectedPhoto}
                </p>
              </div>
            ) : (
              <div style={{
                border: "1px dashed #ccc",
                borderRadius: "8px",
                padding: "40px 20px",
                textAlign: "center",
                color: "#757575"
              }}>
                {isLoading ? (
                  <p>Loading image...</p>
                ) : (
                  <p>No photos available. Take attendance to generate photos.</p>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }
  };
  
  return (
    <div>
      <h1>{selectedCourse}</h1>
      
      {/* Always show the "Open New Menu" button, unless already in new menu view */}
      
      
      {/* Show course selection buttons only in the main view */}
      {!showHistorics && !showNewMenu && (
        <div style={{ marginBottom: "10px" }}>
          {Object.keys(COURSE_TABLES).map((course) => (
            <button
              key={course}
              onClick={() => setSelectedCourse(course)}
              style={{
                margin: "0 5px",
                padding: "8px 12px",
                backgroundColor: selectedCourse === course ? "#4CAF50" : "#f1f1f1",
                color: selectedCourse === course ? "white" : "black",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              {course}
            </button>
          ))}
        </div>
      )}
      
      {/* Render the appropriate content based on state */}
      {renderContent()}
    </div>
  );
}

export default Attendance;