import boto3
import json
import os
from dotenv import load_dotenv
import cv2

dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'interface', '.env')
load_dotenv(dotenv_path)

#Connect to AWS Ressource, Credentials are optionals as we are accessing from the same AWS user
client=boto3.client('rekognition',aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=os.getenv("REGION_NAME"))
s3 = boto3.client('s3',
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=os.getenv("REGION_NAME")
)

#Define bucket name to access
bucket_name = os.getenv("BUCKET_NAME")

student_name="DiegoGomez"
student_id_photo=r"C:\Users\User\Desktop\FinalProject\ImagesRekognition\Student"+ rf"s\{student_name}.jpeg"
with open(student_id_photo, 'rb') as image_file:
    student_id_photo_bytes = image_file.read()

i=1
classroomFolder=r"C:\Users\User\Desktop\FinalProject\ImagesRekognition\RealClassroomPhotos"
for file in os.listdir(classroomFolder):
    camera_local_file = rf'C:\Users\User\Desktop\FinalProject\ImagesRekognition\RealClassroomPhotos\{file}' 
    #convert files to bytes in order to be able to read it
    with open(camera_local_file, 'rb') as image_file:
        camera_file_bytes = image_file.read()
    responseDetection=client.detect_faces( Image={'Bytes': camera_file_bytes})

    # Read the image with OpenCV
    image = cv2.imread(camera_local_file)
    image_height, image_width, _ = image.shape

    # Draw bounding boxes for each detected face
    for face in responseDetection['FaceDetails']:
        bbox = face['BoundingBox']
        left = int(bbox['Left'] * image_width)
        top = int(bbox['Top'] * image_height)
        width = int(bbox['Width'] * image_width)
        height = int(bbox['Height'] * image_height)
        cv2.rectangle(
            image, 
            (left, top), 
            (left + width, top + height), 
            (37, 173, 250), 
            2  
        )

    # Print number of faces detected
    print(f"{len(responseDetection['FaceDetails'])} Faces were detected")

    # Save the annotated image
    output_path = rf"C:\Users\User\Desktop\FinalProject\ImagesRekognition\FacesDetectedInClassroom\faces_detected_{i}.jpeg"
    cv2.imwrite(output_path, image)
    
    #Look for the face in SourceImage evaluating all the faces in TargetImage
    responseRecognition=client.compare_faces(
        SourceImage={'Bytes': student_id_photo_bytes},
        TargetImage={'Bytes': camera_file_bytes},
        SimilarityThreshold=80
    )
    # Read the target image with OpenCV
    image = cv2.imread(camera_local_file)

    # Get image dimensions
    image_height, image_width, _ = image.shape

    # Draw bounding boxes for matched faces
    for faceMatch in responseRecognition['FaceMatches']:
        # Get bounding box coordinates
        bbox = faceMatch['Face']['BoundingBox']
        
        # Convert normalized coordinates to pixel coordinates
        left = int(bbox['Left'] * image_width)
        top = int(bbox['Top'] * image_height)
        width = int(bbox['Width'] * image_width)
        height = int(bbox['Height'] * image_height)
        
        # Draw green rectangle (to differentiate from previous red detection boxes)
        cv2.rectangle(
            image, 
            (left, top), 
            (left + width, top + height), 
            (0, 200, 0),  # Green color in BGR
            2
        )
        
        # Print matching information
        print('Face at coordinates ' + str(bbox) + ' matches with ' + str(faceMatch['Similarity']) + '% confidence')

    # Print total number of face matches
    print(f"Total face matches: {len(responseRecognition['FaceMatches'])}")

    # Save the annotated image
    output_path = rf"C:\Users\User\Desktop\FinalProject\ImagesRekognition\StudentFoundInClassroom\{student_name}_Detection_in_{i}.jpeg"
    cv2.imwrite(output_path, image)
    print(f"Annotated image saved to {output_path}")
    i=i+1

