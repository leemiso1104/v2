# encoding: utf-8
# 캔버스에 그리는 그림들(버섯·건물·우주·배경)을 글자(data URL)로 바꿔 assets.js 에 담는다.
# 이렇게 해야 index.html 을 파일로 바로 열어도 Save(PNG 저장)가 브라우저 보안에 막히지 않는다.
# img 폴더의 그림을 바꾸거나 새로 넣은 뒤에는 터미널에서 이 폴더로 와서 한 번 실행하면 된다 :
#   ruby make-assets.rb
require "base64"
Dir.chdir(__dir__)
TYPES = { ".webp" => "image/webp", ".png" => "image/png", ".jpg" => "image/jpeg" }
files = Dir["img/**/*.{webp,png,jpg}"].sort - ["img/title.png"]   # 제목 그림은 캔버스에 안 그리니 뺀다
out = +"// 자동으로 만든 파일 : 직접 고치지 말고 make-assets.rb 를 다시 실행할 것\n"
out << "const ASSETS = {\n"
files.each do |f|
  out << "  \"#{f}\": \"data:#{TYPES[File.extname(f)]};base64,#{Base64.strict_encode64(File.binread(f))}\",\n"
end
out << "};\n"
File.write("assets.js", out)
puts "assets.js 완료 : 그림 #{files.size}개, #{out.bytesize / 1024} KB"
