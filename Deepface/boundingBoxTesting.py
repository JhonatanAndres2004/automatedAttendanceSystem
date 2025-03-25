import os
import numpy as np
from deepface import DeepFace
from sklearn.metrics import confusion_matrix

# Función para calcular IoU
def calcular_iou(boxA, boxB):
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[0] + boxA[2], boxB[0] + boxB[2])
    yB = min(boxA[1] + boxA[3], boxB[1] + boxB[3])
    inter_area = max(0, xB - xA) * max(0, yB - yA)
    boxA_area = boxA[2] * boxA[3]
    boxB_area = boxB[2] * boxB[3]
    union_area = boxA_area + boxB_area - inter_area
    return inter_area / union_area

# Función para leer el ground truth
def leer_ground_truth(ruta_gt):
    with open(ruta_gt, 'r') as f:
        lineas = f.readlines()
    nombre_archivo = lineas[0].strip()
    num_boxes = int(lineas[1].strip())
    boxes = []
    for i in range(num_boxes):
        valores = lineas[2 + i].strip().split()
        x1, y1, w, h = map(int, valores[:4])
        boxes.append([x1, y1, w, h])
    return nombre_archivo, boxes

# Función para evaluar un modelo
def evaluar_modelo(ground_truth, detecciones, iou_threshold=0.3):
    TP = 0  # Verdaderos positivos
    FP = 0  # Falsos positivos
    FN = 0  # Falsos negativos

    # Comparar cada bounding box del ground truth con las detecciones
    for gt_box in ground_truth:
        encontrado = False
        for det_box in detecciones:
            iou = calcular_iou(gt_box, det_box)
            if iou >= iou_threshold:
                TP += 1
                encontrado = True
                break
        if not encontrado:
            FN += 1

    # Falsos positivos son detecciones que no coinciden con ningún ground truth
    FP = len(detecciones) - TP

    return TP, FP, FN

# Función principal para procesar todas las imágenes
def procesar_carpeta(carpeta_imagenes, archivo_gt):
    # Variables para acumular resultados
    total_TP = 0
    total_FP = 0
    total_FN = 0

    # Leer el archivo de ground truth
    with open(archivo_gt, 'r') as f:
        lineas = f.readlines()

    # Procesar cada imagen en el ground truth
    i = 0
    while i < len(lineas):
        nombre_archivo = lineas[i].strip()
        num_boxes = int(lineas[i + 1].strip())
        ground_truth = []
        for j in range(num_boxes):
            valores = lineas[i + 2 + j].strip().split()
            x1, y1, w, h = map(int, valores[:4])
            ground_truth.append([x1, y1, w, h])
        i += 2 + num_boxes

        # Ruta de la imagen
        ruta_imagen = os.path.join(carpeta_imagenes, nombre_archivo).replace("/", "\\")

        # Verificar si la imagen existe
        if not os.path.exists(ruta_imagen):
            print(f"Imagen no encontrada: {ruta_imagen}")
            continue

        # Detectar caras con DeepFace
        try:
            detecciones = DeepFace.extract_faces(ruta_imagen, detector_backend="opencv")
        except ValueError as e:
            print(f"No se detectaron caras en {ruta_imagen}: {e}")
            detecciones = []

        # Formatear detecciones como [x1, y1, w, h]
        detecciones_formato = []
        for det in detecciones:
            x, y, w, h = det["facial_area"]["x"], det["facial_area"]["y"], det["facial_area"]["w"], det["facial_area"]["h"]
            detecciones_formato.append([x, y, w, h])

        # Evaluar el modelo para esta imagen
        TP, FP, FN = evaluar_modelo(ground_truth, detecciones_formato)

        # Acumular resultados
        total_TP += TP
        total_FP += FP
        total_FN += FN

        print(f"Imagen: {nombre_archivo}")
        print(f"Verdaderos positivos (TP): {TP}")
        print(f"Falsos positivos (FP): {FP}")
        print(f"Falsos negativos (FN): {FN}")

    # Calcular métricas globales
    precision = total_TP / (total_TP + total_FP) if (total_TP + total_FP) > 0 else 0
    recall = total_TP / (total_TP + total_FN) if (total_TP + total_FN) > 0 else 0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0

    print("\nMétricas globales:")
    print(f"Verdaderos positivos totales (TP): {total_TP}")
    print(f"Falsos positivos totales (FP): {total_FP}")
    print(f"Falsos negativos totales (FN): {total_FN}")
    print(f"Precisión global: {precision:.2f}")
    print(f"Recall global: {recall:.2f}")
    print(f"F1-score global: {f1:.2f}")

    # Matriz de confusión global
    y_true = [1] * total_TP + [0] * total_FP  # 1 para TP, 0 para FP
    y_pred = [1] * total_TP + [0] * total_FP
    conf_matrix = confusion_matrix(y_true, y_pred)
    print("\nMatriz de confusión global:")
    print(conf_matrix)

# Carpeta con las imágenes y archivo de ground truth
#carpeta_imagenes = r"C:\Users\Guzz1\Downloads\archive\WIDER_val\WIDER_val\images"
carpeta_imagenes = r"C:\Users\Guzz1\Downloads\U_database"
archivo_gt = "U_annotations.txt"

# Procesar todas las imágenes
procesar_carpeta(carpeta_imagenes, archivo_gt)