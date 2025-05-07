import boto3
import json
import os
from dotenv import load_dotenv 
import cv2
import json
from datetime import datetime
from PIL import Image
students_found = []

def create_thumbnail(input_path ,output_path , size=(512, 512)):
    """
    Creates a thumbnail of the image at input_path and saves it to output_path.
    
    Parameters:
    - input_path: str, path to the original image.
    - output_path: str, path where the thumbnail will be saved.
    - size: tuple(int, int), max size (width, height) of the thumbnail.
    """
    try:
        with Image.open(input_path) as img:
            img.thumbnail(size, Image.LANCZOS)  # High-quality downsampling
            img.save( output_path, optimize=True, quality=70)  # Lower quality for degradation
            print(f"Thumbnail saved to ")
    except Exception as e:
        print(f"Error creating thumbnail: {e}")

def main(table):
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
    
    s3 = boto3.client('s3',
                  aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=os.getenv("AWS_REGION"))

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
                SimilarityThreshold=35
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
        os.makedirs(rf"../../StudentsFoundInClassroom/{table}", exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = rf"../../StudentsFoundInClassroom/{table}/faces_in_classroom_{timestamp}.jpeg"
        cv2.imwrite(output_path, image)
        thumbnail_path =rf"../../thumnbail_{table}.jpeg"
        create_thumbnail(output_path,thumbnail_path )
        s3.upload_file(thumbnail_path, os.getenv("S3_BUCKET_NAME"),rf"thumbnails/{table}/faces_in_classroom_{timestamp}.jpeg" )
        print(f"Annotated image saved to {output_path}")
        
        m += 1
    with open("../../recognized_students.json", "w", encoding="utf-8") as f:
        json.dump(students_found, f)

if __name__ == "__main__":
    main()
