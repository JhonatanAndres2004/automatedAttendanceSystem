
import boto3
import json
import os
from dotenv import load_dotenv 
import cv2
import json


students_found = []
def main():
    dotenv_path = os.path.join("..", 'interface', '.env')
    load_dotenv()

    client = boto3.client(
        'rekognition',
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=os.getenv("AWS_REGION")
    )
    classroomFolder = r"../../classroom"
    studentstxt = "../../students/students_downloaded.txt"
    

    with open(studentstxt, "r", encoding="utf-8") as file:
        student_array = [line.strip() for line in file]

    numberOfStudents = len(student_array)
    colors = [(85, 255, 51)]

    boundingBoxRecognizedFaces = []
    m = 1

    for file in os.listdir(classroomFolder):
        camera_local_file = rf'../../classroom/{file}' 
        
        with open(camera_local_file, 'rb') as image_file:
            camera_file_bytes = image_file.read()

      
        image = cv2.imread(camera_local_file)

        recognized_counter = 0
        boundingBoxRecognizedFacesithImage = []

        for student_name in student_array:
            student_found = False
            student_id_photo = r"../../students" + rf"/{student_name}.jpeg"
            with open(student_id_photo, 'rb') as image_file:
                student_id_photo_bytes = image_file.read()

            responseRecognition = client.compare_faces(
                SourceImage={'Bytes': student_id_photo_bytes},
                TargetImage={'Bytes': camera_file_bytes},
                SimilarityThreshold=80
            )

            image_height, image_width, _ = image.shape

            for faceMatch in responseRecognition['FaceMatches']:
                bbox = faceMatch['Face']['BoundingBox']
                left = int(bbox['Left'] * image_width)
                top = int(bbox['Top'] * image_height)
                width = int(bbox['Width'] * image_width)
                height = int(bbox['Height'] * image_height)

                cv2.rectangle(image, (left, top), (left + width, top + height), colors[0], 2)
                cv2.putText(image, f"{student_name}", (left + 10, top - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, colors[0], 1)

                recognized_counter += 1
                print(f'Face at coordinates {bbox} matches with {faceMatch["Similarity"]}% confidence and is likely {student_name}')
                students_found.append(student_name)
                boundingBoxRecognizedFacesithImage.append((student_name, left, top, width, height))
                student_found = True

            if not student_found:
                boundingBoxRecognizedFacesithImage.append((student_name, 0, 0, 0, 0))
                print(f"Student {student_name} not found in the image")

        boundingBoxRecognizedFaces.append(boundingBoxRecognizedFacesithImage)
        
        os.makedirs("../../StudentsFoundInClassroom", exist_ok=True)
        output_path = rf"../../StudentsFoundInClassroom/faces_in_classroom_{m}_{recognized_counter}.jpeg"
        cv2.imwrite(output_path, image)
        print(f"Annotated image saved to {output_path}")
        
        m += 1
    with open("../../recognized_students.json", "w", encoding="utf-8") as f:
        json.dump(students_found, f)

if __name__ == "__main__":
    main()
    
