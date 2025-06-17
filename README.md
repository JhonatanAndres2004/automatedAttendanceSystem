# Attendance Tracking System Based on Facial Identification

An automated attendance management system that leverages facial recognition technology to streamline student identification and record-keeping in academic environments.

# Video of the project

Link: [Attendance Tracking System video](https://www.youtube.com/watch?v=Iy_daGBITbk)

# 🎯 Overview

This system addresses the inefficiencies of traditional attendance methods by using computer vision and artificial intelligence to automatically identify students and maintain attendance records. The solution achieves a 90% F1-score with minimal processing requirements, making it scalable for various educational and large-scale scenarios.

# ✨ Key Features

1. Automated Face Detection & Recognition: Real-time student identification using advanced AI models

2. Web-based Interface: User-friendly dashboard for attendance management

3. Multiple Frame Processing: Captures multiple frames per session for improved accuracy

4. Historical Analytics: Comprehensive attendance tracking with visual reports

5. Manual Correction Support: Allows instructors to manually verify and correct identifications

6. Cloud Integration: Leverages AWS services for scalable performance

# 🛠️ Technology Stack

Backend

Python: Core application logic
AWS Rekognition: Face detection and identification
MySQL: Attendance data storage
AWS S3: Reference image storage

Frontend

React: Interactive web interface
JavaScript: Client-side functionality

Hardware

AXIS Q1604 IP Camera: Image capture
Lens CS 2.8-8mm F1.2 P-Iris 5MP: Wide-angle classroom coverage
FortiSwitch 148F-FPOE: Network connectivity with PoE support

# 🚀 Getting Started
Prerequisites

Python 3.8+
Node.js 14+
MySQL 8.0+
AWS Account with Rekognition access
IP Camera with network connectivity

# 📖 Usage

Taking Attendance

Setup Course: Add students and their reference photos
Select Course: Choose the active course from the dropdown
Capture Frame: Click "Take Attendance" to capture classroom image
Review Results: Identified students will be highlighted with bounding boxes
Manual Corrections: Toggle attendance status for any missed identifications
Save Record: Click "Save Attendance" to store the session data

Viewing Reports

Course Overview: View attendance statistics by course
Student History: Individual attendance records with visual charts
Session Details: Frame-by-frame detection results for performance analysis

# 🧪 Testing & Validation

The system underwent comprehensive testing:

Model Comparison: Evaluated OpenCV, MTCNN, RetinaFace, and AWS Rekognition
Parameter Optimization: Tested resolution, brightness, photo recency, and similarity thresholds
Real-world Validation: 8 classroom sessions with 44 students
Statistical Analysis: t-test validation confirming >90% F1-Score with 95% confidence

# 🚧 Limitations

Single reference photo per student
Requires clear, unobstructed facial images
No integration with official university systems
Performance may vary with lighting conditions

# Acknowledgments

Universidad del Norte - Department of Electronics and Electrical Engineering
AWS for cloud services and credits
Research participants who provided consent for system testing

# 📞 Contact

Diego Gómez - dgomez@uninorte.edu.co
Jhonatan Maldonado - barreraaj@uninorte.edu.co
Eduardo Guzmán - aeguzman@uninorte.edu.co