import os
from PIL import Image

# ディレクトリ内のファイルを処理
def apply_transparency_from_test_png(directory):
    # 'test.png' のパスを指定
    test_image_path = os.path.join(directory, 'test.png')
    
    # 'test.png' を読み込んでアルファチャンネルを取得
    with Image.open(test_image_path).convert('RGBA') as test_img:
        test_alpha = test_img.getchannel('A')  # アルファチャンネル（透過部分）

    # ディレクトリ内の全てのPNGファイルを処理
    for filename in os.listdir(directory):
        if filename.endswith('.png') and filename != 'test.png':
            image_path = os.path.join(directory, filename)
            with Image.open(image_path).convert('RGBA') as img:
                # 'test.png' の透過部分を他の画像に適用
                img.putalpha(test_alpha)

                # リサイズ後の画像を保存（上書き）
                img.save(image_path)

    print(f"全てのPNGファイルに'test.png'の透過が適用されました。")

# 実行部分
if __name__ == "__main__":
    # 画像が保存されているディレクトリパスを指定
    target_directory = "./"  # 例えば、現在のディレクトリの場合

    apply_transparency_from_test_png(target_directory)
