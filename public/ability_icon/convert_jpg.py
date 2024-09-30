import os
from PIL import Image

def convert_jpg_to_png(directory):
    # ディレクトリ内の全ファイルを取得
    for filename in os.listdir(directory):
        # ファイル名が.jpgまたは.jpegで終わるか確認（大文字小文字を区別しない）
        if filename.lower().endswith(('.jpg', '.jpeg')):
            # フルパスを取得
            jpg_path = os.path.join(directory, filename)
            # 拡張子を.pngに変更
            png_filename = os.path.splitext(filename)[0] + '.png'
            png_path = os.path.join(directory, png_filename)
            
            try:
                # 画像を開く
                with Image.open(jpg_path) as img:
                    # PNG形式で保存
                    img.save(png_path, 'PNG')
                print(f"変換成功: {jpg_path} → {png_path}")
            except Exception as e:
                print(f"変換失敗: {jpg_path}  エラー: {e}")

if __name__ == "__main__":
    # スクリプトのあるディレクトリを取得
    current_directory = os.path.dirname(os.path.abspath(__file__))
    convert_jpg_to_png(current_directory)
