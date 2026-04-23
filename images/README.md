# Images folder — Electro Hub Market

This folder holds all product images for the marketplace.

## Folder structure

```
images/
└── products/
    ├── dji-neo-propellers/   ← one folder per product listing
    │   ├── cover.jpg         ← main photo shown in product card & hero
    │   ├── photo-2.jpg
    │   ├── photo-3.jpg
    │   └── ...
    └── your-new-product/     ← create a new sub-folder for each new item
        ├── cover.jpg
        └── ...
```

## How to add photos for a product

1. Create a sub-folder inside `images/products/` named after your product
   (use lowercase letters and hyphens, e.g. `iphone-14-pro`).
2. Upload your photos into that folder.
   - Name the main / cover photo **`cover.jpg`** (or `.png`).
   - Name extra photos `photo-2.jpg`, `photo-3.jpg`, etc.
3. Open the matching product page in `products/` and replace the SVG
   placeholder with a real `<img>` tag:

```html
<!-- Main cover image -->
<img class="product-img"
     src="../images/products/your-product-folder/cover.jpg"
     alt="Descriptive alt text" />

<!-- Optional extra photos gallery -->
<div class="img-grid">
  <img src="../images/products/your-product-folder/photo-2.jpg" alt="" />
  <img src="../images/products/your-product-folder/photo-3.jpg" alt="" />
</div>
```

4. On the homepage (`index.html`) replace the SVG inside `.product-card-thumb`
   with a real image:

```html
<img src="images/products/your-product-folder/cover.jpg"
     alt="Your product name" />
```

## Tips

- Keep images under **500 KB** each for fast loading on mobile.
- Recommended size: **800 × 800 px** (square) for cover photos.
- Use JPEG for photos, PNG for screenshots or diagrams.
- GitHub Pages serves images directly — no server required.
