import os
from PIL import Image
"""
透過画像の余計な周りの透過部分を削除するスクリプト
"""

def trimTransparentBorders(imagePath):
    img = Image.open(imagePath)
    img = img.crop(img.getbbox())  # 透明部分をトリミング
    img.save(imagePath)  # 元の画像を上書き保存

def processAllImagesInFolder(folderPath):
    for fileName in os.listdir(folderPath):
        if fileName.endswith('.png'):
            imagePath = os.path.join(folderPath, fileName)
            trimTransparentBorders(imagePath)

# 現在のディレクトリにある全ての画像を処理
currentDirectory = os.path.dirname(os.path.abspath(__file__))
processAllImagesInFolder(currentDirectory)

