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

#Folder of real classroom photos
classroomFolder=r"C:\Users\User\Desktop\FinalProject\ImagesRekognition\RealClassroomPhotos"

#Cycle that only draws rectangles where there are faces according to Rekognition's algorithm
i=1
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
    #Increase the photo's index
    i=i+1



student_array=["AlejandroCallasas", "AndresAnillo","DiegoGomez","GabrielCastanez", "MauricioDeLaHoz","YordiRochel", "MariaBerdugo","AlbaQuiroz","GiohanOlivares","JesusCotes"]
colors=[(0, 200, 0),(200,0,0),(0,0,0), (0,0,255), (150,150,0),(0,150,150),(100,20,60),(20,60,100),(60,100,20),(255,255,255)]


m=1
#Create image of the class with all faces recognized in it
for file in os.listdir(classroomFolder):
    camera_local_file = rf'C:\Users\User\Desktop\FinalProject\ImagesRekognition\RealClassroomPhotos\{file}' 

    #convert files to bytes in order to be able to read it
    with open(camera_local_file, 'rb') as image_file:
        camera_file_bytes = image_file.read()
    responseDetection=client.detect_faces( Image={'Bytes': camera_file_bytes})
    image = cv2.imread(camera_local_file)

    k=0
    recognized_counter=0
    for student_name in student_array:
        student_id_photo=r"C:\Users\User\Desktop\FinalProject\ImagesRekognition\Student"+ rf"s\{student_name}.jpeg"
        with open(student_id_photo, 'rb') as image_file:
            student_id_photo_bytes = image_file.read()

        #Look for the face in SourceImage evaluating all the faces in TargetImage
        responseRecognition=client.compare_faces(
            SourceImage={'Bytes': student_id_photo_bytes},
            TargetImage={'Bytes': camera_file_bytes},
            SimilarityThreshold=80
        )
        # Read the target image with OpenCV

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
                colors[k],  # Green color in BGR
                2,
            )
            
            padding = 5  # Espacio entre el rectángulo y el cuadro de texto
            text_box_height = 25  # Altura del cuadro de texto
            # Agregar texto dentro del recuadro de texto
            cv2.putText(image, f"{student_name}", (left + 10, top - padding - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, colors[k], 1)

            recognized_counter=recognized_counter+1
            # Print matching information
            print('Face at coordinates ' + str(bbox) + ' matches with ' + str(faceMatch['Similarity']) + '% confidence'+ f"and is likely {student_name}")
        k=k+1
    # Save the annotated image
    output_path = rf"C:\Users\User\Desktop\FinalProject\ImagesRekognition\StudentFoundInClassroom\faces_in_classroom_{m}_{recognized_counter}.jpeg"
    cv2.imwrite(output_path, image)
    print(f"Annotated image saved to {output_path}")
    m=m+1


