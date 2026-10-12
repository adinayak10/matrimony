#!/bin/bash

# Image Optimization Script for BanjaraMatch
# This script compresses images and converts them to WebP format
# Reduces page payload size significantly

echo "========================================="
echo "  BanjaraMatch Image Optimization Tool  "
echo "========================================="
echo ""

# Check if required tools are installed
check_dependencies() {
    echo "Checking dependencies..."
    
    if ! command -v jpegoptim &> /dev/null; then
        echo "❌ jpegoptim not found. Installing..."
        sudo apt-get update && sudo apt-get install -y jpegoptim
    else
        echo "✓ jpegoptim found"
    fi
    
    if ! command -v optipng &> /dev/null; then
        echo "❌ optipng not found. Installing..."
        sudo apt-get install -y optipng
    else
        echo "✓ optipng found"
    fi
    
    if ! command -v cwebp &> /dev/null; then
        echo "❌ webp tools not found. Installing..."
        sudo apt-get install -y webp
    else
        echo "✓ webp tools found"
    fi
    
    echo ""
}

# Optimize JPEG images
optimize_jpegs() {
    echo "Optimizing JPEG images..."
    find public/images -type f \( -iname "*.jpg" -o -iname "*.jpeg" \) -exec jpegoptim --max=85 --strip-all --preserve --quiet {} \;
    echo "✓ JPEG optimization complete"
    echo ""
}

# Optimize PNG images
optimize_pngs() {
    echo "Optimizing PNG images..."
    find public/images -type f -iname "*.png" -exec optipng -o3 -quiet {} \;
    echo "✓ PNG optimization complete"
    echo ""
}

# Convert images to WebP format (backup originals)
convert_to_webp() {
    echo "Converting images to WebP format..."
    
    # Convert JPEGs to WebP
    find public/images -type f \( -iname "*.jpg" -o -iname "*.jpeg" \) | while read file; do
        webp_file="${file%.*}.webp"
        if [ ! -f "$webp_file" ]; then
            cwebp -q 85 -quiet "$file" -o "$webp_file" 2>/dev/null
        fi
    done
    
    # Convert PNGs to WebP
    find public/images -type f -iname "*.png" | while read file; do
        webp_file="${file%.*}.webp"
        if [ ! -f "$webp_file" ]; then
            cwebp -q 85 -quiet "$file" -o "$webp_file" 2>/dev/null
        fi
    done
    
    echo "✓ WebP conversion complete"
    echo ""
}

# Calculate space savings
calculate_savings() {
    echo "Calculating space savings..."
    
    original_size=$(du -sh public/images 2>/dev/null | cut -f1)
    webp_count=$(find public/images -name "*.webp" | wc -l)
    
    echo "📁 Images directory size: $original_size"
    echo "🖼️  WebP images created: $webp_count"
    echo ""
}

# Main execution
main() {
    cd "$(dirname "$0")" || exit 1
    
    check_dependencies
    optimize_jpegs
    optimize_pngs
    convert_to_webp
    calculate_savings
    
    echo "========================================="
    echo "  ✅ Image Optimization Complete!  "
    echo "========================================="
    echo ""
    echo "Next steps:"
    echo "1. Update image tags to use WebP with fallback"
    echo "2. Test the website"
    echo "3. Monitor PageSpeed score improvement"
    echo ""
}

# Run the script
main
