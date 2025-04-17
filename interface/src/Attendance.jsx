import { useEffect, useState } from "react";



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

  const table = COURSE_TABLES[selectedCourse];

  useEffect(() => {
    if (!table) return;

    const fetchStudents = () => {
      fetch(`${API_URL}/students/${table}`)
        .then((res) => res.json())
        .then((data) => {
          setStudents(data);

          // Agregar solo nuevos estudiantes al estado de toggles, sin sobreescribir los existentes
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

    fetchStudents();
    const interval = setInterval(fetchStudents, 5000);
    return () => clearInterval(interval);
  }, [table]);

  // Fetch classroom photos whenever we run attendance recognition
  const fetchClassroomPhotos = () => {
    fetch(`${API_URL}/classroom-photos`)
      .then((res) => res.json())
      .then((data) => {
        setClassroomPhotos(data.photos || []);
        // Auto-select the first photo if available
        if (data.photos && data.photos.length > 0) {
          setSelectedPhoto(data.photos[0]);
        }
      })
      .catch((err) => console.error("Error al obtener fotos:", err));
  };

  const takeAttendance = () => {
    setIsLoading(true);
    // Enviar la tabla seleccionada al backend
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
        // Fetch photos after recognition is complete
        fetchClassroomPhotos();
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error al tomar asistencia:", err);
        setIsLoading(false);
      });
  };

  const saveAttendance = () => {
    const studentsToUpdate = students
      .filter((s) => recognizedStudents[s.student_name])
      .map((s) => s.student_name);
  
    if (studentsToUpdate.length === 0) {
      alert(" No hay asistencia para guardar.");
      return;
    }
  
    fetch(`${API_URL}/update-attendances/${table}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ students: studentsToUpdate }),
    })
      .then((res) => res.json())
      .then(() => {
        alert("Asistencia guardada en la base de datos.");
        // Limpiar solo los toggles visibles
        setRecognizedStudents((prev) => {
          const updated = { ...prev };
          studentsToUpdate.forEach((name) => {
            updated[name] = false;
          });
          return updated;
        });
      })
      .catch((err) => console.error("Error al guardar asistencia:", err));
  };
  
  const toggleStudent = (name) => {
    setRecognizedStudents((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  return (
    <div>
      <h1>{selectedCourse}</h1>

      {/* Botones para seleccionar curso */}
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

      <div style={{ display: "flex", marginBottom: "20px" }}>
        <div style={{ flex: "1" }}>
          {/* Botones de acción */}
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
          </div>

          {/* Tabla de estudiantes */}
          <table 
            border="1" 
            style={{ 
              borderCollapse: "collapse", 
              width: "100%",
              marginRight: "20px" 
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#f2f2f2" }}>
                <th style={{ padding: "8px", textAlign: "left" }}>Name</th>
                <th style={{ padding: "8px", textAlign: "center" }}>Attendances</th>
                <th style={{ padding: "8px", textAlign: "center" }}>Present</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.student_name} style={{ 
                  backgroundColor: recognizedStudents[student.student_name] ? "#e8f5e9" : "white" 
                }}>
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
  <h2>Detección</h2>
  
  {selectedPhoto ? (
    <div style={{ 
      textAlign: "center", 
      border: "1px solid #ddd",
      borderRadius: "8px",
      padding: "10px"
    }}>
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
    </div>
  );
}

export default Attendance;