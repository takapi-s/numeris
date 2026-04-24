import os
from PIL import Image

# ディレクトリ内のファイルを処理
def resize_images_to_test_png(directory):
    # 'test.png' のパスを指定
    test_image_path = os.path.join(directory, 'test.png')
    
    # 'test.png' のサイズを取得
    with Image.open(test_image_path) as test_img:
        test_size = test_img.size  # (width, height)

    # ディレクトリ内の全てのPNGファイルを処理
    for filename in os.listdir(directory):
        if filename.endswith('.png') and filename != 'test.png':
            image_path = os.path.join(directory, filename)
            with Image.open(image_path) as img:
                # 画像を 'test.png' と同じサイズにリサイズ
                resized_img = img.resize(test_size, Image.Resampling.LANCZOS)
                
                # リサイズ後の画像を保存（上書き）
                resized_img.save(image_path)

    print(f"全てのPNGファイルが'test.png'と同じサイズにリサイズされました。")

# 実行部分
if __name__ == "__main__":
    # 画像が保存されているディレクトリパスを指定
    target_directory = "./"  # 例えば、現在のディレクトリの場合

    resize_images_to_test_png(target_directory)
