for i in {0..9}; do
  hue=$((i * 36))
  magick sunflower.png \
    -modulate 100,100,$hue \
    "sunflower_${i}.png"
done
