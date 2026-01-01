#!/bin/bash
# 生成图片列表 JSON

cd "$(dirname "$0")/../" || exit 1

OUTPUT="images.json"

echo "[" > "$OUTPUT"

FIRST=true
# 使用 awk 替代 shell 循环以提高性能
find . -type f \( -iname "*.webp" -o -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.gif" -o -iname "*.svg" \) | sort -r | awk '
BEGIN {
    print "["
    first = 1
}
{
    # 去掉开头的 ./
    sub(/^\.\//, "", $0)
    path = $0
    
    # 分割路径
    n = split(path, parts, "/")
    
    # 仅处理符合 year/month/day/filename 结构的文件 (至少4部分)
    # 这样可以自动过滤掉 cache 目录或其他不符合规范的图片
    if (n >= 4) {
        year = parts[1]
        month = parts[2]
        day = parts[3]
        filename = parts[n]
        
        # 简单的数字检查，确保是日期目录
        if (year ~ /^[0-9]+$/ && month ~ /^[0-9]+$/) {
            # 转义 JSON 特殊字符
            gsub(/\\/, "\\\\", path)
            gsub(/"/, "\\\"", path)
            gsub(/\\/, "\\\\", filename)
            gsub(/"/, "\\\"", filename)
            
            if (first == 0) {
                print ","
            }
            first = 0
            
            print "  {"
            print "    \"url\": \"/api/i/" path "\","
            print "    \"filename\": \"" filename "\","
            print "    \"year\": \"" year "\","
            print "    \"month\": \"" month "\","
            print "    \"day\": \"" day "\","
            print "    \"date\": \"" year "-" month "-" day "\""
            printf "  }"
        }
    }
}
END {
    print "\n]"
}
' > "$OUTPUT"

TOTAL=$(grep -c '"url"' "$OUTPUT" || echo 0)
echo "✓ 已生成 $TOTAL 张图片的列表: $(pwd)/$OUTPUT"
