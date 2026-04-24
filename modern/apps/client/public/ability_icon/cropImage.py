import os
from PIL import Image

def crop_images_in_current_folder(output_folder):
    # 現在のスクリプトのディレクトリを取得
    input_folder = os.path.dirname(os.path.abspath(__file__))
    
    # 出力フォルダが存在しない場合は作成
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
    
    # PNGファイルを検索して処理
    for filename in os.listdir(input_folder):
        if filename.lower().endswith('.png'):
            file_path = os.path.join(input_folder, filename)
            try:
                # 画像を開く
                with Image.open(file_path) as img:
                    # 高さ200から740までを切り取る
                    cropped_img = img.crop((0, 200, img.width, 740))
                    
                    # 出力フォルダに保存
                    output_path = os.path.join(output_folder, filename)
                    cropped_img.save(output_path)
                    print(f"Saved cropped image: {output_path}")
            except Exception as e:
                print(f"Failed to process {filename}: {e}")


output_folder = '../crops/'

# 関数を実行
crop_images_in_current_folder(output_folder)
